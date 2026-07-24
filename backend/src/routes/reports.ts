import { Router, type Response } from 'express';
import { supabase } from '../lib/supabase.js';
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
  const startColumn = start.toISOString().slice(0, 10);

  const [
    { data: accounts },
    { data: paidRows },
    { count: pendencias },
    { data: txRows },
    { data: recentRows },
  ] = await Promise.all([
    supabase.from('Account').select('*'),
    supabase.from('Transaction').select('type, amount').eq('status', 'PAGO'),
    supabase
      .from('Transaction')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'PENDENTE'),
    supabase
      .from('Transaction')
      .select('*, category:Category(*)')
      .gte('date', startColumn)
      .order('date', { ascending: true }),
    supabase
      .from('Transaction')
      .select('*, account:Account(*), category:Category(*)')
      .order('date', { ascending: false })
      .limit(6),
  ]);

  const accountsList = accounts ?? [];
  // A coluna `date` chega como 'YYYY-MM-DD'; convertida para Date (UTC) para
  // permitir os cálculos de mês abaixo (getUTCFullYear/getUTCMonth).
  const txs = (txRows ?? []).map((t) => ({ ...t, date: new Date(t.date) }));

  // Saldo real: saldo inicial das contas + receitas pagas − despesas pagas.
  const initial = accountsList.reduce((s, a) => s + Number(a.balance), 0);
  const paid = (paidRows ?? []).reduce<Record<string, number>>((acc, r) => {
    acc[r.type] = (acc[r.type] ?? 0) + Number(r.amount);
    return acc;
  }, {});
  const saldoTotal = initial + (paid.RECEITA ?? 0) - (paid.DESPESA ?? 0);

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
      pendencias: pendencias ?? 0,
      contas: accountsList.length,
    },
    cashFlow: flow,
    expensesByCategory: [...catCurrent.entries()]
      .map(([category, value]) => ({ category, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6),
    recent: (recentRows ?? []).map(txToJson),
  });
});

function sendCsv(res: Response, filename: string, lines: string[]) {
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  // BOM para o Excel reconhecer UTF-8
  return res.send('﻿' + lines.join('\n'));
}

// GET /api/reports/export/transactions.csv — exportação básica dos dados
reportsRouter.get('/export/transactions.csv', async (_req, res) => {
  const { data: rows, error } = await supabase
    .from('Transaction')
    .select('*, account:Account(*), category:Category(*)')
    .order('date', { ascending: false });
  if (error) return res.status(500).json({ error: 'Erro ao exportar' });

  const esc = (v: string) => `"${v.replace(/"/g, '""')}"`;
  const lines = [
    'data;descricao;categoria;conta;tipo;status;valor',
    ...(rows ?? []).map(txToJson).map((t) =>
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
  const startColumn = start.toISOString().slice(0, 10);

  const { data: txRows, error } = await supabase
    .from('Transaction')
    .select('date, type, amount')
    .gte('date', startColumn)
    .order('date', { ascending: true });
  if (error) return res.status(500).json({ error: 'Erro ao exportar' });

  const txs = (txRows ?? []).map((t) => ({ ...t, date: new Date(t.date) }));

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
