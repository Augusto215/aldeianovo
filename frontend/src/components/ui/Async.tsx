import { Loader2, AlertTriangle } from 'lucide-react';

/** Estados de carregamento e erro para dados vindos da API. */

export function Loading({ label = 'Carregando…' }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-16 text-sm text-ink-muted">
      <Loader2 size={18} className="animate-spin" />
      {label}
    </div>
  );
}

export function LoadError({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-sm">
      <AlertTriangle size={22} className="text-critical" />
      <p className="text-ink-secondary">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="rounded-lg border border-hairline px-3 py-1.5 text-sm font-medium text-ink-secondary hover:bg-plane"
        >
          Tentar novamente
        </button>
      )}
    </div>
  );
}
