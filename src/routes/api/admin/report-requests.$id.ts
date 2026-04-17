/**
 * GET /api/admin/report-requests/$id — full detail for one row.
 */

import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireAdminSession } from "@/lib/admin/session";

interface LeadJoin {
  id: string;
  name: string | null;
  email: string | null;
  company: string | null;
  created_at: string;
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export const Route = createFileRoute("/api/admin/report-requests/$id")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        try {
          await requireAdminSession();
        } catch (res) {
          if (res instanceof Response) return res;
          throw res;
        }

        const { data, error } = await supabaseAdmin
          .from("report_requests")
          .select(
            `id, instagram_username, request_status, pdf_status, delivery_status,
             pdf_storage_path, pdf_generated_at, pdf_error_message,
             email_sent_at, email_message_id, email_error_message,
             analysis_snapshot_id, competitor_usernames, metadata,
             is_free_request, request_month, request_source,
             created_at, updated_at,
             lead:lead_id ( id, name, email, company, created_at )`,
          )
          .eq("id", params.id)
          .maybeSingle();

        if (error) {
          console.error("[admin/report-requests/$id] query failed", error);
          return jsonResponse(
            { success: false, error_code: "QUERY_FAILED", message: error.message },
            500,
          );
        }
        if (!data) {
          return jsonResponse(
            { success: false, error_code: "NOT_FOUND", message: "Pedido não encontrado." },
            404,
          );
        }

        const rawLead = (data as unknown as { lead: LeadJoin | LeadJoin[] | null }).lead;
        const lead = Array.isArray(rawLead) ? rawLead[0] ?? null : rawLead;

        return jsonResponse({
          success: true,
          row: {
            ...data,
            lead,
          },
        });
      },
    },
  },
});
