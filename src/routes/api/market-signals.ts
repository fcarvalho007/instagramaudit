/**
 * POST /api/market-signals
 *
 * Camada não-bloqueante "Sinais de Mercado" sobre um snapshot Apify já
 * existente em `analysis_snapshots`. Não cria, não regenera e não escreve
 * dados de Instagram. Apenas chama DataForSEO (gated por kill-switch +
 * allowlist + caps por plano) e devolve um envelope tipado.
 *
 * Contrato:
 *   - O endpoint NUNCA lança HTTP 5xx por falha do DataForSEO. Devolve
 *     `{ status: "timeout" | "error" | "blocked" | "disabled" | ... }`
 *     para o client renderizar fallback editorial.
 *   - Exige `snapshotId` válido — assim só um relatório legítimo já gerado
 *     pode despoletar enriquecimento (defesa anti-abuso simples).
 *
 * Body:
 *   { snapshotId: string, plan?: "free" | "paid" }
 */
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import {
  isAllowed,
  isDataForSeoEnabled,
} from "@/lib/security/dataforseo-allowlist";
import { buildMarketSignals } from "@/lib/dataforseo/market-signals";
import type { SnapshotPayload } from "@/lib/report/snapshot-to-report-data";
import {
  buildPersistedSummary,
  decideCacheTtlSeconds,
  readCachedSummary,
  summaryToPublicEnvelope,
  type PersistedMarketSignals,
} from "@/lib/market-signals/cache";

const BodySchema = z.object({
  snapshotId: z.string().uuid(),
  plan: z.enum(["free", "paid"]).optional().default("free"),
});

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    },
  });
}

type CacheStatus = "hit" | "miss" | "disabled" | "blocked";
type CostSource = "provider_reported" | "cache" | "none";

function withMeta(
  body: Record<string, unknown>,
  meta: { cache_status: CacheStatus; cost_usd: number; cost_source: CostSource },
): Record<string, unknown> {
  return { ...body, ...meta };
}

export const Route = createFileRoute("/api/market-signals")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        // 1. Parse + validate body.
        let parsed: z.infer<typeof BodySchema>;
        try {
          const raw = (await request.json()) as unknown;
          parsed = BodySchema.parse(raw);
        } catch (err) {
          return json(
            {
              status: "error",
              message:
                err instanceof Error ? err.message : "invalid body",
              cache_status: "miss" as const,
              cost_usd: 0,
              cost_source: "none" as const,
            },
            400,
          );
        }

        const plan = parsed.plan;

        // 2. Kill-switch (cheap, no DB).
        if (!isDataForSeoEnabled()) {
          return json(
            withMeta(
              {
                status: "disabled",
                plan,
                message: "DataForSEO está desativado.",
              },
              { cache_status: "disabled", cost_usd: 0, cost_source: "none" },
            ),
          );
        }

        // 3. Carregar snapshot real (anti-abuso: precisa de ID válido).
        const { data, error } = await supabaseAdmin
          .from("analysis_snapshots")
          .select("id, instagram_username, normalized_payload")
          .eq("id", parsed.snapshotId)
          .maybeSingle();

        if (error) {
          return json(
            withMeta(
              { status: "error", plan, message: error.message },
              { cache_status: "miss", cost_usd: 0, cost_source: "none" },
            ),
          );
        }
        if (!data) {
          return json(
            withMeta(
              { status: "error", plan, message: "Snapshot não encontrado." },
              { cache_status: "miss", cost_usd: 0, cost_source: "none" },
            ),
            404,
          );
        }

        const handle = (data.instagram_username ?? "").toLowerCase();

        // 4. Allowlist (testing mode).
        if (!isAllowed(handle)) {
          return json(
            withMeta(
              {
                status: "blocked",
                plan,
                message: `Handle "${handle}" fora da allowlist DataForSEO.`,
              },
              { cache_status: "blocked", cost_usd: 0, cost_source: "none" },
            ),
          );
        }

        // 5. Cache lookup — read the persisted summary from normalized_payload.
        //    Same snapshotId + plan, within TTL → no provider call at all.
        const normalized = (data.normalized_payload ?? {}) as Record<
          string,
          unknown
        >;
        const cached = readCachedSummary(normalized, plan);
        if (cached) {
          const envelope = summaryToPublicEnvelope(cached) as unknown as Record<
            string,
            unknown
          >;
          return json(
            withMeta(envelope, {
              cache_status: "hit",
              cost_usd: cached.provider_cost_usd,
              cost_source: "cache",
            }),
          );
        }

        // 6. Cache miss — orchestrate one DataForSEO attempt (timeout 60s).
        const startedAt = new Date();
        const payload = normalized as SnapshotPayload;
        const result = await buildMarketSignals(payload, {
          ownerHandle: handle,
          plan,
          totalTimeoutMs: 60_000,
        });

        // 7. Collect provider cost + log ids from provider_call_logs rows
        //    created during this request. Best-effort; any failure leaves
        //    cost at 0 but still returns a usable envelope to the UI.
        let providerCostUsd = 0;
        let providerCallLogIds: string[] = [];
        try {
          const { data: logs } = await supabaseAdmin
            .from("provider_call_logs")
            .select("id, actual_cost_usd")
            .eq("provider", "dataforseo")
            .eq("handle", handle)
            .gte("created_at", startedAt.toISOString());
          if (Array.isArray(logs)) {
            providerCallLogIds = logs.map((l) => l.id as string);
            providerCostUsd = logs.reduce(
              (sum, l) =>
                sum + (typeof l.actual_cost_usd === "number" ? l.actual_cost_usd : 0),
              0,
            );
          }
        } catch (err) {
          console.error("[market-signals] failed to read provider_call_logs", err);
        }

        // 8. Persist the summary if status is cacheable.
        const ttlSeconds = decideCacheTtlSeconds(result);
        let persistedCostSource: CostSource = providerCostUsd > 0
          ? "provider_reported"
          : "none";

        if (ttlSeconds !== null) {
          const summary: PersistedMarketSignals = buildPersistedSummary({
            result,
            plan,
            ttlSeconds,
            providerCostUsd,
            providerCallLogIds,
            now: startedAt,
          });
          try {
            const key =
              plan === "free" ? "market_signals_free" : "market_signals_paid";
            // JSON round-trip: forces the value to plain Json so the typed
            // Supabase client accepts it on `normalized_payload` (jsonb).
            const nextPayload = JSON.parse(
              JSON.stringify({ ...normalized, [key]: summary }),
            );
            const { error: writeErr } = await supabaseAdmin
              .from("analysis_snapshots")
              .update({ normalized_payload: nextPayload })
              .eq("id", data.id);
            if (writeErr) {
              console.error(
                "[market-signals] failed to persist summary",
                writeErr,
              );
            }
          } catch (err) {
            console.error("[market-signals] persist threw", err);
          }
        }

          return json(
            withMeta(result as unknown as Record<string, unknown>, {
              cache_status: "miss",
              cost_usd: providerCostUsd,
              cost_source: persistedCostSource,
            }),
          );
      },
    },
  },
});