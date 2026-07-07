import { useMemo, useState, type FormEvent } from 'react';
import { Search, Plus, Download, CalendarRange, Trash2, Loader2 } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Modal, Field, inputClass } from '@/components/ui/Modal';
import { Loading, LoadError } from '@/components/ui/Async';
import { api, useFetch, downloadFile } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import type { Transaction, Account, Category, TxType } from '@/lib/types';
import { formatCurrency, formatDate } from '@/lib/format';

type Filter = 'todos' | TxType;

const FILTERS: { key: Filter; label: string }[] = [
  { key: 'todos', label: 'Todos' },
  { key: 'receita', label: 'Entradas' },
  { key: 'despesa', label: 'Saídas' },
];

const EMPTY_FORM = {
  description: '',
  amount: '',
  type: 'despesa' as TxType,
  status: 'pago' as 'pago' | 'pendente',
  date: new Date().toISOString().slice(0, 10),
  accountId: '',
  category: '',
};

export function Transactions() {
  const { user } = useAuth();
  const canWrite = user?.role !== 'LEITURA';

  const { data: transactions, loading, error, reload } =
    useFetch<Transaction[]>('/transactions');
  const { data: accounts } = useFetch<Account[]>('/accounts');
  const { data: categories } = useFetch<Category[]>('/categories');

  const [filter, setFilter] = useState<Filter>('todos');
  const [query, setQuery] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

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

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setFormError(null);
    try {
      await api.post('/transactions', {
        ...form,
        amount: Number(form.amount),
        category: form.category || undefined,
      });
      setModalOpen(false);
      setForm(EMPTY_FORM);
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
              onClick={() => setModalOpen(true)}
              className="flex items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-2 text-sm font-semibold text-white hover:bg-brand-700"
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
                <th className="px-5 py-3 font-medium">Descrição</th>
                <th className="px-5 py-3 font-medium">Categoria</th>
                <th className="px-5 py-3 font-medium">Conta</th>
                <th className="px-5 py-3 font-medium">Data</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 text-right font-medium">Valor</th>
                {canWrite && <th className="px-3 py-3" aria-label="Ações" />}
              </tr>
            </thead>
            <tbody>
              {rows.map((t) => (
                <tr
                  key={t.id}
                  className="border-b border-hairline last:border-0 hover:bg-plane"
                >
                  <td className="px-5 py-3 font-medium text-ink">
                    {t.description}
                  </td>
                  <td className="px-5 py-3 text-ink-secondary">{t.category}</td>
                  <td className="px-5 py-3 text-ink-secondary">{t.account}</td>
                  <td className="px-5 py-3 tabular text-ink-secondary">
                    {formatDate(t.date)}
                  </td>
                  <td className="px-5 py-3">
                    <StatusBadge status={t.status} />
                  </td>
                  <td
                    className={`px-5 py-3 text-right tabular font-semibold ${
                      t.type === 'receita' ? 'text-[#006300]' : 'text-critical'
                    }`}
                  >
                    {t.type === 'receita' ? '+' : '−'}
                    {formatCurrency(t.amount)}
                  </td>
                  {canWrite && (
                    <td className="px-3 py-3 text-right">
                      <button
                        onClick={() => onDelete(t)}
                        className="text-ink-muted hover:text-critical"
                        aria-label={`Excluir ${t.description}`}
                        title="Excluir"
                      >
                        <Trash2 size={15} />
                      </button>
                    </td>
                  )}
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td
                    colSpan={canWrite ? 7 : 6}
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

      {/* Nova movimentação */}
      <Modal
        open={modalOpen}
        title="Nova movimentação"
        onClose={() => setModalOpen(false)}
      >
        <form onSubmit={onSubmit} className="space-y-4">
          <Field label="Descrição">
            <input
              required
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className={inputClass}
              placeholder="Ex.: Repasse convênio federal"
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Tipo">
              <select
                value={form.type}
                onChange={(e) =>
                  setForm({ ...form, type: e.target.value as TxType })
                }
                className={inputClass}
              >
                <option value="receita">Receita</option>
                <option value="despesa">Despesa</option>
              </select>
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

          <div className="grid grid-cols-2 gap-3">
            <Field label="Valor (R$)">
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
            <Field label="Data">
              <input
                required
                type="date"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
                className={inputClass}
              />
            </Field>
          </div>

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

          <Field label="Categoria">
            <input
              list="categorias"
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              className={inputClass}
              placeholder="Ex.: Projetos (nova categoria é criada)"
            />
            <datalist id="categorias">
              {(categories ?? []).map((c) => (
                <option key={c.id} value={c.name} />
              ))}
            </datalist>
          </Field>

          {formError && <p className="text-sm text-critical">{formError}</p>}

          <button
            type="submit"
            disabled={saving}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand-600 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-70"
          >
            {saving && <Loader2 size={16} className="animate-spin" />}
            Salvar movimentação
          </button>
        </form>
      </Modal>
    </div>
  );
}
