/**
 * Server-only helper for writing product events.
 * Import only from server functions or .server.ts files.
 */

import { supabaseAdmin } from "@/integrations/supabase/client.server";

export interface TrackEventPayload {
  eventType: string;
  leadId?: string | null;
  snapshotId?: string | null;
  handle?: string | null;
  actorHash?: string | null;
  metadata?: Record<string, unknown>;
}

/**
 * Fire-and-forget event insert. Swallows errors to avoid
 * disrupting the caller's primary flow.
 */
export async function recordProductEvent(payload: TrackEventPayload): Promise<void> {
  try {
    await supabaseAdmin.from("product_events").insert({
      event_type: payload.eventType,
      lead_id: payload.leadId ?? null,
      snapshot_id: payload.snapshotId ?? null,
      handle: payload.handle?.toLowerCase() ?? null,
      actor_hash: payload.actorHash ?? null,
      metadata: payload.metadata ?? {},
    });
  } catch (err) {
    console.error("[tracking] Failed to record event:", payload.eventType, err);
  }
}