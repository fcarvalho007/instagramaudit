/**
 * GET /api/admin/reports
 *
 * Lista os snapshots de relatório considerados "ativos" (≤ 5 dias desde
 * `updated_at`) e devolve, em paralelo, um sumário dos snapshots já
 * expirados para alimentar o botão de limpeza no painel admin.
 *
 * Regra de negócio (v1):
 *   - Retenção visível ao admin: 5 dias após `updated_at` (e NÃO `created_at`,
 *     porque `analysis_snapshots` faz upsert por `cache_key` — uma análise
 *     refrescada actualiza `updated_at` mas pode manter o `created_at`
 *     original).
 *   - Estados:
 *       active   — age_days < 4
 *       expiring — 4 ≤ age_days < 5
 *       expired  — age_days ≥ 5  (não devem aparecer na lista activa, mas
 *                                  o cálculo é defensivo).
 *
 * Acesso: apenas administradores autenticados (Google + allowlist).
 * NÃO chama Apify. NÃO regenera dados. Apenas leitura à BD.
 */

import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireAdminSession } from "@/lib/admin/session";

const RETENTION_DAYS = 5;
const EXPIRING_THRESHOLD_DAYS = 4;
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

type RetentionStatus = "active" | "expiring" | "expired";

interface ReportRow {
  id: string;
  instagram_username: string;
  display_name: string | null;
  followers: number | null;
  posts_analyzed: number | null;
  dominant_format: string | null;
  avg_engagement_pct: number | null;
  created_at: string;
  updated_at: string;
  retention_base_at: string;
  retention_expires_at: string;
  retention_status: RetentionStatus;
  age_days: number;
}

interface ExpiredSummary {
  count: number;
  oldest_updated_at: string | null;
  newest_updated_at: string | null;
}

/**
 * Extrai com segurança os campos exibidos na tabela do painel a partir do
 * `normalized_payload`. Nunca atira — usa defaults seguros para qualquer
 * forma parcial.
 */
function extractRowMetrics(payload: unknown): {
  display_name: string | null;
  followers: number | null;
  posts_analyzed: number | null;
  dominant_format: string | null;
  avg_engagement_pct: number | null;
} {
  const p = (payload ?? {}) as Record<string, unknown>;
  const profile = (p.profile ?? {}) as Record<string, unknown>;
  const summary = (p.content_summary ?? {}) as Record<string, unknown>;

  const num = (v: unknown): number | null =>
    typeof v === "number" && Number.isFinite(v) ? v : null;
  const str = (v: unknown): string | null =>
    typeof v === "string" && v.length > 0 ? v : null;

  return {
    display_name: str(profile.display_name),
    followers: num(profile.followers_count),
    posts_analyzed: num(summary.posts_analyzed),
    dominant_format: str(summary.dominant_format),
    avg_engagement_pct: num(summary.average_engagement_rate),
  };
}

function computeRetention(
  updatedAtIso: string,
  nowMs: number,
): {
  retention_base_at: string;
  retention_expires_at: string;
  retention_status: RetentionStatus;
  age_days: number;
} {
  const baseMs = new Date(updatedAtIso).getTime();
  const ageMs = Number.isFinite(baseMs) ? Math.max(0, nowMs - baseMs) : 0;
  const ageDays = ageMs / MS_PER_DAY;
  const expiresMs = (Number.isFinite(baseMs) ? baseMs : nowMs) + RETENTION_DAYS * MS_PER_DAY;

  let status: RetentionStatus;
  if (ageDays < EXPIRING_THRESHOLD_DAYS) status = "active";
  else if (ageDays < RETENTION_DAYS) status = "expiring";
  else status = "expired";

  return {
    retention_base_at: updatedAtIso,
    retention_expires_at: new Date(expiresMs).toISOString(),
    retention_status: status,
    age_days: Math.round(ageDays * 100) / 100,
  };
}

export const Route = createFileRoute("/api/admin/reports")({
  server: {
    handlers: {
      GET: async () => {
        try {
          await requireAdminSession();
        } catch (res) {
          if (res instanceof Response) return res;
          return json(
            { success: false, error_code: "UNAUTHENTICATED", message: "Sessão inválida." },
            401,
          );
        }

        const nowMs = Date.now();
        const cutoffIso = new Date(nowMs - RETENTION_DAYS * MS_PER_DAY).toISOString();

        // Query principal: snapshots activos (updated_at >= now() - 5d)
        const activeRes = await supabaseAdmin
          .from("analysis_snapshots")
          .select("id, instagram_username, normalized_payload, created_at, updated_at")
          .gte("updated_at", cutoffIso)
          .order("updated_at", { ascending: false })
          .limit(200);

        if (activeRes.error) {
          return json(
            {
              success: false,
              error_code: "DB_ERROR",
              message: activeRes.error.message,
            },
            500,
          );
        }

        const reports: ReportRow[] = (activeRes.data ?? []).map((row) => {
          const metrics = extractRowMetrics(row.normalized_payload);
          const retention = computeRetention(row.updated_at as string, nowMs);
          return {
            id: row.id as string,
            instagram_username: row.instagram_username as string,
            ...metrics,
            created_at: row.created_at as string,
            updated_at: row.updated_at as string,
            ...retention,
          };
        });

        // Sumário dos expirados (updated_at < now() - 5d)
        // Pedimos apenas a contagem exacta + min/max do `updated_at` em
        // queries dedicadas para nunca depender de um LIMIT artificial.
        const expiredCountRes = await supabaseAdmin
          .from("analysis_snapshots")
          .select("id", { count: "exact", head: true })
          .lt("updated_at", cutoffIso);

        if (expiredCountRes.error) {
          return json(
            {
              success: false,
              error_code: "DB_ERROR",
              message: expiredCountRes.error.message,
            },
            500,
          );
        }

        const expiredCount = expiredCountRes.count ?? 0;

        let oldest_updated_at: string | null = null;
        let newest_updated_at: string | null = null;

        if (expiredCount > 0) {
          const [oldestRes, newestRes] = await Promise.all([
            supabaseAdmin
              .from("analysis_snapshots")
              .select("updated_at")
              .lt("updated_at", cutoffIso)
              .order("updated_at", { ascending: true })
              .limit(1)
              .maybeSingle(),
            supabaseAdmin
              .from("analysis_snapshots")
              .select("updated_at")
              .lt("updated_at", cutoffIso)
              .order("updated_at", { ascending: false })
              .limit(1)
              .maybeSingle(),
          ]);

          if (oldestRes.error || newestRes.error) {
            return json(
              {
                success: false,
                error_code: "DB_ERROR",
                message:
                  oldestRes.error?.message ?? newestRes.error?.message ?? "",
              },
              500,
            );
          }

          oldest_updated_at =
            (oldestRes.data?.updated_at as string | undefined) ?? null;
          newest_updated_at =
            (newestRes.data?.updated_at as string | undefined) ?? null;
        }

        const expired_summary: ExpiredSummary = {
          count: expiredCount,
          oldest_updated_at,
          newest_updated_at,
        };

        return json({
          success: true,
          reports,
          expired_summary,
          retention_days: RETENTION_DAYS,
          generated_at: new Date(nowMs).toISOString(),
        });
      },
    },
  },
});