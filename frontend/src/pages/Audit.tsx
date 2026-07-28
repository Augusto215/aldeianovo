import { useState } from 'react';
import { ShieldCheck, Lock, Eye, ArrowRight } from 'lucide-react';
import { Card, CardHeader } from '@/components/ui/Card';
import { Loading, LoadError } from '@/components/ui/Async';
import { Modal } from '@/components/ui/Modal';
import { useFetch } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import type { AuditLogEntry, AuditAction, AuditEntityType, AuditDetailValue } from '@/lib/types';
import { formatDateTime } from '@/lib/format';

const ACTION_LABEL: Record<AuditAction, string> = {
  visualizou: 'Visualizou',
  baixou: 'Baixou',
  editou: 'Editou',
  assinou: 'Assinou',
  excluiu: 'Excluiu',
  criou: 'Criou',
  entrou: 'Entrou (login)',
};

const ACTION_STYLE: Record<AuditAction, string> = {
  visualizou: 'bg-plane text-ink-secondary ring-hairline',
  baixou: 'bg-[#2a78d6]/10 text-[#1c5cab] ring-[#2a78d6]/30',
  editou: 'bg-warning/15 text-[#8a5a00] ring-warning/40',
  assinou: 'bg-[#7c3aed]/10 text-[#5b21b6] ring-[#7c3aed]/30',
  excluiu: 'bg-critical/10 text-critical ring-critical/30',
  criou: 'bg-good/15 text-[#0f6b2c] ring-good/40',
  entrou: 'bg-brand-50 text-brand-700 ring-brand-200',
};

const ENTITY_LABEL: Record<AuditEntityType, string> = {
  TRANSACAO: 'Transação',
  CONTA: 'Conta',
  USUARIO: 'Usuário',
  DOCUMENTO: 'Documento',
  SESSAO: 'Sessão',
};

function isDiff(
  v: AuditDetailValue,
): v is { de: string | number | boolean | null; para: string | number | boolean | null } {
  return typeof v === 'object' && v !== null && 'de' in v && 'para' in v;
}

function plainValue(v: string | number | boolean | null): string {
  if (v === null || v === '') return '—';
  if (typeof v === 'boolean') return v ? 'Sim' : 'Não';
  if (typeof v === 'number') return v.toLocaleString('pt-BR', { minimumFractionDigits: 2 });
  return String(v);
}

export function Audit() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';

  const [action, setAction] = useState<'todas' | AuditAction>('todas');
  const [selected, setSelected] = useState<AuditLogEntry | null>(null);

  const { data: logs, loading, error, reload } = useFetch<AuditLogEntry[]>(
    action === 'todas' ? '/audit' : `/audit?action=${action}`,
  );

  if (!isAdmin) {
    return (
      <Card className="flex flex-col items-center gap-3 p-10 text-center">
        <Lock size={22} className="text-ink-muted" />
        <p className="text-sm text-ink-secondary">
          Somente o administrador tem acesso à trilha de auditoria.
        </p>
      </Card>
    );
  }

  if (loading) return <Loading />;
  if (error || !logs) return <LoadError message={error ?? 'Erro ao carregar'} onRetry={reload} />;

  const detailEntries = selected?.details ? Object.entries(selected.details) : [];

  return (
    <div className="space-y-5">
      <div className="flex items-start gap-3 rounded-xl border border-hairline bg-white p-4">
        <ShieldCheck size={18} className="mt-0.5 shrink-0 text-brand-600" />
        <p className="text-sm text-ink-secondary">
          Registro automático e imutável de quem visualizou, baixou, editou, assinou,
          excluiu ou criou cada item, e de cada login — com data, hora exata e endereço
          IP. Nenhum usuário, inclusive administradores, pode editar ou apagar este
          histórico.
        </p>
      </div>

      <div className="flex items-center gap-1 overflow-x-auto rounded-lg border border-hairline bg-white p-1">
        {(['todas', ...Object.keys(ACTION_LABEL)] as const).map((key) => (
          <button
            key={key}
            onClick={() => setAction(key as 'todas' | AuditAction)}
            className={`shrink-0 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              action === key
                ? 'bg-brand-600 text-white'
                : 'text-ink-secondary hover:bg-plane'
            }`}
          >
            {key === 'todas' ? 'Todas' : ACTION_LABEL[key as AuditAction]}
          </button>
        ))}
      </div>

      <Card>
        <CardHeader title="Trilha de auditoria" subtitle={`${logs.length} registros (mais recentes primeiro)`} />
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-hairline text-left text-xs uppercase tracking-wide text-ink-muted">
                <th className="px-5 py-3 font-medium">Data e hora</th>
                <th className="px-5 py-3 font-medium">Usuário</th>
                <th className="px-5 py-3 font-medium">Ação</th>
                <th className="px-5 py-3 font-medium">Item afetado</th>
                <th className="px-5 py-3 font-medium">Endereço IP</th>
                <th className="px-3 py-3" aria-label="Detalhes" />
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id} className="border-b border-hairline last:border-0 hover:bg-plane">
                  <td className="px-5 py-3 tabular text-ink-secondary">
                    {formatDateTime(log.createdAt)}
                  </td>
                  <td className="px-5 py-3">
                    <div className="font-medium text-ink">{log.userName}</div>
                    <div className="text-xs text-ink-muted">{log.userEmail}</div>
                  </td>
                  <td className="px-5 py-3">
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${ACTION_STYLE[log.action]}`}
                    >
                      {ACTION_LABEL[log.action]}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    {log.entityLabel ? (
                      <>
                        <div className="text-ink-secondary">{log.entityLabel}</div>
                        {log.entityType && (
                          <div className="text-xs text-ink-muted">
                            {ENTITY_LABEL[log.entityType]}
                          </div>
                        )}
                      </>
                    ) : (
                      <span className="text-ink-muted">—</span>
                    )}
                  </td>
                  <td className="px-5 py-3 tabular text-ink-secondary">{log.ipAddress}</td>
                  <td className="px-3 py-3 text-right">
                    {log.details && Object.keys(log.details).length > 0 && (
                      <button
                        onClick={() => setSelected(log)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-hairline bg-white px-2.5 py-1.5 text-xs font-medium text-ink-secondary transition-colors hover:border-brand-300 hover:text-brand-700"
                        title="Visualizar detalhes"
                      >
                        <Eye size={14} /> Visualizar
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {logs.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-5 py-10 text-center text-sm text-ink-muted">
                    Nenhum registro encontrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Detalhes do registro */}
      <Modal
        open={selected !== null}
        title="Detalhes do registro"
        onClose={() => setSelected(null)}
      >
        {selected && (
          <div className="space-y-4">
            <div className="rounded-lg bg-plane p-3 text-sm">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${ACTION_STYLE[selected.action]}`}
                >
                  {ACTION_LABEL[selected.action]}
                </span>
                {selected.entityType && (
                  <span className="text-ink-secondary">
                    {ENTITY_LABEL[selected.entityType]}
                    {selected.entityLabel ? `: ${selected.entityLabel}` : ''}
                  </span>
                )}
              </div>
              <div className="mt-2 text-xs text-ink-muted">
                Por <span className="font-medium text-ink-secondary">{selected.userName}</span>{' '}
                em {formatDateTime(selected.createdAt)} · IP {selected.ipAddress}
              </div>
            </div>

            {selected.action === 'editou' && (
              <p className="text-xs text-ink-muted">
                Campos alterados (antes <ArrowRight size={11} className="inline" /> depois):
              </p>
            )}

            <dl className="divide-y divide-hairline rounded-lg border border-hairline">
              {detailEntries.map(([label, value]) => (
                <div key={label} className="flex flex-col gap-0.5 px-3 py-2 text-sm sm:flex-row sm:items-start sm:gap-3">
                  <dt className="w-40 shrink-0 text-xs font-medium uppercase tracking-wide text-ink-muted sm:pt-0.5">
                    {label}
                  </dt>
                  <dd className="min-w-0 flex-1 text-ink">
                    {isDiff(value) ? (
                      <span className="flex flex-wrap items-center gap-1.5">
                        <span className="rounded bg-critical/10 px-1.5 py-0.5 text-critical line-through decoration-critical/50">
                          {plainValue(value.de)}
                        </span>
                        <ArrowRight size={13} className="shrink-0 text-ink-muted" />
                        <span className="rounded bg-good/15 px-1.5 py-0.5 text-[#0f6b2c]">
                          {plainValue(value.para)}
                        </span>
                      </span>
                    ) : (
                      plainValue(value)
                    )}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        )}
      </Modal>
    </div>
  );
}
