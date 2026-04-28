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

/**
 * Build the deterministic storage path for the snapshot-keyed public PDF flow.
 *
 * Lives under a dedicated `public/snapshots/...` prefix so that it never
 * collides with the email-gated flow (`reports/...`). Year/month are derived
 * from the snapshot's own `created_at`, so the path is idempotent regardless
 * of when the user clicks "download".
 */
export function buildPublicSnapshotPdfPath(args: {
  snapshotId: string;
  createdAtIso: string;
}): string {
  const created = new Date(args.createdAtIso);
  const year = String(created.getUTCFullYear());
  const month = String(created.getUTCMonth() + 1).padStart(2, "0");
  return `public/snapshots/${year}/${month}/${args.snapshotId}.pdf`;
}

/**
 * Best-effort existence check using `storage.list()` with a search filter.
 * Returns `false` (and logs) on error so callers can fall back to rendering.
 */
export async function pdfExistsAtPath(path: string): Promise<boolean> {
  const lastSlash = path.lastIndexOf("/");
  const prefix = lastSlash >= 0 ? path.slice(0, lastSlash) : "";
  const filename = lastSlash >= 0 ? path.slice(lastSlash + 1) : path;

  const { data, error } = await supabaseAdmin.storage
    .from(REPORT_PDF_BUCKET)
    .list(prefix, { search: filename, limit: 1 });

  if (error) {
    console.error("[pdfExistsAtPath] list failed", error);
    return false;
  }
  return Array.isArray(data) && data.some((entry) => entry.name === filename);
}

/**
 * Wrap `createSignedUrl` so callers never construct signed URLs inline.
 * Bucket stays private; the URL is short-lived (default callers pass 300s).
 */
export async function signReportPdfUrl(
  path: string,
  ttlSeconds: number,
): Promise<{ ok: true; url: string } | { ok: false; message: string }> {
  const { data, error } = await supabaseAdmin.storage
    .from(REPORT_PDF_BUCKET)
    .createSignedUrl(path, ttlSeconds);

  if (error || !data?.signedUrl) {
    return { ok: false, message: error?.message ?? "Signed URL unavailable" };
  }
  return { ok: true, url: data.signedUrl };
}
