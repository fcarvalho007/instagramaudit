/**
 * Acções operacionais sobre reports do admin v2.
 *
 * STUB CLIENT-SIDE — nesta fase o admin opera sobre mock data e não
 * existem endpoints reais para `resend-report-email`, `regenerate-report-pdf`
 * nem a tabela de auditoria `report_actions`. Estas funções simulam latência
 * e devolvem `{ ok: true }` para que a UI (toasts, confirmações, estados de
 * loading) seja desenvolvida e validada exactamente como no fluxo final.
 *
 * Quando o backend existir, basta substituir o corpo de cada função por um
 * `fetch` para `/api/admin/reports/<id>/<acção>` (autenticado via cookie de
 * admin) — assinaturas e tipos de retorno mantêm-se.
 */

export type ReportActionResult =
  | { ok: true }
  | { ok: false; error: string };

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function resendReportEmail(
  _reportId: string,
): Promise<ReportActionResult> {
  await delay(800);
  return { ok: true };
}

export async function regenerateReportPdf(
  _reportId: string,
): Promise<ReportActionResult> {
  await delay(1200);
  return { ok: true };
}

export async function retryReportFull(
  _reportId: string,
): Promise<ReportActionResult> {
  await delay(1500);
  return { ok: true };
}