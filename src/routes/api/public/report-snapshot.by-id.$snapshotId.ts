/**
 * GET /api/public/report-snapshot/by-id/:snapshotId
 *
 * Lê um snapshot histórico imutável de `report_snapshots`. Se não encontrar,
 * faz fallback para `analysis_snapshots` (mesmo shape do endpoint legacy)
 * para manter URLs antigos válidos.
 *
 * Apenas leitura. NÃO chama Apify, OpenAI ou DataForSEO. NÃO regenera. NÃO
 * escreve. Devolve um shape compatível com o adapter
 * `snapshotToReportData` no cliente — `report_payload_jsonb` (ReportPayloadV1)
 * usa os mesmos nomes de campo (`profile`, `posts`, `metrics`,
 * `format_stats`, `content_summary`, `insights`, `competitor_summaries`,
 * `data_provenance`).
 */

import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { buildReportBenchmarkInput } from "@/lib/report/benchmark-input.server";
import type { SnapshotPayload } from "@/lib/report/snapshot-to-report-data";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    },
  });
}

function isExpired(
  expiresAt: string | null,
  expiredAt: string | null,
): boolean {
  if (expiredAt) return true;
  if (!expiresAt) return false;
  const t = Date.parse(expiresAt);
  return Number.isFinite(t) && t < Date.now();
}

export const Route = createFileRoute(
  "/api/public/report-snapshot/by-id/$snapshotId",
)({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const snapshotId = (params.snapshotId ?? "").trim();
        if (!UUID_RE.test(snapshotId)) {
          return json(
            {
              success: false,
              error_code: "INVALID_SNAPSHOT_ID",
              message: "Snapshot ID inválido.",
            },
            400,
          );
        }

        // 1. Try report_snapshots first (immutable historical store).
        const { data: rs, error: rsErr } = await supabaseAdmin
          .from("report_snapshots")
          .select(
            "id, instagram_username, report_payload_jsonb, payload_schema_version, report_version, algorithm_version, created_at, expires_at, expired_at",
          )
          .eq("id", snapshotId)
          .maybeSingle();

        if (rsErr) {
          return json(
            {
              success: false,
              error_code: "DB_ERROR",
              message: rsErr.message,
            },
            500,
          );
        }

        if (rs) {
          const expired = isExpired(rs.expires_at, rs.expired_at);
          if (expired) {
            return json({
              success: true,
              snapshot: {
                id: rs.id,
                instagram_username: rs.instagram_username,
                created_at: rs.created_at,
                expires_at: rs.expires_at,
                expired: true,
                payload_schema_version: rs.payload_schema_version,
                report_version: rs.report_version,
                algorithm_version: rs.algorithm_version,
                source: "report_snapshot",
              },
            });
          }

          const payload = (rs.report_payload_jsonb ?? {}) as SnapshotPayload;
          const benchmark = await buildReportBenchmarkInput(payload);

          return json({
            success: true,
            snapshot: {
              id: rs.id,
              instagram_username: rs.instagram_username,
              payload,
              meta: {
                generated_at: rs.created_at,
                instagram_username: rs.instagram_username,
              },
              created_at: rs.created_at,
              expires_at: rs.expires_at,
              expired: false,
              payload_schema_version: rs.payload_schema_version,
              report_version: rs.report_version,
              algorithm_version: rs.algorithm_version,
              benchmark,
              source: "report_snapshot",
            },
          });
        }

        // 2. Fallback: legacy analysis_snapshots (covers old URLs in emails /
        //    bookmarks before Phase 2). Mirrors the legacy endpoint shape.
        const { data: as, error: asErr } = await supabaseAdmin
          .from("analysis_snapshots")
          .select(
            "id, instagram_username, normalized_payload, created_at, updated_at, expires_at",
          )
          .eq("id", snapshotId)
          .maybeSingle();

        if (asErr) {
          return json(
            {
              success: false,
              error_code: "DB_ERROR",
              message: asErr.message,
            },
            500,
          );
        }

        if (!as) {
          return json(
            {
              success: false,
              error_code: "SNAPSHOT_NOT_FOUND",
              message: "Snapshot não encontrado.",
            },
            404,
          );
        }

        const payload = (as.normalized_payload ?? {}) as SnapshotPayload;
        const benchmark = await buildReportBenchmarkInput(payload);

        return json({
          success: true,
          snapshot: {
            id: as.id,
            instagram_username: as.instagram_username,
            payload,
            meta: {
              generated_at: as.created_at,
              instagram_username: as.instagram_username,
            },
            created_at: as.created_at,
            updated_at: as.updated_at,
            expires_at: as.expires_at,
            expired: isExpired(as.expires_at, null),
            benchmark,
            source: "legacy_analysis_snapshot",
          },
        });
      },
    },
  },
});