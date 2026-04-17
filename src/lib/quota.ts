/**
 * Quota constants + helpers shared by the report request flow.
 *
 * Source of truth for the monthly free-report limit lives now in the backend
 * (`/api/request-full-report`), which counts `report_requests` per
 * `lead_id + request_month` with `is_free_request = true` and decides the
 * outcome (`first_free` / `last_free` / `limit_reached`).
 *
 * This module only exposes the constant and a tiny normalization helper used
 * by both the frontend (for display + form normalization) and shared types.
 * No localStorage / no browser state — the previous client-side counter was
 * removed because it was trivially bypassable and is no longer authoritative.
 */

export const FREE_MONTHLY_LIMIT = 2;

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}
