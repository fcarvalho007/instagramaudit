/**
 * Client-safe schema for the contextual pricing-feedback sheet.
 * The sheet appears AFTER the user has had time to see value
 * (70% scroll, PDF export, or 90s after unlock).
 */
import { z } from "zod";
import { PRICING_PREFERENCES } from "./unlock-flow";

export const PRICING_FEEDBACK_TRIGGERS = ["scroll", "pdf", "timer"] as const;
export type PricingFeedbackTrigger = (typeof PRICING_FEEDBACK_TRIGGERS)[number];

export const pricingFeedbackSchema = z
  .object({
    lead_id: z.string().uuid(),
    snapshot_id: z.string().uuid(),
    pricing_preference: z.enum(PRICING_PREFERENCES),
    trigger: z.enum(PRICING_FEEDBACK_TRIGGERS),
  })
  .strict();

export type PricingFeedbackPayload = z.infer<typeof pricingFeedbackSchema>;