/**
 * GET /api/admin/report-requests — paginated list with filters.
 *
 * Query params:
 *   status   — request_status filter
 *   pdf      — pdf_status filter
 *   email    — delivery_status filter
 *   q        — search by username or lead email (ilike)
 *   page     — 1-indexed (default 1)
 *   pageSize — default 25, max 100
 */

import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireAdminSession } from "@/lib/admin/session";

const PAGE_SIZE_DEFAULT = 25;
const PAGE_SIZE_MAX = 100;

interface LeadJoin {
  id: string;
  name: string | null;
  email: string | null;
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export const Route = createFileRoute("/api/admin/report-requests")({
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
        const status = url.searchParams.get("status") ?? undefined;
        const pdf = url.searchParams.get("pdf") ?? undefined;
        const email = url.searchParams.get("email") ?? undefined;
        const q = url.searchParams.get("q")?.trim() ?? "";

        const pageRaw = Number(url.searchParams.get("page") ?? "1");
        const pageSizeRaw = Number(url.searchParams.get("pageSize") ?? PAGE_SIZE_DEFAULT);
        const page = Number.isFinite(pageRaw) && pageRaw > 0 ? Math.floor(pageRaw) : 1;
        const pageSize = Math.min(
          PAGE_SIZE_MAX,
          Number.isFinite(pageSizeRaw) && pageSizeRaw > 0 ? Math.floor(pageSizeRaw) : PAGE_SIZE_DEFAULT,
        );

        const from = (page - 1) * pageSize;
        const to = from + pageSize - 1;

        let query = supabaseAdmin
          .from("report_requests")
          .select(
            `id, instagram_username, request_status, pdf_status, delivery_status,
             pdf_storage_path, email_sent_at, pdf_generated_at, is_free_request,
             analysis_snapshot_id, created_at, updated_at,
             lead:lead_id ( id, name, email )`,
            { count: "exact" },
          )
          .order("created_at", { ascending: false })
          .range(from, to);

        if (status) query = query.eq("request_status", status);
        if (pdf) query = query.eq("pdf_status", pdf);
        if (email) query = query.eq("delivery_status", email);
        if (q) {
          // Match by username (on the row) OR by lead email.
          // Supabase JS does not support ORs across joins easily — apply on the
          // username only and filter the rest client-side if needed. For email
          // search we use a separate query path.
          if (q.includes("@")) {
            // resolve lead ids first
            const { data: leadHits } = await supabaseAdmin
              .from("leads")
              .select("id")
              .ilike("email_normalized", `%${q.toLowerCase()}%`)
              .limit(500);
            const ids = (leadHits ?? []).map((l) => l.id);
            if (ids.length === 0) {
              return jsonResponse({
                success: true,
                rows: [],
                total: 0,
                page,
                pageSize,
              });
            }
            query = query.in("lead_id", ids);
          } else {
            query = query.ilike("instagram_username", `%${q}%`);
          }
        }

        const { data, error, count } = await query;

        if (error) {
          console.error("[admin/report-requests] query failed", error);
          return jsonResponse(
            { success: false, error_code: "QUERY_FAILED", message: error.message },
            500,
          );
        }

        // Normalize lead join shape (Supabase returns array for non-FK joins).
        type RawRow = {
          id: string;
          instagram_username: string;
          request_status: string;
          pdf_status: string;
          delivery_status: string;
          pdf_storage_path: string | null;
          email_sent_at: string | null;
          pdf_generated_at: string | null;
          is_free_request: boolean;
          analysis_snapshot_id: string | null;
          created_at: string;
          updated_at: string;
          lead: LeadJoin | LeadJoin[] | null;
        };

        const rows = (data as unknown as RawRow[] | null ?? []).map((r) => {
          const leadValue = Array.isArray(r.lead) ? r.lead[0] ?? null : r.lead;
          return {
            id: r.id,
            instagram_username: r.instagram_username,
            request_status: r.request_status,
            pdf_status: r.pdf_status,
            delivery_status: r.delivery_status,
            pdf_storage_path: r.pdf_storage_path,
            email_sent_at: r.email_sent_at,
            pdf_generated_at: r.pdf_generated_at,
            is_free_request: r.is_free_request,
            analysis_snapshot_id: r.analysis_snapshot_id,
            created_at: r.created_at,
            updated_at: r.updated_at,
            lead: leadValue
              ? {
                  id: leadValue.id,
                  name: leadValue.name,
                  email: leadValue.email,
                }
              : null,
          };
        });

        return jsonResponse({
          success: true,
          rows,
          total: count ?? rows.length,
          page,
          pageSize,
        });
      },
    },
  },
});
