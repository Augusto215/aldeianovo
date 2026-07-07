import { FileDown, FileText } from 'lucide-react';
import { Card, CardHeader } from '@/components/ui/Card';
import { Loading, LoadError } from '@/components/ui/Async';
import { useFetch, downloadFile } from '@/lib/api';
import type { Summary } from '@/lib/types';
import { formatCurrency } from '@/lib/format';

export function Reports() {
  const { data, loading, error, reload } = useFetch<Summary>('/reports/summary');

  if (loading) return <Loading />;
  if (error || !data) return <LoadError message={error ?? 'Erro ao carregar'} onRetry={reload} />;

  const cashFlow = data.cashFlow;

  return (
    <div className="space-y-6">
      {/* Ações de exportação */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Card className="flex items-center gap-3 p-5">
          <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
            <FileText size={18} />
          </span>
          <div className="min-w-0 flex-1">
            <div className="text-sm font-semibold text-ink">
              Fechamento mensal
            </div>
            <div className="text-xs text-ink-muted">
              Consolidado por mês (CSV)
            </div>
          </div>
          <button
            onClick={() =>
              downloadFile('/reports/export/monthly.csv', 'fechamento-mensal.csv')
            }
            className="rounded-lg border border-hairline px-2.5 py-1.5 text-xs font-medium text-ink-secondary hover:bg-plane"
          >
            Gerar
          </button>
        </Card>
        <Card className="flex items-center gap-3 p-5">
          <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
            <FileDown size={18} />
          </span>
          <div className="min-w-0 flex-1">
            <div className="text-sm font-semibold text-ink">
              Exportar movimentações
            </div>
            <div className="text-xs text-ink-muted">
              Histórico completo (CSV)
            </div>
          </div>
          <button
            onClick={() =>
              downloadFile('/reports/export/transactions.csv', 'movimentacoes.csv')
            }
            className="rounded-lg border border-hairline px-2.5 py-1.5 text-xs font-medium text-ink-secondary hover:bg-plane"
          >
            Exportar
          </button>
        </Card>
      </div>

      {/* Consolidado mensal */}
      <Card>
        <CardHeader
          title="Consolidado mensal"
          subtitle={`Receitas, despesas e resultado — últimos ${cashFlow.length} meses`}
        />
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-hairline text-left text-xs uppercase tracking-wide text-ink-muted">
                <th className="px-5 py-3 font-medium">Mês</th>
                <th className="px-5 py-3 text-right font-medium">Receitas</th>
                <th className="px-5 py-3 text-right font-medium">Despesas</th>
                <th className="px-5 py-3 text-right font-medium">Resultado</th>
              </tr>
            </thead>
            <tbody>
              {cashFlow.map((m, i) => (
                <tr
                  key={`${m.month}-${i}`}
                  className="border-b border-hairline last:border-0 hover:bg-plane"
                >
                  <td className="px-5 py-3 font-medium text-ink">{m.month}</td>
                  <td className="px-5 py-3 text-right tabular text-[#006300]">
                    {formatCurrency(m.receita)}
                  </td>
                  <td className="px-5 py-3 text-right tabular text-critical">
                    {formatCurrency(m.despesa)}
                  </td>
                  <td className="px-5 py-3 text-right tabular font-semibold text-ink">
                    {formatCurrency(m.saldo)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-hairline bg-plane">
                <td className="px-5 py-3 text-sm font-semibold text-ink">
                  Total
                </td>
                <td className="px-5 py-3 text-right tabular font-semibold text-[#006300]">
                  {formatCurrency(cashFlow.reduce((s, m) => s + m.receita, 0))}
                </td>
                <td className="px-5 py-3 text-right tabular font-semibold text-critical">
                  {formatCurrency(cashFlow.reduce((s, m) => s + m.despesa, 0))}
                </td>
                <td className="px-5 py-3 text-right tabular font-semibold text-ink">
                  {formatCurrency(cashFlow.reduce((s, m) => s + m.saldo, 0))}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </Card>
    </div>
  );
}
