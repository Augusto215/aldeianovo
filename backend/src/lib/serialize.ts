/**
 * Serialização para o formato consumido pelo frontend:
 * enums em minúsculas, numeric (string) → number.
 */

type TxWithRelations = {
  id: string;
  date: string; // coluna `date` — já vem como 'YYYY-MM-DD'
  description: string;
  amount: string | number;
  type: 'RECEITA' | 'DESPESA';
  status: 'PAGO' | 'PENDENTE';
  accountId: string;
  categoryId: string | null;
  account: { name: string } | null;
  category: { name: string } | null;
  mes: string | null;
  financiador: string | null;
  favorecido: string | null;
  cpfCnpj: string | null;
  dossie: string | null;
};

export function txToJson(t: TxWithRelations) {
  return {
    id: t.id,
    date: t.date,
    description: t.description,
    category: t.category?.name ?? 'Sem categoria',
    account: t.account?.name ?? '',
    accountId: t.accountId,
    categoryId: t.categoryId,
    type: t.type.toLowerCase() as 'receita' | 'despesa',
    amount: Number(t.amount),
    status: t.status.toLowerCase() as 'pago' | 'pendente',
    mes: t.mes ?? '',
    financiador: t.financiador ?? '',
    favorecido: t.favorecido ?? '',
    cpfCnpj: t.cpfCnpj ?? '',
    dossie: t.dossie ?? '',
  };
}

export type AccountJson = {
  id: string;
  name: string;
  bank: string;
  type: 'corrente' | 'poupanca' | 'caixa';
  balance: number;
};

type AccountRow = {
  id: string;
  name: string;
  bank: string | null;
  type: 'CORRENTE' | 'POUPANCA' | 'CAIXA';
};

export function accountToJson(a: AccountRow, currentBalance: number): AccountJson {
  return {
    id: a.id,
    name: a.name,
    bank: a.bank ?? '—',
    type: a.type.toLowerCase() as AccountJson['type'],
    balance: currentBalance,
  };
}

const ROLE_LABEL: Record<string, string> = {
  ADMIN: 'Administrador',
  COORDENACAO: 'Coordenação',
  FINANCEIRO: 'Financeiro',
  LEITURA: 'Leitura',
};

type UserRow = {
  id: string;
  name: string;
  email: string;
  role: string;
  active: boolean;
};

export function userToJson(u: UserRow) {
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    roleLabel: ROLE_LABEL[u.role] ?? u.role,
    active: u.active,
  };
}
