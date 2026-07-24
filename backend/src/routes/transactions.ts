import { Router } from 'express';
import { z } from 'zod';
import { supabase } from '../lib/supabase.js';
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

const toDateColumn = (d: Date) => d.toISOString().slice(0, 10);

/** Busca a categoria pelo nome ou cria (idempotente via upsert por nome único). */
async function findOrCreateCategory(name: string): Promise<string> {
  const { data, error } = await supabase
    .from('Category')
    .upsert({ name }, { onConflict: 'name' })
    .select('id')
    .single();
  if (error || !data) throw new Error('Erro ao resolver categoria');
  return data.id as string;
}

// GET /api/transactions?type=&status=&q=&from=&to=
transactionsRouter.get('/', async (req, res) => {
  const { type, status, q, from, to } = req.query as Record<
    string,
    string | undefined
  >;

  let query = supabase
    .from('Transaction')
    .select('*, account:Account(*), category:Category(*)')
    .order('date', { ascending: false });

  if (type) query = query.eq('type', type.toUpperCase());
  if (status) query = query.eq('status', status.toUpperCase());
  if (from) query = query.gte('date', from);
  if (to) query = query.lte('date', to);

  if (q) {
    const safeQ = q.replace(/[,()]/g, ' ').trim();
    const { data: matchingCategories } = await supabase
      .from('Category')
      .select('id')
      .ilike('name', `%${safeQ}%`);
    const catIds = (matchingCategories ?? []).map((c) => c.id);
    const orParts = [`description.ilike.%${safeQ}%`];
    if (catIds.length) orParts.push(`categoryId.in.(${catIds.join(',')})`);
    query = query.or(orParts.join(','));
  }

  const { data: rows, error } = await query;
  if (error) return res.status(500).json({ error: 'Erro ao buscar transações' });

  return res.json((rows ?? []).map(txToJson));
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
    const { category, accountId, date, ...data } = parsed.data;

    const { data: account } = await supabase
      .from('Account')
      .select('id')
      .eq('id', accountId)
      .maybeSingle();
    if (!account) return res.status(400).json({ error: 'Conta inexistente' });

    const categoryId = category ? await findOrCreateCategory(category) : null;

    const { data: tx, error } = await supabase
      .from('Transaction')
      .insert({
        ...data,
        date: toDateColumn(date),
        accountId,
        categoryId,
        userId: req.userId ?? null,
      })
      .select('*, account:Account(*), category:Category(*)')
      .single();

    if (error || !tx) return res.status(500).json({ error: 'Erro ao criar transação' });
    return res.status(201).json(txToJson(tx));
  },
);

// PUT /api/transactions/:id
transactionsRouter.put('/:id', requireRole(...CAN_WRITE), async (req, res) => {
  const parsed = txSchema.partial().safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Dados inválidos' });

  const { category, accountId, date, ...data } = parsed.data;
  const update: Record<string, unknown> = { ...data };
  if (date) update.date = toDateColumn(date);
  if (accountId) update.accountId = accountId;
  if (category) update.categoryId = await findOrCreateCategory(category);

  const { data: tx, error } = await supabase
    .from('Transaction')
    .update(update)
    .eq('id', String(req.params.id))
    .select('*, account:Account(*), category:Category(*)')
    .maybeSingle();

  if (error || !tx) return res.status(404).json({ error: 'Transação não encontrada' });
  return res.json(txToJson(tx));
});

// DELETE /api/transactions/:id
transactionsRouter.delete(
  '/:id',
  requireRole(...CAN_WRITE),
  async (req, res) => {
    const { data, error } = await supabase
      .from('Transaction')
      .delete()
      .eq('id', String(req.params.id))
      .select('id');

    if (error || !data || data.length === 0) {
      return res.status(404).json({ error: 'Transação não encontrada' });
    }
    return res.status(204).end();
  },
);
