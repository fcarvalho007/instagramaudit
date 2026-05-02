import { cn } from "@/lib/utils";

export type ReportSourceType = "dados" | "mercado" | "auto" | "ia" | "pro";

interface Props {
  type: ReportSourceType;
  /** Texto curto para acessibilidade (não renderizado). */
  detail?: string;
  className?: string;
}

const LABEL: Record<ReportSourceType, string> = {
  dados: "⬡ DADOS",
  mercado: "◈ MERCADO",
  auto: "∿ AUTO",
  ia: "✦ IA",
  pro: "◆ PRO",
};

const A11Y: Record<ReportSourceType, string> = {
  dados: "Dados extraídos do perfil público",
  mercado: "Referência de mercado externa",
  auto: "Cálculo ou classificação automática",
  ia: "Leitura editorial por IA",
  pro: "Funcionalidade disponível na versão PRO",
};

/**
 * Micro-rótulo de proveniência unificado para todo o relatório V2.
 *
 * Quatro tipos:
 *   · dados   → dado público recolhido directamente do Instagram
 *   · mercado → referência da Knowledge Base (Buffer, Socialinsider…)
 *   · auto    → métrica calculada ou classificação determinística
 *   · ia      → texto/leitura gerado por IA
 *
 * Estilo: 10px, weight 500, tracking 0.08em, opacity 50%.
 * Sem fundo, sem ring, sem pill — puro metadata.
 */
export function ReportSourceLabel({
  type,
  detail,
  className,
}: Props) {
  const label = LABEL[type];
  const detailText = detail?.trim() || null;
  const a11y = detailText ? `${A11Y[type]} · ${detailText}` : A11Y[type];
  return (
    <span
      role="note"
      aria-label={a11y}
      title={a11y}
      className={cn(
        "inline-flex items-center",
        "text-[10px] font-medium tracking-[0.08em] leading-none",
        "text-slate-500 opacity-50",
        "whitespace-nowrap",
        className,
      )}
    >
      {label}
    </span>
  );
}
