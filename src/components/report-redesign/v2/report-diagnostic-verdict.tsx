import { Bot } from "lucide-react";

import { cn } from "@/lib/utils";
import { ReportSourceLabel } from "./report-source-label";

interface Props {
  text: string;
  /**
   * `ai` = veredito veio de `aiInsightsV2.sections.hero` (OpenAI).
   * `fallback` = síntese determinística construída a partir dos cálculos.
   * Determina o chip de proveniência mostrado no header.
   */
  source?: "ai" | "fallback";
}

/**
 * Caixa de veredito editorial (azul/neutra) que abre o Bloco 02.
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
      aria-label="Veredito editorial"
      className={cn(
        "rounded-2xl border border-blue-200/70",
        "bg-[linear-gradient(180deg,#EFF4FF_0%,#F8FAFF_100%)]",
        "px-5 py-4 md:px-6 md:py-5",
        "shadow-[0_1px_2px_rgba(15,23,42,0.03)]",
        "border-l-4 border-l-blue-500",
      )}
    >
      <div className="flex items-start gap-3">
        <span
          aria-hidden
          className="shrink-0 inline-flex h-8 w-8 items-center justify-center rounded-lg bg-white ring-1 ring-blue-200 text-blue-600"
        >
          <Bot className="size-4" />
        </span>
        <div className="min-w-0 space-y-1.5 flex-1">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <p className="text-eyebrow-sm text-blue-700">
              Veredito editorial
            </p>
            <ReportSourceLabel
              type={isAi ? "ia" : "auto"}
              detail={isAi ? "Síntese editorial" : "Síntese das classificações"}
            />
          </div>
          <p className="text-[15px] md:text-base text-slate-800 leading-relaxed font-medium">
            {text}
          </p>
        </div>
      </div>
    </aside>
  );
}
