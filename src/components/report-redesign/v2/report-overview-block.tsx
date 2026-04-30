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
    <div className="space-y-8 md:space-y-10">
      {/* Número decorativo discreto, só desktop. Não é semântico. */}
      <div
        aria-hidden="true"
        className={cn(
          "hidden md:block -mt-4 mb-2",
          REDESIGN_TOKENS.blockNumberDecor,
        )}
      >
        01
      </div>

      <ReportKpiGridV2 result={result} />

      {insightNode ? (
        <div className="max-w-3xl">
          <p className={cn(REDESIGN_TOKENS.eyebrowAccent, "mb-3")}>
            Leitura principal
          </p>
          <div className={REDESIGN_TOKENS.insightFrameV2}>{insightNode}</div>
        </div>
      ) : null}
    </div>
  );
}