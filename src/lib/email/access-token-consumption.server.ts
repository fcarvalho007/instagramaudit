/**
 * Consumo one-time dos links de acesso por email (Ronda 5B).
 *
 * O token continua a ser stateless (HMAC assinado), mas o `jti` é
 * registado em `email_access_tokens` no primeiro clique. Um segundo
 * clique encontra a linha e é recusado — evita que um link reencaminhado
 * ou recuperado de logs volte a emitir sessão.
 *
 * Fail-closed: se a escrita falhar por qualquer motivo que não seja
 * "já existe", recusamos o consumo em vez de emitir sessão às cegas.
 */

import { supabaseAdmin } from "@/integrations/supabase/client.server";

export type ConsumeResult = "consumed" | "already_used" | "error";

export async function consumeAccessToken(input: {
  jti: string;
  leadId: string;
  expiresAtSec: number;
}): Promise<ConsumeResult> {
  const { error } = await supabaseAdmin.from("email_access_tokens").insert({
    jti: input.jti,
    lead_id: input.leadId,
    expires_at: new Date(input.expiresAtSec * 1000).toISOString(),
  });
  if (!error) return "consumed";
  // 23505 = unique_violation → o token já foi usado.
  if ((error as { code?: string }).code === "23505") return "already_used";
  console.warn("[access-token] consume failed", error.message);
  return "error";
}

/**
 * Resolve o destino canónico a partir da `cache_key` transportada pelo
 * token. Devolve `null` quando não existe associação — o chamador cai
 * então na área privada.
 */
export async function resolveReportPath(input: {
  leadId: string;
  reportRef: string | null;
}): Promise<string | null> {
  if (!input.reportRef) return null;
  const { data } = await supabaseAdmin
    .from("lead_reports")
    .select("handle")
    .eq("lead_id", input.leadId)
    .eq("cache_key", input.reportRef)
    .maybeSingle();
  if (!data?.handle) return null;
  return `/analyze/${encodeURIComponent(data.handle.replace(/^@/, ""))}`;
}
