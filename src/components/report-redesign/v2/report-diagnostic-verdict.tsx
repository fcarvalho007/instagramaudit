import { Bot } from "lucide-react";

import { cn } from "@/lib/utils";
import { ReportSourceLabel } from "./report-source-label";

interface Props {
  text: string;
  /**
   * `ai` = veredicto veio de `aiInsightsV2.sections.hero` (OpenAI).
   * `fallback` = síntese determinística construída a partir dos cálculos.
   * Determina o chip de proveniência mostrado no header.
   */
  source?: "ai" | "fallback";
}

/**
 * Caixa de veredicto editorial (azul/neutra) que abre o Bloco 02.
 * Sem alarmes vermelhos. Ícone Bot da Lucide. A cópia é decidida
 * pelo orquestrador do bloco: AI v2 quando existe, fallback
 * determinista, ou cópia segura quando o sinal é insuficiente.
 *
 * O chip de proveniência distingue claramente leitura IA de leitura
 * automática — ver `ReportSourceLabel`.
 */
export function ReportDiagnosticVerdict({ text, source = "fallback" }: Props) {
  const isAi = source === "ai";
  return (
    <aside
      aria-label="Veredicto editorial"
      className={cn(
        "rounded-2xl border border-accent-primary/20",
        "bg-tint-primary",
        "px-6 py-5 md:px-7 md:py-6",
        "shadow-card",
        "border-l-[3px] border-l-accent-primary",
      )}
    >
      <div className="flex items-start gap-3">
        <span
          aria-hidden
          className="shrink-0 inline-flex h-8 w-8 items-center justify-center rounded-lg bg-surface-secondary ring-1 ring-accent-primary/20 text-accent-primary"
        >
          <Bot className="size-4" />
        </span>
        <div className="min-w-0 space-y-1.5 flex-1">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <p className="text-eyebrow-sm text-accent-primary">
              Veredicto editorial
            </p>
            <ReportSourceLabel
              type={isAi ? "ia" : "auto"}
              detail={isAi ? "Síntese editorial" : "Síntese das classificações"}
            />
          </div>
          <p className="text-[15px] md:text-[16px] text-content-primary leading-relaxed">
            {text}
          </p>
        </div>
      </div>
    </aside>
  );
}
