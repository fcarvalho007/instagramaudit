/**
 * GET /api/admin/lead-timeline/$id — product_events timeline for a lead.
 *
 * Returns events by lead_id + handle (from report_requests).
 * Admin-protected. Loaded on-demand when the detail sheet opens.
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

export const Route = createFileRoute("/api/admin/lead-timeline/$id")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        try {
          await requireAdminSession();
        } catch (res) {
          if (res instanceof Response) return res;
          throw res;
        }

        const leadId = params.id;

        // Get handle from report_requests for this lead
        const { data: req } = await supabaseAdmin
          .from("report_requests")
          .select("instagram_username")
          .eq("lead_id", leadId)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        const handle = req?.instagram_username?.toLowerCase() ?? null;

        // Fetch events by lead_id OR handle
        let query = supabaseAdmin
          .from("product_events")
          .select("id, event_type, handle, metadata, created_at")
          .order("created_at", { ascending: false })
          .limit(50);

        if (handle) {
          query = query.or(`lead_id.eq.${leadId},handle.eq.${handle}`);
        } else {
          query = query.eq("lead_id", leadId);
        }

        const { data: events, error } = await query;

        if (error) {
          console.error("[lead-timeline] query failed", error);
          return jsonResponse({ success: false, error: error.message }, 500);
        }

        return jsonResponse({ success: true, events: events ?? [] });
      },
    },
  },
});