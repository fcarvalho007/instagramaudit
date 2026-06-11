import type { LucideIcon } from "lucide-react";
import type { VariantFeatures } from "@/lib/report/report-variant";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import {
  Eye,
  Stethoscope,
  TrendingUp,
  FileText,
  Search,
  BarChart3,
  Activity,
  CalendarClock,
  LayoutGrid,
  Star,
  Compass,
  ListChecks,
} from "lucide-react";

/**
 * Configuração estática dos 6 blocos da Phase 1A.
 * Fonte única de verdade para IDs, eyebrows, perguntas humanas
 * e subtítulos — usada por nav lateral, tabs mobile e block-shell.
 */

export interface BlockConfig {
  id: string;
  number: string;
  shortLabel: string;
  question: string;
  subtitle: string;
  /** Ícone Lucide para a bottom nav bar mobile. */
  icon: LucideIcon;
  /** Override do eyebrow renderizado no header do bloco. Quando ausente,
   *  o `ReportBlockSection` usa `shortLabel.toUpperCase()`. */
  eyebrowOverride?: string;
  /** Key in VariantFeatures that controls this block's visibility. */
  featureKey: keyof VariantFeatures;
  /** Commercial tier this block belongs to. `lab` = experimental,
   *  hidden from public and pro reports; only visible in internal_lab. */
  tier: "free" | "pro" | "lab";
}

export const BLOCKS: readonly BlockConfig[] = [
  {
    id: "overview",
    number: "01",
    shortLabel: "Visão geral",
    eyebrowOverride: "Visão geral",
    question: "Como está o perfil em geral?",
    subtitle:
      "Identidade do perfil, indicadores principais e enquadramento do que este relatório mostra.",
    icon: Eye,
    featureKey: "blockOverview",
    tier: "free",
  },
  {
    id: "diagnostico",
    number: "02",
    shortLabel: "Diagnóstico editorial",
    eyebrowOverride: "Diagnóstico editorial",
    question: "O que explica estes resultados?",
    subtitle:
      "Perguntas essenciais que qualquer marketer faz ao olhar para um perfil — respondidas pelo cruzamento dos dados recolhidos.",
    icon: Stethoscope,
    featureKey: "blockDiagnosis",
    tier: "pro",
  },
  {
    id: "performance",
    number: "03",
    shortLabel: "Desempenho",
    eyebrowOverride: "Desempenho",
    question: "Quando e como reage o público?",
    subtitle:
      "Evolução ao longo do tempo, ritmo de publicação e melhores momentos para chegar à audiência.",
    icon: TrendingUp,
    featureKey: "blockPerformance",
    tier: "lab",
  },
  {
    id: "conteudo",
    number: "04",
    shortLabel: "Conteúdo",
    question: "Que conteúdos têm melhor performance?",
    subtitle:
      "Publicações com mais retorno, mistura de formatos e padrões de linguagem editorial.",
    icon: FileText,
    featureKey: "blockContent",
    tier: "lab",
  },
  {
    id: "procura",
    number: "05",
    shortLabel: "Procura",
    question: "Há procura real por estes temas fora da plataforma?",
    subtitle:
      "Sinais de procura externa que ajudam a perceber se os mesmos temas têm interesse em pesquisa.",
    icon: Search,
    featureKey: "blockSearch",
    tier: "lab",
  },
  {
    id: "benchmark",
    number: "06",
    shortLabel: "Comparação",
    eyebrowOverride: "Comparação",
    question: "Como se compara com perfis semelhantes?",
    subtitle:
      "Posição face a referências de mercado e a perfis pares quando disponíveis.",
    icon: BarChart3,
    featureKey: "blockBenchmark",
    tier: "lab",
  },
] as const;

/**
 * Returns a localized copy of BLOCKS using the report namespace. Keeps
 * icon/id/featureKey from the static config and overrides text fields.
 */
export function useBlocks(): readonly BlockConfig[] {
  const { t } = useTranslation("report");
  return useMemo(() => {
    return BLOCKS.map((b) => ({
      ...b,
      shortLabel: t(`blocks.${b.id}.short`, { defaultValue: b.shortLabel }),
      question: t(`blocks.${b.id}.question`, { defaultValue: b.question }),
      subtitle: t(`blocks.${b.id}.subtitle`, { defaultValue: b.subtitle }),
      eyebrowOverride: b.eyebrowOverride
        ? t(`blocks.${b.id}.eyebrow`, { defaultValue: b.eyebrowOverride })
        : undefined,
    }));
  }, [t]);
}

// ── Commercial sidebar TOC (Free + Pro reports) ────────────────────
//
// These 7 entries are the user-facing structure of the commercial
// report. They are not "blocks" in the rendering sense — they are
// anchors pointing to cards already rendered inside the existing
// `overview` and `diagnostico` blocks. The lab-only blocks
// (performance, conteudo, procura, benchmark) NEVER appear here.

export type SectionTier = "free" | "pro";

export interface CommercialSection {
  id: string;
  number: string;
  shortLabel: string;
  tier: SectionTier;
  icon: LucideIcon;
}

export const COMMERCIAL_SECTIONS: readonly CommercialSection[] = [
  { id: "overview",              number: "01", shortLabel: "Visão geral",         tier: "free", icon: Eye },
  { id: "engagement",            number: "02", shortLabel: "Engagement",          tier: "free", icon: Activity },
  { id: "frequencia",            number: "03", shortLabel: "Cadência semanal", tier: "pro",  icon: CalendarClock },
  { id: "formatos",              number: "04", shortLabel: "Mix de formatos",     tier: "pro",  icon: LayoutGrid },
  { id: "publicacoes-chave",     number: "05", shortLabel: "Melhor vs pior publicação", tier: "pro",  icon: Star },
  { id: "diagnostico-editorial", number: "06", shortLabel: "Diagnóstico editorial", tier: "pro", icon: Stethoscope },
  { id: "prioridades",           number: "07", shortLabel: "Prioridades de acção", tier: "pro",  icon: ListChecks },
] as const;
