import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { accountToJson } from '../lib/serialize.js';
import { requireRole, CAN_WRITE } from '../middleware/auth.js';

export const accountsRouter = Router();

const accountSchema = z.object({
  name: z.string().min(1),
  bank: z.string().optional(),
  type: z
    .enum(['corrente', 'poupanca', 'caixa'])
    .transform((t) => t.toUpperCase() as 'CORRENTE' | 'POUPANCA' | 'CAIXA'),
  balance: z.coerce.number().default(0), // saldo inicial
});

/**
 * Saldo real de cada conta = saldo inicial + receitas pagas − despesas pagas.
 * Transações pendentes não afetam o saldo.
 */
async function currentBalances(): Promise<Map<string, number>> {
  const sums = await prisma.transaction.groupBy({
    by: ['accountId', 'type'],
    where: { status: 'PAGO' },
    _sum: { amount: true },
  });
  const map = new Map<string, number>();
  for (const s of sums) {
    const delta = Number(s._sum.amount ?? 0) * (s.type === 'RECEITA' ? 1 : -1);
    map.set(s.accountId, (map.get(s.accountId) ?? 0) + delta);
  }
  return map;
}

// GET /api/accounts
accountsRouter.get('/', async (_req, res) => {
  const [accounts, deltas] = await Promise.all([
    prisma.account.findMany({ orderBy: { createdAt: 'asc' } }),
    currentBalances(),
  ]);
  return res.json(
    accounts.map((a) =>
      accountToJson(a, Number(a.balance) + (deltas.get(a.id) ?? 0)),
    ),
  );
});

// POST /api/accounts
accountsRouter.post('/', requireRole(...CAN_WRITE), async (req, res) => {
  const parsed = accountSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Dados inválidos' });

  const account = await prisma.account.create({ data: parsed.data });
  return res.status(201).json(accountToJson(account, Number(account.balance)));
});

// PUT /api/accounts/:id
accountsRouter.put('/:id', requireRole(...CAN_WRITE), async (req, res) => {
  const parsed = accountSchema.partial().safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Dados inválidos' });

  try {
    const account = await prisma.account.update({
      where: { id: String(req.params.id) },
      data: parsed.data,
    });
    return res.json(accountToJson(account, Number(account.balance)));
  } catch {
    return res.status(404).json({ error: 'Conta não encontrada' });
  }
});

// DELETE /api/accounts/:id
accountsRouter.delete('/:id', requireRole(...CAN_WRITE), async (req, res) => {
  const count = await prisma.transaction.count({
    where: { accountId: String(req.params.id) },
  });
  if (count > 0) {
    return res
      .status(409)
      .json({ error: 'Conta possui transações e não pode ser excluída' });
  }
  try {
    await prisma.account.delete({ where: { id: String(req.params.id) } });
    return res.status(204).end();
  } catch {
    return res.status(404).json({ error: 'Conta não encontrada' });
  }
});
