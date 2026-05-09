/**
 * Public feedback endpoint for beta testers.
 *
 * GET  /api/public/feedback/:requestId
 *   Validates the requestId, returns minimal lead info and whether feedback
 *   was already submitted. Emits `feedback_started` once per requestId.
 *
 * POST /api/public/feedback/:requestId
 *   Validates payload, inserts into `beta_feedback`, emits `feedback_submitted`,
 *   and moves the lead to commercial_status `feedback_recebido`.
 *
 * No admin auth required (public link delivered by email). Duplicate submits
 * are blocked by the UNIQUE constraint on report_request_id.
 */

import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { recordProductEvent } from "@/lib/tracking.server";
import {
  recordLeadEvent,
  updateLeadCommercialStatus,
} from "@/lib/admin/lead-events.server";
import { feedbackFormSchema } from "@/lib/feedback/feedback-schema";

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function firstName(name: string | null | undefined): string | null {
  if (!name) return null;
  const first = name.trim().split(/\s+/)[0];
  return first || null;
}

async function loadContext(requestId: string) {
  const { data: rr, error: rrErr } = await supabaseAdmin
    .from("report_requests")
    .select("id, lead_id, instagram_username")
    .eq("id", requestId)
    .maybeSingle();
  if (rrErr || !rr) return { ok: false as const, code: "NOT_FOUND" };

  const { data: lead, error: leadErr } = await supabaseAdmin
    .from("leads")
    .select("id, name")
    .eq("id", rr.lead_id)
    .maybeSingle();
  if (leadErr || !lead) return { ok: false as const, code: "NOT_FOUND" };

  const { data: existing } = await supabaseAdmin
    .from("beta_feedback")
    .select("id")
    .eq("report_request_id", requestId)
    .maybeSingle();

  return {
    ok: true as const,
    leadId: lead.id as string,
    leadFirstName: firstName(lead.name as string | null),
    handle: rr.instagram_username as string,
    alreadySubmitted: Boolean(existing),
  };
}

export const Route = createFileRoute("/api/public/feedback/$requestId")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const requestId = params.requestId;
        if (!UUID_REGEX.test(requestId)) {
          return json({ ok: false, code: "INVALID_ID" }, 400);
        }

        const ctx = await loadContext(requestId);
        if (!ctx.ok) return json({ ok: false, code: ctx.code }, 404);

        // Emit feedback_started once: only if no prior feedback_started for this request.
        if (!ctx.alreadySubmitted) {
          const { data: priorEvents } = await supabaseAdmin
            .from("product_events")
            .select("id")
            .eq("event_type", "feedback_started")
            .eq("lead_id", ctx.leadId)
            .contains("metadata", { report_request_id: requestId })
            .limit(1);

          if (!priorEvents || priorEvents.length === 0) {
            await recordProductEvent({
              eventType: "feedback_started",
              leadId: ctx.leadId,
              handle: ctx.handle,
              metadata: { report_request_id: requestId },
            });
          }
        }

        return json({
          ok: true,
          leadFirstName: ctx.leadFirstName,
          handle: ctx.handle,
          alreadySubmitted: ctx.alreadySubmitted,
        });
      },

      POST: async ({ params, request }) => {
        const requestId = params.requestId;
        if (!UUID_REGEX.test(requestId)) {
          return json({ ok: false, code: "INVALID_ID" }, 400);
        }

        let body: unknown;
        try {
          body = await request.json();
        } catch {
          return json({ ok: false, code: "INVALID_PAYLOAD" }, 400);
        }

        const parsed = feedbackFormSchema.safeParse(body);
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

        const ctx = await loadContext(requestId);
        if (!ctx.ok) return json({ ok: false, code: ctx.code }, 404);

        if (ctx.alreadySubmitted) {
          return json({ ok: false, code: "ALREADY_SUBMITTED" }, 409);
        }

        const userAgent = request.headers.get("user-agent")?.slice(0, 500) ?? null;

        const { error: insertErr } = await supabaseAdmin
          .from("beta_feedback")
          .insert({
            lead_id: ctx.leadId,
            report_request_id: requestId,
            usefulness_score: parsed.data.usefulness_score,
            clarity_text: parsed.data.clarity_text ?? null,
            missing_text: parsed.data.missing_text ?? null,
            purchase_intent: parsed.data.purchase_intent,
            pricing_preference: parsed.data.pricing_preference ?? null,
            contact_consent: parsed.data.contact_consent,
            user_agent: userAgent,
          });

        if (insertErr) {
          // 23505 = unique_violation (race condition)
          const code = (insertErr as { code?: string }).code;
          if (code === "23505") {
            return json({ ok: false, code: "ALREADY_SUBMITTED" }, 409);
          }
          return json(
            { ok: false, code: "PERSISTENCE_FAILED", message: insertErr.message },
            500,
          );
        }

        await recordLeadEvent({
          leadId: ctx.leadId,
          eventType: "feedback_submitted",
          handle: ctx.handle,
          metadata: {
            report_request_id: requestId,
            usefulness_score: parsed.data.usefulness_score,
            purchase_intent: parsed.data.purchase_intent,
            pricing_preference: parsed.data.pricing_preference ?? null,
            contact_consent: parsed.data.contact_consent,
          },
        });

        await updateLeadCommercialStatus({
          leadId: ctx.leadId,
          status: "feedback_recebido",
          source: "auto",
          reason: "feedback_received",
        });

        return json({ ok: true });
      },
    },
  },
});

// Re-export z to avoid unused import warnings if tree-shaken (kept for clarity).
void z;