/**
 * Server-only helper to enqueue the **Paid** enrichment subset against
 * an existing snapshot after an entitlement is granted (post-purchase).
 *
 * Idempotent:
 *  - Only enqueues rows for types whose `enrichment_status` is currently
 *    `skipped` (the Free default). Existing `pending` / `running` /
 *    `success` rows are left untouched.
 *  - The enrichment runner itself is idempotent per type (it short-
 *    circuits when the relevant payload key is already present).
 *
 * Best-effort: never throws. All failures are logged and swallowed so
 * the payment webhook never fails because of enrichment plumbing.
 */

import { supabaseAdmin } from "@/integrations/supabase/client.server";
import {
  ENRICHMENT_PRIORITY,
  PAID_ENRICHMENT_TYPES,
  type EnrichmentStatusMap,
  type EnrichmentType,
} from "./types";

const LOG = "[enqueue-paid]";

export interface EnqueuePaidEnrichmentsInput {
  /** Public site origin used to trigger `/api/public/enrich-snapshot`. */
  origin: string;
}

export async function enqueuePaidEnrichmentsForSnapshot(
  snapshotId: string,
  input: EnqueuePaidEnrichmentsInput,
): Promise<{ enqueued: EnrichmentType[]; skipped: EnrichmentType[] }> {
  try {
    const { data: snap, error: snapErr } = await supabaseAdmin
      .from("analysis_snapshots")
      .select("id, instagram_username, normalized_payload")
      .eq("id", snapshotId)
      .maybeSingle();

    if (snapErr || !snap) {
      console.warn(`${LOG} snapshot not found`, snapshotId, snapErr?.message);
      return { enqueued: [], skipped: [...PAID_ENRICHMENT_TYPES] };
    }

    const payload = (snap.normalized_payload ?? {}) as Record<string, unknown>;
    const status = (payload.enrichment_status ?? {}) as Partial<EnrichmentStatusMap>;

    // Only enqueue paid types currently `skipped` (the Free default) or
    // missing from the map entirely.
    const toEnqueue = PAID_ENRICHMENT_TYPES.filter((t) => {
      const s = status[t];
      return s === "skipped" || s === undefined;
    });

    if (toEnqueue.length === 0) {
      return { enqueued: [], skipped: [...PAID_ENRICHMENT_TYPES] };
    }

    // Reset status to `pending` for the types we are about to enqueue,
    // so admin diagnostics reflect the in-flight state.
    const nextStatus: Record<string, string> = { ...(status as Record<string, string>) };
    for (const t of toEnqueue) nextStatus[t] = "pending";

    await supabaseAdmin
      .from("analysis_snapshots")
      .update({
        normalized_payload: {
          ...payload,
          enrichment_status: nextStatus,
        } as never,
      })
      .eq("id", snapshotId);

    const rows = toEnqueue.map((type) => ({
      snapshot_id: snapshotId,
      analysis_event_id: null,
      handle: snap.instagram_username,
      enrichment_type: type,
      status: "pending" as const,
      priority: ENRICHMENT_PRIORITY[type],
    }));

    const { error: insertErr } = await supabaseAdmin
      .from("enrichment_jobs")
      .insert(rows as never);

    if (insertErr) {
      console.error(`${LOG} insert enrichment_jobs failed`, insertErr.message);
      return { enqueued: [], skipped: [...PAID_ENRICHMENT_TYPES] };
    }

    console.info(
      `${LOG} enqueued`,
      toEnqueue.length,
      "paid enrichment_jobs for snapshot",
      snapshotId,
      toEnqueue,
    );

    // Fire-and-forget: trigger the async runner.
    const internalToken = process.env.INTERNAL_API_TOKEN;
    if (internalToken && input.origin) {
      fetch(`${input.origin}/api/public/enrich-snapshot`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${internalToken}`,
        },
        body: JSON.stringify({ snapshot_id: snapshotId }),
      }).catch((err) => {
        console.warn(`${LOG} enrich-snapshot trigger failed (job table ensures delivery)`, err);
      });
    }

    return {
      enqueued: toEnqueue,
      skipped: PAID_ENRICHMENT_TYPES.filter((t) => !toEnqueue.includes(t)),
    };
  } catch (err) {
    console.error(`${LOG} unexpected failure`, err);
    return { enqueued: [], skipped: [...PAID_ENRICHMENT_TYPES] };
  }
}

/**
 * Convenience wrapper: resolve the snapshot id for a paid lead_payment
 * (via `report_cache_key`) and enqueue paid enrichments against it.
 */
export async function enqueuePaidEnrichmentsForPayment(args: {
  reportCacheKey: string | null | undefined;
  origin: string;
}): Promise<void> {
  if (!args.reportCacheKey) {
    console.info(`${LOG} payment has no report_cache_key; nothing to top up`);
    return;
  }
  try {
    const { data, error } = await supabaseAdmin
      .from("analysis_snapshots")
      .select("id")
      .eq("cache_key", args.reportCacheKey)
      .maybeSingle();
    if (error) {
      console.warn(`${LOG} snapshot lookup failed`, error.message);
      return;
    }
    if (!data?.id) {
      console.info(`${LOG} no snapshot for cache_key`, args.reportCacheKey);
      return;
    }
    await enqueuePaidEnrichmentsForSnapshot(data.id, { origin: args.origin });
  } catch (err) {
    console.error(`${LOG} enqueuePaidEnrichmentsForPayment threw`, err);
  }
}