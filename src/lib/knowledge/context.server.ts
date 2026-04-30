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

export interface FormatKnowledgeContextOptions {
  /**
   * Quando `false` (padrão), o prompt instrui explicitamente o modelo
   * a não mencionar alcance, saves, partilhas, impressões ou visitas
   * ao perfil — métricas que requerem acesso autenticado.
   */
  hasReachData?: boolean;
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
export function formatKnowledgeContextForPrompt(
  ctx: KnowledgeContext,
  options: FormatKnowledgeContextOptions = {},
): string {
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
  lines.push("Regras editoriais (obrigatórias):");
  lines.push(
    "- As fontes editoriais (Socialinsider, Buffer, Hootsuite, Databox) são apenas contexto silencioso de mercado. NÃO atribuir o perfil analisado a estas fontes — elas não analisaram este perfil.",
  );
  lines.push(
    "- Use estes dados como referência direcional para fundamentar a interpretação.",
  );
  lines.push(
    "- NÃO atribua benchmarks a fontes externas (não escreva \"segundo a Socialinsider\", \"de acordo com o Buffer\", etc.).",
  );
  lines.push(
    "- NÃO inclua URLs nem nomes de domínios (socialinsider.com, buffer.com, hootsuite.com, databox.com).",
  );
  lines.push(
    "- Use linguagem de hedge: \"sugere\", \"indica\", \"aponta para\", \"em termos comparativos\", \"referência direcional\".",
  );
  if (!options.hasReachData) {
    lines.push(
      "- NÃO mencione alcance, reach, saves, partilhas, impressões, visitas ao perfil ou cliques no website — não há dados reais para este perfil.",
    );
  }
  return lines.join("\n");
}