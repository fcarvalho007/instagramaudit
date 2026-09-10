import { signPrintToken } from "./print-token.server";
/**
 * Builds the absolute public URL the PDF provider must fetch.
 *
 * Resolution order for the base URL:
 *   1. `process.env.PDF_PUBLIC_BASE_URL` (explicit override)
 *   2. `https://auditprofiles.com` (stable production URL)
 *
 * The URL always points at the snapshot-keyed print route so the renderer
 * captures the exact persisted snapshot — never triggering a fresh
 * Apify/DataForSEO/OpenAI pipeline run.
 */

const DEFAULT_BASE = "https://auditprofiles.com";

function resolveBase(): string {
  const raw = (process.env.PDF_PUBLIC_BASE_URL ?? "").trim();
  if (!raw) return DEFAULT_BASE;
  return raw.replace(/\/$/, "");
}

export function buildSnapshotPrintUrl(snapshotId: string, access: "free" | "pro" = "free"): string {
  if (!snapshotId) {
    throw new Error("buildSnapshotPrintUrl: snapshotId is required");
  }
  return `${resolveBase()}/report/print/${encodeURIComponent(snapshotId)}?pdf=1&print_token=${signPrintToken(snapshotId, access)}`;
}
