import type { TxStatus } from '@/lib/types';

/**
 * Badge de status — cor + rótulo (nunca cor sozinha), conforme regra de
 * status da skill dataviz.
 */
const MAP: Record<TxStatus, { label: string; className: string }> = {
  pago: {
    label: 'Pago',
    className: 'bg-good/10 text-[#0a7a0a] ring-good/30',
  },
  pendente: {
    label: 'Pendente',
    className: 'bg-warning/15 text-[#8a5a00] ring-warning/40',
  },
};

export function StatusBadge({ status }: { status: TxStatus }) {
  const s = MAP[status];
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${s.className}`}
    >
      {s.label}
    </span>
  );
}
