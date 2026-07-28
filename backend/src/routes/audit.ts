import { Router } from 'express';
import { supabase } from '../lib/supabase.js';
import { requireRole } from '../middleware/auth.js';

export const auditRouter = Router();

/**
 * GET /api/audit — trilha de auditoria (somente leitura).
 * Só ADMIN acessa. Não existe (e não deve existir) rota de PUT/DELETE aqui:
 * o histórico é imutável, inclusive para administradores.
 */
auditRouter.get('/', requireRole('ADMIN'), async (req, res) => {
  const { userId, action, from, to } = req.query as Record<string, string | undefined>;

  let query = supabase
    .from('AuditLog')
    .select('*, user:User(name, email)')
    .order('createdAt', { ascending: false })
    .limit(500);

  if (userId) query = query.eq('userId', userId);
  if (action) query = query.eq('action', action.toUpperCase());
  if (from) query = query.gte('createdAt', from);
  if (to) query = query.lte('createdAt', to);

  const { data, error } = await query;
  if (error) return res.status(500).json({ error: 'Erro ao buscar trilha de auditoria' });

  return res.json(
    (data ?? []).map((row: any) => ({
      id: row.id,
      action: (row.action as string).toLowerCase(),
      ipAddress: row.ipAddress,
      createdAt: row.createdAt,
      userId: row.userId,
      userName: row.user?.name ?? 'Usuário removido',
      userEmail: row.user?.email ?? '',
      documentId: row.documentId,
      entityType: row.entityType,
      entityLabel: row.entityLabel,
      details: row.details ?? null,
    })),
  );
});
