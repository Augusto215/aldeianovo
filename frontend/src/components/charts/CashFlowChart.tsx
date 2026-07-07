import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import type { CashFlowMonth } from '@/lib/types';
import { SERIES, CHROME } from '@/lib/colors';
import { formatCurrency, formatCurrencyCompact } from '@/lib/format';

function TooltipContent({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-hairline bg-white px-3 py-2 shadow-card">
      <div className="mb-1 text-xs font-semibold text-ink">{label}</div>
      {payload.map((p: any) => (
        <div key={p.dataKey} className="flex items-center gap-2 text-xs">
          <span
            className="h-2 w-2 rounded-full"
            style={{ backgroundColor: p.color }}
          />
          <span className="capitalize text-ink-secondary">{p.dataKey}</span>
          <span className="ml-auto tabular font-medium text-ink">
            {formatCurrency(p.value)}
          </span>
        </div>
      ))}
    </div>
  );
}

export function CashFlowChart({ data }: { data: CashFlowMonth[] }) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: 4, bottom: 0 }}>
        <defs>
          <linearGradient id="gReceita" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={SERIES.receita} stopOpacity={0.18} />
            <stop offset="100%" stopColor={SERIES.receita} stopOpacity={0} />
          </linearGradient>
          <linearGradient id="gDespesa" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={SERIES.despesa} stopOpacity={0.16} />
            <stop offset="100%" stopColor={SERIES.despesa} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} stroke={CHROME.grid} strokeDasharray="0" />
        <XAxis
          dataKey="month"
          tickLine={false}
          axisLine={{ stroke: CHROME.axis }}
          tick={{ fill: CHROME.muted, fontSize: 12 }}
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          width={52}
          tick={{ fill: CHROME.muted, fontSize: 12 }}
          tickFormatter={(v) => formatCurrencyCompact(v)}
        />
        <Tooltip content={<TooltipContent />} cursor={{ stroke: CHROME.axis }} />
        <Legend
          iconType="circle"
          iconSize={8}
          formatter={(value) => (
            <span className="text-xs capitalize text-ink-secondary">{value}</span>
          )}
        />
        <Area
          type="monotone"
          dataKey="receita"
          stroke={SERIES.receita}
          strokeWidth={2}
          fill="url(#gReceita)"
          dot={false}
          activeDot={{ r: 4 }}
        />
        <Area
          type="monotone"
          dataKey="despesa"
          stroke={SERIES.despesa}
          strokeWidth={2}
          fill="url(#gDespesa)"
          dot={false}
          activeDot={{ r: 4 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
