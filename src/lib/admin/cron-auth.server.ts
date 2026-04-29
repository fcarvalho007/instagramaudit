/**
 * Autenticação de hooks de cron (/api/public/hooks/sync-*).
 *
 * Aceita uma de duas credenciais:
 *   - header `x-internal-token` igual a `INTERNAL_API_TOKEN` (chamadas server-to-server)
 *   - header `apikey` igual a `SUPABASE_PUBLISHABLE_KEY` (chamada via pg_net pelo pg_cron)
 *
 * Devolve `null` quando autorizado, ou uma `Response 401` quando não.
 */
export function authorizeCronHook(request: Request): Response | null {
  const internal = process.env.INTERNAL_API_TOKEN;
  const apiKey =
    process.env.SUPABASE_PUBLISHABLE_KEY ?? process.env.SUPABASE_ANON_KEY;

  const tokenHeader = request.headers.get("x-internal-token");
  const apiKeyHeader = request.headers.get("apikey");

  const tokenOk = !!internal && tokenHeader === internal;
  const apiKeyOk = !!apiKey && apiKeyHeader === apiKey;

  if (tokenOk || apiKeyOk) return null;
  return new Response("Unauthorized", { status: 401 });
}