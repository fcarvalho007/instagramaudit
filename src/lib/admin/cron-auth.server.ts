/**
 * Autenticação de hooks de cron (/api/public/hooks/sync-*).
 *
 * Aceita exclusivamente `x-internal-token: <INTERNAL_API_TOKEN>`.
 * O branch que aceitava `apikey: <SUPABASE_PUBLISHABLE_KEY>` foi removido
 * — a anon key não é prova de origem e estava efectivamente a permitir
 * qualquer chamada autenticada com a chave publishable do projecto.
 *
 * Devolve `null` quando autorizado, ou uma `Response 401` quando não.
 * NB: actualizar quaisquer jobs pg_cron / schedulers externos para
 * enviarem o header `x-internal-token`.
 */
export function authorizeCronHook(request: Request): Response | null {
  const internal = process.env.INTERNAL_API_TOKEN;
  const tokenHeader = request.headers.get("x-internal-token");
  if (internal && tokenHeader === internal) return null;
  return new Response("Unauthorized", { status: 401 });
}