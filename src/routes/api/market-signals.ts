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
            },
            400,
          );
        }

        const plan = parsed.plan;

        // 2. Kill-switch (cheap, no DB).
        if (!isDataForSeoEnabled()) {
          return json({
            status: "disabled",
            plan,
            message: "DataForSEO está desativado.",
          });
        }

        // 3. Carregar snapshot real (anti-abuso: precisa de ID válido).
        const { data, error } = await supabaseAdmin
          .from("analysis_snapshots")
          .select("id, instagram_username, normalized_payload")
          .eq("id", parsed.snapshotId)
          .maybeSingle();

        if (error) {
          return json({
            status: "error",
            plan,
            message: error.message,
          });
        }
        if (!data) {
          return json(
            { status: "error", plan, message: "Snapshot não encontrado." },
            404,
          );
        }

        const handle = (data.instagram_username ?? "").toLowerCase();

        // 4. Allowlist (testing mode).
        if (!isAllowed(handle)) {
          return json({
            status: "blocked",
            plan,
            message: `Handle "${handle}" fora da allowlist DataForSEO.`,
          });
        }

        // 5. Orquestrar (com timeout duro de 60s).
        const payload = (data.normalized_payload ?? {}) as SnapshotPayload;
        const result = await buildMarketSignals(payload, {
          plan,
          totalTimeoutMs: 60_000,
        });

        return json(result);
      },
    },
  },
});