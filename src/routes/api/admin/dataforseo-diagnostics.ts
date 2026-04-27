/**
 * GET /api/admin/dataforseo-diagnostics
 *
 * Devolve o estado operacional da integração DataForSEO:
 * - secrets configurados (apenas presença, nunca o valor)
 * - kill-switch e modo de testes
 * - allowlist activa
 * - últimas 10 chamadas em provider_call_logs (provider='dataforseo')
 * - custo agregado dos últimos 30 dias
 */

import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireAdminSession } from "@/lib/admin/session";
import {
  getAllowlist,
  isDataForSeoEnabled,
  isTestingModeActive,
} from "@/lib/security/dataforseo-allowlist";

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

export const Route = createFileRoute("/api/admin/dataforseo-diagnostics")({
  server: {
    handlers: {
      GET: async () => {
        try {
          await requireAdminSession();
        } catch (response) {
          if (response instanceof Response) return response;
          throw response;
        }

        const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

        const [recent, totals] = await Promise.all([
          supabaseAdmin
            .from("provider_call_logs")
            .select(
              "id, created_at, actor, handle, status, http_status, duration_ms, estimated_cost_usd, actual_cost_usd, error_excerpt",
            )
            .eq("provider", "dataforseo")
            .order("created_at", { ascending: false })
            .limit(10),
          supabaseAdmin
            .from("provider_call_logs")
            .select("status, actual_cost_usd")
            .eq("provider", "dataforseo")
            .gte("created_at", since),
        ]);

        const calls = recent.data ?? [];
        const last30 = totals.data ?? [];
        const costUsd30d = last30.reduce(
          (sum, row) => sum + (Number(row.actual_cost_usd) || 0),
          0,
        );
        const counters = last30.reduce(
          (acc, row) => {
            const key = (row.status ?? "unknown") as keyof typeof acc;
            acc[key] = (acc[key] ?? 0) + 1;
            return acc;
          },
          { success: 0, error: 0, blocked: 0 } as Record<string, number>,
        );

        return json({
          secrets: {
            login: Boolean(process.env.DATAFORSEO_LOGIN),
            password: Boolean(process.env.DATAFORSEO_PASSWORD),
            enabled: Boolean(process.env.DATAFORSEO_ENABLED),
            allowlist: Boolean(process.env.DATAFORSEO_ALLOWLIST),
          },
          gate: {
            kill_switch_active: !isDataForSeoEnabled(),
            testing_mode: isTestingModeActive(),
            allowlist: getAllowlist(),
          },
          recent_calls: calls,
          totals_30d: {
            calls: last30.length,
            counters,
            cost_usd: Number(costUsd30d.toFixed(5)),
          },
        });
      },
    },
  },
});