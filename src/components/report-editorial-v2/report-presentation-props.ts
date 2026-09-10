import type { ComponentProps } from "react";

import type { ReportShellV2 } from "@/components/report-redesign/v2/report-shell-v2";

/**
 * As duas variantes de apresentação recebem exactamente o mesmo contrato
 * de props de produção. Derivamos o tipo do shell existente para garantir
 * que não diverge.
 */
export type ReportPresentationProps = ComponentProps<typeof ReportShellV2>;

export type ReportDesign = "editorial_v2" | "legacy";

/**
 * Normaliza o recuo de apresentação. Editorial V2 é agora o padrão; apenas
 * `legacy` selecciona explicitamente o relatório anterior.
 */
export function parseReportDesign(value: unknown): ReportDesign | undefined {
  if (value === "editorial_v2" || value === "legacy") return value;
  return undefined;
}
