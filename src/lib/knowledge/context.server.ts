/**
 * Helper server-only que entrega contexto verificado da Knowledge Base
 * ao orquestrador de insights (`src/lib/insights/openai-insights.server.ts`).
 *
 * **Não é exposto via HTTP.** A KB é interna; o único consumidor é a
 * camada de geração de insights, que injecta o contexto no prompt de
 * sistema do GPT.
 *
 * Wiring real fica para o R3 — este módulo já entrega o shape final.
 */

import { supabaseAdmin } from "@/integrations/supabase/client.server";
import type {
  BenchmarkFormat,
  BenchmarkTier,
  KnowledgeContext,
} from "./types";

const EMPTY: KnowledgeContext = {
  benchmarks: [],
  notes: [],
  metadata: { last_updated: new Date(0).toISOString(), total_entries: 0 },
};

export interface KnowledgeContextInput {
  tier: BenchmarkTier;
  format: BenchmarkFormat;
  vertical?: string | null;
}

export async function getKnowledgeContext(
  input: KnowledgeContextInput,
): Promise<KnowledgeContext> {
  try {
    const { data, error } = await supabaseAdmin.rpc("get_knowledge_context", {
      p_tier: input.tier,
      p_format: input.format,
      p_vertical: input.vertical ?? undefined,
    });
    if (error) {
      console.error("[knowledge] get_knowledge_context failed", error.message);
      return EMPTY;
    }
    if (!data || typeof data !== "object") return EMPTY;
    return data as unknown as KnowledgeContext;
  } catch (err) {
    console.error("[knowledge] get_knowledge_context threw", err);
    return EMPTY;
  }
}

/**
 * Serializa o contexto em texto para incluir como bloco no prompt de
 * sistema do GPT. Mantém o formato curto e factual — o R3 chama isto
 * directamente quando construir o prompt enriquecido.
 */
export function formatKnowledgeContextForPrompt(ctx: KnowledgeContext): string {
  const today = new Date().toISOString().slice(0, 10);
  const lines: string[] = [
    `Contexto verificado da Knowledge Base do InstaBench (data: ${today}):`,
  ];

  for (const b of ctx.benchmarks) {
    const sample = `n=${b.sample_size}`;
    const src = b.source_name ? ` (${b.source_name}, ${sample})` : ` (${sample})`;
    lines.push(
      `- Benchmark ${b.format} ${b.tier}: ${Number(b.engagement_pct).toFixed(2)}%${src}`,
    );
  }

  for (const n of ctx.notes) {
    lines.push(`- Nota [${n.category}] ${n.title}: ${n.body}`);
  }

  if (lines.length === 1) {
    lines.push("- (sem entradas relevantes para este perfil)");
  }

  lines.push("");
  lines.push(
    "Use estes dados para fundamentar as suas interpretações. Cite fonte quando relevante.",
  );
  return lines.join("\n");
}