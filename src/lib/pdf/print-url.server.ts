/**
 * Builds the absolute public URL the PDF provider must fetch.
 *
 * Resolution order for the base URL:
 *   1. `process.env.PDF_PUBLIC_BASE_URL` (explicit override)
 *   2. `https://instagramaudit.lovable.app` (stable production URL)
 *
 * The URL always points at the snapshot-keyed print route so the renderer
 * captures the exact persisted snapshot — never triggering a fresh
 * Apify/DataForSEO/OpenAI pipeline run.
 */

const DEFAULT_BASE = "https://instagramaudit.lovable.app";

function resolveBase(): string {
  const raw = (process.env.PDF_PUBLIC_BASE_URL ?? "").trim();
  if (!raw) return DEFAULT_BASE;
  return raw.replace(/\/$/, "");
}

export function buildSnapshotPrintUrl(snapshotId: string): string {
  if (!snapshotId) {
    throw new Error("buildSnapshotPrintUrl: snapshotId is required");
  }
  return `${resolveBase()}/report/print/${encodeURIComponent(snapshotId)}?pdf=1`;
}