/**
 * GET /api/admin/recent-reports?limit=4 — últimos report_requests com lead.
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

export const Route = createFileRoute("/api/admin/recent-reports")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          await requireAdminSession();
        } catch (res) {
          if (res instanceof Response) return res;
          throw res;
        }

        const url = new URL(request.url);
        const limitRaw = Number(url.searchParams.get("limit") ?? "4");
        const limit = Math.min(
          20,
          Number.isFinite(limitRaw) && limitRaw > 0 ? Math.floor(limitRaw) : 4,
        );

        const { data, error } = await supabaseAdmin
          .from("report_requests")
          .select(
            `id, instagram_username, request_status, pdf_status, delivery_status,
             is_free_request, request_source, created_at,
             lead:lead_id ( id, name, email )`,
          )
          .order("created_at", { ascending: false })
          .limit(limit);

        if (error) {
          return jsonResponse(
            { success: false, error_code: "QUERY_FAILED", message: error.message },
            500,
          );
        }

        type LeadJoin = { id: string; name: string | null; email: string | null };
        type RawRow = {
          id: string;
          instagram_username: string;
          request_status: string;
          pdf_status: string;
          delivery_status: string;
          is_free_request: boolean;
          request_source: string;
          created_at: string;
          lead: LeadJoin | LeadJoin[] | null;
        };

        const rows = ((data as unknown as RawRow[] | null) ?? []).map((r) => {
          const lead = Array.isArray(r.lead) ? r.lead[0] ?? null : r.lead;
          return {
            id: r.id,
            instagram_username: r.instagram_username,
            request_status: r.request_status,
            pdf_status: r.pdf_status,
            delivery_status: r.delivery_status,
            is_free_request: r.is_free_request,
            request_source: r.request_source,
            created_at: r.created_at,
            lead,
          };
        });

        return jsonResponse({ success: true, rows });
      },
    },
  },
});