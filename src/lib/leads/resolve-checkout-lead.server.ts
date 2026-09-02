/**
 * Resolução de identidade para o checkout (Ronda 11B.1).
 *
 * Dois níveis distintos, nunca fundidos:
 *
 *   lead_session            → identidade GLOBAL (área privada, packs, histórico)
 *   report_capture_session  → identidade TEMPORÁRIA, scoped ao par
 *                             (lead, cache_key) do relatório que originou a
 *                             captura de email. Só autoriza operações sobre
 *                             esse relatório concreto.
 *
 * Esta função nunca promove a sessão scoped a sessão global e nunca emite
 * cookies. Nunca confia em `username`, email do browser, `lead_id` enviado
 * pelo cliente ou `cache_key` não assinada.
 */

import { getRequest } from "@tanstack/react-start/server";

import { getLeadFromCookie } from "./lead-cookie.server";
import { readCaptureLeadIdFromRequest } from "./report-capture-session.server";

export type CheckoutIdentitySource =
  | "lead_session"
  | "report_capture_session"
  | "none";

export interface CheckoutIdentity {
  leadId: string | null;
  source: CheckoutIdentitySource;
  /** `cache_key` do relatório quando a identidade é scoped. */
  cacheKey: string | null;
}

const NONE: CheckoutIdentity = {
  leadId: null,
  source: "none",
  cacheKey: null,
};

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Produtos que uma identidade scoped pode comprar. Packs e o diagnóstico
 * humano têm valor global e reutilizável — exigem `lead_session`.
 */
const SCOPED_ALLOWED_PRODUCTS = new Set<string>(["report_full_9"]);

export function isScopedCheckoutAllowed(productCode: string): boolean {
  return SCOPED_ALLOWED_PRODUCTS.has(productCode);
}

function safeGlobalLead(): string | null {
  try {
    return getLeadFromCookie();
  } catch {
    return null;
  }
}

function safeRequest(): Request | null {
  try {
    return getRequest();
  } catch {
    return null;
  }
}

/**
 * O CTA Pro envia o id do snapshot no parâmetro `report_cache_key`. O cookie
 * scoped está ligado à `cache_key` do snapshot. Traduzimos server-side, com
 * o mesmo padrão de `/api/public/report-access-state`.
 */
async function resolveCacheKey(reportRef: string): Promise<string | null> {
  if (!UUID_RE.test(reportRef)) {
    // Já é (ou pretende ser) uma cache_key literal.
    return reportRef;
  }
  try {
    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );
    const { data } = await supabaseAdmin
      .from("analysis_snapshots")
      .select("cache_key")
      .eq("id", reportRef)
      .maybeSingle();
    return data?.cache_key ?? null;
  } catch {
    return null;
  }
}

async function leadExists(leadId: string): Promise<boolean> {
  try {
    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );
    const { data } = await supabaseAdmin
      .from("leads")
      .select("id")
      .eq("id", leadId)
      .maybeSingle();
    return Boolean(data);
  } catch {
    return false;
  }
}

export async function resolveCheckoutIdentity(input: {
  /** `report_cache_key` recebido no URL do checkout (snapshot id ou cache_key). */
  reportRef?: string | null;
}): Promise<CheckoutIdentity> {
  // 1. Sessão global tem sempre precedência.
  const globalLead = safeGlobalLead();
  if (globalLead && (await leadExists(globalLead))) {
    return { leadId: globalLead, source: "lead_session", cacheKey: null };
  }

  // 2. Identidade scoped: obriga a referência de relatório.
  const reportRef = input.reportRef?.trim();
  if (!reportRef) return NONE;

  const request = safeRequest();
  if (!request) return NONE;

  const cacheKey = await resolveCacheKey(reportRef);
  if (!cacheKey) return NONE;

  let leadId: string | null = null;
  try {
    leadId = readCaptureLeadIdFromRequest(request, cacheKey);
  } catch {
    return NONE;
  }
  if (!leadId) return NONE;
  if (!(await leadExists(leadId))) return NONE;

  return { leadId, source: "report_capture_session", cacheKey };
}
