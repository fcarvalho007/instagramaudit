/**
 * Cache-state probe for the period-consume dialog.
 *
 * Lets the Pro sidebar show "open cached analysis (0 credits)" vs
 * "generate new analysis (1 credit)" without performing a provider call.
 * Read-only and side-effect free: never writes credit_ledger, never
 * triggers Apify, never logs an analysis_event.
 *
 * Authorization: returns `hasFreshCache: false` for any caller without a
 * `lead_session` cookie OR without the `report_full_9` entitlement, so
 * Free users can never use this endpoint to enumerate cache state.
 */

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const InputSchema = z.object({
  handle: z.string().min(1).max(100),
  competitors: z.array(z.string().min(1).max(100)).max(2).default([]),
  window: z.enum(["30d", "90d"]),
});

export interface PeriodCacheState {
  /** Cache exists AND is within the fresh-reuse window. */
  hasFreshCache: boolean;
  /** Snapshot age in milliseconds, or null when no snapshot. */
  ageMs: number | null;
  /** Snapshot id when present (for admin diagnostics, not used by the UI). */
  snapshotId: string | null;
  /** True when this lead already owns the cached report (no credit needed). */
  alreadyOwned: boolean;
  /** Current credit balance — saves the caller a second round-trip. */
  balance: number;
}

export const getPeriodCacheState = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => InputSchema.parse(data))
  .handler(async ({ data }): Promise<PeriodCacheState> => {
    try {
      const { getLeadFromCookie } = await import(
        "@/lib/leads/lead-cookie.server"
      );
      const leadId = getLeadFromCookie();
      const empty: PeriodCacheState = {
        hasFreshCache: false,
        ageMs: null,
        snapshotId: null,
        alreadyOwned: false,
        balance: 0,
      };
      if (!leadId) return empty;

      const { hasEntitlement } = await import(
        "@/lib/payments/entitlements.server"
      );
      const isPro = await hasEntitlement(leadId, "report_full_9");
      if (!isPro) return empty;

      const { buildCacheKey, lookupSnapshot, isFresh } = await import(
        "@/lib/analysis/cache"
      );
      const { leadOwnsReport } = await import(
        "@/lib/credits/lead-reports.server"
      );
      const { getBalance } = await import("@/lib/credits/credits.server");

      const cacheKey = buildCacheKey(data.handle, data.competitors, data.window);
      const [snapshot, balance] = await Promise.all([
        lookupSnapshot(cacheKey),
        getBalance(leadId).catch(() => 0),
      ]);

      if (!snapshot) {
        return { ...empty, balance };
      }
      const fresh = isFresh(snapshot);
      const ageMs = Date.now() - new Date(snapshot.created_at).getTime();
      const alreadyOwned = await leadOwnsReport(leadId, cacheKey);

      return {
        hasFreshCache: fresh,
        ageMs,
        snapshotId: snapshot.id,
        alreadyOwned,
        balance,
      };
    } catch (err) {
      console.warn("[period-cache] getPeriodCacheState failed", err);
      return {
        hasFreshCache: false,
        ageMs: null,
        snapshotId: null,
        alreadyOwned: false,
        balance: 0,
      };
    }
  });