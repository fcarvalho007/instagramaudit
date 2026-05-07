/**
 * GET /api/admin/leads-kanban — enriched leads for kanban view.
 *
 * Returns all leads joined with latest report_request and product_events stats.
 */

import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireAdminSession } from "@/lib/admin/session";

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
        const requestByLead = new Map<string, (typeof requests)[0]>();
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

        // 4. Costs from analysis_snapshots (estimated via provider_call_logs)
        const snapshotIds = [
          ...new Set(
            (requests ?? [])
              .map((r) => r.analysis_snapshot_id)
              .filter(Boolean)
          ),
        ] as string[];

        let costBySnapshot = new Map<string, number>();
        if (snapshotIds.length > 0) {
          const { data: costs } = await supabaseAdmin
            .from("provider_call_logs")
            .select("analysis_event_id, estimated_cost_usd")
            .not("estimated_cost_usd", "is", null);

          // We need analysis_events to map snapshot → cost
          const { data: events } = await supabaseAdmin
            .from("analysis_events")
            .select("id, analysis_snapshot_id, estimated_cost_usd")
            .in("analysis_snapshot_id", snapshotIds);

          if (events) {
            for (const ev of events) {
              if (ev.analysis_snapshot_id && ev.estimated_cost_usd) {
                costBySnapshot.set(
                  ev.analysis_snapshot_id,
                  (costBySnapshot.get(ev.analysis_snapshot_id) ?? 0) +
                    Number(ev.estimated_cost_usd)
                );
              }
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
          };
        });

        return jsonResponse({ success: true, leads: enriched });
      },
    },
  },
});