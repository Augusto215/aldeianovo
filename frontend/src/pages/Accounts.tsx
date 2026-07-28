import { useState, type FormEvent } from 'react';
import { Plus, Landmark, PiggyBank, Banknote, Loader2, Pencil, Trash2 } from 'lucide-react';
import { Card, CardHeader } from '@/components/ui/Card';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Modal, Field, inputClass } from '@/components/ui/Modal';
import { Loading, LoadError } from '@/components/ui/Async';
import { api, useFetch } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import type { Account, Transaction } from '@/lib/types';
import { formatCurrency, formatDate } from '@/lib/format';

const ICONS = {
  corrente: Landmark,
  poupanca: PiggyBank,
  caixa: Banknote,
} as const;

const TIPO_LABEL: Record<Account['type'], string> = {
  corrente: 'Conta corrente',
  poupanca: 'Poupança / Reserva',
  caixa: 'Caixa',
};

const EMPTY_FORM = {
  name: '',
  bank: '',
  type: 'corrente' as Account['type'],
  balance: '',
};

export function Accounts() {
  const { user } = useAuth();
  const canWrite = user?.role !== 'LEITURA';

  const { data: accounts, loading, error, reload } = useFetch<Account[]>('/accounts');
  const { data: transactions } = useFetch<Transaction[]>('/transactions');

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Account | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  function openCreate() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setFormError(null);
    setModalOpen(true);
  }

  function openEdit(a: Account) {
    setEditing(a);
    setForm({
      name: a.name,
      bank: a.bank === '—' ? '' : a.bank,
      type: a.type,
      balance: String(a.initialBalance),
    });
    setFormError(null);
    setModalOpen(true);
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setFormError(null);
    try {
      const payload = {
        name: form.name,
        bank: form.bank || undefined,
        type: form.type,
        balance: form.balance ? Number(form.balance) : 0,
      };
      if (editing) {
        await api.put(`/accounts/${editing.id}`, payload);
      } else {
        await api.post('/accounts', payload);
      }
      setModalOpen(false);
      setEditing(null);
      setForm(EMPTY_FORM);
      reload();
    } catch (err) {
      setFormError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function onDelete(a: Account) {
    if (!window.confirm(`Excluir a conta "${a.name}"?`)) return;
    try {
      await api.del(`/accounts/${a.id}`);
      reload();
    } catch (err) {
      alert((err as Error).message);
    }
  }

  if (loading) return <Loading />;
  if (error || !accounts) return <LoadError message={error ?? 'Erro ao carregar'} onRetry={reload} />;

  const total = accounts.reduce((s, a) => s + a.balance, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm text-ink-muted">Saldo consolidado</div>
          <div className="text-2xl font-semibold tabular text-ink">
            {formatCurrency(total)}
          </div>
        </div>
        {canWrite && (
          <button
            onClick={openCreate}
            className="flex items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-700"
          >
            <Plus size={15} /> Nova conta
          </button>
        )}
      </div>

      {/* Cartões de contas */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {accounts.map((a) => {
          const Icon = ICONS[a.type];
          return (
            <Card key={a.id} className="group p-5">
              <div className="flex items-center justify-between">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
                  <Icon size={18} />
                </span>
                <span className="text-[11px] uppercase tracking-wide text-ink-muted">
                  {TIPO_LABEL[a.type]}
                </span>
              </div>
              <div className="mt-4 text-sm font-medium text-ink">{a.name}</div>
              <div className="text-xs text-ink-muted">{a.bank}</div>
              <div className="mt-3 flex items-end justify-between gap-2">
                <div className="text-xl font-semibold tabular text-ink">
                  {formatCurrency(a.balance)}
                </div>
                {canWrite && (
                  <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
                    <button
                      onClick={() => openEdit(a)}
                      className="rounded-md p-1.5 text-ink-muted transition-colors hover:bg-brand-50 hover:text-brand-700"
                      aria-label={`Editar conta ${a.name}`}
                      title="Editar"
                    >
                      <Pencil size={15} />
                    </button>
                    <button
                      onClick={() => onDelete(a)}
                      className="rounded-md p-1.5 text-ink-muted transition-colors hover:bg-critical/10 hover:text-critical"
                      aria-label={`Excluir conta ${a.name}`}
                      title="Excluir"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                )}
              </div>
            </Card>
          );
        })}
        {accounts.length === 0 && (
          <Card className="p-8 text-center text-sm text-ink-muted sm:col-span-2 xl:col-span-4">
            Nenhuma conta cadastrada.
          </Card>
        )}
      </div>

      {/* Transações por conta */}
      <Card>
        <CardHeader
          title="Últimas transações"
          subtitle="Movimentações vinculadas às contas"
        />
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-hairline text-left text-xs uppercase tracking-wide text-ink-muted">
                <th className="px-5 py-3 font-medium">Conta</th>
                <th className="px-5 py-3 font-medium">Descrição</th>
                <th className="px-5 py-3 font-medium">Data</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 text-right font-medium">Valor</th>
              </tr>
            </thead>
            <tbody>
              {(transactions ?? []).slice(0, 8).map((t) => (
                <tr
                  key={t.id}
                  className="border-b border-hairline last:border-0 hover:bg-plane"
                >
                  <td className="px-5 py-3 font-medium text-ink">{t.account}</td>
                  <td className="px-5 py-3 text-ink-secondary">
                    {t.description}
                  </td>
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
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Nova / editar conta */}
      <Modal
        open={modalOpen}
        title={editing ? 'Editar conta' : 'Nova conta'}
        onClose={() => setModalOpen(false)}
      >
        <form onSubmit={onSubmit} className="space-y-4">
          <Field label="Nome da conta">
            <input
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className={inputClass}
              placeholder="Ex.: Conta Movimento"
            />
          </Field>
          <Field label="Banco (opcional)">
            <input
              value={form.bank}
              onChange={(e) => setForm({ ...form, bank: e.target.value })}
              className={inputClass}
              placeholder="Ex.: Banco do Brasil"
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Tipo">
              <select
                value={form.type}
                onChange={(e) =>
                  setForm({ ...form, type: e.target.value as Account['type'] })
                }
                className={inputClass}
              >
                <option value="corrente">Conta corrente</option>
                <option value="poupanca">Poupança / Reserva</option>
                <option value="caixa">Caixa</option>
              </select>
            </Field>
            <Field label="Saldo inicial (R$)">
              <input
                type="number"
                step="0.01"
                value={form.balance}
                onChange={(e) => setForm({ ...form, balance: e.target.value })}
                className={inputClass}
                placeholder="0,00"
              />
            </Field>
          </div>

          {formError && <p className="text-sm text-critical">{formError}</p>}

          <button
            type="submit"
            disabled={saving}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand-600 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-70"
          >
            {saving && <Loader2 size={16} className="animate-spin" />}
            {editing ? 'Salvar alterações' : 'Criar conta'}
          </button>
        </form>
      </Modal>
    </div>
  );
}
