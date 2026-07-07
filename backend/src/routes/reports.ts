import { Router, type Response } from 'express';
import { prisma } from '../lib/prisma.js';
import { txToJson } from '../lib/serialize.js';

export const reportsRouter = Router();

const monthLabel = new Intl.DateTimeFormat('pt-BR', {
  month: 'short',
  timeZone: 'UTC',
});

function labelFor(d: Date) {
  const raw = monthLabel.format(d).replace('.', '');
  return raw.charAt(0).toUpperCase() + raw.slice(1);
}

/**
 * GET /api/reports/summary?months=8
 * KPIs, fluxo de caixa mensal, despesas por categoria (mês corrente)
 * e movimentações recentes — tudo que o dashboard/relatórios consomem.
 */
reportsRouter.get('/summary', async (req, res) => {
  const months = Math.min(Number(req.query.months) || 8, 24);
  const now = new Date();
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - (months - 1), 1));
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));

  const [accounts, paidSums, pendencias, txs, recentRows] = await Promise.all([
    prisma.account.findMany(),
    prisma.transaction.groupBy({
      by: ['type'],
      where: { status: 'PAGO' },
      _sum: { amount: true },
    }),
    prisma.transaction.count({ where: { status: 'PENDENTE' } }),
    prisma.transaction.findMany({
      where: { date: { gte: start } },
      include: { category: true },
      orderBy: { date: 'asc' },
    }),
    prisma.transaction.findMany({
      include: { account: true, category: true },
      orderBy: { date: 'desc' },
      take: 6,
    }),
  ]);

  // Saldo real: saldo inicial das contas + receitas pagas − despesas pagas.
  const initial = accounts.reduce((s, a) => s + Number(a.balance), 0);
  const paid = Object.fromEntries(
    paidSums.map((s) => [s.type, Number(s._sum.amount ?? 0)]),
  );
  const saldoTotal =
    initial + (paid.RECEITA ?? 0) - (paid.DESPESA ?? 0);

  // Fluxo de caixa mensal (últimos N meses).
  const cashFlow = Array.from({ length: months }, (_, i) => {
    const d = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + i, 1));
    return {
      key: `${d.getUTCFullYear()}-${d.getUTCMonth()}`,
      month: labelFor(d),
      receita: 0,
      despesa: 0,
    };
  });
  const byKey = new Map(cashFlow.map((m) => [m.key, m]));
  const catCurrent = new Map<string, number>();

  for (const t of txs) {
    const key = `${t.date.getUTCFullYear()}-${t.date.getUTCMonth()}`;
    const bucket = byKey.get(key);
    const amount = Number(t.amount);
    if (bucket) {
      if (t.type === 'RECEITA') bucket.receita += amount;
      else bucket.despesa += amount;
    }
    if (t.type === 'DESPESA' && t.date >= monthStart) {
      const name = t.category?.name ?? 'Sem categoria';
      catCurrent.set(name, (catCurrent.get(name) ?? 0) + amount);
    }
  }

  const flow = cashFlow.map(({ key: _key, ...m }) => ({
    ...m,
    saldo: m.receita - m.despesa,
  }));
  const current = flow.at(-1) ?? { receita: 0, despesa: 0, saldo: 0 };
  const previous = flow.at(-2);

  const variation = (cur: number, prev?: number) =>
    prev && prev !== 0 ? ((cur - prev) / prev) * 100 : null;

  return res.json({
    kpis: {
      saldoTotal,
      receitaMes: current.receita,
      despesaMes: current.despesa,
      resultadoMes: current.saldo,
      variacaoReceita: variation(current.receita, previous?.receita),
      variacaoDespesa: variation(current.despesa, previous?.despesa),
      pendencias,
      contas: accounts.length,
    },
    cashFlow: flow,
    expensesByCategory: [...catCurrent.entries()]
      .map(([category, value]) => ({ category, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6),
    recent: recentRows.map(txToJson),
  });
});

function sendCsv(res: Response, filename: string, lines: string[]) {
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  // BOM para o Excel reconhecer UTF-8
  return res.send('\uFEFF' + lines.join('\n'));
}

// GET /api/reports/export/transactions.csv — exportação básica dos dados
reportsRouter.get('/export/transactions.csv', async (_req, res) => {
  const rows = await prisma.transaction.findMany({
    include: { account: true, category: true },
    orderBy: { date: 'desc' },
  });
  const esc = (v: string) => `"${v.replace(/"/g, '""')}"`;
  const lines = [
    'data;descricao;categoria;conta;tipo;status;valor',
    ...rows.map(txToJson).map((t) =>
      [
        t.date,
        esc(t.description),
        esc(t.category),
        esc(t.account),
        t.type,
        t.status,
        t.amount.toFixed(2).replace('.', ','),
      ].join(';'),
    ),
  ];
  return sendCsv(res, 'movimentacoes.csv', lines);
});

// GET /api/reports/export/monthly.csv — fechamento mensal consolidado
reportsRouter.get('/export/monthly.csv', async (req, res) => {
  const months = Math.min(Number(req.query.months) || 8, 24);
  const now = new Date();
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - (months - 1), 1));

  const txs = await prisma.transaction.findMany({
    where: { date: { gte: start } },
    orderBy: { date: 'asc' },
  });

  const buckets = new Map<string, { receita: number; despesa: number }>();
  for (let i = 0; i < months; i++) {
    const d = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + i, 1));
    buckets.set(`${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`, {
      receita: 0,
      despesa: 0,
    });
  }
  for (const t of txs) {
    const key = `${t.date.getUTCFullYear()}-${String(t.date.getUTCMonth() + 1).padStart(2, '0')}`;
    const b = buckets.get(key);
    if (!b) continue;
    if (t.type === 'RECEITA') b.receita += Number(t.amount);
    else b.despesa += Number(t.amount);
  }

  const fmt = (n: number) => n.toFixed(2).replace('.', ',');
  const lines = [
    'mes;receitas;despesas;resultado',
    ...[...buckets.entries()].map(
      ([mes, b]) => `${mes};${fmt(b.receita)};${fmt(b.despesa)};${fmt(b.receita - b.despesa)}`,
    ),
  ];
  return sendCsv(res, 'fechamento-mensal.csv', lines);
});
