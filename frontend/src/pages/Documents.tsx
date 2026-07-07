import {
  ScrollText,
  GitBranch,
  Tags,
  ScanSearch,
  CalendarClock,
  ShieldCheck,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';

/**
 * GED — Gestão Eletrônica de Documentos (Etapa 2).
 * O desenvolvimento inicia após a conclusão da Etapa 1 (gestão financeira).
 * Esta página apresenta o escopo planejado (ver docs/ESPECIFICACAO.md).
 */
const MODULES = [
  {
    icon: ScrollText,
    title: 'Auditoria',
    items: [
      'Registro automático de quem visualizou, baixou, editou, assinou e excluiu',
      'Data, hora e endereço IP de cada ação',
      'Histórico permanente e imutável — inapagável até pelo administrador',
    ],
  },
  {
    icon: GitBranch,
    title: 'Controle de Versões',
    items: [
      'Versionamento (v1.0, v1.1, v2.0…)',
      'Apenas a versão aprovada fica visível',
      'Documentos finalizados ficam congelados',
      'Conversão automática para PDF/A',
    ],
  },
  {
    icon: Tags,
    title: 'Metadados Obrigatórios',
    items: [
      'Nome do projeto e financiador',
      'Tipo de documento',
      'Data de emissão e vigência',
      'Exigidos antes de salvar qualquer documento',
    ],
  },
  {
    icon: ScanSearch,
    title: 'OCR',
    items: [
      'Reconhecimento de texto em documentos digitalizados',
      'Pesquisa por palavras-chave no conteúdo',
    ],
  },
  {
    icon: CalendarClock,
    title: 'Temporalidade',
    items: [
      'Regras de retenção (ex.: financeiros por 10 anos)',
      'Alerta automático à coordenação ao vencer',
      'Descarte seguro ou arquivamento definitivo',
    ],
  },
  {
    icon: ShieldCheck,
    title: 'Segurança',
    items: [
      'Autenticação em dois fatores (2FA)',
      'Controle de permissões por perfil',
      'Conformidade com a LGPD',
    ],
  },
];

export function Documents() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-ink-muted">
          Gestão Eletrônica de Documentos integrada ao sistema financeiro.
        </p>
        <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-warning/15 px-2.5 py-1 text-xs font-medium text-[#8a5a00] ring-1 ring-inset ring-warning/40">
          Etapa 2 — inicia após a conclusão da Etapa 1
        </span>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {MODULES.map(({ icon: Icon, title, items }) => (
          <Card key={title} className="p-5">
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-50 text-brand-700">
                <Icon size={18} />
              </span>
              <h2 className="text-sm font-semibold text-ink">{title}</h2>
            </div>
            <ul className="mt-3 space-y-1.5 text-sm text-ink-secondary">
              {items.map((item) => (
                <li key={item} className="flex gap-2">
                  <span className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-brand-500" />
                  {item}
                </li>
              ))}
            </ul>
          </Card>
        ))}
      </div>
    </div>
  );
}
