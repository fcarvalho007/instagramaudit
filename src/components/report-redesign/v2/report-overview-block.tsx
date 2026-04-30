import type { ReactNode } from "react";
import { Bot } from "lucide-react";

import type { AdapterResult } from "@/lib/report/snapshot-to-report-data";
import type { AiInsightV2Section } from "@/lib/insights/types";
import { cn } from "@/lib/utils";

import { REDESIGN_TOKENS } from "../report-tokens";
import { ReportOverviewCards } from "./report-overview-cards";

interface Props {
  result: AdapterResult;
  /**
   * Renderer de insight v2 já provido pelo `ReportShellV2`. Mantém-se
   * a mesma assinatura — devolve `ReactNode | null` para a chave.
   */
  renderInsight: (key: AiInsightV2Section) => ReactNode;
}

/**
 * Composição visual do Bloco 01 · Overview (Phase 1B.1F).
 *
 *  - watermark "01" decorativo (não empurra layout)
 *  - 3 cartões cinematográficos: Saúde do envolvimento, Ritmo, Motor
 *  - frame editorial "Leitura IA" com pista visual de IA
 */
export function ReportOverviewBlock({ result, renderInsight }: Props) {
  const insightNode = renderInsight("hero");

  return (
    <div className="relative space-y-8 md:space-y-10">
      {/* Watermark "01" — decorativo, não empurra layout. */}
      <div
        aria-hidden="true"
        className={cn(
          "hidden lg:block absolute -top-16 right-0 lg:right-2 z-0 select-none pointer-events-none",
          REDESIGN_TOKENS.blockNumberDecor,
        )}
      >
        01
      </div>

      <div className="relative z-10">
        <ReportOverviewCards result={result} />
      </div>

      {insightNode ? (
        <div className="relative z-10 max-w-3xl mt-2">
          <div className="mb-3 flex items-center gap-2">
            <span
              aria-hidden="true"
              className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-[linear-gradient(135deg,#EFF6FF,#DBEAFE)] text-blue-600 ring-1 ring-blue-100"
            >
              <Bot className="h-3.5 w-3.5" />
            </span>
            <p className={REDESIGN_TOKENS.eyebrowAccent}>Leitura IA</p>
          </div>
          <p className="mb-3 text-[13px] md:text-sm text-slate-500 leading-relaxed">
            Síntese gerada a partir dos dados públicos do perfil, da
            referência de mercado e dos sinais de procura externa.
          </p>
          <div className={REDESIGN_TOKENS.insightFrameV2}>{insightNode}</div>
        </div>
      ) : null}
    </div>
  );
}
