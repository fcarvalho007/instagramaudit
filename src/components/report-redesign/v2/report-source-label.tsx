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

/** Mapeia tipo → tom visual (subtil; o azul fica reservado a interpretação/cálculo). */
function tone(type: ReportSourceType, caution: boolean): string {
  if (caution) {
    return "bg-amber-50 ring-amber-200 text-amber-800";
  }
  switch (type) {
    case "calculation":
    case "ai":
      return "bg-blue-50 ring-blue-200 text-blue-700";
    case "external":
      // Indigo subtil distingue "voz emprestada" da Knowledge Base
      // dos cálculos e leituras de IA próprias da InstaBench.
      return "bg-indigo-50 ring-indigo-200 text-indigo-700";
    case "extracted":
    case "automatic":
    default:
      return "bg-slate-50 ring-slate-200 text-slate-600";
  }
}

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
 * Estilo: mono uppercase, ~10–11px, tracking largo, pill discreto.
 * Pensado para conviver com títulos de cartão sem competir.
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
        tone(type, caution),
        className,
      )}
    >
      <Icon aria-hidden className="size-3 shrink-0" />
      <span className="truncate">
        {label.toUpperCase()}
        {detailText ? (
          <>
            <span className="mx-1.5 opacity-50">·</span>
            <span>{detailText}</span>
          </>
        ) : null}
      </span>
    </span>
  );
}
