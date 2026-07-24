# Projeto Aldeia — Sistema de Gestão Integrado (APOINME)

Plataforma integrada para a **APOINME — Articulação dos Povos Indígenas do
Nordeste, Minas Gerais e Espírito Santo**, composta por dois módulos:

| Etapa | Módulo | Situação |
|---|---|---|
| **1** | Sistema Web de Gestão Financeira | Em desenvolvimento (MVP navegável) |
| **2** | Sistema GED — Gestão Eletrônica de Documentos | Inicia após a conclusão da Etapa 1 |

O módulo GED será **integrado ao sistema financeiro** e só entra em
desenvolvimento após a conclusão da primeira etapa. A especificação completa
está em [docs/ESPECIFICACAO.md](docs/ESPECIFICACAO.md).

> A Etapa 1 é **funcional de ponta a ponta**: autenticação com JWT + bcrypt,
> CRUD de transações/contas/categorias/usuários, relatórios e exportação CSV,
> com dados persistidos em **PostgreSQL (Supabase)** via `@supabase/supabase-js`.

## Estrutura

```
projeto-aldeia/
├── frontend/        # React + Vite + TypeScript + Tailwind + Recharts
├── backend/         # Node + Express + TypeScript + @supabase/supabase-js (esqueleto)
│   └── sql/schema.sql  # DDL — rodar uma vez no SQL Editor do Supabase
├── docs/            # Especificação completa do sistema
├── package.json     # workspaces (frontend + backend)
└── README.md
```

## Etapa 1 — Gestão Financeira

| Módulo | Descrição |
|---|---|
| **Dashboard Financeiro** | Visão geral de receitas/despesas, KPIs, gráficos, resumo mensal e saldo atual |
| **Entradas e Saídas** | Cadastro de receitas e despesas, categorias, histórico, pesquisa, filtros e controle por período |
| **Gestão de Contas** | Controle de saldo real, múltiplas contas, transações detalhadas e status de pagamento (Pago/Pendente) |
| **Relatórios e Exportação** | Relatório financeiro mensal, histórico consolidado e exportação básica |
| **Controle de Usuários** | Login, autenticação segura, recuperação de senha, perfis de acesso e permissões |

## Etapa 2 — GED (após conclusão da Etapa 1)

| Módulo | Descrição |
|---|---|
| **Auditoria** | Registro automático e imutável de quem visualizou, baixou, editou, assinou e excluiu (data, hora e IP) — inapagável até pelo administrador |
| **Controle de Versões** | Versionamento (v1.0, v1.1…), apenas versão aprovada visível, documentos finalizados congelados, conversão automática para PDF/A |
| **Metadados Obrigatórios** | Projeto, financiador, tipo de documento, data de emissão e vigência exigidos antes de salvar |
| **OCR** | Pesquisa por palavras-chave em documentos digitalizados |
| **Temporalidade** | Regras de retenção (ex.: financeiros por 10 anos), alerta automático à coordenação, descarte seguro ou arquivamento definitivo |
| **Segurança** | Autenticação em dois fatores (2FA) e conformidade com a LGPD |

## Como rodar

Requisitos: **Node 20+** e um projeto no [Supabase](https://supabase.com) (plano gratuito serve).

```bash
# 1. Instalar dependências (raiz + workspaces)
npm install

# 2. Configurar o banco (Supabase)
cp backend/.env.example backend/.env
# → edite backend/.env e cole SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY
#   do seu projeto (painel do Supabase: Project Settings → API)

# 3. Criar as tabelas (uma vez, no SQL Editor do painel do Supabase,
#    colando o conteúdo de backend/sql/schema.sql) e popular com dados de exemplo
npm run db:seed

# 4. Rodar a API
npm run dev:api        # http://localhost:3333

# 5. Rodar o frontend (em outro terminal)
npm run dev            # http://localhost:5173
```

> Login inicial (criado pelo seed): **admin@apoinme.org.br** / **apoinme123**
> — troque a senha após o primeiro acesso.

### Notas

- **Recuperação de senha:** o token é gerado pela API; enquanto não há
  serviço de e-mail configurado, o link aparece no log do servidor.
- **Permissões:** ADMIN gerencia usuários; ADMIN/COORDENACAO/FINANCEIRO
  criam e editam dados financeiros; LEITURA apenas visualiza.
- **Saldo real:** saldo inicial da conta + receitas pagas − despesas pagas.
  Transações pendentes não afetam o saldo.

## Próximos passos

### Etapa 1
- [x] Conectar o frontend à API real
- [x] Autenticação JWT + recuperação de senha (link por e-mail pendente)
- [x] Banco modelado no Supabase (PostgreSQL) via `@supabase/supabase-js`
- [x] CRUD de transações, contas e usuários
- [x] Relatórios e exportação CSV
- [ ] Serviço de e-mail (recuperação de senha / notificações)
- [ ] Deploy em nuvem

### Etapa 2 (GED — inicia após a Etapa 1)
- [ ] Upload e armazenamento de documentos com metadados obrigatórios
- [ ] Trilha de auditoria imutável (visualização, download, edição, assinatura, exclusão)
- [ ] Autenticação em dois fatores (2FA)
- [ ] Versionamento com aprovação e congelamento de documentos finalizados
- [ ] Conversão automática para PDF/A
- [ ] OCR e busca por palavras-chave
- [ ] Regras de temporalidade, alertas e descarte seguro/arquivamento

## Stack

- **Frontend:** React 18, Vite, TypeScript, Tailwind CSS, React Router, Recharts, lucide-react
- **Backend:** Node.js, Express, TypeScript, Supabase (`@supabase/supabase-js`), PostgreSQL, JWT
