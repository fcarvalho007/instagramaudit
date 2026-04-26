/**
 * GET /api/admin/reports
 *
 * Listagem administrativa de relatórios disponíveis para pré-visualização.
 *
 * - Apenas administradores autenticados (Google + allowlist).
 * - Lê de `analysis_snapshots` (a fonte operacional v1).
 * - Devolve apenas snapshots com `created_at >= now() - 5 dias`
 *   (regra de retenção de relatório).
 * - Calcula `retention_expires_at = created_at + 5 dias` e o estado
 *   ("Ativo" | "A expirar" | "Expirado").
 * - NÃO chama Apify. NÃO escreve. NÃO afeta `analysis_events` ou logs.
 *
 * IMPORTANTE: o `expires_at` da tabela é o TTL de cache (24h) e mantém-se
 * inalterado. A retenção de 5 dias para o relatório é uma camada própria
 * derivada do `created_at`.
 */

import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireAdminSession } from "@/lib/admin/session";

export const REPORT_RETENTION_DAYS = 5;
const REPORT_RETENTION_MS = REPORT_RETENTION_DAYS * 24 * 60 * 60 * 1000;
/** Quando mostrar "A expirar" no admin (a partir de 4 dias de idade). */
const EXPIRING_THRESHOLD_MS = 4 * 24 * 60 * 60 * 1000;

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    },
  });
}

interface ReportRow {
  id: string;
  instagram_username: string;
  competitors_count: number;
  created_at: string;
  updated_at: string;
  /** TTL de cache da snapshot (24h). NÃO é a retenção do relatório. */
  cache_expires_at: string | null;
  /** Retenção do relatório = created_at + 5 dias. */
  retention_expires_at: string;
  /** "active" | "expiring" | "expired". */
  retention_status: "active" | "expiring" | "expired";
  posts_count: number;
  dominant_format: string | null;
  engagement_rate: number | null;
  provider: string;
  analysis_status: string;
}

export interface ReportsListResponse {
  success: true;
  retention_days: number;
  generated_at: string;
  total: number;
  rows: ReportRow[];
}

function safeNumber(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

function safeString(v: unknown): string | null {
  return typeof v === "string" && v.length > 0 ? v : null;
}

function arrayLength(v: unknown): number {
  return Array.isArray(v) ? v.length : 0;
}

function deriveStatus(
  createdAtIso: string,
  now: number,
): { retentionExpiresAt: string; status: ReportRow["retention_status"] } {
  const created = new Date(createdAtIso).getTime();
  const expiresAt = new Date(created + REPORT_RETENTION_MS).toISOString();
  const age = now - created;
  let status: ReportRow["retention_status"];
  if (age >= REPORT_RETENTION_MS) status = "expired";
  else if (age >= EXPIRING_THRESHOLD_MS) status = "expiring";
  else status = "active";
  return { retentionExpiresAt: expiresAt, status };
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

        const now = Date.now();
        const cutoffIso = new Date(now - REPORT_RETENTION_MS).toISOString();

        const { data, error } = await supabaseAdmin
          .from("analysis_snapshots")
          .select(
            "id, instagram_username, competitor_usernames, normalized_payload, provider, analysis_status, created_at, updated_at, expires_at",
          )
          .gte("created_at", cutoffIso)
          .order("created_at", { ascending: false });

        if (error) {
          return json(
            { success: false, error_code: "DB_ERROR", message: error.message },
            500,
          );
        }

        const rows: ReportRow[] = (data ?? []).map((r) => {
          const payload =
            (r.normalized_payload as Record<string, unknown> | null) ?? {};
          const cs =
            (payload["content_summary"] as Record<string, unknown> | undefined) ??
            undefined;
          const posts = payload["posts"];
          const { retentionExpiresAt, status } = deriveStatus(r.created_at, now);
          return {
            id: r.id,
            instagram_username: r.instagram_username,
            competitors_count: arrayLength(r.competitor_usernames),
            created_at: r.created_at,
            updated_at: r.updated_at,
            cache_expires_at: r.expires_at ?? null,
            retention_expires_at: retentionExpiresAt,
            retention_status: status,
            posts_count: arrayLength(posts),
            dominant_format: cs ? safeString(cs["dominant_format"]) : null,
            engagement_rate: cs
              ? safeNumber(cs["average_engagement_rate"])
              : null,
            provider: r.provider,
            analysis_status: r.analysis_status,
          };
        });

        const body: ReportsListResponse = {
          success: true,
          retention_days: REPORT_RETENTION_DAYS,
          generated_at: new Date(now).toISOString(),
          total: rows.length,
          rows,
        };
        return json(body);
      },
    },
  },
});
