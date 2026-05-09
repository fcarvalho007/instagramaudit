/**
 * GET /api/admin/leads-kanban — enriched leads for kanban view.
 *
 * Returns all leads joined with latest report_request and product_events stats.
 */

import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireAdminSession } from "@/lib/admin/session";
import { resolveCallCost } from "@/lib/admin/cost-resolution";

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export const Route = createFileRoute("/api/admin/leads-kanban")({
  server: {
    handlers: {
      GET: async () => {
        try {
          await requireAdminSession();
        } catch (res) {
          if (res instanceof Response) return res;
          throw res;
        }

        // 1. All leads
        const { data: leads, error: leadsErr } = await supabaseAdmin
          .from("leads")
          .select("*")
          .order("created_at", { ascending: false });

        if (leadsErr) {
          console.error("[leads-kanban] leads query failed", leadsErr);
          return jsonResponse({ success: false, error: leadsErr.message }, 500);
        }

        if (!leads || leads.length === 0) {
          return jsonResponse({ success: true, leads: [] });
        }

        const leadIds = leads.map((l) => l.id);

        // 2. Latest report_request per lead
        const { data: requests } = await supabaseAdmin
          .from("report_requests")
          .select(
            "id, lead_id, instagram_username, request_status, pdf_status, analysis_snapshot_id, created_at, updated_at"
          )
          .in("lead_id", leadIds)
          .order("created_at", { ascending: false });

        // Build map: lead_id → latest request
        type ReqRow = NonNullable<typeof requests>[number];
        const requestByLead = new Map<string, ReqRow>();
        if (requests) {
          for (const r of requests) {
            if (!requestByLead.has(r.lead_id)) {
              requestByLead.set(r.lead_id, r);
            }
          }
        }

        // 3. Report view counts from product_events
        const handles = [
          ...new Set(
            (requests ?? [])
              .map((r) => r.instagram_username?.toLowerCase())
              .filter(Boolean)
          ),
        ];

        let viewsByHandle = new Map<string, number>();
        if (handles.length > 0) {
          const { data: viewEvents } = await supabaseAdmin
            .from("product_events")
            .select("handle")
            .eq("event_type", "report_viewed")
            .in("handle", handles);

          if (viewEvents) {
            for (const ev of viewEvents) {
              if (ev.handle) {
                viewsByHandle.set(
                  ev.handle,
                  (viewsByHandle.get(ev.handle) ?? 0) + 1
                );
              }
            }
          }
        }

        // 4. Custo real por snapshot — agregar provider_call_logs via analysis_events,
        //    aplicando regra actual>0 ? actual : estimated (resolveCallCost).
        const snapshotIds = [
          ...new Set(
            (requests ?? [])
              .map((r) => r.analysis_snapshot_id)
              .filter(Boolean)
          ),
        ] as string[];

        const costBySnapshot = new Map<string, number>();
        if (snapshotIds.length > 0) {
          const { data: events } = await supabaseAdmin
            .from("analysis_events")
            .select("id, analysis_snapshot_id")
            .in("analysis_snapshot_id", snapshotIds);

          const eventToSnapshot = new Map<string, string>();
          for (const ev of events ?? []) {
            if (ev.analysis_snapshot_id) {
              eventToSnapshot.set(ev.id, ev.analysis_snapshot_id);
            }
          }

          const eventIds = [...eventToSnapshot.keys()];
          if (eventIds.length > 0) {
            const { data: calls } = await supabaseAdmin
              .from("provider_call_logs")
              .select("analysis_event_id, actual_cost_usd, estimated_cost_usd")
              .in("analysis_event_id", eventIds);

            for (const c of calls ?? []) {
              const snapId = eventToSnapshot.get(c.analysis_event_id ?? "");
              if (!snapId) continue;
              const cost = resolveCallCost(c);
              costBySnapshot.set(snapId, (costBySnapshot.get(snapId) ?? 0) + cost);
            }
          }
        }

        // 5. Last product_event per lead
        let lastEventByLead = new Map<string, string>();
        if (leadIds.length > 0) {
          const { data: lastEvents } = await supabaseAdmin
            .from("product_events")
            .select("lead_id, created_at")
            .in("lead_id", leadIds)
            .order("created_at", { ascending: false });

          if (lastEvents) {
            for (const ev of lastEvents) {
              if (ev.lead_id && !lastEventByLead.has(ev.lead_id)) {
                lastEventByLead.set(ev.lead_id, ev.created_at);
              }
            }
          }
        }

        // 5b. Beta feedback per lead (via report_request_id)
        const reqIds = (requests ?? []).map((r) => r.id);
        const feedbackByLead = new Map<string, {
          id: string;
          usefulness_score: number;
          clarity_text: string | null;
          missing_text: string | null;
          purchase_intent: "sim" | "talvez" | "nao";
          pricing_preference: string | null;
          contact_consent: boolean;
          created_at: string;
        }>();
        if (reqIds.length > 0) {
          const { data: feedbackRows } = await supabaseAdmin
            .from("beta_feedback")
            .select(
              "id, lead_id, report_request_id, usefulness_score, clarity_text, missing_text, purchase_intent, pricing_preference, contact_consent, created_at"
            )
            .in("report_request_id", reqIds)
            .order("created_at", { ascending: false });

          if (feedbackRows) {
            for (const f of feedbackRows) {
              if (f.lead_id && !feedbackByLead.has(f.lead_id)) {
                feedbackByLead.set(f.lead_id, {
                  id: f.id,
                  usefulness_score: f.usefulness_score,
                  clarity_text: f.clarity_text,
                  missing_text: f.missing_text,
                  purchase_intent: f.purchase_intent as "sim" | "talvez" | "nao",
                  pricing_preference: f.pricing_preference,
                  contact_consent: !!f.contact_consent,
                  created_at: f.created_at,
                });
              }
            }
          }
        }

        // 6. Assemble enriched leads
        const enriched = leads.map((lead) => {
          const req = requestByLead.get(lead.id);
          const handle = req?.instagram_username?.toLowerCase() ?? null;
          const snapshotId = req?.analysis_snapshot_id ?? null;
          const lastEvent = lastEventByLead.get(lead.id);

          return {
            id: lead.id,
            email: lead.email,
            name: lead.name,
            handle,
            user_type: lead.user_type,
            purpose: lead.purpose,
            company: lead.company,
            profile_ownership: lead.profile_ownership,
            source: lead.source,
            beta_consent: lead.beta_consent,
            beta_consent_at: lead.beta_consent_at,
            commercial_status: lead.commercial_status ?? "novo_pedido",
            internal_notes: lead.internal_notes,
            contacted_at: lead.contacted_at,
            archived_at: lead.archived_at,
            report_status: req?.request_status ?? null,
            pdf_status: req?.pdf_status ?? null,
            report_cost_usd: snapshotId
              ? (costBySnapshot.get(snapshotId) ?? null)
              : null,
            report_views: handle ? (viewsByHandle.get(handle) ?? 0) : 0,
            last_interaction: lastEvent ?? lead.updated_at,
            created_at: lead.created_at,
            report_request_id: req?.id ?? null,
            feedback: feedbackByLead.get(lead.id) ?? null,
          };
        });

        return jsonResponse({ success: true, leads: enriched });
      },
    },
  },
});