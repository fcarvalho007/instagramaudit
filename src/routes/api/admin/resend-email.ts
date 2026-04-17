/**
 * POST /api/admin/resend-email — manual email resend action.
 *
 * Reuses the existing /api/send-report-email route with the internal token
 * header. Updates request_status accordingly when the cycle reaches the end.
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

export const Route = createFileRoute("/api/admin/resend-email")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          await requireAdminSession();
        } catch (res) {
          if (res instanceof Response) return res;
          throw res;
        }

        const internalToken = process.env.INTERNAL_API_TOKEN;
        if (!internalToken) {
          return jsonResponse(
            { success: false, error_code: "NOT_CONFIGURED", message: "Token interno em falta." },
            500,
          );
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

        try {
          const res = await fetch(`${origin}/api/send-report-email`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-internal-token": internalToken,
            },
            body: JSON.stringify({ report_request_id: reportRequestId }),
          });
          const body = await res.json().catch(() => ({}));
          if (!res.ok) {
            await supabaseAdmin
              .from("report_requests")
              .update({ request_status: "failed_email" })
              .eq("id", reportRequestId);
            return jsonResponse(
              { success: false, error_code: "EMAIL_FAILED", message: "O envio do email falhou.", detail: body },
              502,
            );
          }
          await supabaseAdmin
            .from("report_requests")
            .update({ request_status: "completed" })
            .eq("id", reportRequestId);
          return jsonResponse({ success: true, email: body });
        } catch (err) {
          const msg = err instanceof Error ? err.message : "unknown error";
          await supabaseAdmin
            .from("report_requests")
            .update({ request_status: "failed_email" })
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
