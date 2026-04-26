/**
 * POST /api/admin/reports/cleanup-expired
 *
 * Apaga snapshots de relatório com `updated_at < now() - 5 days`.
 *
 * IMPORTANTE — segurança e escopo:
 *   - DELETE só em `analysis_snapshots`. Nunca outras tabelas.
 *   - As tabelas abaixo NÃO podem ser tocadas por esta operação:
 *       analysis_events, provider_call_logs, usage_alerts,
 *       social_profiles, report_requests, leads.
 *   - Acesso restrito a administradores autenticados (Google + allowlist).
 *   - NÃO chama Apify, NÃO regenera nada.
 *
 * O critério é `updated_at` (não `created_at`) para coincidir com a regra
 * de retenção de 5 dias após a última geração/refresh.
 */

import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireAdminSession } from "@/lib/admin/session";

const RETENTION_DAYS = 5;
const MS_PER_DAY = 86_400_000;

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    },
  });
}

export const Route = createFileRoute("/api/admin/reports/cleanup-expired")({
  server: {
    handlers: {
      POST: async () => {
        try {
          await requireAdminSession();
        } catch (res) {
          if (res instanceof Response) return res;
          return json(
            { success: false, error_code: "UNAUTHENTICATED", message: "Sessão inválida." },
            401,
          );
        }

        const cutoffIso = new Date(
          Date.now() - RETENTION_DAYS * MS_PER_DAY,
        ).toISOString();

        // .select('id') força o cliente a devolver as linhas eliminadas para
        // podermos contar o resultado real, em vez de assumir uma contagem
        // calculada antes do delete.
        const { data, error } = await supabaseAdmin
          .from("analysis_snapshots")
          .delete()
          .lt("updated_at", cutoffIso)
          .select("id");

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

        return json({
          success: true,
          deleted_count: data?.length ?? 0,
          cutoff_at: cutoffIso,
        });
      },
    },
  },
});