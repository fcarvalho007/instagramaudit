import { createFileRoute } from "@tanstack/react-router";
import { requireAdminSession } from "@/lib/admin/session";
import { syncScrapeCreatorsBalance } from "@/lib/admin/scrapecreators-costs.server";

/**
 * POST /api/admin/sistema/scrapecreators-sync-balance
 *
 * Consulta o saldo oficial do ScrapeCreators. CONSOME 1 CRÉDITO — só é
 * invocado por acção manual confirmada no admin. Nunca em mount/polling/cron.
 */
export const Route = createFileRoute("/api/admin/sistema/scrapecreators-sync-balance")({
  server: {
    handlers: {
      POST: async () => {
        try {
          await requireAdminSession();
        } catch (res) {
          if (res instanceof Response) return res;
          throw res;
        }
        const result = await syncScrapeCreatorsBalance();
        return Response.json(result, { status: result.ok ? 200 : 502 });
      },
    },
  },
});
