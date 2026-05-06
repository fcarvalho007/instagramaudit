/**
 * GET /api/admin/billing-reconciliation?days=30
 * POST /api/admin/billing-reconciliation  (insert import row)
 */

import { createFileRoute } from "@tanstack/react-router";
import { requireAdminSession } from "@/lib/admin/session";
import {
  getReconciliationData,
  insertBillingImportRow,
  type BillingImportInput,
} from "@/lib/admin/billing-reconciliation.server";

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export const Route = createFileRoute("/api/admin/billing-reconciliation")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const denied = await requireAdminSession(request);
        if (denied) return denied;

        const url = new URL(request.url);
        const days = Math.min(Number(url.searchParams.get("days")) || 30, 365);

        const data = await getReconciliationData(days);
        return json(data);
      },
      POST: async ({ request }) => {
        const denied = await requireAdminSession(request);
        if (denied) return denied;

        const body = (await request.json()) as BillingImportInput;

        if (!body.provider || !body.period_start || !body.period_end || body.actual_cost_usd == null) {
          return json({ success: false, message: "Campos obrigatórios em falta" }, 400);
        }

        try {
          const result = await insertBillingImportRow({
            ...body,
            source: body.source || "manual",
          });
          return json(result, 201);
        } catch (e: unknown) {
          const msg = e instanceof Error ? e.message : "Erro desconhecido";
          return json({ success: false, message: msg }, 500);
        }
      },
    },
  },
});