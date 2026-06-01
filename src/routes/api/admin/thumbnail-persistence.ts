/**
 * GET /api/admin/thumbnail-persistence
 *
 * Devolve diagnóstico da persistência de thumbnails:
 *   - últimas 10 runs (mais recentes primeiro)
 *   - agregado dos últimos 7 dias: total tentados, armazenados,
 *     taxa de sucesso e breakdown de falhas por razão.
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

interface Row {
  id: string;
  created_at: string;
  cache_key: string;
  handle: string;
  attempted: number;
  stored: number;
  failed_403: number;
  failed_timeout: number;
  failed_invalid_content_type: number;
  failed_upload: number;
  failed_other: number;
  avatar: string;
  duration_ms: number | null;
}

export const Route = createFileRoute("/api/admin/thumbnail-persistence")({
  server: {
    handlers: {
      GET: async () => {
        try {
          await requireAdminSession();
        } catch (res) {
          if (res instanceof Response) return res;
          throw res;
        }

        const sinceISO = new Date(
          Date.now() - 7 * 24 * 60 * 60 * 1000,
        ).toISOString();

        const [recentRes, windowRes] = await Promise.all([
          supabaseAdmin
            .from("thumbnail_persistence_runs")
            .select(
              "id, created_at, cache_key, handle, attempted, stored, failed_403, failed_timeout, failed_invalid_content_type, failed_upload, failed_other, avatar, duration_ms",
            )
            .order("created_at", { ascending: false })
            .limit(10),
          supabaseAdmin
            .from("thumbnail_persistence_runs")
            .select(
              "attempted, stored, failed_403, failed_timeout, failed_invalid_content_type, failed_upload, failed_other",
            )
            .gte("created_at", sinceISO),
        ]);

        if (recentRes.error || windowRes.error) {
          return jsonResponse(
            {
              success: false,
              error_code: "QUERY_FAILED",
              message: (recentRes.error ?? windowRes.error)?.message,
            },
            500,
          );
        }

        const rows = (windowRes.data ?? []) as Array<
          Pick<
            Row,
            | "attempted"
            | "stored"
            | "failed_403"
            | "failed_timeout"
            | "failed_invalid_content_type"
            | "failed_upload"
            | "failed_other"
          >
        >;
        const agg = rows.reduce(
          (acc, r) => {
            acc.total_attempted += r.attempted ?? 0;
            acc.total_stored += r.stored ?? 0;
            acc.failures_by_reason.failed_403 += r.failed_403 ?? 0;
            acc.failures_by_reason.failed_timeout += r.failed_timeout ?? 0;
            acc.failures_by_reason.failed_invalid_content_type +=
              r.failed_invalid_content_type ?? 0;
            acc.failures_by_reason.failed_upload += r.failed_upload ?? 0;
            acc.failures_by_reason.failed_other += r.failed_other ?? 0;
            return acc;
          },
          {
            runs: rows.length,
            total_attempted: 0,
            total_stored: 0,
            failures_by_reason: {
              failed_403: 0,
              failed_timeout: 0,
              failed_invalid_content_type: 0,
              failed_upload: 0,
              failed_other: 0,
            },
          },
        );

        const success_rate =
          agg.total_attempted > 0
            ? Number(
                ((agg.total_stored / agg.total_attempted) * 100).toFixed(1),
              )
            : null;

        return jsonResponse({
          success: true,
          window_days: 7,
          recent: (recentRes.data ?? []) as Row[],
          aggregate: {
            ...agg,
            success_rate_pct: success_rate,
          },
        });
      },
    },
  },
});