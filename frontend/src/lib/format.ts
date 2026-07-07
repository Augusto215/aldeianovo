/** Utilitários de formatação (pt-BR). */

const brl = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
});

const brlCompact = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  notation: 'compact',
  maximumFractionDigits: 1,
});

const dateFmt = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
});

export const formatCurrency = (value: number) => brl.format(value);

export const formatCurrencyCompact = (value: number) => brlCompact.format(value);

export const formatDate = (iso: string) => dateFmt.format(new Date(iso));

export const formatPercent = (value: number) =>
  `${value > 0 ? '+' : ''}${value.toFixed(1)}%`;
