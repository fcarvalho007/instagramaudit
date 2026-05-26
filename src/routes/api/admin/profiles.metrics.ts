/**
 * GET /api/admin/profiles/metrics — agregados de perfis na janela `?period=`.
 *
 * Lê `social_profiles` (totais por perfil) + `analysis_snapshots` na janela.
 */

import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireAdminSession } from "@/lib/admin/session";
import { resolvePeriod } from "@/lib/admin/period";

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export const Route = createFileRoute("/api/admin/profiles/metrics")({
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
        const { sinceISO, days } = resolvePeriod(url.searchParams.get("period"));

        const [{ data: profiles, error: pErr }, { data: snapshots, error: sErr }] =
          await Promise.all([
            supabaseAdmin
              .from("social_profiles")
              .select("handle, analyses_total, last_analyzed_at, estimated_cost_usd_total")
              .limit(5000),
            supabaseAdmin
              .from("analysis_snapshots")
              .select("instagram_username, created_at")
              .gte("created_at", sinceISO)
              .limit(10000),
          ]);

        if (pErr || sErr) {
          return jsonResponse(
            { success: false, error_code: "QUERY_FAILED", message: (pErr ?? sErr)?.message },
            500,
          );
        }

        const all = profiles ?? [];
        const snapHandles = new Set<string>();
        for (const s of snapshots ?? []) {
          snapHandles.add(s.instagram_username.toLowerCase());
        }
        const uniqueProfiles = snapHandles.size;
        const repeated = all.filter((p) => (p.analyses_total ?? 0) >= 2).length;

        // "Com relatório" = perfis com snapshot na janela que também existem em social_profiles.
        const profileHandleSet = new Set(all.map((p) => p.handle.toLowerCase()));
        let profilesWithReport = 0;
        for (const h of snapHandles) {
          if (profileHandleSet.has(h)) profilesWithReport += 1;
        }
        const conversionPct =
          uniqueProfiles > 0 ? (profilesWithReport / uniqueProfiles) * 100 : null;

        return jsonResponse({
          success: true,
          window_days: days,
          unique_profiles: uniqueProfiles,
          repeated_profiles: repeated,
          profiles_with_report: profilesWithReport,
          conversion_pct: conversionPct,
          total_profiles: all.length,
        });
      },
    },
  },
});