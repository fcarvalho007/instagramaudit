/**
 * Email link helpers — server-safe, no DB / no provider calls.
 *
 * `resolveReportUrl` prefere o link imutável `/reports/{report_snapshot_id}`
 * quando disponível e cai para `/analyze/{handle}` apenas em legacy ou quando
 * o report_snapshot ainda não foi persistido.
 */

import { signUnsubscribeToken } from "./unsubscribe-token.server";

const DEFAULT_BASE_URL = "https://auditprofiles.com";

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

/**
 * Server-only: returns the absolute URL for the public unsubscribe page,
 * carrying a signed token bound to a single lead. Safe to embed in
 * marketing emails; never include in transactional emails (report-ready,
 * personal-area-saved, request-received).
 */
export function buildUnsubscribeUrl(leadId: string): string {
  const token = signUnsubscribeToken(leadId);
  const base = resolveBaseUrl();
  return `${base}/unsubscribe?token=${encodeURIComponent(token)}`;
}