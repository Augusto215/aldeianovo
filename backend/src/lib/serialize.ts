import type { Prisma } from '@prisma/client';

/**
 * Serialização para o formato consumido pelo frontend:
 * enums em minúsculas, Decimal → number e datas como YYYY-MM-DD.
 */

type TxWithRelations = Prisma.TransactionGetPayload<{
  include: { account: true; category: true };
}>;

export function txToJson(t: TxWithRelations) {
  return {
    id: t.id,
    date: t.date.toISOString().slice(0, 10),
    description: t.description,
    category: t.category?.name ?? 'Sem categoria',
    account: t.account.name,
    accountId: t.accountId,
    categoryId: t.categoryId,
    type: t.type.toLowerCase() as 'receita' | 'despesa',
    amount: Number(t.amount),
    status: t.status.toLowerCase() as 'pago' | 'pendente',
  };
}

export type AccountJson = {
  id: string;
  name: string;
  bank: string;
  type: 'corrente' | 'poupanca' | 'caixa';
  balance: number;
};

export function accountToJson(
  a: Prisma.AccountGetPayload<object>,
  currentBalance: number,
): AccountJson {
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

export function userToJson(u: Prisma.UserGetPayload<object>) {
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    roleLabel: ROLE_LABEL[u.role] ?? u.role,
    active: u.active,
  };
}
