/**
 * Área privada acessível com `lead_session` (Ronda 5B).
 *
 * Estas funções não usam `requireSupabaseAuth`: a autorização vem do
 * cookie `lead_session`, assinado com HMAC e emitido apenas depois de o
 * email ter sido verificado através do magic link. Sem cookie válido
 * devolvem `null` / lista vazia — nunca dados de outro lead.
 */

import { createServerFn } from "@tanstack/react-start";

export interface LeadAudit {
  id: string;
  handle: string;
  cacheKey: string;
  createdAt: string;
  analysisSnapshotId: string | null;
  source: string;
  profileRelationship: string | null;
}

export interface LeadSessionState {
  hasLeadSession: boolean;
  email: string | null;
  credits: number;
}

export const getLeadSessionState = createServerFn({ method: "GET" }).handler(
  async (): Promise<LeadSessionState> => {
    const { getLeadFromCookie } = await import("@/lib/leads/lead-cookie.server");
    const leadId = getLeadFromCookie();
    if (!leadId) return { hasLeadSession: false, email: null, credits: 0 };

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: lead } = await supabaseAdmin
      .from("leads")
      .select("email")
      .eq("id", leadId)
      .maybeSingle();
    if (!lead) return { hasLeadSession: false, email: null, credits: 0 };

    let credits = 0;
    try {
      const { getBalance } = await import("@/lib/credits/credits.server");
      credits = await getBalance(leadId);
    } catch {
      credits = 0;
    }
    return { hasLeadSession: true, email: lead.email ?? null, credits };
  },
);

export const getLeadAudits = createServerFn({ method: "GET" }).handler(
  async (): Promise<LeadAudit[]> => {
    const { getLeadFromCookie } = await import("@/lib/leads/lead-cookie.server");
    const leadId = getLeadFromCookie();
    if (!leadId) return [];

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("lead_reports")
      .select(
        "id, handle, cache_key, created_at, analysis_snapshot_id, source, profile_relationship",
      )
      .eq("lead_id", leadId)
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) return [];

    const { recordAccessEvent } = await import("@/lib/leads/access-events.server");
    void recordAccessEvent({ eventType: "private_area_viewed", leadId });

    return (data ?? []).map((r) => ({
      id: r.id,
      handle: r.handle,
      cacheKey: r.cache_key,
      createdAt: r.created_at,
      analysisSnapshotId: r.analysis_snapshot_id,
      source: r.source,
      profileRelationship: r.profile_relationship,
    }));
  },
);

/** Termina a sessão de lead (logout do caminho passwordless). */
export const endLeadSession = createServerFn({ method: "POST" }).handler(
  async (): Promise<{ ok: true }> => {
    const { clearLeadCookie } = await import("@/lib/leads/lead-cookie.server");
    clearLeadCookie();
    return { ok: true };
  },
);
