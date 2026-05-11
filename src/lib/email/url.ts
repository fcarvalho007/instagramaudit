/**
 * Email link helpers — server-safe, no DB / no provider calls.
 *
 * `resolveReportUrl` prefere o link imutável `/reports/{report_snapshot_id}`
 * quando disponível e cai para `/analyze/{handle}` apenas em legacy ou quando
 * o report_snapshot ainda não foi persistido.
 */

const DEFAULT_BASE_URL = "https://instagramaudit.lovable.app";

function resolveBaseUrl(): string {
  const base = (
    process.env.PUBLIC_APP_BASE_URL ??
    process.env.PDF_PUBLIC_BASE_URL ??
    DEFAULT_BASE_URL
  ).trim();
  return base.replace(/\/+$/, "");
}

export function resolveReportUrl(
  handle: string,
  reportSnapshotId?: string | null,
): string {
  const base = resolveBaseUrl();
  const trimmedId = reportSnapshotId?.trim();
  if (trimmedId) {
    return `${base}/reports/${encodeURIComponent(trimmedId)}`;
  }
  const safeHandle = encodeURIComponent(handle.replace(/^@/, ""));
  return `${base}/analyze/${safeHandle}`;
}