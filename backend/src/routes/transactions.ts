import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { txToJson } from '../lib/serialize.js';
import {
  requireRole,
  CAN_WRITE,
  type AuthedRequest,
} from '../middleware/auth.js';

export const transactionsRouter = Router();

const txSchema = z.object({
  description: z.string().min(1),
  amount: z.coerce.number().positive(),
  type: z
    .enum(['receita', 'despesa'])
    .transform((t) => t.toUpperCase() as 'RECEITA' | 'DESPESA'),
  status: z
    .enum(['pago', 'pendente'])
    .transform((s) => s.toUpperCase() as 'PAGO' | 'PENDENTE'),
  date: z.coerce.date(),
  accountId: z.string().min(1),
  category: z.string().trim().min(1).optional(), // nome; criada se não existir
});

// GET /api/transactions?type=&status=&q=&from=&to=
transactionsRouter.get('/', async (req, res) => {
  const { type, status, q, from, to } = req.query as Record<
    string,
    string | undefined
  >;

  const rows = await prisma.transaction.findMany({
    where: {
      ...(type && { type: type.toUpperCase() as 'RECEITA' | 'DESPESA' }),
      ...(status && { status: status.toUpperCase() as 'PAGO' | 'PENDENTE' }),
      ...(q && {
        OR: [
          { description: { contains: q, mode: 'insensitive' } },
          { category: { name: { contains: q, mode: 'insensitive' } } },
        ],
      }),
      ...((from || to) && {
        date: {
          ...(from && { gte: new Date(from) }),
          ...(to && { lte: new Date(`${to}T23:59:59.999Z`) }),
        },
      }),
    },
    include: { account: true, category: true },
    orderBy: { date: 'desc' },
  });

  return res.json(rows.map(txToJson));
});

// POST /api/transactions
transactionsRouter.post(
  '/',
  requireRole(...CAN_WRITE),
  async (req: AuthedRequest, res) => {
    const parsed = txSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Dados inválidos' });
    }
    const { category, accountId, ...data } = parsed.data;

    const account = await prisma.account.findUnique({ where: { id: accountId } });
    if (!account) return res.status(400).json({ error: 'Conta inexistente' });

    const tx = await prisma.transaction.create({
      data: {
        ...data,
        account: { connect: { id: accountId } },
        ...(category && {
          category: {
            connectOrCreate: {
              where: { name: category },
              create: { name: category },
            },
          },
        }),
        ...(req.userId && { createdBy: { connect: { id: req.userId } } }),
      },
      include: { account: true, category: true },
    });

    return res.status(201).json(txToJson(tx));
  },
);

// PUT /api/transactions/:id
transactionsRouter.put('/:id', requireRole(...CAN_WRITE), async (req, res) => {
  const parsed = txSchema.partial().safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Dados inválidos' });

  const { category, accountId, ...data } = parsed.data;

  try {
    const tx = await prisma.transaction.update({
      where: { id: String(req.params.id) },
      data: {
        ...data,
        ...(accountId && { account: { connect: { id: accountId } } }),
        ...(category && {
          category: {
            connectOrCreate: {
              where: { name: category },
              create: { name: category },
            },
          },
        }),
      },
      include: { account: true, category: true },
    });
    return res.json(txToJson(tx));
  } catch {
    return res.status(404).json({ error: 'Transação não encontrada' });
  }
});

// DELETE /api/transactions/:id
transactionsRouter.delete(
  '/:id',
  requireRole(...CAN_WRITE),
  async (req, res) => {
    try {
      await prisma.transaction.delete({ where: { id: String(req.params.id) } });
      return res.status(204).end();
    } catch {
      return res.status(404).json({ error: 'Transação não encontrada' });
    }
  },
);
