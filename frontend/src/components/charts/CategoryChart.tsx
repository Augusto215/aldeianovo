import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
} from 'recharts';
import { CATEGORICAL, CHROME } from '@/lib/colors';
import { formatCurrency, formatCurrencyCompact } from '@/lib/format';

function TooltipContent({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const p = payload[0];
  return (
    <div className="rounded-lg border border-hairline bg-white px-3 py-2 shadow-card">
      <div className="text-xs font-semibold text-ink">{p.payload.category}</div>
      <div className="tabular text-xs text-ink-secondary">
        {formatCurrency(p.value)}
      </div>
    </div>
  );
}

export function CategoryChart({
  data,
}: {
  data: { category: string; value: number }[];
}) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart
        data={data}
        layout="vertical"
        margin={{ top: 4, right: 16, left: 4, bottom: 0 }}
      >
        <CartesianGrid horizontal={false} stroke={CHROME.grid} />
        <XAxis
          type="number"
          tickLine={false}
          axisLine={false}
          tick={{ fill: CHROME.muted, fontSize: 12 }}
          tickFormatter={(v) => formatCurrencyCompact(v)}
        />
        <YAxis
          type="category"
          dataKey="category"
          tickLine={false}
          axisLine={false}
          width={92}
          tick={{ fill: CHROME.muted, fontSize: 12 }}
        />
        <Tooltip content={<TooltipContent />} cursor={{ fill: 'rgba(0,0,0,0.03)' }} />
        <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={20}>
          {data.map((_, i) => (
            <Cell key={i} fill={CATEGORICAL[i % CATEGORICAL.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
