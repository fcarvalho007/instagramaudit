/**
 * POST /api/admin/apify-backfill-actual-cost
 *
 * Admin-only. Lê `apify_run_id` em `provider_call_logs` e `apify_lab_runs`
 * com `actual_cost_usd` vazio e popula com `usageTotalUsd` do endpoint
 * `GET /v2/actor-runs/{runId}`. Não arranca novos actor runs.
 *
 * Body:
 * {
 *   "scope": "both" | "provider_call_logs" | "apify_lab_runs",
 *   "limit": 500,
 *   "driftThresholdPct": 30,
 *   "dryRun": false
 * }
 */

import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { requireAdminSession } from "@/lib/admin/session";
import { backfillApifyActualCost } from "@/lib/admin/apify-actual-cost-backfill.server";

const BodySchema = z.object({
  scope: z.enum(["both", "provider_call_logs", "apify_lab_runs"]).optional(),
  limit: z.number().int().min(1).max(1000).optional(),
  driftThresholdPct: z.number().min(0).max(1000).optional(),
  dryRun: z.boolean().optional(),
});

export const Route = createFileRoute("/api/admin/apify-backfill-actual-cost")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          await requireAdminSession();
        } catch (res) {
          if (res instanceof Response) return res;
          throw res;
        }

        let body: unknown = {};
        try {
          const text = await request.text();
          if (text.trim().length > 0) body = JSON.parse(text);
        } catch {
          return Response.json(
            { success: false, error: "JSON inválido" },
            { status: 400 },
          );
        }

        const parsed = BodySchema.safeParse(body);
        if (!parsed.success) {
          return Response.json(
            { success: false, error: parsed.error.message },
            { status: 400 },
          );
        }

        const result = await backfillApifyActualCost(parsed.data);
        return Response.json({ success: result.ok, result });
      },
    },
  },
});