# Sistema de Gestão Integrado — Especificação Completa

## Objetivo

Desenvolver uma plataforma integrada composta por dois módulos:

1. **Sistema Web de Gestão Financeira** (Etapa 1)
2. **Sistema de Gestão Eletrônica de Documentos — GED** (Etapa 2)

O módulo GED deve ser **integrado ao sistema financeiro** e iniciar **apenas
após a conclusão da primeira etapa**.

---

## ETAPA 1 — Sistema de Gestão Financeira

### Dashboard Financeiro
- Visão geral de receitas e despesas
- Indicadores financeiros (KPIs)
- Gráficos de movimentação financeira
- Resumo financeiro mensal
- Saldo atual

### Gestão de Receitas e Despesas
- Cadastro de receitas
- Cadastro de despesas
- Categorias financeiras
- Histórico completo das movimentações
- Pesquisa
- Filtros
- Controle por período

### Gestão Financeira
- Controle de saldo real
- Controle de contas
- Registro detalhado de transações
- Status de pagamento: **Pago** / **Pendente**

### Usuários
- Login
- Autenticação segura
- Recuperação de senha
- Perfis de acesso diferentes
- Controle de permissões

### Relatórios
- Relatório financeiro mensal
- Histórico consolidado
- Exportação básica dos dados

### Interface
- Painel administrativo
- Layout moderno
- Responsivo
- Compatível com computador, tablet e celular

---

## ETAPA 2 — Sistema GED (Gestão Eletrônica de Documentos)

### Auditoria

O sistema deve registrar automaticamente:

- Quem **visualizou**
- Quem **baixou**
- Quem **editou**
- Quem **assinou**
- Quem **excluiu**

Registrar também:

- Data
- Hora
- Endereço IP

O histórico deve ser:

- **Permanente**
- **Imutável**
- **Não pode ser apagado nem pelo administrador**

O sistema deve possuir **autenticação em dois fatores (2FA)**.

### Controle de Versões
- Versionamento (v1.0, v1.1, v2.0…)
- Apenas a versão **aprovada** fica visível
- Histórico completo das alterações
- Documentos finalizados ficam **congelados**
- Conversão automática para **PDF/A**

### Metadados Obrigatórios

Antes de salvar um documento, exigir:

- Nome do projeto
- Financiador
- Tipo de documento
- Data de emissão
- Vigência

### OCR

Documentos digitalizados devem possuir OCR para permitir pesquisa por
palavras-chave.

### Temporalidade

Permitir configurar regras como:

- Documentos financeiros guardados por **10 anos**

Após o vencimento:

- Avisar automaticamente a coordenação
- Permitir descarte seguro
- Permitir arquivamento definitivo

---

## Requisitos Gerais

### Segurança
- Login seguro
- Controle de permissões
- Autenticação em dois fatores (2FA)
- Registro completo de auditoria
- Histórico imutável
- Conformidade com a **LGPD**

### Interface
- Moderna
- Responsiva
- Fácil utilização
- Compatível com desktop e dispositivos móveis

### Relatórios
- Financeiros
- Históricos
- Exportação de dados

### Funcionalidades Gerais
- Dashboard
- Cadastro de receitas
- Cadastro de despesas
- Controle de saldo
- Controle de contas
- Pesquisa
- Filtros
- Gestão documental
- OCR
- Versionamento
- Auditoria
- Controle de usuários
- Controle de permissões
- Histórico completo
- Conversão para PDF/A
- Regras de retenção documental
- Alertas automáticos
