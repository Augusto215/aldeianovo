/**
 * Paleta categórica validada (skill dataviz) — atribuir por ordem fixa,
 * nunca ciclar. Cor segue a entidade, nunca o rank.
 */
export const CATEGORICAL = [
  '#2a78d6', // 1 blue
  '#1baf7a', // 2 aqua
  '#eda100', // 3 yellow
  '#008300', // 4 green
  '#4a3aa7', // 5 violet
  '#e34948', // 6 red
  '#e87ba4', // 7 magenta
  '#eb6834', // 8 orange
] as const;

/** Papéis semânticos usados nos gráficos de fluxo de caixa. */
export const SERIES = {
  receita: '#1baf7a', // entradas (aqua)
  despesa: '#e34948', // saídas (red)
  saldo: '#2a78d6', // saldo (blue)
} as const;

/** Cores de status — reservadas, nunca reutilizadas como série. */
export const STATUS = {
  good: '#0ca30c',
  warning: '#fab219',
  serious: '#ec835a',
  critical: '#d03b3b',
} as const;

/** Chrome dos gráficos. */
export const CHROME = {
  grid: '#e1e0d9',
  axis: '#c3c2b7',
  muted: '#898781',
} as const;
