import { Router } from 'express';
import multer from 'multer';
import crypto from 'node:crypto';
import { z } from 'zod';
import { supabase } from '../lib/supabase.js';
import { txToJson } from '../lib/serialize.js';
import {
  requireRole,
  CAN_WRITE,
  type AuthedRequest,
} from '../middleware/auth.js';
import { logAudit, getClientIp, diffDetails } from '../lib/audit.js';

export const transactionsRouter = Router();

const DOSSIE_BUCKET = 'dossies';
const DOSSIE_MIME_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'application/pdf'];

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});

function sanitizeFileName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, '-').slice(-100);
}

// POST /api/transactions/dossie — upload de anexo (imagem/PDF) do dossiê
transactionsRouter.post(
  '/dossie',
  requireRole(...CAN_WRITE),
  upload.single('file'),
  async (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'Nenhum arquivo enviado' });
    if (!DOSSIE_MIME_TYPES.includes(req.file.mimetype)) {
      return res.status(400).json({ error: 'Envie uma imagem (PNG/JPEG/WEBP) ou PDF' });
    }

    const path = `transacoes/${crypto.randomUUID()}-${sanitizeFileName(req.file.originalname)}`;
    const { error } = await supabase.storage
      .from(DOSSIE_BUCKET)
      .upload(path, req.file.buffer, { contentType: req.file.mimetype });
    if (error) return res.status(500).json({ error: 'Erro ao enviar arquivo' });

    return res.status(201).json({ path, name: req.file.originalname });
  },
);

// GET /api/transactions/:id/dossie-url — URL assinada e temporária do anexo
transactionsRouter.get('/:id/dossie-url', async (req, res) => {
  const { data: tx } = await supabase
    .from('Transaction')
    .select('dossie')
    .eq('id', String(req.params.id))
    .maybeSingle();

  if (!tx?.dossie) return res.status(404).json({ error: 'Nenhum anexo para esta transação' });

  const { data, error } = await supabase.storage
    .from(DOSSIE_BUCKET)
    .createSignedUrl(tx.dossie, 300); // 5 minutos
  if (error || !data) return res.status(500).json({ error: 'Erro ao gerar link do anexo' });

  const name = tx.dossie.split('/').pop()?.replace(/^[0-9a-f-]{36}-/, '') ?? 'anexo';
  return res.json({ url: data.signedUrl, name });
});

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
  mes: z.string().trim().optional(),
  financiador: z.string().trim().optional(),
  favorecido: z.string().trim().optional(),
  cpfCnpj: z.string().trim().optional(),
  dossie: z.string().trim().optional(),
});

const toDateColumn = (d: Date) => d.toISOString().slice(0, 10);

/** Snapshot legível da transação para os detalhes da auditoria. */
function txSnapshot(tx: {
  description: string;
  amount: string | number;
  type: string;
  status: string;
  date: string;
  mes?: string | null;
  financiador?: string | null;
  favorecido?: string | null;
  cpfCnpj?: string | null;
  dossie?: string | null;
  account?: { name: string } | null;
  category?: { name: string } | null;
}) {
  return {
    'Descrição': tx.description,
    'Valor (R$)': Number(tx.amount),
    'Tipo': tx.type === 'RECEITA' ? 'Entrada' : 'Saída',
    'Status': tx.status === 'PAGO' ? 'Pago' : 'Pendente',
    'Data': tx.date,
    'Mês': tx.mes ?? null,
    'Financiador/Projeto': tx.financiador || null,
    'Favorecido': tx.favorecido || null,
    'CPF/CNPJ': tx.cpfCnpj || null,
    'Categoria': tx.category?.name ?? null,
    'Conta': tx.account?.name ?? null,
    'Dossiê': tx.dossie ? 'Com anexo' : null,
  };
}

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

    if (req.userId) {
      await logAudit({
        userId: req.userId,
        action: 'CRIOU',
        ip: getClientIp(req),
        entityType: 'TRANSACAO',
        entityLabel: tx.description,
        details: txSnapshot(tx),
      });
    }

    return res.status(201).json(txToJson(tx));
  },
);

// PUT /api/transactions/:id
transactionsRouter.put('/:id', requireRole(...CAN_WRITE), async (req: AuthedRequest, res) => {
  const auditIp = getClientIp(req);
  const parsed = txSchema.partial().safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Dados inválidos' });

  const { category, accountId, date, ...data } = parsed.data;
  const update: Record<string, unknown> = { ...data };
  if (date) update.date = toDateColumn(date);
  if (accountId) update.accountId = accountId;
  if (category) update.categoryId = await findOrCreateCategory(category);

  // Linha anterior completa: usada no diff da auditoria e na limpeza do dossiê.
  const { data: existing } = await supabase
    .from('Transaction')
    .select('*, account:Account(*), category:Category(*)')
    .eq('id', String(req.params.id))
    .maybeSingle();
  if (!existing) return res.status(404).json({ error: 'Transação não encontrada' });
  const previousDossie: string | null = existing.dossie ?? null;

  const { data: tx, error } = await supabase
    .from('Transaction')
    .update(update)
    .eq('id', String(req.params.id))
    .select('*, account:Account(*), category:Category(*)')
    .maybeSingle();

  if (error || !tx) return res.status(404).json({ error: 'Transação não encontrada' });

  if (data.dossie !== undefined && previousDossie && previousDossie !== data.dossie) {
    await supabase.storage.from(DOSSIE_BUCKET).remove([previousDossie]);
  }

  if (req.userId) {
    await logAudit({
      userId: req.userId,
      action: 'EDITOU',
      ip: auditIp,
      entityType: 'TRANSACAO',
      entityLabel: tx.description,
      details: diffDetails(txSnapshot(existing), txSnapshot(tx)),
    });
  }

  return res.json(txToJson(tx));
});

// DELETE /api/transactions/:id
transactionsRouter.delete(
  '/:id',
  requireRole(...CAN_WRITE),
  async (req: AuthedRequest, res) => {
    const { data, error } = await supabase
      .from('Transaction')
      .delete()
      .eq('id', String(req.params.id))
      .select('*, account:Account(*), category:Category(*)');

    if (error || !data || data.length === 0) {
      return res.status(404).json({ error: 'Transação não encontrada' });
    }

    const removed = data[0];
    const dossiePath = removed.dossie as string | null;
    if (dossiePath) {
      await supabase.storage.from(DOSSIE_BUCKET).remove([dossiePath]);
    }

    if (req.userId) {
      await logAudit({
        userId: req.userId,
        action: 'EXCLUIU',
        ip: getClientIp(req),
        entityType: 'TRANSACAO',
        entityLabel: removed.description as string,
        details: txSnapshot(removed),
      });
    }

    return res.status(204).end();
  },
);
