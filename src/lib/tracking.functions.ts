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
  "email_clicked",
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
    await recordProductEvent({
      eventType: data.eventType,
      snapshotId: data.snapshotId,
      handle: data.handle,
      metadata: data.metadata as Record<string, unknown> | undefined,
    });
    return { ok: true };
  });