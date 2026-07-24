/**
 * Seed do banco — usuários, contas, categorias e movimentações de exemplo.
 * Rode com: npm run db:seed (idempotente: pode rodar mais de uma vez).
 */
import bcrypt from 'bcryptjs';
import { supabase } from '../lib/supabase.js';

type TxType = 'RECEITA' | 'DESPESA';
type TxStatus = 'PAGO' | 'PENDENTE';
type AccountType = 'CORRENTE' | 'POUPANCA' | 'CAIXA';

const ADMIN_EMAIL = 'admin@apoinme.org.br';
const ADMIN_PASSWORD = 'apoinme123';

async function main() {
  // ── Usuários ────────────────────────────────────────────────
  const password = await bcrypt.hash(ADMIN_PASSWORD, 10);
  const usersData = [
    { name: 'Administrador', email: ADMIN_EMAIL, role: 'ADMIN' as const },
    { name: 'Maria Tembé', email: 'maria@apoinme.org.br', role: 'COORDENACAO' as const },
    { name: 'João Pataxó', email: 'joao@apoinme.org.br', role: 'FINANCEIRO' as const },
    { name: 'Ana Xukuru', email: 'ana@apoinme.org.br', role: 'FINANCEIRO' as const },
    { name: 'Carlos Potiguara', email: 'carlos@apoinme.org.br', role: 'LEITURA' as const },
  ];
  for (const u of usersData) {
    const { data: existing } = await supabase
      .from('User')
      .select('id')
      .eq('email', u.email)
      .maybeSingle();
    if (!existing) {
      const { error } = await supabase
        .from('User')
        .insert({ ...u, passwordHash: password });
      if (error) throw error;
    }
  }
  const { data: admin, error: adminError } = await supabase
    .from('User')
    .select('id')
    .eq('email', ADMIN_EMAIL)
    .single();
  if (adminError || !admin) throw adminError ?? new Error('Admin não encontrado após seed');

  // ── Contas (balance = saldo inicial) ────────────────────────
  const accountsData: { name: string; bank: string | null; type: AccountType; balance: number }[] = [
    { name: 'Conta Movimento', bank: 'Banco do Brasil', type: 'CORRENTE', balance: 50000 },
    { name: 'Reserva Projetos', bank: 'Caixa Econômica', type: 'POUPANCA', balance: 80000 },
    { name: 'Fundo Emergencial', bank: 'Sicoob', type: 'POUPANCA', balance: 42000 },
    { name: 'Caixa Local', bank: null, type: 'CAIXA', balance: 2000 },
  ];
  const accounts: Record<string, string> = {};
  for (const a of accountsData) {
    const { data: existing } = await supabase
      .from('Account')
      .select('id')
      .eq('name', a.name)
      .maybeSingle();
    if (existing) {
      accounts[a.name] = existing.id;
    } else {
      const { data: created, error } = await supabase
        .from('Account')
        .insert(a)
        .select('id')
        .single();
      if (error || !created) throw error ?? new Error('Falha ao criar conta');
      accounts[a.name] = created.id;
    }
  }

  // ── Categorias ──────────────────────────────────────────────
  const categoryNames = ['Projetos', 'Pessoal', 'Logística', 'Eventos', 'Administrativo', 'Doações'];
  const categories: Record<string, string> = {};
  for (const name of categoryNames) {
    const { data: c, error } = await supabase
      .from('Category')
      .upsert({ name }, { onConflict: 'name' })
      .select('id')
      .single();
    if (error || !c) throw error ?? new Error('Falha ao criar categoria');
    categories[name] = c.id;
  }

  // ── Movimentações (últimos 8 meses) ─────────────────────────
  const { count } = await supabase
    .from('Transaction')
    .select('id', { count: 'exact', head: true });
  if (count && count > 0) {
    console.log('Transações já existem — seed de movimentações ignorado.');
    return;
  }

  const now = new Date();
  const month = (back: number, day: number) =>
    new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - back, day));

  type Row = [number, number, string, string, string, TxType, number, TxStatus];
  //          mesAtrás, dia, descrição, categoria, conta, tipo, valor, status
  const rows: Row[] = [
    // Mês corrente
    [0, 1, 'Repasse estadual', 'Projetos', 'Conta Movimento', 'RECEITA', 22000, 'PAGO'],
    [0, 3, 'Combustível — deslocamentos', 'Logística', 'Caixa Local', 'DESPESA', 1800, 'PAGO'],
    [0, 5, 'Venda de artesanato — feira', 'Doações', 'Caixa Local', 'RECEITA', 4300, 'PAGO'],
    [0, 10, 'Serviços contábeis', 'Administrativo', 'Conta Movimento', 'DESPESA', 2400, 'PAGO'],
    [0, 12, 'Hospedagem — encontro regional', 'Logística', 'Reserva Projetos', 'DESPESA', 6100, 'PAGO'],
    [0, 15, 'Emenda parlamentar', 'Projetos', 'Reserva Projetos', 'RECEITA', 30000, 'PENDENTE'],
    [0, 18, 'Aluguel sede', 'Administrativo', 'Conta Movimento', 'DESPESA', 5000, 'PENDENTE'],
    [0, 20, 'Material gráfico — cartilhas', 'Eventos', 'Caixa Local', 'DESPESA', 3100, 'PENDENTE'],
    [0, 22, 'Doação apoiadores', 'Doações', 'Conta Movimento', 'RECEITA', 12500, 'PAGO'],
    [0, 25, 'Passagens — assembleia', 'Logística', 'Reserva Projetos', 'DESPESA', 6200, 'PAGO'],
    [0, 27, 'Folha de pagamento', 'Pessoal', 'Conta Movimento', 'DESPESA', 24800, 'PAGO'],
    [0, 28, 'Repasse convênio federal', 'Projetos', 'Conta Movimento', 'RECEITA', 45000, 'PAGO'],
    // Meses anteriores (histórico para o fluxo de caixa)
    [1, 5, 'Repasse convênio federal', 'Projetos', 'Conta Movimento', 'RECEITA', 68000, 'PAGO'],
    [1, 8, 'Doação apoiadores', 'Doações', 'Conta Movimento', 'RECEITA', 42200, 'PAGO'],
    [1, 12, 'Folha de pagamento', 'Pessoal', 'Conta Movimento', 'DESPESA', 24500, 'PAGO'],
    [1, 15, 'Encontro de lideranças', 'Eventos', 'Reserva Projetos', 'DESPESA', 31000, 'PAGO'],
    [1, 20, 'Deslocamentos e logística', 'Logística', 'Caixa Local', 'DESPESA', 21000, 'PAGO'],
    [2, 4, 'Repasse estadual', 'Projetos', 'Conta Movimento', 'RECEITA', 60600, 'PAGO'],
    [2, 9, 'Emenda parlamentar', 'Projetos', 'Reserva Projetos', 'RECEITA', 35000, 'PAGO'],
    [2, 14, 'Folha de pagamento', 'Pessoal', 'Conta Movimento', 'DESPESA', 24500, 'PAGO'],
    [2, 18, 'Oficinas territoriais', 'Eventos', 'Reserva Projetos', 'DESPESA', 28800, 'PAGO'],
    [2, 24, 'Manutenção da sede', 'Administrativo', 'Conta Movimento', 'DESPESA', 23200, 'PAGO'],
    [3, 6, 'Repasse convênio federal', 'Projetos', 'Conta Movimento', 'RECEITA', 70400, 'PAGO'],
    [3, 10, 'Doação internacional', 'Doações', 'Conta Movimento', 'RECEITA', 32000, 'PAGO'],
    [3, 13, 'Folha de pagamento', 'Pessoal', 'Conta Movimento', 'DESPESA', 24200, 'PAGO'],
    [3, 17, 'Assembleia geral', 'Eventos', 'Reserva Projetos', 'DESPESA', 33500, 'PAGO'],
    [3, 25, 'Logística — territórios', 'Logística', 'Caixa Local', 'DESPESA', 14200, 'PAGO'],
    [4, 5, 'Repasse estadual', 'Projetos', 'Conta Movimento', 'RECEITA', 55300, 'PAGO'],
    [4, 11, 'Doação apoiadores', 'Doações', 'Conta Movimento', 'RECEITA', 33000, 'PAGO'],
    [4, 14, 'Folha de pagamento', 'Pessoal', 'Conta Movimento', 'DESPESA', 24100, 'PAGO'],
    [4, 19, 'Campanha de comunicação', 'Eventos', 'Conta Movimento', 'DESPESA', 22000, 'PAGO'],
    [4, 23, 'Deslocamentos', 'Logística', 'Caixa Local', 'DESPESA', 18000, 'PAGO'],
    [5, 7, 'Repasse convênio federal', 'Projetos', 'Conta Movimento', 'RECEITA', 88300, 'PAGO'],
    [5, 12, 'Folha de pagamento', 'Pessoal', 'Conta Movimento', 'DESPESA', 23900, 'PAGO'],
    [5, 16, 'Encontro regional', 'Eventos', 'Reserva Projetos', 'DESPESA', 25100, 'PAGO'],
    [5, 22, 'Manutenção administrativa', 'Administrativo', 'Conta Movimento', 'DESPESA', 15100, 'PAGO'],
    [6, 6, 'Repasse estadual', 'Projetos', 'Conta Movimento', 'RECEITA', 76800, 'PAGO'],
    [6, 13, 'Folha de pagamento', 'Pessoal', 'Conta Movimento', 'DESPESA', 23700, 'PAGO'],
    [6, 18, 'Oficinas de formação', 'Eventos', 'Reserva Projetos', 'DESPESA', 20300, 'PAGO'],
    [6, 24, 'Logística — assembleias', 'Logística', 'Caixa Local', 'DESPESA', 14200, 'PAGO'],
    [7, 8, 'Repasse convênio federal', 'Projetos', 'Conta Movimento', 'RECEITA', 84200, 'PAGO'],
    [7, 14, 'Folha de pagamento', 'Pessoal', 'Conta Movimento', 'DESPESA', 23500, 'PAGO'],
    [7, 19, 'Assembleia dos povos', 'Eventos', 'Reserva Projetos', 'DESPESA', 24800, 'PAGO'],
    [7, 26, 'Administrativo geral', 'Administrativo', 'Conta Movimento', 'DESPESA', 13500, 'PAGO'],
  ];

  const { error: txError } = await supabase.from('Transaction').insert(
    rows.map(([back, day, description, category, account, type, amount, status]) => ({
      description,
      amount,
      type,
      status,
      date: month(back, day).toISOString().slice(0, 10),
      accountId: accounts[account],
      categoryId: categories[category],
      userId: admin.id,
    })),
  );
  if (txError) throw txError;

  console.log(`✅ Seed concluído: ${rows.length} transações, ${accountsData.length} contas, ${usersData.length} usuários.`);
  console.log(`   Login: ${ADMIN_EMAIL} / ${ADMIN_PASSWORD}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
