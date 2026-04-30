/**
 * Prompt builder para insights v2 (R3).
 *
 * v2 produz 9 micro-insights chaveados por secção do report, com shape
 * `{ emphasis, text }`. O prompt é alimentado por:
 *  1. O mesmo `InsightsContext` do v1 (perfil, summary, benchmark, etc.).
 *  2. Um bloco de contexto verificado da Knowledge Base injectado no
 *     system prompt via `formatKnowledgeContextForPrompt`.
 *
 * Pure module — sem I/O. O hash dos inputs serve para detectar drift e
 * decidir cache hits no `analyze-public-v1`.
 */

import { createHash } from "crypto";

import { buildInsightsUserPayload, type InsightsUserPayload } from "./prompt";
import type { AiInsightV2Section, InsightsContext } from "./types";
import { AI_INSIGHT_V2_SECTIONS } from "./types";
import type { KnowledgeContext } from "@/lib/knowledge/types";
import { formatKnowledgeContextForPrompt } from "@/lib/knowledge/context.server";
import {
  BENCHMARK_DATASET_VERSION,
  formatBenchmarkContextForPrompt,
  type BenchmarkContextForProfileInput,
} from "@/lib/knowledge/benchmark-context";

/** Limite editorial para cada `text` (caracteres). Espelhado no validador. */
export const INSIGHT_V2_TEXT_MAX = 240;

/** Núcleo do system prompt — independente da KB para manter testável. */
const SYSTEM_PROMPT_BASE = `És o redactor editorial do InstaBench. Geras 9 micro-leituras curtas (1-2 frases) sobre dados de Instagram, uma para cada secção do relatório, dirigidas a leitores não-técnicos: marketers, criadores e donos de pequenos negócios.

Regras de língua (obrigatórias):
- Português europeu (Acordo Ortográfico de 1990).
- Registo impessoal — nunca "você"; preferir "o perfil", "este conteúdo", "a conta", construções impessoais ou "tu" pontual.
- Proibido: "tela" (usar "ecrã"), "celular" (usar "telemóvel"), "usuário" (usar "utilizador"), "arquivo" (usar "ficheiro"), "engajamento" (usar "envolvimento"), gerúndio decorativo brasileiro.
- Ortografia AO90: "direta", "ação", "ótimo", "ator", "setor", "adoção".
- Traduzir sempre "engagement" para "envolvimento".

Regras de conteúdo (obrigatórias):
- Cada texto = 1 observação concreta com número + 1 recomendação prática accionável.
- Recomendação no infinitivo impessoal ("Testar...", "Reforçar...", "Reduzir...", "Manter...").
- Citar sempre pelo menos um valor numérico do payload (percentagem, contagem, ritmo). Sem número, o insight é genérico e rejeitado.
- Quando relevante, citar benchmarks da Knowledge Base (ex.: "vs 4,2% médios para o tier"). Não inventar benchmarks que não venham da KB nem do payload.
- Usar notas editoriais da KB como contexto interpretativo (algoritmo, formato, vertical), nunca como facto novo sobre o perfil.
- Texto máximo: ${INSIGHT_V2_TEXT_MAX} caracteres.
- Tom claro, profissional, simpático. Frases curtas. Sem jargão técnico, sem caminhos snake_case (engagement_pct, content_summary.x, etc.).

Comparação com referências (obrigatório):
- Quando comparar valores do perfil com referências, usar linguagem direccional ("aproxima-se de", "fica abaixo de", "em linha com", "supera ligeiramente").
- Não atribuir números a fontes externas, mesmo que apareçam no contexto.
- Não escrever nomes de empresas ou ferramentas (Socialinsider, Buffer, Hootsuite, Databox).

Linguagem visível (proibido em "text"):
- Sufixos snake_case: "_pct", "_count", "_rate", "_per_week".
- Caminhos com pontos: "content_summary.…", "benchmark.…", "market_signals.…".
- Rótulos crus em inglês: "position below", "engagement_pct", "dominant_format".
- Traduzir tudo para pt-PT natural ("envolvimento médio", "abaixo da referência", "ritmo de publicação semanal", etc.).

Tom por "emphasis":
- "positive": ganho concreto vs benchmark/expectativa. Tom encorajador.
- "negative": gap relevante a corrigir. Tom directo, sem alarmismo.
- "default": observação neutra com recomendação. Tom analítico.
- "neutral": contexto sem julgamento (ex.: dados insuficientes). Tom factual.

Mapeamento das 9 secções (uma observação dirigida a cada uma):
- "hero": panorama global do perfil (envolvimento médio + tier + ritmo).
- "marketSignals": procura de mercado vs temas do perfil (se "market_signals.has_free" for false, escrever um texto neutro a explicar que não há sinais de pesquisa para cruzar; nunca inventar tendências).
- "evolutionChart": evolução temporal de likes/comentários ao longo dos posts analisados.
- "benchmark": posicionamento face ao benchmark do tier + formato dominante.
- "formats": mistura Reels/Carrosséis/Imagens vs benchmark por formato.
- "topPosts": leitura dos posts com melhor desempenho (formato, gostos, comentários).
- "heatmap": padrões de horário/dia (se não houver dados suficientes, neutral + recomendação de testar janelas).
- "daysOfWeek": dias com maior envolvimento (se inconclusivo, neutral).
- "language": leitura editorial das captions (tom, comprimento, padrões).

Formato de saída:
JSON estrito conforme o schema fornecido. Sem texto antes ou depois. Sem markdown. Sem comentários. Todas as 9 chaves de "sections" são obrigatórias.`;

/**
 * Constrói o system prompt completo, injectando o bloco de contexto da KB
 * imediatamente após o núcleo. A formatação está delegada ao helper da KB
 * para que o admin/UI partilhem a mesma serialização.
 */
export function buildSystemPromptV2(
  kb: KnowledgeContext,
  options: {
    hasReachData?: boolean;
    profileBenchmark?: BenchmarkContextForProfileInput;
  } = {},
): string {
  const kbBlock = formatKnowledgeContextForPrompt(kb, {
    hasReachData: options.hasReachData,
  });
  const parts = [
    SYSTEM_PROMPT_BASE,
    "",
    "CONTEXTO DA KNOWLEDGE BASE",
    kbBlock,
  ];
  if (options.profileBenchmark) {
    parts.push("");
    parts.push("REFERÊNCIAS DE BENCHMARK (perfil específico)");
    parts.push(
      formatBenchmarkContextForPrompt({
        ...options.profileBenchmark,
        hasReachData:
          options.profileBenchmark.hasReachData ?? options.hasReachData ?? false,
      }),
    );
  }
  return parts.join("\n");
}

/**
 * Hash curto e determinístico do estado da KB. Permite cache-bust no
 * snapshot quando as entradas relevantes mudam.
 */
export function computeKbVersion(kb: KnowledgeContext): string {
  // Inclui a versão do dataset estático para invalidar cache quando o
  // ficheiro `benchmark-context.ts` for actualizado.
  const seed = `${kb.metadata.last_updated}|${kb.metadata.total_entries}|${kb.benchmarks.length}|${kb.notes.length}|ds:${BENCHMARK_DATASET_VERSION}`;
  return createHash("sha1").update(seed).digest("hex").slice(0, 12);
}

/**
 * Hash dos inputs v2 (system + user). Determinístico para o mesmo
 * snapshot + KB. Usado para decidir regenerar ou reutilizar o cache.
 */
export function hashInsightsV2Prompt(
  systemPrompt: string,
  userPayload: InsightsUserPayload,
): string {
  const serialised = `${systemPrompt}\n${stableStringify(userPayload)}`;
  return createHash("sha256").update(serialised).digest("hex").slice(0, 16);
}

/** Reutiliza o builder v1 — o payload de input é o mesmo. */
export function buildInsightsV2UserPayload(
  ctx: InsightsContext,
): InsightsUserPayload {
  return buildInsightsUserPayload(ctx);
}

/**
 * JSON schema enviado ao OpenAI via `response_format`. Strict + 9 chaves
 * obrigatórias para que o modelo nunca devolva uma secção em falta.
 */
const sectionItemSchema = {
  type: "object",
  additionalProperties: false,
  required: ["emphasis", "text"],
  properties: {
    emphasis: {
      type: "string",
      enum: ["positive", "negative", "default", "neutral"],
    },
    text: { type: "string", minLength: 1 },
  },
} as const;

export const RESPONSE_JSON_SCHEMA_V2 = {
  name: "ai_insights_v2",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    required: ["sections"],
    properties: {
      sections: {
        type: "object",
        additionalProperties: false,
        required: [...AI_INSIGHT_V2_SECTIONS],
        properties: AI_INSIGHT_V2_SECTIONS.reduce<
          Record<string, typeof sectionItemSchema>
        >((acc, key) => {
          acc[key] = sectionItemSchema;
          return acc;
        }, {}),
      },
    },
  },
} as const;

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value))
    return `[${value.map((v) => stableStringify(v)).join(",")}]`;
  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj).sort();
  return `{${keys
    .map((k) => `${JSON.stringify(k)}:${stableStringify(obj[k])}`)
    .join(",")}}`;
}

/** Lista de chaves esperada — exposta para testes. */
export const REQUIRED_V2_SECTION_KEYS: readonly AiInsightV2Section[] =
  AI_INSIGHT_V2_SECTIONS;