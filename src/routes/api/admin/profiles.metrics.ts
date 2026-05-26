/**
 * GET /api/admin/profiles/metrics — agregados de perfis (30d).
 *
 * Lê `social_profiles` (totais por perfil) + `report_requests` para conversão.
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

export const Route = createFileRoute("/api/admin/profiles/metrics")({
  server: {
    handlers: {
      GET: async () => {
        try {
          await requireAdminSession();
        } catch (res) {
          if (res instanceof Response) return res;
          throw res;
        }

        const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

        const [{ data: profiles, error: pErr }, { data: requests, error: rErr }] =
          await Promise.all([
            supabaseAdmin
              .from("social_profiles")
              .select("handle, analyses_total, last_analyzed_at, estimated_cost_usd_total")
              .limit(5000),
            supabaseAdmin
              .from("report_requests")
              .select("instagram_username, created_at, delivery_status")
              .gte("created_at", since)
              .limit(5000),
          ]);

        if (pErr || rErr) {
          return jsonResponse(
            { success: false, error_code: "QUERY_FAILED", message: (pErr ?? rErr)?.message },
            500,
          );
        }

        const all = profiles ?? [];
        const recentProfiles = all.filter(
          (p) => p.last_analyzed_at && p.last_analyzed_at >= since,
        );
        const uniqueProfiles30d = recentProfiles.length;
        const repeated = all.filter((p) => (p.analyses_total ?? 0) >= 2).length;

        const reportHandles = new Set(
          (requests ?? []).map((r) => r.instagram_username.toLowerCase()),
        );
        const profilesWithReport = recentProfiles.filter((p) =>
          reportHandles.has(p.handle.toLowerCase()),
        ).length;
        const conversionPct =
          uniqueProfiles30d > 0 ? (profilesWithReport / uniqueProfiles30d) * 100 : null;

        return jsonResponse({
          success: true,
          window_days: 30,
          unique_profiles_30d: uniqueProfiles30d,
          repeated_profiles: repeated,
          profiles_with_report_30d: profilesWithReport,
          conversion_pct: conversionPct,
          total_profiles: all.length,
        });
      },
    },
  },
});