import { Database, Calculator, Cpu, Bot, BookOpen } from "lucide-react";

import { cn } from "@/lib/utils";

export type ReportSourceType =
  | "extracted"
  | "calculation"
  | "automatic"
  | "ai"
  | "external";

interface Props {
  type: ReportSourceType;
  /** Texto curto à direita do label, ex.: "GOSTOS + COMENTÁRIOS". */
  detail?: string;
  /**
   * Quando `true` o chip apresenta-se com tom "atenção" (amber). Usar
   * apenas em leituras automáticas que sinalizam algo a corrigir.
   * Default: `false`.
   */
  caution?: boolean;
  className?: string;
}

const LABEL_PT: Record<ReportSourceType, string> = {
  extracted: "Dado extraído",
  calculation: "Cálculo",
  automatic: "Leitura automática",
  ai: "Leitura IA",
  external: "Referência externa",
};

const ICON: Record<ReportSourceType, typeof Database> = {
  extracted: Database,
  calculation: Calculator,
  automatic: Cpu,
  ai: Bot,
  external: BookOpen,
};

/**
 * Cor ÚNICA para todos os tipos. O chip vive em rodapé discreto e
 * nunca compete com títulos. A diferenciação é feita pelo ícone +
 * label, não pela cor. `caution` mantém-se como variante leve de aviso
 * (apenas borda) — opcional, raramente usada.
 */
const NEUTRAL_TONE =
  "bg-slate-50 ring-slate-200 text-slate-500";
const CAUTION_TONE =
  "bg-slate-50 ring-amber-300 text-slate-600";

/**
 * Micro-rótulo de proveniência usado em todo o relatório.
 *
 * Cinco tipos editoriais:
 *   · extracted   → dado público recolhido directamente do Instagram
 *   · calculation → métrica calculada pela InstaBench
 *   · automatic   → classificação determinística por regras internas
 *   · ai          → texto/leitura gerado por IA
 *   · external    → referência da Knowledge Base (Buffer, Socialinsider…)
 *
 * Estilo: mono uppercase, 10px, tracking largo, pill ultra-discreto
 * em tom slate único. Pensado para viver no rodapé dos cartões, nunca
 * a competir com títulos. O `detail` é guardado em `aria-label`/`title`
 * mas não renderizado visualmente — o chip mostra apenas tipo + ícone.
 */
export function ReportSourceLabel({
  type,
  detail,
  caution = false,
  className,
}: Props) {
  const Icon = ICON[type];
  const label = LABEL_PT[type];
  const detailText = detail?.trim() ? detail.trim().toUpperCase() : null;
  const a11y = detailText ? `${label} · ${detailText.toLowerCase()}` : label;
  return (
    <span
      role="note"
      aria-label={a11y}
      title={a11y}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full ring-1 px-2 py-0.5",
        "font-mono text-[10px] uppercase tracking-[0.16em] leading-none",
        "max-w-full whitespace-nowrap overflow-hidden text-ellipsis",
        (caution ? CAUTION_TONE : NEUTRAL_TONE),
        className,
      )}
    >
      <Icon aria-hidden className="size-3 shrink-0 opacity-70" />
      <span className="truncate">{label.toUpperCase()}</span>
    </span>
  );
}
