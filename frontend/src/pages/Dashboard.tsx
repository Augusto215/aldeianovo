import { Wallet, TrendingUp, TrendingDown, Scale } from 'lucide-react';
import { Card, CardHeader } from '@/components/ui/Card';
import { KpiCard } from '@/components/ui/KpiCard';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Loading, LoadError } from '@/components/ui/Async';
import { CashFlowChart } from '@/components/charts/CashFlowChart';
import { CategoryChart } from '@/components/charts/CategoryChart';
import { useFetch } from '@/lib/api';
import type { Summary } from '@/lib/types';
import { formatCurrency, formatDate } from '@/lib/format';

export function Dashboard() {
  const { data, loading, error, reload } = useFetch<Summary>('/reports/summary');

  if (loading) return <Loading />;
  if (error || !data) return <LoadError message={error ?? 'Erro ao carregar'} onRetry={reload} />;

  const { kpis, cashFlow, expensesByCategory, recent } = data;

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Saldo total"
          value={formatCurrency(kpis.saldoTotal)}
          icon={Wallet}
          hint={`em ${kpis.contas} conta${kpis.contas === 1 ? '' : 's'}`}
        />
        <KpiCard
          label="Receitas do mês"
          value={formatCurrency(kpis.receitaMes)}
          icon={TrendingUp}
          delta={kpis.variacaoReceita ?? undefined}
          deltaGoodWhenUp
        />
        <KpiCard
          label="Despesas do mês"
          value={formatCurrency(kpis.despesaMes)}
          icon={TrendingDown}
          delta={kpis.variacaoDespesa ?? undefined}
          deltaGoodWhenUp={false}
        />
        <KpiCard
          label="Resultado do mês"
          value={formatCurrency(kpis.resultadoMes)}
          icon={Scale}
          hint={`${kpis.pendencias} pendência${kpis.pendencias === 1 ? '' : 's'}`}
        />
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader
            title="Fluxo de caixa"
            subtitle={`Receitas e despesas — últimos ${cashFlow.length} meses`}
          />
          <div className="p-4">
            <CashFlowChart data={cashFlow} />
          </div>
        </Card>

        <Card>
          <CardHeader
            title="Despesas por categoria"
            subtitle="Mês corrente"
          />
          <div className="p-4">
            {expensesByCategory.length === 0 ? (
              <p className="py-16 text-center text-sm text-ink-muted">
                Sem despesas no mês.
              </p>
            ) : (
              <CategoryChart data={expensesByCategory} />
            )}
          </div>
        </Card>
      </div>

      {/* Transações recentes */}
      <Card>
        <CardHeader
          title="Movimentações recentes"
          subtitle="Últimas entradas e saídas"
          action={
            <a
              href="/transacoes"
              className="text-sm font-medium text-brand-600 hover:underline"
            >
              Ver todas
            </a>
          }
        />
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-hairline text-left text-xs uppercase tracking-wide text-ink-muted">
                <th className="px-5 py-3 font-medium">Descrição</th>
                <th className="px-5 py-3 font-medium">Categoria</th>
                <th className="px-5 py-3 font-medium">Data</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 text-right font-medium">Valor</th>
              </tr>
            </thead>
            <tbody>
              {recent.map((t) => (
                <tr
                  key={t.id}
                  className="border-b border-hairline last:border-0 hover:bg-plane"
                >
                  <td className="px-5 py-3 font-medium text-ink">
                    {t.description}
                  </td>
                  <td className="px-5 py-3 text-ink-secondary">{t.category}</td>
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
              {recent.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-5 py-10 text-center text-sm text-ink-muted">
                    Nenhuma movimentação registrada ainda.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
