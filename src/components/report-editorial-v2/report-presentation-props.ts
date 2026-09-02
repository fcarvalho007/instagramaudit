import type { ComponentProps } from "react";

import type { ReportShellV2 } from "@/components/report-redesign/v2/report-shell-v2";

/**
 * As duas variantes de apresentação recebem exactamente o mesmo contrato
 * de props de produção. Derivamos o tipo do shell existente para garantir
 * que não diverge.
 */
export type ReportPresentationProps = ComponentProps<typeof ReportShellV2>;

export type ReportDesign = "default" | "editorial_v2";

/** Normaliza o search param `?report_design=`. Qualquer outro valor cai no default. */
export function parseReportDesign(value: unknown): ReportDesign | undefined {
  return value === "editorial_v2" ? "editorial_v2" : undefined;
}
