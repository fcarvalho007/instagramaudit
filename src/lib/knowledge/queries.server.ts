/**
 * Server-only helpers para a Knowledge Base.
 *
 * Toda a leitura/escrita usa `supabaseAdmin` (service role) — as 5 tabelas
 * `knowledge_*` têm RLS activa sem policies, logo o cliente público não as
 * vê. O admin é validado **antes** de chegar aqui, em cada server route,
 * via `requireAdminSession()`.
 *
 * Antes de cada INSERT/UPDATE definimos `app.current_admin_email` para o
 * trigger `knowledge_log_change()` registar o autor em `knowledge_history`.
 */

import { supabaseAdmin } from "@/integrations/supabase/client.server";
import type {
  BenchmarkFormat,
  BenchmarkOrigin,
  BenchmarkTier,
  KnowledgeBenchmark,
  KnowledgeNote,
  KnowledgeOverview,
  KnowledgeSource,
  KnowledgeSuggestion,
  NoteCategory,
  SourceType,
} from "./types";

/**
 * Define o email do admin actual na sessão Postgres para o trigger de
 * auditoria capturar quem fez a alteração. `set_config(..., true)` =
 * SET LOCAL → vive só dentro da transação implícita do statement seguinte.
 *
 * Best-effort: se falhar não bloqueia a operação, só perde o autor.
 */
async function tagAdmin(email: string): Promise<void> {
  try {
    await supabaseAdmin.rpc("set_admin_email_session", { p_email: email });
  } catch {
    // ignorar — auditoria sem autor é melhor do que falhar a operação
  }
}

// =====================================================================
// LEITURA
// =====================================================================

export async function listBenchmarks(opts?: {
  format?: BenchmarkFormat | "all";
}): Promise<KnowledgeBenchmark[]> {
  let q = supabaseAdmin
    .from("knowledge_benchmarks")
    .select(
      "id, tier, format, engagement_pct, sample_size, source_id, notes, valid_from, valid_to, origin, created_by_email, created_at, updated_at, knowledge_sources(name)",
    )
    .order("tier", { ascending: true })
    .order("format", { ascending: true });
  if (opts?.format && opts.format !== "all") {
    q = q.eq("format", opts.format);
  }
  const { data, error } = await q;
  if (error) throw new Error(`listBenchmarks: ${error.message}`);
  return (data ?? []).map((row) => {
    const source = (row as { knowledge_sources: { name: string } | null })
      .knowledge_sources;
    return {
      id: row.id as string,
      tier: row.tier as BenchmarkTier,
      format: row.format as BenchmarkFormat,
      engagement_pct: Number(row.engagement_pct),
      sample_size: row.sample_size as number,
      source_id: row.source_id as string | null,
      source_name: source?.name ?? null,
      notes: (row.notes as string | null) ?? null,
      valid_from: row.valid_from as string,
      valid_to: row.valid_to as string | null,
      origin: row.origin as BenchmarkOrigin,
      created_by_email: row.created_by_email as string | null,
      created_at: row.created_at as string,
      updated_at: row.updated_at as string,
    };
  });
}

export async function listSources(): Promise<KnowledgeSource[]> {
  const { data, error } = await supabaseAdmin
    .from("knowledge_sources")
    .select("*")
    .order("name", { ascending: true });
  if (error) throw new Error(`listSources: ${error.message}`);

  // Conta citações em benchmarks + notas (queries leves separadas)
  const ids = (data ?? []).map((r) => r.id as string);
  const counts = new Map<string, number>();
  if (ids.length > 0) {
    const [{ data: bRows }, { data: nRows }] = await Promise.all([
      supabaseAdmin
        .from("knowledge_benchmarks")
        .select("source_id")
        .in("source_id", ids),
      supabaseAdmin
        .from("knowledge_notes")
        .select("source_id")
        .in("source_id", ids),
    ]);
    for (const r of [...(bRows ?? []), ...(nRows ?? [])]) {
      const sid = (r as { source_id: string | null }).source_id;
      if (!sid) continue;
      counts.set(sid, (counts.get(sid) ?? 0) + 1);
    }
  }

  return (data ?? []).map((row) => ({
    id: row.id as string,
    name: row.name as string,
    type: (row.type as SourceType | null) ?? null,
    url: (row.url as string | null) ?? null,
    published_at: (row.published_at as string | null) ?? null,
    sample_size: (row.sample_size as number | null) ?? null,
    notes: (row.notes as string | null) ?? null,
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
    citations_count: counts.get(row.id as string) ?? 0,
  }));
}

export async function listNotes(): Promise<KnowledgeNote[]> {
  const { data, error } = await supabaseAdmin
    .from("knowledge_notes")
    .select(
      "id, category, vertical, title, body, source_id, valid_from, valid_to, archived, created_by_email, created_at, updated_at, knowledge_sources(name)",
    )
    .order("archived", { ascending: true })
    .order("created_at", { ascending: false });
  if (error) throw new Error(`listNotes: ${error.message}`);
  return (data ?? []).map((row) => {
    const source = (row as { knowledge_sources: { name: string } | null })
      .knowledge_sources;
    return {
      id: row.id as string,
      category: row.category as NoteCategory,
      vertical: (row.vertical as string | null) ?? null,
      title: row.title as string,
      body: row.body as string,
      source_id: (row.source_id as string | null) ?? null,
      source_name: source?.name ?? null,
      valid_from: (row.valid_from as string | null) ?? null,
      valid_to: (row.valid_to as string | null) ?? null,
      archived: Boolean(row.archived),
      created_by_email: (row.created_by_email as string | null) ?? null,
      created_at: row.created_at as string,
      updated_at: row.updated_at as string,
    };
  });
}

export async function listSuggestions(): Promise<KnowledgeSuggestion[]> {
  const { data, error } = await supabaseAdmin
    .from("knowledge_suggestions")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw new Error(`listSuggestions: ${error.message}`);
  return (data ?? []).map((row) => ({
    id: row.id as string,
    type: row.type as KnowledgeSuggestion["type"],
    payload: (row.payload as Record<string, unknown>) ?? {},
    reason: (row.reason as string | null) ?? null,
    status: row.status as KnowledgeSuggestion["status"],
    reviewed_by_email: (row.reviewed_by_email as string | null) ?? null,
    reviewed_at: (row.reviewed_at as string | null) ?? null,
    created_at: row.created_at as string,
  }));
}

export async function getOverview(): Promise<KnowledgeOverview> {
  const [benchmarks, sources, notes, suggestions] = await Promise.all([
    supabaseAdmin
      .from("knowledge_benchmarks")
      .select("tier, format, origin, updated_at, created_by_email", { count: "exact" }),
    supabaseAdmin
      .from("knowledge_sources")
      .select("id, updated_at", { count: "exact" }),
    supabaseAdmin
      .from("knowledge_notes")
      .select("id, archived, updated_at", { count: "exact" })
      .eq("archived", false),
    supabaseAdmin
      .from("knowledge_suggestions")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending"),
  ]);

  if (benchmarks.error) throw new Error(`overview/benchmarks: ${benchmarks.error.message}`);
  if (sources.error) throw new Error(`overview/sources: ${sources.error.message}`);
  if (notes.error) throw new Error(`overview/notes: ${notes.error.message}`);
  if (suggestions.error) throw new Error(`overview/suggestions: ${suggestions.error.message}`);

  const bRows = benchmarks.data ?? [];
  const total =
    (benchmarks.count ?? bRows.length) +
    (sources.count ?? sources.data?.length ?? 0) +
    (notes.count ?? notes.data?.length ?? 0);

  let manualCount = 0;
  let systemCount = 0;
  for (const r of bRows) {
    const o = r.origin as BenchmarkOrigin;
    if (o === "manual") manualCount += 1;
    else systemCount += 1;
  }

  // Cobertura por tier: quantos tiers têm ≥3 benchmarks documentados.
  const tierCounts = new Map<BenchmarkTier, number>();
  for (const r of bRows) {
    const t = r.tier as BenchmarkTier;
    tierCounts.set(t, (tierCounts.get(t) ?? 0) + 1);
  }
  const tiers: BenchmarkTier[] = ["nano", "micro", "mid", "macro"];
  const tierCoverage = tiers.filter((t) => (tierCounts.get(t) ?? 0) >= 3).length;

  // Última actualização entre as 3 entidades editáveis.
  let lastAt: string | null = null;
  let lastBy: string | null = null;
  let lastLabel: string | null = null;
  for (const r of bRows) {
    const at = r.updated_at as string;
    if (!lastAt || at > lastAt) {
      lastAt = at;
      lastBy = (r.created_by_email as string | null) ?? null;
      lastLabel = `Benchmark ${String(r.format)} ${String(r.tier)}`;
    }
  }
  for (const r of sources.data ?? []) {
    const at = r.updated_at as string;
    if (!lastAt || at > lastAt) {
      lastAt = at;
      lastBy = null;
      lastLabel = "Fonte";
    }
  }
  for (const r of notes.data ?? []) {
    const at = r.updated_at as string;
    if (!lastAt || at > lastAt) {
      lastAt = at;
      lastBy = null;
      lastLabel = "Nota editorial";
    }
  }

  return {
    total_entries: total,
    manual_count: manualCount + (sources.count ?? 0) + (notes.count ?? 0), // todas as não-bench são manuais por agora
    system_count: systemCount,
    tier_coverage: tierCoverage,
    tier_total: tiers.length,
    last_update: { at: lastAt, by: lastBy, label: lastLabel },
    pending_suggestions: suggestions.count ?? 0,
  };
}

// =====================================================================
// ESCRITA — benchmarks
// =====================================================================

export interface UpsertBenchmarkInput {
  id?: string;
  tier: BenchmarkTier;
  format: BenchmarkFormat;
  engagement_pct: number;
  sample_size: number;
  source_id?: string | null;
  notes?: string | null;
  valid_from: string;
  valid_to?: string | null;
  origin?: BenchmarkOrigin;
}

export async function upsertBenchmark(
  input: UpsertBenchmarkInput,
  adminEmail: string,
): Promise<KnowledgeBenchmark> {
  await tagAdmin(adminEmail);
  const payload = {
    tier: input.tier,
    format: input.format,
    engagement_pct: input.engagement_pct,
    sample_size: input.sample_size,
    source_id: input.source_id ?? null,
    notes: input.notes ?? null,
    valid_from: input.valid_from,
    valid_to: input.valid_to ?? null,
    origin: input.origin ?? "manual",
    created_by_email: adminEmail,
  };
  if (input.id) {
    const { error } = await supabaseAdmin
      .from("knowledge_benchmarks")
      .update(payload)
      .eq("id", input.id);
    if (error) throw new Error(`updateBenchmark: ${error.message}`);
  } else {
    const { error } = await supabaseAdmin
      .from("knowledge_benchmarks")
      .insert(payload);
    if (error) throw new Error(`insertBenchmark: ${error.message}`);
  }

  // Devolve a linha actualizada (com source_name).
  const list = await listBenchmarks();
  const found =
    list.find((b) =>
      input.id
        ? b.id === input.id
        : b.tier === input.tier && b.format === input.format && b.valid_from === input.valid_from,
    ) ?? list[0];
  return found;
}

export async function archiveBenchmark(id: string, adminEmail: string): Promise<void> {
  await tagAdmin(adminEmail);
  const today = new Date().toISOString().slice(0, 10);
  const { error } = await supabaseAdmin
    .from("knowledge_benchmarks")
    .update({ valid_to: today })
    .eq("id", id)
    .is("valid_to", null);
  if (error) throw new Error(`archiveBenchmark: ${error.message}`);
}

// =====================================================================
// ESCRITA — sources
// =====================================================================

export interface CreateSourceInput {
  name: string;
  type?: SourceType | null;
  url?: string | null;
  published_at?: string | null;
  sample_size?: number | null;
  notes?: string | null;
}

export async function createSource(
  input: CreateSourceInput,
  adminEmail: string,
): Promise<KnowledgeSource> {
  await tagAdmin(adminEmail);
  const { data, error } = await supabaseAdmin
    .from("knowledge_sources")
    .insert({
      name: input.name,
      type: input.type ?? null,
      url: input.url ?? null,
      published_at: input.published_at ?? null,
      sample_size: input.sample_size ?? null,
      notes: input.notes ?? null,
    })
    .select("*")
    .single();
  if (error || !data) throw new Error(`createSource: ${error?.message ?? "no row"}`);
  return {
    id: data.id as string,
    name: data.name as string,
    type: (data.type as SourceType | null) ?? null,
    url: (data.url as string | null) ?? null,
    published_at: (data.published_at as string | null) ?? null,
    sample_size: (data.sample_size as number | null) ?? null,
    notes: (data.notes as string | null) ?? null,
    created_at: data.created_at as string,
    updated_at: data.updated_at as string,
    citations_count: 0,
  };
}

// =====================================================================
// ESCRITA — notes
// =====================================================================

export interface UpsertNoteInput {
  id?: string;
  category: NoteCategory;
  vertical?: string | null;
  title: string;
  body: string;
  source_id?: string | null;
  valid_from?: string | null;
  valid_to?: string | null;
}

export async function upsertNote(
  input: UpsertNoteInput,
  adminEmail: string,
): Promise<void> {
  await tagAdmin(adminEmail);
  const payload = {
    category: input.category,
    vertical: input.category === "vertical" ? input.vertical ?? null : null,
    title: input.title,
    body: input.body,
    source_id: input.source_id ?? null,
    valid_from: input.valid_from ?? null,
    valid_to: input.valid_to ?? null,
    created_by_email: adminEmail,
  };
  if (input.id) {
    const { error } = await supabaseAdmin
      .from("knowledge_notes")
      .update(payload)
      .eq("id", input.id);
    if (error) throw new Error(`updateNote: ${error.message}`);
  } else {
    const { error } = await supabaseAdmin.from("knowledge_notes").insert(payload);
    if (error) throw new Error(`insertNote: ${error.message}`);
  }
}

export async function archiveNote(id: string, adminEmail: string): Promise<void> {
  await tagAdmin(adminEmail);
  const { error } = await supabaseAdmin
    .from("knowledge_notes")
    .update({ archived: true })
    .eq("id", id);
  if (error) throw new Error(`archiveNote: ${error.message}`);
}

// =====================================================================
// HISTÓRICO (consultado pelo drawer)
// =====================================================================

export async function getEntityHistory(
  entityType: "benchmark" | "source" | "note",
  entityId: string,
) {
  const { data, error } = await supabaseAdmin
    .from("knowledge_history")
    .select("*")
    .eq("entity_type", entityType)
    .eq("entity_id", entityId)
    .order("changed_at", { ascending: false })
    .limit(20);
  if (error) throw new Error(`getEntityHistory: ${error.message}`);
  return data ?? [];
}

// =====================================================================
// EXPORT (dataset completo)
// =====================================================================

export async function exportDataset() {
  const [benchmarks, sources, notes] = await Promise.all([
    listBenchmarks(),
    listSources(),
    listNotes(),
  ]);
  return {
    exported_at: new Date().toISOString(),
    benchmarks,
    sources,
    notes,
  };
}