/** Tipos dos dados retornados pela API (ver backend/src/lib/serialize.ts). */

export type TxType = 'receita' | 'despesa';
export type TxStatus = 'pago' | 'pendente';

export interface Transaction {
  id: string;
  date: string; // YYYY-MM-DD
  description: string;
  category: string;
  account: string;
  accountId: string;
  categoryId: string | null;
  type: TxType;
  amount: number;
  status: TxStatus;
}

export interface Account {
  id: string;
  name: string;
  bank: string;
  balance: number;
  type: 'corrente' | 'poupanca' | 'caixa';
}

export type Role = 'ADMIN' | 'COORDENACAO' | 'FINANCEIRO' | 'LEITURA';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  roleLabel: string;
  active: boolean;
}

export interface Category {
  id: string;
  name: string;
}

export interface CashFlowMonth {
  month: string;
  receita: number;
  despesa: number;
  saldo: number;
}

export interface Summary {
  kpis: {
    saldoTotal: number;
    receitaMes: number;
    despesaMes: number;
    resultadoMes: number;
    variacaoReceita: number | null;
    variacaoDespesa: number | null;
    pendencias: number;
    contas: number;
  };
  cashFlow: CashFlowMonth[];
  expensesByCategory: { category: string; value: number }[];
  recent: Transaction[];
}
