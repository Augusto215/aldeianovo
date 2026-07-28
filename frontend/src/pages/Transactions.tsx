import { useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Search,
  Plus,
  Download,
  CalendarRange,
  Trash2,
  Pencil,
  Loader2,
  Paperclip,
  FileText,
  X,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Modal, Field, inputClass } from '@/components/ui/Modal';
import { Loading, LoadError } from '@/components/ui/Async';
import { api, useFetch, downloadFile, uploadFile } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import type { Transaction, Account, Category, TxType } from '@/lib/types';
import { formatCurrency, formatDate } from '@/lib/format';

type Filter = 'todos' | TxType;

const FILTERS: { key: Filter; label: string }[] = [
  { key: 'todos', label: 'Todos' },
  { key: 'receita', label: 'Entradas' },
  { key: 'despesa', label: 'Saídas' },
];

const MESES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

function mesFromDate(date: string) {
  const idx = new Date(`${date}T00:00:00`).getMonth();
  return MESES[idx] ?? '';
}

const TODAY = new Date().toISOString().slice(0, 10);

const EMPTY_FORM = {
  description: '',
  amount: '',
  type: 'despesa' as TxType,
  status: 'pago' as 'pago' | 'pendente',
  date: TODAY,
  accountId: '',
  category: '',
  mes: mesFromDate(TODAY),
  financiador: '',
  favorecido: '',
  cpfCnpj: '',
  dossie: '',
};

/** Nome amigável do anexo a partir do path no bucket (remove o prefixo uuid). */
function dossieDisplayName(path: string) {
  return path.split('/').pop()?.replace(/^[0-9a-f-]{36}-/, '') ?? 'Arquivo anexado';
}

export function Transactions() {
  const { user } = useAuth();
  const canWrite = user?.role !== 'LEITURA';

  const { data: transactions, loading, error, reload } =
    useFetch<Transaction[]>('/transactions');
  const { data: accounts } = useFetch<Account[]>('/accounts');
  const { data: categories } = useFetch<Category[]>('/categories');

  const [searchParams] = useSearchParams();
  const urlQuery = searchParams.get('q') ?? '';

  const [filter, setFilter] = useState<Filter>('todos');
  const [query, setQuery] = useState(urlQuery);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // Busca vinda da barra do topo (?q=): sincroniza com o campo local.
  useEffect(() => {
    setQuery(urlQuery);
  }, [urlQuery]);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Transaction | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [dossieName, setDossieName] = useState('');
  const [uploadingDossie, setUploadingDossie] = useState(false);
  const [dossieError, setDossieError] = useState<string | null>(null);
  const [loadingDossieId, setLoadingDossieId] = useState<string | null>(null);

  const rows = useMemo(() => {
    return (transactions ?? []).filter((t) => {
      const byType = filter === 'todos' || t.type === filter;
      const byQuery =
        !query ||
        t.description.toLowerCase().includes(query.toLowerCase()) ||
        t.category.toLowerCase().includes(query.toLowerCase());
      const byPeriod =
        (!dateFrom || t.date >= dateFrom) && (!dateTo || t.date <= dateTo);
      return byType && byQuery && byPeriod;
    });
  }, [transactions, filter, query, dateFrom, dateTo]);

  const totalEntradas = rows
    .filter((t) => t.type === 'receita')
    .reduce((s, t) => s + t.amount, 0);
  const totalSaidas = rows
    .filter((t) => t.type === 'despesa')
    .reduce((s, t) => s + t.amount, 0);

  function openCreate() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setDossieName('');
    setFormError(null);
    setModalOpen(true);
  }

  function openEdit(t: Transaction) {
    setEditing(t);
    setForm({
      description: t.description,
      amount: String(t.amount),
      type: t.type,
      status: t.status,
      date: t.date,
      accountId: t.accountId,
      category: t.category === 'Sem categoria' ? '' : t.category,
      mes: t.mes || mesFromDate(t.date),
      financiador: t.financiador,
      favorecido: t.favorecido,
      cpfCnpj: t.cpfCnpj,
      dossie: t.dossie,
    });
    setDossieName(t.dossie ? dossieDisplayName(t.dossie) : '');
    setFormError(null);
    setModalOpen(true);
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setFormError(null);
    try {
      const payload = {
        ...form,
        amount: Number(form.amount),
        category: form.category || undefined,
      };
      if (editing) {
        await api.put(`/transactions/${editing.id}`, payload);
      } else {
        await api.post('/transactions', payload);
      }
      setModalOpen(false);
      setEditing(null);
      setForm(EMPTY_FORM);
      setDossieName('');
      reload();
    } catch (err) {
      setFormError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function onDelete(t: Transaction) {
    if (!window.confirm(`Excluir "${t.description}"?`)) return;
    try {
      await api.del(`/transactions/${t.id}`);
      reload();
    } catch (err) {
      alert((err as Error).message);
    }
  }

  async function onDossieFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setDossieError(null);
    setUploadingDossie(true);
    try {
      const { path, name } = await uploadFile<{ path: string; name: string }>(
        '/transactions/dossie',
        file,
      );
      setForm((f) => ({ ...f, dossie: path }));
      setDossieName(name);
    } catch (err) {
      setDossieError((err as Error).message);
    } finally {
      setUploadingDossie(false);
    }
  }

  async function onViewDossie(t: Transaction) {
    setLoadingDossieId(t.id);
    try {
      const { url } = await api.get<{ url: string; name: string }>(
        `/transactions/${t.id}/dossie-url`,
      );
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setLoadingDossieId(null);
    }
  }

  if (loading) return <Loading />;
  if (error) return <LoadError message={error} onRetry={reload} />;

  return (
    <div className="space-y-5">
      {/* Ações e filtros */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:flex-wrap">
        <div className="flex items-center gap-1 rounded-lg border border-hairline bg-white p-1">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                filter === f.key
                  ? 'bg-brand-600 text-white'
                  : 'text-ink-secondary hover:bg-plane'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="flex flex-1 items-center gap-2 rounded-lg border border-hairline bg-white px-3">
          <Search size={16} className="text-ink-muted" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por descrição ou categoria…"
            className="w-full bg-transparent py-2 text-sm outline-none"
          />
        </div>

        {/* Controle por período */}
        <div className="flex items-center gap-2 rounded-lg border border-hairline bg-white px-3 py-1">
          <CalendarRange size={16} className="shrink-0 text-ink-muted" />
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            aria-label="Data inicial"
            className="bg-transparent py-1 text-sm text-ink-secondary outline-none"
          />
          <span className="text-xs text-ink-muted">até</span>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            aria-label="Data final"
            className="bg-transparent py-1 text-sm text-ink-secondary outline-none"
          />
        </div>

        <div className="flex gap-2">
          <button
            onClick={() =>
              downloadFile('/reports/export/transactions.csv', 'movimentacoes.csv')
            }
            className="flex items-center gap-1.5 rounded-lg border border-hairline bg-white px-3 py-2 text-sm font-medium text-ink-secondary hover:bg-plane"
          >
            <Download size={15} /> Exportar
          </button>
          {canWrite && (
            <button
              onClick={openCreate}
              className="flex items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-700"
            >
              <Plus size={15} /> Nova
            </button>
          )}
        </div>
      </div>

      {/* Resumo do filtro */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card className="p-4">
          <div className="text-xs uppercase tracking-wide text-ink-muted">
            Entradas (filtro)
          </div>
          <div className="mt-1 text-xl font-semibold tabular text-[#006300]">
            {formatCurrency(totalEntradas)}
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-xs uppercase tracking-wide text-ink-muted">
            Saídas (filtro)
          </div>
          <div className="mt-1 text-xl font-semibold tabular text-critical">
            {formatCurrency(totalSaidas)}
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-xs uppercase tracking-wide text-ink-muted">
            Resultado
          </div>
          <div className="mt-1 text-xl font-semibold tabular text-ink">
            {formatCurrency(totalEntradas - totalSaidas)}
          </div>
        </Card>
      </div>

      {/* Tabela */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-hairline text-left text-xs uppercase tracking-wide text-ink-muted">
                <th className="px-5 py-3 font-medium">Mês</th>
                <th className="px-5 py-3 font-medium">Data</th>
                <th className="px-5 py-3 font-medium">Financiador/Projeto</th>
                <th className="px-5 py-3 font-medium">Categoria</th>
                <th className="px-5 py-3 font-medium">Descrição</th>
                <th className="px-5 py-3 text-right font-medium">Valor total</th>
                <th className="px-5 py-3 font-medium">Tipo</th>
                <th className="px-5 py-3 font-medium">Favorecido</th>
                <th className="px-5 py-3 font-medium">CPF/CNPJ</th>
                <th className="px-5 py-3 font-medium">Dossiê</th>
                <th className="px-5 py-3 font-medium">Conta</th>
                <th className="px-5 py-3 font-medium">Status</th>
                {canWrite && <th className="px-3 py-3" aria-label="Ações" />}
              </tr>
            </thead>
            <tbody>
              {rows.map((t) => (
                <tr
                  key={t.id}
                  className="border-b border-hairline last:border-0 hover:bg-plane"
                >
                  <td className="px-5 py-3 text-ink-secondary">{t.mes}</td>
                  <td className="px-5 py-3 tabular text-ink-secondary">
                    {formatDate(t.date)}
                  </td>
                  <td className="px-5 py-3 text-ink-secondary">{t.financiador}</td>
                  <td className="px-5 py-3 text-ink-secondary">{t.category}</td>
                  <td className="px-5 py-3 font-medium text-ink">
                    {t.description}
                  </td>
                  <td
                    className={`px-5 py-3 text-right tabular font-semibold ${
                      t.type === 'receita' ? 'text-[#006300]' : 'text-critical'
                    }`}
                  >
                    {t.type === 'receita' ? '+' : '−'}
                    {formatCurrency(t.amount)}
                  </td>
                  <td className="px-5 py-3 text-ink-secondary">
                    {t.type === 'receita' ? 'Entrada' : 'Saída'}
                  </td>
                  <td className="px-5 py-3 text-ink-secondary">{t.favorecido}</td>
                  <td className="px-5 py-3 text-ink-secondary">{t.cpfCnpj}</td>
                  <td className="px-5 py-3">
                    {t.dossie ? (
                      <button
                        onClick={() => onViewDossie(t)}
                        disabled={loadingDossieId === t.id}
                        className="flex items-center gap-1 text-sm font-medium text-brand-600 hover:underline disabled:opacity-60"
                      >
                        {loadingDossieId === t.id ? (
                          <Loader2 size={13} className="animate-spin" />
                        ) : (
                          <FileText size={13} />
                        )}
                        Ver anexo
                      </button>
                    ) : (
                      <span className="text-ink-muted">—</span>
                    )}
                  </td>
                  <td className="px-5 py-3 text-ink-secondary">{t.account}</td>
                  <td className="px-5 py-3">
                    <StatusBadge status={t.status} />
                  </td>
                  {canWrite && (
                    <td className="px-3 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => openEdit(t)}
                          className="rounded-md p-1.5 text-ink-muted transition-colors hover:bg-brand-50 hover:text-brand-700"
                          aria-label={`Editar ${t.description}`}
                          title="Editar"
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                          onClick={() => onDelete(t)}
                          className="rounded-md p-1.5 text-ink-muted transition-colors hover:bg-critical/10 hover:text-critical"
                          aria-label={`Excluir ${t.description}`}
                          title="Excluir"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td
                    colSpan={canWrite ? 13 : 12}
                    className="px-5 py-10 text-center text-sm text-ink-muted"
                  >
                    Nenhuma movimentação encontrada.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Nova / editar movimentação */}
      <Modal
        open={modalOpen}
        title={editing ? 'Editar movimentação' : 'Nova movimentação'}
        onClose={() => setModalOpen(false)}
      >
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Mês">
              <select
                value={form.mes}
                onChange={(e) => setForm({ ...form, mes: e.target.value })}
                className={inputClass}
              >
                {MESES.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Data">
              <input
                required
                type="date"
                value={form.date}
                onChange={(e) =>
                  setForm({ ...form, date: e.target.value, mes: mesFromDate(e.target.value) })
                }
                className={inputClass}
              />
            </Field>
          </div>

          <Field label="Financiador/Projeto">
            <input
              value={form.financiador}
              onChange={(e) => setForm({ ...form, financiador: e.target.value })}
              className={inputClass}
              placeholder="Ex.: F. Ford - Fortalecimento Institucional"
            />
          </Field>

          <Field label="Categoria">
            <input
              list="categorias"
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              className={inputClass}
              placeholder="Ex.: Consultoria técnica (sugestões na aba 'lista')"
            />
            <datalist id="categorias">
              {(categories ?? []).map((c) => (
                <option key={c.id} value={c.name} />
              ))}
            </datalist>
          </Field>

          <Field label="Descrição">
            <input
              required
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className={inputClass}
              placeholder="Ex.: Pagamento 1/3 - prestação de serviço ref. ao Contrato nº XX/XXXX"
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Valor total (R$)">
              <input
                required
                type="number"
                min="0.01"
                step="0.01"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
                className={inputClass}
                placeholder="0,00"
              />
            </Field>
            <Field label="Tipo">
              <select
                value={form.type}
                onChange={(e) =>
                  setForm({ ...form, type: e.target.value as TxType })
                }
                className={inputClass}
              >
                <option value="receita">Entrada (Receita)</option>
                <option value="despesa">Saída (Despesa)</option>
              </select>
            </Field>
          </div>

          <Field label="Favorecido">
            <input
              value={form.favorecido}
              onChange={(e) => setForm({ ...form, favorecido: e.target.value })}
              className={inputClass}
              placeholder="Nome completo, igual ao que consta no contrato e nota fiscal"
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="CPF/CNPJ">
              <input
                value={form.cpfCnpj}
                onChange={(e) => setForm({ ...form, cpfCnpj: e.target.value })}
                className={inputClass}
                placeholder="00.000.000/0000-00"
              />
            </Field>
            <Field label="Status">
              <select
                value={form.status}
                onChange={(e) =>
                  setForm({ ...form, status: e.target.value as 'pago' | 'pendente' })
                }
                className={inputClass}
              >
                <option value="pago">Pago</option>
                <option value="pendente">Pendente</option>
              </select>
            </Field>
          </div>

          <Field label="Dossiê (contrato + nota fiscal + comprovante de pagamento)">
            {form.dossie ? (
              <div className="flex items-center justify-between rounded-lg border border-hairline bg-plane px-3 py-2 text-sm">
                <span className="flex items-center gap-1.5 truncate text-ink-secondary">
                  <FileText size={14} className="shrink-0" />
                  {dossieName || 'Arquivo anexado'}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setForm({ ...form, dossie: '' });
                    setDossieName('');
                  }}
                  className="shrink-0 text-ink-muted hover:text-critical"
                  aria-label="Remover anexo"
                >
                  <X size={15} />
                </button>
              </div>
            ) : (
              <label
                className={`flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed py-2.5 text-sm ${
                  uploadingDossie
                    ? 'border-hairline text-ink-muted'
                    : 'border-brand-300 text-brand-600 hover:bg-brand-50'
                }`}
              >
                {uploadingDossie ? (
                  <Loader2 size={15} className="animate-spin" />
                ) : (
                  <Paperclip size={15} />
                )}
                {uploadingDossie ? 'Enviando…' : 'Anexar imagem ou PDF'}
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp,application/pdf"
                  onChange={onDossieFileChange}
                  disabled={uploadingDossie}
                  className="hidden"
                />
              </label>
            )}
            {dossieError && <p className="mt-1.5 text-sm text-critical">{dossieError}</p>}
          </Field>

          <Field label="Conta">
            <select
              required
              value={form.accountId}
              onChange={(e) => setForm({ ...form, accountId: e.target.value })}
              className={inputClass}
            >
              <option value="" disabled>
                Selecione a conta…
              </option>
              {(accounts ?? []).map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </Field>

          {formError && <p className="text-sm text-critical">{formError}</p>}

          <button
            type="submit"
            disabled={saving}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand-600 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-70"
          >
            {saving && <Loader2 size={16} className="animate-spin" />}
            {editing ? 'Salvar alterações' : 'Salvar movimentação'}
          </button>
        </form>
      </Modal>
    </div>
  );
}
