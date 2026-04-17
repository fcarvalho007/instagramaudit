/**
 * POST /api/admin/regenerate-pdf — manual recovery action.
 *
 * Reuses the existing /api/generate-report-pdf route with `force=true`.
 * Resets the row's request_status to "processing" before, and to
 * "completed" or "failed_pdf" depending on outcome. Email status is
 * intentionally not touched here.
 */

import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireAdminSession } from "@/lib/admin/session";

const Schema = z.object({
  report_request_id: z.string().uuid(),
});

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export const Route = createFileRoute("/api/admin/regenerate-pdf")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          await requireAdminSession();
        } catch (res) {
          if (res instanceof Response) return res;
          throw res;
        }

        let raw: unknown;
        try {
          raw = await request.json();
        } catch {
          return jsonResponse(
            { success: false, error_code: "INVALID_PAYLOAD", message: "Pedido inválido." },
            400,
          );
        }
        const parsed = Schema.safeParse(raw);
        if (!parsed.success) {
          return jsonResponse(
            { success: false, error_code: "INVALID_PAYLOAD", message: "ID inválido." },
            400,
          );
        }

        const reportRequestId = parsed.data.report_request_id;
        const origin = new URL(request.url).origin;

        await supabaseAdmin
          .from("report_requests")
          .update({ request_status: "processing" })
          .eq("id", reportRequestId);

        try {
          const res = await fetch(`${origin}/api/generate-report-pdf`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ report_request_id: reportRequestId, force: true }),
          });
          const body = await res.json().catch(() => ({}));
          if (!res.ok) {
            await supabaseAdmin
              .from("report_requests")
              .update({ request_status: "failed_pdf" })
              .eq("id", reportRequestId);
            return jsonResponse(
              { success: false, error_code: "PDF_FAILED", message: "Não foi possível regenerar o PDF.", detail: body },
              502,
            );
          }
          // PDF OK — reset request_status to completed only if email is already sent;
          // otherwise leave it as processing so an email retry can complete the cycle.
          const { data: row } = await supabaseAdmin
            .from("report_requests")
            .select("delivery_status")
            .eq("id", reportRequestId)
            .maybeSingle();
          const next = row?.delivery_status === "sent" ? "completed" : "failed_email";
          await supabaseAdmin
            .from("report_requests")
            .update({ request_status: next })
            .eq("id", reportRequestId);
          return jsonResponse({ success: true, pdf: body });
        } catch (err) {
          const msg = err instanceof Error ? err.message : "unknown error";
          await supabaseAdmin
            .from("report_requests")
            .update({ request_status: "failed_pdf" })
            .eq("id", reportRequestId);
          return jsonResponse(
            { success: false, error_code: "NETWORK", message: msg },
            500,
          );
        }
      },
    },
  },
});
