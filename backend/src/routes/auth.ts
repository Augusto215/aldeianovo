import { Router } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import { z } from 'zod';
import { env } from '../env.js';
import { prisma } from '../lib/prisma.js';
import { userToJson } from '../lib/serialize.js';

export const authRouter = Router();

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

// POST /api/auth/login
authRouter.post('/login', async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Dados inválidos' });
  }

  const { email, password } = parsed.data;
  const user = await prisma.user.findUnique({ where: { email } });

  if (!user || !user.active || !(await bcrypt.compare(password, user.passwordHash))) {
    return res.status(401).json({ error: 'E-mail ou senha incorretos' });
  }

  const token = jwt.sign({ sub: user.id, role: user.role }, env.jwtSecret, {
    expiresIn: env.jwtExpiresIn as jwt.SignOptions['expiresIn'],
  });

  return res.json({ token, user: userToJson(user) });
});

// POST /api/auth/forgot-password
authRouter.post('/forgot-password', async (req, res) => {
  const parsed = z.object({ email: z.string().email() }).safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'E-mail inválido' });
  }

  const user = await prisma.user.findUnique({
    where: { email: parsed.data.email },
  });

  if (user) {
    const token = crypto.randomBytes(32).toString('hex');
    await prisma.user.update({
      where: { id: user.id },
      data: {
        resetToken: token,
        resetTokenExpiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1h
      },
    });
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

  const user = await prisma.user.findUnique({
    where: { resetToken: parsed.data.token },
  });

  if (!user || !user.resetTokenExpiresAt || user.resetTokenExpiresAt < new Date()) {
    return res.status(400).json({ error: 'Token inválido ou expirado' });
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordHash: await bcrypt.hash(parsed.data.password, 10),
      resetToken: null,
      resetTokenExpiresAt: null,
    },
  });

  return res.json({ message: 'Senha redefinida com sucesso' });
});
