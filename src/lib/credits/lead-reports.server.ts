/**
 * lead_reports — associação persistida entre um lead e os relatórios
 * (cache_key / snapshot) que já lhe foram entregues.
 *
 * Usado pelo gate de créditos em /api/analyze-public-v1 para decidir se
 * um cache hit <24h deve consumir crédito (relatório novo para o lead)
 * ou ser servido sem custo (relatório já atribuído a este lead).
 *
 * Acesso exclusivamente via service role; sem RLS policy pública.
 */

import { supabaseAdmin } from "@/integrations/supabase/client.server";

export async function leadOwnsReport(
  leadId: string,
  cacheKey: string,
): Promise<boolean> {
  const { data, error } = await supabaseAdmin
    .from("lead_reports")
    .select("id")
    .eq("lead_id", leadId)
    .eq("cache_key", cacheKey)
    .limit(1)
    .maybeSingle();
  if (error) {
    // Best-effort: se a leitura falhar, assumir que NÃO está associado
    // (o gate apenas perde a optimização de "0 créditos"; nunca cobra
    // a mais nem deixa passar sem cookie).
    console.warn("[lead-reports] leadOwnsReport failed", error.message);
    return false;
  }
  return !!data;
}

export async function upsertLeadReport(input: {
  leadId: string;
  handle: string;
  cacheKey: string;
  analysisSnapshotId?: string | null;
  source?: string;
}): Promise<void> {
  const { error } = await supabaseAdmin
    .from("lead_reports")
    .upsert(
      {
        lead_id: input.leadId,
        handle: input.handle,
        cache_key: input.cacheKey,
        analysis_snapshot_id: input.analysisSnapshotId ?? null,
        source: input.source ?? "analyze_public_v1",
      },
      { onConflict: "lead_id,cache_key", ignoreDuplicates: true },
    );
  if (error) {
    // Não-fatal: associação é um aumento de qualidade do gate, não bloqueia
    // a resposta ao utilizador. Tracking via log.
    console.warn("[lead-reports] upsertLeadReport failed", error.message);
  }
}