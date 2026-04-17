/**
 * Local monthly quota system for free report requests.
 *
 * Stored in localStorage under the key:
 *   instabench:quota:{normalizedEmail}:{YYYY-MM}
 *
 * The month is encoded into the key so usage auto-resets on month change.
 *
 * ⚠️ KNOWN TECHNICAL DEBT — client-side enforcement only.
 *
 * The quota is currently enforced exclusively in the browser. A user clearing
 * localStorage (or using a different device/browser) can bypass the limit and
 * trigger additional `report_requests` rows on the backend. The server route
 * `/api/request-full-report` does NOT count or block by email/month yet.
 *
 * This is intentional for the current milestone (capture leads + premium UX)
 * and will be replaced by server-side enforcement (auth + per-email monthly
 * counter, likely via a Supabase function) in a dedicated future prompt.
 * Until then, treat any client-side quota signal as a UX hint, not a
 * security boundary.
 */

export const FREE_MONTHLY_LIMIT = 2;

const KEY_PREFIX = "instabench:quota";

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function getMonthKey(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

function buildStorageKey(email: string, monthKey: string): string {
  return `${KEY_PREFIX}:${normalizeEmail(email)}:${monthKey}`;
}

function safeGetStorage(): Storage | null {
  try {
    if (typeof window === "undefined") return null;
    return window.localStorage;
  } catch {
    return null;
  }
}

export function getQuotaUsage(email: string, date: Date = new Date()): number {
  const storage = safeGetStorage();
  if (!storage) return 0;
  try {
    const raw = storage.getItem(buildStorageKey(email, getMonthKey(date)));
    if (!raw) return 0;
    const parsed = parseInt(raw, 10);
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
  } catch {
    return 0;
  }
}

export function incrementQuota(email: string, date: Date = new Date()): number {
  const storage = safeGetStorage();
  const current = getQuotaUsage(email, date);
  const next = current + 1;
  if (!storage) return next;
  try {
    storage.setItem(buildStorageKey(email, getMonthKey(date)), String(next));
  } catch {
    // Storage unavailable (private mode, quota exceeded) — degrade silently.
  }
  return next;
}
