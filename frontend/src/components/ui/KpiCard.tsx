import { ArrowDownRight, ArrowUpRight, type LucideIcon } from 'lucide-react';
import { Card } from './Card';

interface KpiCardProps {
  label: string;
  value: string;
  icon: LucideIcon;
  delta?: number; // variação percentual
  deltaGoodWhenUp?: boolean; // se subir é bom (receita) ou ruim (despesa)
  hint?: string;
}

export function KpiCard({
  label,
  value,
  icon: Icon,
  delta,
  deltaGoodWhenUp = true,
  hint,
}: KpiCardProps) {
  const up = (delta ?? 0) >= 0;
  const isGood = deltaGoodWhenUp ? up : !up;
  const deltaColor = isGood ? 'text-[#006300]' : 'text-critical';

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wide text-ink-muted">
          {label}
        </span>
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
          <Icon size={16} strokeWidth={2} />
        </span>
      </div>
      <div className="mt-3 text-2xl font-semibold tabular text-ink">{value}</div>
      <div className="mt-1 flex items-center gap-1.5 text-xs">
        {delta !== undefined ? (
          <span className={`inline-flex items-center gap-0.5 font-medium ${deltaColor}`}>
            {up ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}
            {Math.abs(delta).toFixed(1)}%
          </span>
        ) : null}
        {hint && <span className="text-ink-muted">{hint}</span>}
      </div>
    </Card>
  );
}
