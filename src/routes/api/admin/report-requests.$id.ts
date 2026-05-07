/**
 * GET  /api/admin/report-requests/$id — full detail for one row.
 * PATCH /api/admin/report-requests/$id — update request status.
 */

import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireAdminSession } from "@/lib/admin/session";
import type { Json } from "@/integrations/supabase/types";

const VALID_STATUSES = [
  "pending_review",
  "approved",
  "rejected",
  "processing",
  "completed",
  "archived",
] as const;

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

      PATCH: async ({ request, params }) => {
        try {
          await requireAdminSession();
        } catch (res) {
          if (res instanceof Response) return res;
          throw res;
        }

        let body: Record<string, unknown>;
        try {
          body = await request.json();
        } catch {
          return jsonResponse({ success: false, error: "Invalid JSON" }, 400);
        }

        // Build update payload
        const updates: { request_status?: string; updated_at: string } = {
          updated_at: new Date().toISOString(),
        };

        if (typeof body.request_status === "string") {
          if (!VALID_STATUSES.includes(body.request_status as (typeof VALID_STATUSES)[number])) {
            return jsonResponse({ success: false, error: "Invalid status" }, 400);
          }
          updates.request_status = body.request_status;
        }

        if (!updates.request_status) {
          return jsonResponse({ success: false, error: "No valid fields" }, 400);
        }

        const { data: updated, error } = await supabaseAdmin
          .from("report_requests")
          .update(updates)
          .eq("id", params.id)
          .select("id, request_status, lead_id")
          .maybeSingle();

        if (error) {
          console.error("[admin/report-requests/$id] PATCH failed", error);
          return jsonResponse({ success: false, error: error.message }, 500);
        }
        if (!updated) {
          return jsonResponse({ success: false, error: "Not found" }, 404);
        }

        // If mark_contacted, update leads table
        if (body.mark_contacted === true && updated.lead_id) {
          await supabaseAdmin
            .from("leads")
            .update({ contacted_at: new Date().toISOString(), updated_at: new Date().toISOString() })
            .eq("id", updated.lead_id);
        }

        // Track event (fire-and-forget)
        try {
          await supabaseAdmin.from("product_events").insert([{
            event_type: "request_status_changed",
            lead_id: updated.lead_id,
            metadata: {
              request_id: params.id,
              new_status: updates.request_status,
            } as { [key: string]: Json | undefined },
          }]);
        } catch { /* non-critical */ }

        return jsonResponse({ success: true, row: updated });
      },
    },
  },
});
