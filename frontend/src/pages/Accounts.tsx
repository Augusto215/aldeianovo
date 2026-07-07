import { useState, type FormEvent } from 'react';
import { Plus, Landmark, PiggyBank, Banknote, Loader2 } from 'lucide-react';
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
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setFormError(null);
    try {
      await api.post('/accounts', {
        name: form.name,
        bank: form.bank || undefined,
        type: form.type,
        balance: form.balance ? Number(form.balance) : 0,
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
            onClick={() => setModalOpen(true)}
            className="flex items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-2 text-sm font-semibold text-white hover:bg-brand-700"
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
            <Card key={a.id} className="p-5">
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
              <div className="mt-3 text-xl font-semibold tabular text-ink">
                {formatCurrency(a.balance)}
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

      {/* Nova conta */}
      <Modal open={modalOpen} title="Nova conta" onClose={() => setModalOpen(false)}>
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
            Criar conta
          </button>
        </form>
      </Modal>
    </div>
  );
}
