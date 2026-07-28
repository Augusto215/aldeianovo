import { Router } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import { z } from 'zod';
import { env } from '../env.js';
import { supabase } from '../lib/supabase.js';
import { userToJson } from '../lib/serialize.js';
import { sendEmail } from '../lib/mailer.js';
import { logAudit, getClientIp } from '../lib/audit.js';

export const authRouter = Router();

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const CODE_TTL_MS = 10 * 60 * 1000; // 10 minutos

function issueAccessToken(user: { id: string; role: string }) {
  return jwt.sign({ sub: user.id, role: user.role }, env.jwtSecret, {
    expiresIn: env.jwtExpiresIn as jwt.SignOptions['expiresIn'],
  });
}

async function issueAndSendCode(user: { id: string; email: string; name: string }) {
  const code = crypto.randomInt(100000, 999999).toString();
  const codeHash = await bcrypt.hash(code, 10);
  await supabase
    .from('User')
    .update({
      twoFactorSecret: JSON.stringify({
        codeHash,
        expiresAt: new Date(Date.now() + CODE_TTL_MS).toISOString(),
      }),
    })
    .eq('id', user.id);

  await sendEmail({
    to: user.email,
    subject: 'Seu código de acesso — Gestão Financeira APOINME',
    text:
      `Olá, ${user.name}.\n\n` +
      `Seu código de verificação é: ${code}\n\n` +
      `Ele expira em 10 minutos. Se você não tentou entrar na plataforma, ignore este e-mail.`,
  });
}

// POST /api/auth/login — 1ª etapa: valida e-mail/senha e envia código por e-mail
authRouter.post('/login', async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Dados inválidos' });
  }

  const { email, password } = parsed.data;
  const { data: user } = await supabase
    .from('User')
    .select('*')
    .eq('email', email)
    .maybeSingle();

  if (!user || !user.active || !(await bcrypt.compare(password, user.passwordHash))) {
    return res.status(401).json({ error: 'E-mail ou senha incorretos' });
  }

  if (!env.twoFactorEnabled) {
    await logAudit({
      userId: user.id,
      action: 'ENTROU',
      ip: getClientIp(req),
      entityType: 'SESSAO',
      entityLabel: `Login de ${user.name}`,
    });
    return res.json({
      requiresCode: false,
      token: issueAccessToken(user),
      user: userToJson(user),
    });
  }

  await issueAndSendCode(user);

  const pendingToken = jwt.sign({ sub: user.id, purpose: 'login-2fa' }, env.jwtSecret, {
    expiresIn: '10m',
  });

  return res.json({ requiresCode: true, pendingToken, email: user.email });
});

// POST /api/auth/login/verify — 2ª etapa: confirma o código recebido por e-mail
authRouter.post('/login/verify', async (req, res) => {
  const parsed = z
    .object({ pendingToken: z.string().min(1), code: z.string().min(1) })
    .safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Dados inválidos' });

  let payload: { sub: string; purpose: string };
  try {
    payload = jwt.verify(parsed.data.pendingToken, env.jwtSecret) as typeof payload;
  } catch {
    return res.status(401).json({ error: 'Sessão de login expirada, entre novamente' });
  }
  if (payload.purpose !== 'login-2fa') {
    return res.status(401).json({ error: 'Token inválido' });
  }

  const { data: user } = await supabase
    .from('User')
    .select('*')
    .eq('id', payload.sub)
    .maybeSingle();
  if (!user || !user.active) {
    return res.status(401).json({ error: 'Usuário não encontrado ou inativo' });
  }

  const pending = user.twoFactorSecret ? JSON.parse(user.twoFactorSecret) : null;
  if (!pending || new Date(pending.expiresAt) < new Date()) {
    return res.status(400).json({ error: 'Código expirado, solicite um novo' });
  }
  if (!(await bcrypt.compare(parsed.data.code, pending.codeHash))) {
    return res.status(401).json({ error: 'Código inválido' });
  }

  await supabase.from('User').update({ twoFactorSecret: null }).eq('id', user.id);

  await logAudit({
    userId: user.id,
    action: 'ENTROU',
    ip: getClientIp(req),
    entityType: 'SESSAO',
    entityLabel: `Login de ${user.name}`,
  });

  return res.json({ token: issueAccessToken(user), user: userToJson(user) });
});

// POST /api/auth/login/resend — reenvia um novo código para a etapa em andamento
authRouter.post('/login/resend', async (req, res) => {
  const parsed = z.object({ pendingToken: z.string().min(1) }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Dados inválidos' });

  let payload: { sub: string; purpose: string };
  try {
    payload = jwt.verify(parsed.data.pendingToken, env.jwtSecret) as typeof payload;
  } catch {
    return res.status(401).json({ error: 'Sessão de login expirada, entre novamente' });
  }
  if (payload.purpose !== 'login-2fa') {
    return res.status(401).json({ error: 'Token inválido' });
  }

  const { data: user } = await supabase
    .from('User')
    .select('id, email, name, active')
    .eq('id', payload.sub)
    .maybeSingle();
  if (!user || !user.active) {
    return res.status(401).json({ error: 'Usuário não encontrado ou inativo' });
  }

  await issueAndSendCode(user);
  return res.json({ ok: true });
});

// POST /api/auth/forgot-password
authRouter.post('/forgot-password', async (req, res) => {
  const parsed = z.object({ email: z.string().email() }).safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'E-mail inválido' });
  }

  const { data: user } = await supabase
    .from('User')
    .select('id, email')
    .eq('email', parsed.data.email)
    .maybeSingle();

  if (user) {
    const token = crypto.randomBytes(32).toString('hex');
    await supabase
      .from('User')
      .update({
        resetToken: token,
        resetTokenExpiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(), // 1h
      })
      .eq('id', user.id);
    // TODO: enviar por e-mail (serviço de e-mail ainda não configurado).
    // Por enquanto o link é registrado no log do servidor.
    console.log(
      `🔑 Recuperação de senha para ${user.email}: ` +
        `${env.corsOrigin}/redefinir-senha?token=${token}`,
    );
  }

  // Resposta genérica para não revelar se o e-mail existe.
  return res.json({ message: 'Se o e-mail existir, enviaremos instruções.' });
});

// POST /api/auth/reset-password
authRouter.post('/reset-password', async (req, res) => {
  const parsed = z
    .object({ token: z.string().min(1), password: z.string().min(8) })
    .safeParse(req.body);
  if (!parsed.success) {
    return res
      .status(400)
      .json({ error: 'Token inválido ou senha com menos de 8 caracteres' });
  }

  const { data: user } = await supabase
    .from('User')
    .select('id, resetTokenExpiresAt')
    .eq('resetToken', parsed.data.token)
    .maybeSingle();

  if (
    !user ||
    !user.resetTokenExpiresAt ||
    new Date(user.resetTokenExpiresAt) < new Date()
  ) {
    return res.status(400).json({ error: 'Token inválido ou expirado' });
  }

  await supabase
    .from('User')
    .update({
      passwordHash: await bcrypt.hash(parsed.data.password, 10),
      resetToken: null,
      resetTokenExpiresAt: null,
    })
    .eq('id', user.id);

  return res.json({ message: 'Senha redefinida com sucesso' });
});
