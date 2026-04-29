/**
 * POST /api/admin/sistema/sync-now
 *
 * Invoca os 3 sync jobs em paralelo (server-to-server, com o token interno).
 * Devolve o resultado de cada um. Falhas individuais não interrompem os outros.
 */

import { createFileRoute } from "@tanstack/react-router";
import { requireAdminSession } from "@/lib/admin/session";
import {
  syncApifyCosts,
  syncDataForSeoCosts,
  syncOpenAiCosts,
} from "@/lib/admin/cost-sync.server";

export const Route = createFileRoute("/api/admin/sistema/sync-now")({
  server: {
    handlers: {
      POST: async () => {
        try { await requireAdminSession(); }
        catch (res) { if (res instanceof Response) return res; throw res; }

        const [apify, dfs, openai] = await Promise.allSettled([
          syncApifyCosts(),
          syncDataForSeoCosts(),
          syncOpenAiCosts(),
        ]);
        const unwrap = <T,>(r: PromiseSettledResult<T>): T | { ok: false; message: string } =>
          r.status === "fulfilled" ? r.value : { ok: false, message: r.reason?.message ?? "rejected" };
        return Response.json({
          apify: unwrap(apify),
          dataforseo: unwrap(dfs),
          openai: unwrap(openai),
        });
      },
    },
  },
});
