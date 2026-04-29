import type { AdapterResult } from "@/lib/report/snapshot-to-report-data";

import { ReportKpiGrid } from "./report-kpi-grid";

interface Props {
  result: AdapterResult;
}

/**
 * Wrapper fino que mantém a API existente (`ReportShell` já importa este
 * ficheiro) e delega para o novo `ReportKpiGrid` Iconosquare-style.
 */
export function ReportExecutiveSummary({ result }: Props) {
  return <ReportKpiGrid result={result} />;
}