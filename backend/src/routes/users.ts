import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { supabase } from '../lib/supabase.js';
import { userToJson } from '../lib/serialize.js';
import { requireRole, type AuthedRequest } from '../middleware/auth.js';

export const usersRouter = Router();

const ROLES = ['ADMIN', 'COORDENACAO', 'FINANCEIRO', 'LEITURA'] as const;

// GET /api/users
usersRouter.get('/', async (_req, res) => {
  const { data: users, error } = await supabase
    .from('User')
    .select('*')
    .order('createdAt', { ascending: true });
  if (error) return res.status(500).json({ error: 'Erro ao buscar usuários' });

  return res.json((users ?? []).map(userToJson));
});

// POST /api/users — apenas ADMIN cria usuários
usersRouter.post('/', requireRole('ADMIN'), async (req, res) => {
  const parsed = z
    .object({
      name: z.string().min(1),
      email: z.string().email(),
      password: z.string().min(8),
      role: z.enum(ROLES).default('FINANCEIRO'),
    })
    .safeParse(req.body);
  if (!parsed.success) {
    return res
      .status(400)
      .json({ error: 'Dados inválidos (senha mínima: 8 caracteres)' });
  }

  const { data: exists } = await supabase
    .from('User')
    .select('id')
    .eq('email', parsed.data.email)
    .maybeSingle();
  if (exists) return res.status(409).json({ error: 'E-mail já cadastrado' });

  const { data: user, error } = await supabase
    .from('User')
    .insert({
      name: parsed.data.name,
      email: parsed.data.email,
      role: parsed.data.role,
      passwordHash: await bcrypt.hash(parsed.data.password, 10),
    })
    .select()
    .single();
  if (error || !user) return res.status(500).json({ error: 'Erro ao criar usuário' });

  return res.status(201).json(userToJson(user));
});

// PUT /api/users/:id — apenas ADMIN altera perfil/situação
usersRouter.put('/:id', requireRole('ADMIN'), async (req: AuthedRequest, res) => {
  const parsed = z
    .object({
      name: z.string().min(1).optional(),
      role: z.enum(ROLES).optional(),
      active: z.boolean().optional(),
    })
    .safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Dados inválidos' });

  if (String(req.params.id) === req.userId && parsed.data.active === false) {
    return res.status(400).json({ error: 'Você não pode desativar a si mesmo' });
  }

  const { data: user, error } = await supabase
    .from('User')
    .update(parsed.data)
    .eq('id', String(req.params.id))
    .select()
    .maybeSingle();
  if (error || !user) return res.status(404).json({ error: 'Usuário não encontrado' });

  return res.json(userToJson(user));
});
