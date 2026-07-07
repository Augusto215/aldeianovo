import { Router } from 'express';

/**
 * GED — Gestão Eletrônica de Documentos (Etapa 2).
 * Esqueleto de rotas; a implementação inicia após a conclusão da Etapa 1.
 * Ver docs/ESPECIFICACAO.md e os modelos Document, DocumentVersion,
 * AuditLog e RetentionRule em prisma/schema.prisma.
 *
 * Requisitos ao implementar:
 * - Toda ação (visualizar, baixar, editar, assinar, excluir) grava AuditLog
 *   com usuário, data/hora e IP — trilha permanente e imutável.
 * - Metadados obrigatórios (projeto, financiador, tipo, emissão, vigência)
 *   validados antes de salvar.
 * - Apenas a versão aprovada fica visível; documentos finalizados congelados.
 * - Conversão automática para PDF/A e OCR para busca por palavras-chave.
 * - Regras de temporalidade com alerta à coordenação ao vencer.
 */
export const documentsRouter = Router();

const NOT_IMPLEMENTED = {
  error: 'Módulo GED (Etapa 2) — desenvolvimento inicia após a conclusão da Etapa 1.',
};

documentsRouter.get('/', (_req, res) => res.status(501).json(NOT_IMPLEMENTED));
documentsRouter.post('/', (_req, res) => res.status(501).json(NOT_IMPLEMENTED));
documentsRouter.get('/:id', (_req, res) => res.status(501).json(NOT_IMPLEMENTED));
documentsRouter.get('/:id/versions', (_req, res) => res.status(501).json(NOT_IMPLEMENTED));
documentsRouter.get('/:id/audit', (_req, res) => res.status(501).json(NOT_IMPLEMENTED));
