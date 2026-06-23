/**
 * POST /api/internal/run-report-pipeline
 *
 * Endpoint interno (mesmo origin) que corre `runReportPipeline` para um
 * dado `report_request_id`. Protegido por header `x-internal-token`.
 *
 * Existe para contornar a limitação do runtime Cloudflare Workers: depois
 * do `return Response`, qualquer promessa pendente é terminada. Em vez de
 * `runInBackground(runReportPipeline(...))` (fire-and-forget perdido),
 * usamos um subrequest HTTP para um endpoint dedicado cujo isolate
 * sobrevive até esta resposta ser enviada.
 */

import { createFileRoute } from "@tanstack/react-router";

import { runReportPipeline } from "@/lib/orchestration/run-report-pipeline";

const LOG_PREFIX = "[api/internal/run-report-pipeline]";

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

async function handlePost(request: Request): Promise<Response> {
  const expected = process.env.INTERNAL_API_TOKEN;
  if (!expected) {
    console.error(`${LOG_PREFIX} INTERNAL_API_TOKEN not configured`);
    return json({ ok: false, error: "server_misconfigured" }, 500);
  }

  const token = request.headers.get("x-internal-token");
  if (!token || token !== expected) {
    return json({ ok: false, error: "unauthorized" }, 401);
  }

  let body: { report_request_id?: unknown; origin?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return json({ ok: false, error: "invalid_json" }, 400);
  }

  const reportRequestId =
    typeof body.report_request_id === "string" ? body.report_request_id : null;
  if (!reportRequestId) {
    return json({ ok: false, error: "report_request_id required" }, 400);
  }

  const origin =
    (typeof body.origin === "string" && body.origin) ||
    process.env.PUBLIC_APP_BASE_URL ||
    process.env.APP_BASE_URL ||
    new URL(request.url).origin;

  try {
    await runReportPipeline(reportRequestId, origin);
    return json({ ok: true, report_request_id: reportRequestId }, 200);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unknown error";
    console.error(`${LOG_PREFIX} pipeline crashed`, msg);
    return json({ ok: false, error: msg }, 500);
  }
}

export const Route = createFileRoute("/api/internal/run-report-pipeline")({
  server: {
    handlers: {
      POST: async ({ request }) => handlePost(request),
    },
  },
});