/**
 * GET /api/admin/snapshot/:username
 *
 * Devolve o snapshot mais recente em `analysis_snapshots` para o handle
 * indicado. Apenas acessível a administradores autenticados (Google + allowlist).
 *
 * NÃO chama Apify. NÃO regenera dados. Lê apenas o que já existe na base.
 */

import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireAdminSession } from "@/lib/admin/session";
import { buildReportBenchmarkInput } from "@/lib/report/benchmark-input.server";
import type { SnapshotPayload } from "@/lib/report/snapshot-to-report-data";

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    },
  });
}

export const Route = createFileRoute("/api/admin/snapshot/$username")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        try {
          await requireAdminSession();
        } catch (res) {
          if (res instanceof Response) return res;
          return json(
            { success: false, error_code: "UNAUTHENTICATED", message: "Sessão inválida." },
            401,
          );
        }

        const handle = (params.username ?? "").trim().toLowerCase();
        if (!handle) {
          return json(
            { success: false, error_code: "INVALID_HANDLE", message: "Handle em falta." },
            400,
          );
        }

        const { data, error } = await supabaseAdmin
          .from("analysis_snapshots")
          .select("id, instagram_username, normalized_payload, created_at, updated_at, expires_at")
          .eq("instagram_username", handle)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (error) {
          return json(
            {
              success: false,
              error_code: "DB_ERROR",
              message: error.message,
            },
            500,
          );
        }

        if (!data) {
          return json({ success: true, snapshot: null });
        }

        const payload = (data.normalized_payload ?? {}) as SnapshotPayload;
        const benchmark = await buildReportBenchmarkInput(payload);

        return json({
          success: true,
          snapshot: {
            id: data.id,
            instagram_username: data.instagram_username,
            payload,
            meta: {
              generated_at: data.created_at,
              instagram_username: data.instagram_username,
            },
            created_at: data.created_at,
            updated_at: data.updated_at,
            expires_at: data.expires_at,
            benchmark,
          },
        });
      },
    },
  },
});
