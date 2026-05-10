/**
 * POST /api/public/pricing-feedback
 *
 * Records the user's pricing preference, captured by the contextual sheet
 * that opens AFTER the unlock (70% scroll / PDF export / 90s timer).
 *
 * - Public endpoint (no auth) — protected by:
 *   - strict Zod payload (uuids, enum values)
 *   - in-memory rate-limit per lead_id (1 req / 5s)
 *   - server-side guard: only writes if `leads.pricing_preference IS NULL`
 *     (never overwrites a previous answer)
 */

import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { recordProductEvent } from "@/lib/tracking.server";
import { pricingFeedbackSchema } from "@/lib/pricing-feedback";

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

// Tiny in-memory rate-limit. Sufficient for MVP (single-region edge worker
// + low-volume public endpoint). Resets on cold start, which is acceptable.
const recentByLead = new Map<string, number>();
const RATE_WINDOW_MS = 5_000;

function rateLimited(leadId: string): boolean {
  const now = Date.now();
  const last = recentByLead.get(leadId);
  if (last && now - last < RATE_WINDOW_MS) return true;
  recentByLead.set(leadId, now);
  // Best-effort cleanup
  if (recentByLead.size > 500) {
    for (const [k, t] of recentByLead) {
      if (now - t > RATE_WINDOW_MS * 4) recentByLead.delete(k);
    }
  }
  return false;
}

export const Route = createFileRoute("/api/public/pricing-feedback")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let body: unknown;
        try {
          body = await request.json();
        } catch {
          return json({ ok: false, code: "INVALID_PAYLOAD" }, 400);
        }

        const parsed = pricingFeedbackSchema.safeParse(body);
        if (!parsed.success) {
          return json(
            {
              ok: false,
              code: "INVALID_PAYLOAD",
              issues: parsed.error.issues.map((i) => i.message),
            },
            400,
          );
        }

        const { lead_id, snapshot_id, pricing_preference, trigger } =
          parsed.data;

        if (rateLimited(lead_id)) {
          return json({ ok: false, code: "RATE_LIMITED" }, 429);
        }

        // Confirm lead exists; only update if pricing_preference is still null.
        const { data: lead, error: leadErr } = await (supabaseAdmin as any)
          .from("leads")
          .select("id, pricing_preference")
          .eq("id", lead_id)
          .maybeSingle();

        if (leadErr || !lead) {
          return json({ ok: false, code: "LEAD_NOT_FOUND" }, 404);
        }

        let updated = false;
        if (!lead.pricing_preference) {
          const { error: updErr } = await (supabaseAdmin as any)
            .from("leads")
            .update({ pricing_preference })
            .eq("id", lead_id)
            .is("pricing_preference", null);
          if (updErr) {
            return json(
              {
                ok: false,
                code: "PERSISTENCE_FAILED",
                message: updErr.message,
              },
              500,
            );
          }
          updated = true;
        }

        await recordProductEvent({
          eventType: "pricing_feedback_submitted",
          leadId: lead_id,
          snapshotId: snapshot_id,
          metadata: {
            pricing_preference,
            trigger,
            updated,
          },
        });

        return json({ ok: true, updated });
      },
    },
  },
});