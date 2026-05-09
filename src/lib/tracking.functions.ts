/**
 * Client-callable server function for product event tracking.
 * Fire-and-forget — callers should not await the result.
 */

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const ALLOWED_EVENTS = [
  "report_viewed",
  "public_report_link_copied",
  "pro_teaser_clicked",
  "feedback_started",
  "feedback_submitted",
  "pricing_clicked",
  "pricing_option_clicked",
  "email_clicked",
  "unlock_clicked",
  "feedback_requested",
  "report_link_sent",
] as const;

const trackEventSchema = z.object({
  eventType: z.enum(ALLOWED_EVENTS),
  snapshotId: z.string().uuid().optional(),
  handle: z.string().max(60).optional(),
  metadata: z.record(z.unknown()).optional(),
});

export const trackEvent = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => trackEventSchema.parse(data))
  .handler(async ({ data }) => {
    const { recordProductEvent } = await import("./tracking.server");

    // Resolve lead_id server-side for snapshot-bound events so we can
    // correlate public views with the originating beta request.
    let leadId: string | null | undefined = undefined;
    if (data.snapshotId) {
      try {
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data: rr } = await supabaseAdmin
          .from("report_requests")
          .select("lead_id")
          .eq("analysis_snapshot_id", data.snapshotId)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        leadId = rr?.lead_id ?? null;
      } catch {
        leadId = null;
      }
    }

    await recordProductEvent({
      eventType: data.eventType,
      snapshotId: data.snapshotId,
      handle: data.handle,
      leadId,
      metadata: data.metadata as Record<string, unknown> | undefined,
    });
    return { ok: true };
  });