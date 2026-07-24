-- Schema do Sistema de Gestão Integrado — rode este arquivo UMA VEZ no
-- SQL Editor do Supabase (painel do projeto → SQL Editor → New query).
-- Substitui as migrations do Prisma: o backend agora fala com o Postgres
-- via @supabase/supabase-js (API REST/PostgREST), não por conexão direta.

-- ─────────────────────────────────────────────────────────────
-- Enums
-- ─────────────────────────────────────────────────────────────

CREATE TYPE "Role" AS ENUM ('ADMIN', 'COORDENACAO', 'FINANCEIRO', 'LEITURA');
CREATE TYPE "AccountType" AS ENUM ('CORRENTE', 'POUPANCA', 'CAIXA');
CREATE TYPE "TxType" AS ENUM ('RECEITA', 'DESPESA');
CREATE TYPE "TxStatus" AS ENUM ('PAGO', 'PENDENTE');
CREATE TYPE "DocumentStatus" AS ENUM ('RASCUNHO', 'EM_REVISAO', 'APROVADO', 'CONGELADO', 'ARQUIVADO', 'DESCARTADO');
CREATE TYPE "AuditAction" AS ENUM ('VISUALIZOU', 'BAIXOU', 'EDITOU', 'ASSINOU', 'EXCLUIU');

-- ─────────────────────────────────────────────────────────────
-- Usuários e permissões (Etapa 1)
-- ─────────────────────────────────────────────────────────────

CREATE TABLE "User" (
    "id"                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "name"                 TEXT NOT NULL,
    "email"                TEXT NOT NULL,
    "passwordHash"         TEXT NOT NULL,
    "role"                 "Role" NOT NULL DEFAULT 'FINANCEIRO',
    "active"               BOOLEAN NOT NULL DEFAULT true,
    "createdAt"            timestamptz NOT NULL DEFAULT now(),
    "updatedAt"            timestamptz NOT NULL DEFAULT now(),
    "resetToken"           TEXT,
    "resetTokenExpiresAt"  timestamptz,
    "twoFactorEnabled"     BOOLEAN NOT NULL DEFAULT false,
    "twoFactorSecret"      TEXT,

    CONSTRAINT "User_email_key" UNIQUE ("email"),
    CONSTRAINT "User_resetToken_key" UNIQUE ("resetToken")
);

-- ─────────────────────────────────────────────────────────────
-- Financeiro (Etapa 1)
-- ─────────────────────────────────────────────────────────────

CREATE TABLE "Account" (
    "id"        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "name"      TEXT NOT NULL,
    "bank"      TEXT,
    "type"      "AccountType" NOT NULL DEFAULT 'CORRENTE',
    "balance"   DECIMAL(14,2) NOT NULL DEFAULT 0,
    "createdAt" timestamptz NOT NULL DEFAULT now(),
    "updatedAt" timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE "Category" (
    "id"   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,

    CONSTRAINT "Category_name_key" UNIQUE ("name")
);

CREATE TABLE "Transaction" (
    "id"          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "description" TEXT NOT NULL,
    "amount"      DECIMAL(14,2) NOT NULL,
    "type"        "TxType" NOT NULL,
    "status"      "TxStatus" NOT NULL DEFAULT 'PENDENTE',
    "date"        date NOT NULL DEFAULT CURRENT_DATE,
    "createdAt"   timestamptz NOT NULL DEFAULT now(),
    "accountId"   uuid NOT NULL REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    "categoryId"  uuid REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE,
    "userId"      uuid REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX "Transaction_date_idx" ON "Transaction"("date");
CREATE INDEX "Transaction_type_idx" ON "Transaction"("type");

-- ─────────────────────────────────────────────────────────────
-- GED — Gestão Eletrônica de Documentos (Etapa 2)
-- Modelagem prevista; implementação inicia após a Etapa 1.
-- ─────────────────────────────────────────────────────────────

CREATE TABLE "RetentionRule" (
    "id"             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "name"           TEXT NOT NULL,
    "docType"        TEXT NOT NULL,
    "retentionYears" INTEGER NOT NULL,
    "notifyOnExpiry" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "RetentionRule_name_key" UNIQUE ("name")
);

CREATE TABLE "Document" (
    "id"              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "status"          "DocumentStatus" NOT NULL DEFAULT 'RASCUNHO',
    "projectName"     TEXT NOT NULL,
    "funder"          TEXT NOT NULL,
    "docType"         TEXT NOT NULL,
    "issuedAt"        timestamptz NOT NULL,
    "validUntil"      timestamptz NOT NULL,
    "ocrText"         TEXT,
    "createdAt"       timestamptz NOT NULL DEFAULT now(),
    "updatedAt"       timestamptz NOT NULL DEFAULT now(),
    "ownerId"         uuid NOT NULL REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    "retentionRuleId" uuid REFERENCES "RetentionRule"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX "Document_projectName_idx" ON "Document"("projectName");
CREATE INDEX "Document_docType_idx" ON "Document"("docType");
CREATE INDEX "Document_validUntil_idx" ON "Document"("validUntil");

CREATE TABLE "DocumentVersion" (
    "id"         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "major"      INTEGER NOT NULL,
    "minor"      INTEGER NOT NULL,
    "approved"   BOOLEAN NOT NULL DEFAULT false,
    "filePath"   TEXT NOT NULL,
    "pdfaPath"   TEXT,
    "fileHash"   TEXT NOT NULL,
    "notes"      TEXT,
    "createdAt"  timestamptz NOT NULL DEFAULT now(),
    "documentId" uuid NOT NULL REFERENCES "Document"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    "authorId"   uuid NOT NULL REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,

    CONSTRAINT "DocumentVersion_documentId_major_minor_key" UNIQUE ("documentId", "major", "minor")
);

-- Trilha de auditoria: permanente e imutável. Sem updatedAt e sem exclusão —
-- a aplicação NÃO deve expor UPDATE/DELETE nesta tabela (nem para
-- administradores); reforçado abaixo revogando esses privilégios.
CREATE TABLE "AuditLog" (
    "id"         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "action"     "AuditAction" NOT NULL,
    "ipAddress"  TEXT NOT NULL,
    "createdAt"  timestamptz NOT NULL DEFAULT now(),
    "userId"     uuid NOT NULL REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    "documentId" uuid REFERENCES "Document"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");
CREATE INDEX "AuditLog_userId_idx" ON "AuditLog"("userId");
CREATE INDEX "AuditLog_documentId_idx" ON "AuditLog"("documentId");

-- ─────────────────────────────────────────────────────────────
-- updatedAt automático (substitui @updatedAt do Prisma)
-- ─────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW."updatedAt" = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "User_set_updated_at" BEFORE UPDATE ON "User"
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER "Account_set_updated_at" BEFORE UPDATE ON "Account"
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER "Document_set_updated_at" BEFORE UPDATE ON "Document"
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─────────────────────────────────────────────────────────────
-- Row Level Security — só o backend acessa (chave service_role,
-- que ignora RLS); anon/authenticated ficam sem nenhuma policy,
-- ou seja, sem acesso nenhum a estas tabelas.
-- ─────────────────────────────────────────────────────────────

ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Account" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Category" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Transaction" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Document" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "DocumentVersion" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AuditLog" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "RetentionRule" ENABLE ROW LEVEL SECURITY;

-- AuditLog: trilha imutável — mesmo o service_role (que ignora RLS) não deve
-- ter UPDATE/DELETE liberado por engano num código futuro.
REVOKE UPDATE, DELETE ON "AuditLog" FROM PUBLIC;
