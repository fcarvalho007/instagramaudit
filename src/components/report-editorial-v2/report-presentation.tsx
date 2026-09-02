import { ReportShellV2 } from "@/components/report-redesign/v2/report-shell-v2";

import { EditorialV2Shell } from "./editorial-v2-shell";
import type { ReportDesign, ReportPresentationProps } from "./report-presentation-props";

/**
 * Interruptor de apresentação. Único ponto de decisão entre o relatório
 * de produção (default) e a fundação Editorial V2. Ambas as variantes
 * recebem as MESMAS props — nenhum fetch, selector, entitlement ou evento
 * de analytics é introduzido aqui.
 */
export function ReportPresentation({
  design,
  ...props
}: ReportPresentationProps & { design?: ReportDesign }) {
  if (design === "editorial_v2") {
    return <EditorialV2Shell {...props} />;
  }
  return <ReportShellV2 {...props} />;
}
