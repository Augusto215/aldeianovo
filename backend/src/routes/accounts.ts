import { Router } from 'express';
import { z } from 'zod';
import { supabase } from '../lib/supabase.js';
import { accountToJson } from '../lib/serialize.js';
import { requireRole, CAN_WRITE, type AuthedRequest } from '../middleware/auth.js';
import { logAudit, getClientIp, diffDetails } from '../lib/audit.js';

export const accountsRouter = Router();

const TIPO_LABEL: Record<string, string> = {
  CORRENTE: 'Conta corrente',
  POUPANCA: 'Poupança / Reserva',
  CAIXA: 'Caixa',
};

/** Snapshot legível da conta para os detalhes da auditoria. */
function accountSnapshot(a: {
  name: string;
  bank?: string | null;
  type: string;
  balance: string | number;
}) {
  return {
    'Nome': a.name,
    'Banco': a.bank || null,
    'Tipo': TIPO_LABEL[a.type] ?? a.type,
    'Saldo inicial (R$)': Number(a.balance),
  };
}

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
  const { data } = await supabase
    .from('Transaction')
    .select('accountId, type, amount')
    .eq('status', 'PAGO');

  const map = new Map<string, number>();
  for (const t of data ?? []) {
    const delta = Number(t.amount) * (t.type === 'RECEITA' ? 1 : -1);
    map.set(t.accountId, (map.get(t.accountId) ?? 0) + delta);
  }
  return map;
}

// GET /api/accounts
accountsRouter.get('/', async (_req, res) => {
  const [{ data: accounts, error }, deltas] = await Promise.all([
    supabase.from('Account').select('*').order('createdAt', { ascending: true }),
    currentBalances(),
  ]);
  if (error) return res.status(500).json({ error: 'Erro ao buscar contas' });

  return res.json(
    (accounts ?? []).map((a) =>
      accountToJson(a, Number(a.balance) + (deltas.get(a.id) ?? 0)),
    ),
  );
});

// POST /api/accounts
accountsRouter.post('/', requireRole(...CAN_WRITE), async (req: AuthedRequest, res) => {
  const parsed = accountSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Dados inválidos' });

  const { data: account, error } = await supabase
    .from('Account')
    .insert(parsed.data)
    .select()
    .single();
  if (error || !account) return res.status(500).json({ error: 'Erro ao criar conta' });

  if (req.userId) {
    await logAudit({
      userId: req.userId,
      action: 'CRIOU',
      ip: getClientIp(req),
      entityType: 'CONTA',
      entityLabel: account.name,
      details: accountSnapshot(account),
    });
  }

  return res.status(201).json(accountToJson(account, Number(account.balance)));
});

// PUT /api/accounts/:id
accountsRouter.put('/:id', requireRole(...CAN_WRITE), async (req: AuthedRequest, res) => {
  const auditIp = getClientIp(req);
  const parsed = accountSchema.partial().safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Dados inválidos' });

  const { data: existing } = await supabase
    .from('Account')
    .select()
    .eq('id', String(req.params.id))
    .maybeSingle();
  if (!existing) return res.status(404).json({ error: 'Conta não encontrada' });

  const { data: account, error } = await supabase
    .from('Account')
    .update(parsed.data)
    .eq('id', String(req.params.id))
    .select()
    .maybeSingle();
  if (error || !account) return res.status(404).json({ error: 'Conta não encontrada' });

  if (req.userId) {
    await logAudit({
      userId: req.userId,
      action: 'EDITOU',
      ip: auditIp,
      entityType: 'CONTA',
      entityLabel: account.name,
      details: diffDetails(accountSnapshot(existing), accountSnapshot(account)),
    });
  }

  return res.json(accountToJson(account, Number(account.balance)));
});

// DELETE /api/accounts/:id
accountsRouter.delete('/:id', requireRole(...CAN_WRITE), async (req: AuthedRequest, res) => {
  const { count } = await supabase
    .from('Transaction')
    .select('id', { count: 'exact', head: true })
    .eq('accountId', String(req.params.id));
  if (count && count > 0) {
    return res
      .status(409)
      .json({ error: 'Conta possui transações e não pode ser excluída' });
  }

  const { data, error } = await supabase
    .from('Account')
    .delete()
    .eq('id', String(req.params.id))
    .select();
  if (error || !data || data.length === 0) {
    return res.status(404).json({ error: 'Conta não encontrada' });
  }

  if (req.userId) {
    await logAudit({
      userId: req.userId,
      action: 'EXCLUIU',
      ip: getClientIp(req),
      entityType: 'CONTA',
      entityLabel: data[0].name as string,
      details: accountSnapshot(data[0]),
    });
  }

  return res.status(204).end();
});
