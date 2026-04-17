/**
 * Local monthly quota system for free report requests.
 *
 * Stored in localStorage under the key:
 *   instabench:quota:{normalizedEmail}:{YYYY-MM}
 *
 * The month is encoded into the key so usage auto-resets on month change.
 * Designed to be swapped later for a Supabase-backed implementation
 * without changing the consumer surface.
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

export function getRemainingFree(email: string, date: Date = new Date()): number {
  return Math.max(0, FREE_MONTHLY_LIMIT - getQuotaUsage(email, date));
}
