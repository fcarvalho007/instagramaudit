/**
 * PDF storage helpers — wraps Supabase Storage with a deterministic naming
 * strategy. Bucket access is server-only via the service role admin client.
 */

import { supabaseAdmin } from "@/integrations/supabase/client.server";

export const REPORT_PDF_BUCKET = "report-pdfs";

/**
 * Build a deterministic, audit-friendly storage path from the report request.
 * Year/month come from `request_month` (start-of-month date), not from `now()`,
 * so regenerated PDFs land at the same path as the original.
 */
export function buildReportPath(args: {
  reportRequestId: string;
  requestMonth: string; // YYYY-MM-DD (date column)
}): string {
  const [year, month] = args.requestMonth.split("-");
  return `reports/${year}/${month}/${args.reportRequestId}.pdf`;
}

export async function uploadReportPdf(
  path: string,
  bytes: Uint8Array,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const { error } = await supabaseAdmin.storage
    .from(REPORT_PDF_BUCKET)
    .upload(path, bytes, {
      contentType: "application/pdf",
      cacheControl: "private, max-age=0, must-revalidate",
      upsert: true,
    });

  if (error) {
    return { ok: false, message: error.message };
  }
  return { ok: true };
}
