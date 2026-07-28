import type { Request } from 'express';
import { supabase } from './supabase.js';

export type AuditAction =
  | 'VISUALIZOU'
  | 'BAIXOU'
  | 'EDITOU'
  | 'ASSINOU'
  | 'EXCLUIU'
  | 'CRIOU'
  | 'ENTROU';

/** O que foi afetado pela ação — usado para discriminar a trilha de auditoria. */
export type AuditEntityType = 'TRANSACAO' | 'CONTA' | 'USUARIO' | 'DOCUMENTO' | 'SESSAO';

/**
 * Detalhes do evento, exibidos no "Visualizar" da trilha de auditoria.
 * Chaves são rótulos legíveis (ex.: "Descrição", "Valor"). O valor pode ser
 * o dado em si (criação/exclusão) ou `{ de, para }` (edição).
 */
export type AuditDetails = Record<
  string,
  string | number | boolean | null | { de: string | number | boolean | null; para: string | number | boolean | null }
>;

/** IP real do cliente, considerando proxy reverso (nginx/docker-compose). */
export function getClientIp(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.length > 0) {
    return forwarded.split(',')[0].trim();
  }
  return req.ip ?? req.socket.remoteAddress ?? 'desconhecido';
}

/**
 * Grava um evento na trilha de auditoria (AuditLog).
 * Tabela é append-only: não expor UPDATE/DELETE em nenhuma rota.
 */
export async function logAudit(params: {
  userId: string;
  action: AuditAction;
  ip: string;
  documentId?: string | null;
  entityType?: AuditEntityType;
  entityLabel?: string;
  details?: AuditDetails | null;
}) {
  const { error } = await supabase.from('AuditLog').insert({
    userId: params.userId,
    action: params.action,
    ipAddress: params.ip,
    documentId: params.documentId ?? null,
    entityType: params.entityType ?? null,
    entityLabel: params.entityLabel ?? null,
    details: params.details ?? null,
  });
  if (error) console.error('Falha ao gravar auditoria:', error.message);
}

type Snapshot = Record<string, string | number | boolean | null>;

/**
 * Compara dois snapshots (chaves = rótulos legíveis) e monta
 * `{ campo: { de, para } }` só com o que realmente mudou.
 */
export function diffDetails(before: Snapshot, after: Snapshot): AuditDetails | null {
  const out: AuditDetails = {};
  for (const label of new Set([...Object.keys(before), ...Object.keys(after)])) {
    const de = before[label] ?? null;
    const para = after[label] ?? null;
    if (de !== para) out[label] = { de, para };
  }
  return Object.keys(out).length ? out : null;
}
