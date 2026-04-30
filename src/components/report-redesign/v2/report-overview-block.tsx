import type { ReactNode } from "react";

import type { AdapterResult } from "@/lib/report/snapshot-to-report-data";
import type { AiInsightV2Section } from "@/lib/insights/types";
import { cn } from "@/lib/utils";

import { REDESIGN_TOKENS } from "../report-tokens";
import { ReportKpiGridV2 } from "./report-kpi-grid-v2";

interface Props {
  result: AdapterResult;
  /**
   * Renderer de insight v2 já provido pelo `ReportShellV2`. Mantém-se
   * a mesma assinatura — devolve `ReactNode | null` para a chave.
   */
  renderInsight: (key: AiInsightV2Section) => ReactNode;
}

/**
 * Composição visual do Bloco 01 · Overview (Phase 1B.1).
 *
 * Substitui o uso direto de `<ReportExecutiveSummary />` + `renderInsight("hero")`
 * dentro do `ReportBlockSection` "overview". O cabeçalho do block (eyebrow +
 * pergunta + subtítulo) continua a vir do `ReportBlockSection`, mas aqui
 * acrescentamos:
 *   - número decorativo "01" estilo editorial
 *   - KPI grid v2 (mais respiração e hierarquia)
 *   - frame editorial para o insight principal
 */
export function ReportOverviewBlock({ result, renderInsight }: Props) {
  const insightNode = renderInsight("hero");

  return (
    <div className="relative space-y-6 md:space-y-8">
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
        <ReportKpiGridV2 result={result} />
      </div>

      {insightNode ? (
        <div className="relative z-10 max-w-3xl mt-2">
          <p className={cn(REDESIGN_TOKENS.eyebrowAccent, "mb-3")}>
            Leitura principal
          </p>
          <div className={REDESIGN_TOKENS.insightFrameV2}>{insightNode}</div>
        </div>
      ) : null}
    </div>
  );
}