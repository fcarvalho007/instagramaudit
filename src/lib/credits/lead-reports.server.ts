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
/**
 * Ponte "snapshot anónimo → lead".
 *
 * Quando a auditoria base corre sem email (`PUBLIC_BASELINE_NO_EMAIL=true`),
 * não existe `lead_reports` porque não havia lead no momento da análise.
 * No registo (ou no login pós-valor) associamos retroactivamente o snapshot
 * baseline do handle que a pessoa acabou de ver, para que o ownership
 * (`leadOwnsReport`) passe a existir e o Level 2 (Comment Intelligence) e
 * a área privada funcionem sem repetir scraping.
 *
 * Idempotente: assenta no UNIQUE(lead_id, cache_key) do upsert.
 */
export async function claimAnonymousBaselineReport(input: {
  leadId: string;
  handle: string;
  profileRelationship?: string | null;
}): Promise<{ claimed: boolean; cacheKey: string }> {
  const handle = input.handle.trim().replace(/^@/, "").toLowerCase();
  const { buildCacheKey, lookupSnapshot } = await import(
    "@/lib/analysis/cache"
  );
  const cacheKey = buildCacheKey(handle, [], "baseline");
  const snapshot = await lookupSnapshot(cacheKey);
  if (!snapshot) return { claimed: false, cacheKey };

  await upsertLeadReport({
    leadId: input.leadId,
    handle,
    cacheKey,
    analysisSnapshotId: snapshot.id,
    source: "anonymous_baseline_claim",
    profileRelationship: input.profileRelationship ?? null,
  });
  return { claimed: true, cacheKey };
}

/**
 * Actualiza (ou define) a relação declarada para um par lead↔relatório já
 * existente. Usado quando a pessoa responde à pergunta contextual depois de
 * o relatório já estar associado.
 */
export async function setReportRelationship(input: {
  leadId: string;
  cacheKey: string;
  profileRelationship: string;
}): Promise<void> {
  const { error } = await supabaseAdmin
    .from("lead_reports")
    .update({
      profile_relationship: input.profileRelationship,
      relationship_source: "user_declared",
    })
    .eq("lead_id", input.leadId)
    .eq("cache_key", input.cacheKey);
  if (error) {
    console.warn("[lead-reports] setReportRelationship failed", error.message);
  }
}
