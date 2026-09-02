import "@/styles/editorial-v2.css";

import { getVariantFeatures } from "@/lib/report/report-variant";

import { EditorialOverview } from "./overview/editorial-overview";
import type { ReportPresentationProps } from "./report-presentation-props";

/**
 * Camada de apresentação Editorial V2 — Fase A.
 *
 * Recebe exactamente as mesmas props de produção que o `ReportShellV2`
 * e aplica o mesmo gating de visibilidade da visão geral
 * (`features.blockOverview`). Nesta fase apenas a visão geral está
 * migrada; nenhuma outra secção, gráfico, fetch, selector, métrica ou
 * evento de analytics é introduzido.
 */
export function EditorialV2Shell({
  result,
  payload,
  variant = "public_mvp",
  featuresOverride,
}: ReportPresentationProps) {
  const features = featuresOverride ?? getVariantFeatures(variant);

  return (
    <div className="editorial-v2" data-report-design="editorial_v2">
      <div className="ev2-wrap">
        {features.blockOverview !== "hidden" && (
          <EditorialOverview result={result} payload={payload} />
        )}
      </div>
    </div>
  );
}
