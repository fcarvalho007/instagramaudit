/**
 * GET /api/admin/repeated-searches?days=30&limit=6
 *
 * Top handles com 2+ ANÁLISES GERADAS (snapshots, NÃO cache hits) na janela.
 * Usa `analysis_snapshots` como fonte — coerente com `profiles.metrics.ts` —
 * para evitar inflar a contagem com leituras de cache que não representam
 * intenção real.
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

export const Route = createFileRoute("/api/admin/repeated-searches")({
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
        const daysRaw = Number(url.searchParams.get("days") ?? "30");
        const limitRaw = Number(url.searchParams.get("limit") ?? "6");
        const days = Number.isFinite(daysRaw) && daysRaw > 0 ? Math.floor(daysRaw) : 30;
        const limit = Math.min(
          25,
          Number.isFinite(limitRaw) && limitRaw > 0 ? Math.floor(limitRaw) : 6,
        );

        const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

        const { data, error } = await supabaseAdmin
          .from("analysis_snapshots")
          .select("instagram_username, created_at")
          .gte("created_at", since)
          .order("created_at", { ascending: false })
          .limit(5000);

        if (error) {
          return jsonResponse(
            { success: false, error_code: "QUERY_FAILED", message: error.message },
            500,
          );
        }

        const counts = new Map<string, { count: number; last_at: string }>();
        for (const ev of data ?? []) {
          const h = (ev as { instagram_username: string }).instagram_username.toLowerCase();
          const at = (ev as { created_at: string }).created_at;
          const cur = counts.get(h);
          if (cur) {
            cur.count += 1;
            if (at > cur.last_at) cur.last_at = at;
          } else {
            counts.set(h, { count: 1, last_at: at });
          }
        }

        const repeated = Array.from(counts.entries())
          .filter(([, v]) => v.count >= 2)
          .sort((a, b) => b[1].count - a[1].count)
          .slice(0, limit)
          .map(([handle, v]) => ({ handle, count: v.count, last_at: v.last_at }));

        // Best-effort: para cada handle, tenta encontrar email do lead que pediu relatório.
        if (repeated.length > 0) {
          const handles = repeated.map((r) => r.handle);
          const { data: reqs } = await supabaseAdmin
            .from("report_requests")
            .select("instagram_username, lead:lead_id ( email, name )")
            .in("instagram_username", handles)
            .order("created_at", { ascending: false })
            .limit(500);

          type LeadJoin = { email: string | null; name: string | null };
          const leadByHandle = new Map<string, LeadJoin>();
          for (const r of (reqs ?? []) as unknown as Array<{
            instagram_username: string;
            lead: LeadJoin | LeadJoin[] | null;
          }>) {
            const lead = Array.isArray(r.lead) ? r.lead[0] ?? null : r.lead;
            if (lead && !leadByHandle.has(r.instagram_username)) {
              leadByHandle.set(r.instagram_username, lead);
            }
          }

          return jsonResponse({
            success: true,
            rows: repeated.map((r) => ({
              ...r,
              lead: leadByHandle.get(r.handle) ?? null,
            })),
          });
        }

        return jsonResponse({ success: true, rows: [] });
      },
    },
  },
});