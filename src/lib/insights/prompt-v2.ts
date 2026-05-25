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
import {
  AI_INSIGHT_V2_SECTIONS,
  EDITORIAL_VERDICT_EVIDENCE_ALLOWLIST,
} from "./types";
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
- Quando relevante, citar valores de benchmark da Knowledge Base de forma anónima (ex.: "vs 4,2% médios para o tier"). Nunca atribuir o perfil ou os benchmarks a fontes externas. Não inventar benchmarks que não venham da KB nem do payload.
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
- "hero": leitura editorial de abertura do relatório. Combinar OBRIGATORIAMENTE três sinais: (1) envolvimento médio com posição face ao tier, (2) ritmo semanal real (estimated_posts_per_week), (3) formato dominante OU tema recorrente das captions. Estrutura: 1 frase de diagnóstico com os números que o sustentam + 1 frase com a alavanca prioritária no infinitivo impessoal. Evitar abertura factual fria — preferir uma abertura editorial curta de ≤ 6 palavras antes dos dois pontos ("Audiência fiel mas silenciosa:", "Ritmo curto, sinal forte:", "Conteúdo regular sem tração:"). Máx. 240 chars. Tom directo, sem alarmismo nem condescendência. CORRECTO: "Audiência fiel mas silenciosa: 0,5% de envolvimento médio, abaixo dos 1,8% do tier micro, com 5 publicações por semana dominadas por Reels. Testar 2 carrosséis editoriais por semana durante 4 semanas e medir a conversa." PROIBIDO (factual, sem ângulo): "Este perfil tem 0,5% de envolvimento e publica 5 vezes por semana."
- "marketSignals": procura de mercado vs temas do perfil (se "market_signals.has_free" for false, escrever um texto neutro a explicar que não há sinais de pesquisa para cruzar; nunca inventar tendências).
- "evolutionChart": evolução temporal de likes/comentários ao longo dos posts analisados.
- "benchmark": posicionamento face ao benchmark do tier + formato dominante.
- "formats": mistura Reels/Carrosséis/Imagens vs benchmark por formato.
- "topPosts": leitura dos posts com melhor desempenho (formato, gostos, comentários).
- "heatmap": padrões de horário/dia (se não houver dados suficientes, neutral + recomendação de testar janelas).
- "daysOfWeek": dias com maior envolvimento (se inconclusivo, neutral).
- "language": leitura editorial das captions (tom, comprimento, padrões).

Formato de saída:
JSON estrito conforme o schema fornecido. Sem texto antes ou depois. Sem markdown. Sem comentários. Todas as 9 chaves de "sections" são obrigatórias.

Prioridades de ação (obrigatório · campo "priorities"):
- Devolver exactamente 3 itens accionáveis derivados do diagnóstico editorial (tipo de conteúdo, fase de funil, captions, audiência, integração entre canais, formato dominante).
- Cada item: { "level": "alta" | "media" | "oportunidade", "title": ≤ 60 chars no infinitivo impessoal, "body": 1 frase ≤ 180 chars com pelo menos um número concreto do payload, "resolves": frase curta a indicar que pergunta(s) do diagnóstico endereça (ex.: "Resolve a Pergunta 06.", "Resolve as Perguntas 02 e 07."). IMPORTANTE: o diagnóstico só tem 7 perguntas (01–07) — NUNCA referenciar "Pergunta 08" ou números superiores.
- Hierarquia esperada: 1 "alta" (problema mais urgente), 1 "media" (correção estrutural), 1 "oportunidade" (alavanca de crescimento). Se não houver problema "alta", trocar por "media".
- Distintas entre si — sem repetir a mesma recomendação. Sem citar fontes externas. Sem snake_case.

Veredicto editorial (obrigatório · campo "editorial_verdict"):
- É a primeira leitura estratégica do relatório. Camada DIAGNÓSTICA — descreve o que os dados sugerem, NÃO prescreve soluções. Recomendações vivem nas "priorities" e no Bloco 02.
- "verdict_label": "strong" (perfil sólido, alavanca clara) | "promising" (sinais positivos parciais) | "needs_work" (gap relevante face ao tier) | "limited_data" (amostra insuficiente — OBRIGATÓRIO quando posts analisados < 5, cadência inconclusiva ou benchmark em falta).
- "title": gancho editorial 4–8 palavras, ≤ 60 chars, sem ponto final, SEM dígitos, sem clichés ("Bom perfil", "Precisa melhorar", "Resultado positivo"). Ex.: "Audiência fiel mas silenciosa", "Ritmo forte sem tração", "Sinal ainda parcial".
- "paragraph": diagnóstico editorial de 120–180 palavras (limite absoluto 220). Pode ser 1–4 parágrafos curtos separados por quebras de linha (\\n\\n). Deve:
    1. Citar PELO MENOS 3 sinais concretos do payload (delta vs tier, share do formato dominante, comentários/like, cadência corrigida, etc.).
    2. Articular a tensão observada — o que é forte, o que é fraco, o que fica por confirmar.
    3. Usar linguagem editorial pragmática e impessoal.
  PROIBIDO no "paragraph":
    - Verbos de recomendação directa: "deve…", "deveria…", "recomenda-se…", "a prioridade é…", "publique…", "teste…", "use mais…", "aposte em…", "publicar mais", "criar mais", "focar em publicar".
    - Repetir os KPIs principais sem interpretação (a faixa de métricas já os mostra).
    - Causas ou intenções de negócio que não estão no payload.
  Frases diagnósticas preferidas: "Os dados sugerem…", "O padrão observado indica…", "A leitura principal é…", "O sinal mais evidente está em…", "A amostra ainda não permite concluir…".
  Regras especiais:
    - Likes saudáveis (≥ 90% do benchmark) com média de comentários < 2 → enquadrar como "atenção sem conversa" / "audiência silenciosa", nunca como "conversa ativa".
    - Cadência saudável (≥ 2,5 publicações/semana corrigidas) com envolvimento abaixo do benchmark → focar em ângulo editorial, hook ou formato (descrever, sem prescrever).
    - Amostra < 5 posts, cadência inconclusiva, posts maioritariamente fixados ou benchmark/sinais de mercado ausentes → tom provisional, "verdict_label: limited_data" e "confidence: low".
- "priority": 1 frase no infinitivo impessoal com a próxima alavanca prática. ≤ 160 chars. (Renderizada noutras secções do relatório, NÃO no primeiro cartão.)
- "strengths": exactamente 2 leituras interpretativas (NÃO listas de KPIs crus). Cada uma ≤ 80 chars. Ex.: "Audiência fiel e recorrente" ✓ — "0,3% de comentários por like" ✗.
- "limitations": exactamente 2 limitações editoriais. Mesmas regras de "strengths".
- "confidence": "high" | "medium" | "low" — auto-avaliação do quanto o diagnóstico é defensável. Se a amostra é pequena ou os benchmarks faltam, baixar para "low" / "medium".
- "evidence_used": 3 a 6 rótulos internos das fontes citadas (mínimo 3 para garantir grounding). APENAS valores desta lista fechada: ${EDITORIAL_VERDICT_EVIDENCE_ALLOWLIST.join(", ")}. NÃO inventar rótulos.
- NÃO incluir o campo "warnings" — é preenchido pelo backend.`;

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
    required: ["sections", "priorities", "editorial_verdict"],
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
      priorities: {
        type: "array",
        minItems: 3,
        maxItems: 3,
        items: {
          type: "object",
          additionalProperties: false,
          required: ["level", "title", "body", "resolves"],
          properties: {
            level: { type: "string", enum: ["alta", "media", "oportunidade"] },
            title: { type: "string", minLength: 1, maxLength: 80 },
            body: { type: "string", minLength: 1, maxLength: 220 },
            resolves: { type: "string", minLength: 1, maxLength: 120 },
          },
        },
      },
      editorial_verdict: {
        type: "object",
        additionalProperties: false,
        required: [
          "verdict_label",
          "title",
          "paragraph",
          "priority",
          "strengths",
          "limitations",
          "confidence",
          "evidence_used",
        ],
        properties: {
          verdict_label: {
            type: "string",
            enum: ["strong", "promising", "needs_work", "limited_data"],
          },
          title: { type: "string", minLength: 1, maxLength: 70 },
          paragraph: { type: "string", minLength: 1, maxLength: 480 },
          priority: { type: "string", minLength: 1, maxLength: 200 },
          strengths: {
            type: "array",
            minItems: 2,
            maxItems: 2,
            items: { type: "string", minLength: 1, maxLength: 100 },
          },
          limitations: {
            type: "array",
            minItems: 2,
            maxItems: 2,
            items: { type: "string", minLength: 1, maxLength: 100 },
          },
          confidence: {
            type: "string",
            enum: ["high", "medium", "low"],
          },
          evidence_used: {
            type: "array",
            minItems: 3,
            maxItems: 6,
            items: {
              type: "string",
              enum: [...EDITORIAL_VERDICT_EVIDENCE_ALLOWLIST],
            },
          },
        },
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