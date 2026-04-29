/**
 * Deterministic prompt builder for the OpenAI insights layer.
 *
 * Pure module — no I/O, no fetch, no env reads. Safe to import from
 * anywhere (server or test). The actual OpenAI call lives in
 * `openai-insights.server.ts`.
 *
 * Design goals:
 *   1. **Reproducibility** — given the same `InsightsContext`, this module
 *      produces the same system prompt and the same hash. Enables drift
 *      detection in `AiInsightsV1.source_signals.inputs_hash`.
 *   2. **Editorial discipline** — the system prompt enforces pt-PT (AO90),
 *      forbids invented metrics, caps body length, and requires every
 *      insight to cite a real signal from the input.
 *   3. **Token economy** — the user payload is minimal: only fields the
 *      model needs to interpret. Captions are truncated to 240 chars and
 *      `top_posts` is capped to 3 items.
 */

import { createHash } from "crypto";

import type { InsightsContext } from "./types";

/** Maximum number of top posts forwarded to the model. */
export const PROMPT_TOP_POSTS_CAP = 3;

/** Maximum caption length per post before truncation. */
export const PROMPT_CAPTION_MAX = 240;

/**
 * The deterministic system prompt. Every rule here is also enforced by
 * `validate.ts` — the prompt is the contract, the validator is the guard.
 *
 * Editorial rules are written in pt-PT impessoal so the model mirrors the
 * desired voice. Negative examples target the most common Brazilian forms
 * we have seen leak into model output.
 */
export const INSIGHTS_SYSTEM_PROMPT = `És um analista editorial de redes sociais que escreve em português europeu (Acordo Ortográfico de 1990).

Tarefa:
Analisar o desempenho de um perfil de Instagram a partir do payload JSON que recebes e devolver entre 3 e 5 insights estratégicos accionáveis.

Regras de língua (obrigatórias):
- Português de Portugal, registo impessoal. Nunca usar "você". Preferir construções impessoais ou tratamento por "tu" se necessário.
- Proibido: "tela" (usar "ecrã"), "celular" (usar "telemóvel"), "usuário" (usar "utilizador"), "arquivo" (usar "ficheiro"), "tela", "engajamento" (usar "envolvimento" ou "engagement"), gerúndio decorativo brasileiro ("estamos vendo", "está crescendo").
- Ortografia AO90: "direta", "ação", "ótimo", "ator", "setor", "adoção".

Regras de conteúdo (obrigatórias):
- Usar apenas números e factos presentes no payload. Não inventar métricas, percentagens, médias do mercado, benchmarks ou nomes de concorrentes.
- Se o payload não contém "benchmark", não citar comparação com tier nem mediana de mercado.
- Cada insight deve citar pelo menos um sinal do payload no campo "evidence". Os valores válidos para "evidence" estão listados em "available_signals" do payload do utilizador.
- Cada item de "evidence" DEVE ser uma string copiada exactamente, carácter a carácter, de "available_signals" (também repetido em "allowed_evidence_paths"). Do not invent, shorten, abbreviate or paraphrase evidence paths. Use the exact strings from available_signals. Não usar aliases curtos como "average_comments"; usar sempre o caminho canónico completo, por exemplo "content_summary.average_comments".
- Se um campo aparece no payload mas não consta de "allowed_evidence_paths", NÃO o citar como evidence. Evidence paths must be copied exactly from "allowed_evidence_paths". If a field is visible in the payload but not listed in "allowed_evidence_paths", do not cite it as evidence.
- Zero é evidência observada válida. Se um campo numérico aparece no payload com valor 0, pode ser citado como evidence desde que o caminho exacto conste de "allowed_evidence_paths". Zero is valid observed evidence: a numeric field with value 0 may be cited only if its exact path is listed in "allowed_evidence_paths".
- "confidence" deve ser exactamente uma destas duas strings:
  - "baseado em dados observados" — quando todos os sinais citados existem e têm valor não-nulo no payload.
  - "sinal parcial" — quando algum sinal citado está em falta, é estimativa ou tem volume reduzido.
- "id" deve ser SCREAMING_SNAKE_CASE estável e descritivo (exemplos válidos: "ENG_GAP", "REELS_LOW", "POSTING_CADENCE", "TOP_POST_FORMAT", "BIO_CTA_MISSING").
- "title" curto, máximo 60 caracteres, sem ponto final.
- "body" no máximo 280 caracteres. Começar com a observação concreta (incluir o número), terminar sempre com uma acção concreta no infinitivo impessoal ("Publicar...", "Testar...", "Reduzir...", "Manter...", "Ajustar...").
- "priority" é um inteiro entre 1 e 100. Maior = mais urgente.
- Não duplicar insights. Cada insight cobre um ângulo diferente (ritmo, formato, envolvimento, posicionamento, conteúdo top).

Sinais de mercado (DataForSEO):
- Quando "market_signals.has_free" é true, é OBRIGATÓRIO produzir pelo menos um insight que cruze o desempenho do perfil com a procura de mercado, citando "market_signals.strongest_keyword" e/ou "market_signals.trend_direction" no array "evidence" (cumulativamente com outros sinais relevantes do perfil, se aplicável).
- Esse insight de mercado DEVE incluir, no body, pelo menos um valor numérico vindo do payload: "market_signals.strongest_score" (formatado como "sinal médio de 65"), "market_signals.trend_delta_pct" (ex.: "+22%") ou "market_signals.usable_keyword_count" (ex.: "2 temas com procura mensurável"). Sem número, o insight é considerado genérico e rejeitado.
- A keyword citada no body TEM de ser "market_signals.strongest_keyword" ou um item de "market_signals.top_keywords". É PROIBIDO citar uma keyword de "market_signals.zero_signal_keywords" ou "market_signals.dropped_keywords" como procura existente — só podem ser referidas como "temas sem procura mensurável" e apenas se a acção for descartá-los.
- Se "market_signals.usable_keyword_count" <= 1, focar o insight nessa keyword única; não inventar diversidade.
- Quando "market_signals.has_free" é false, NÃO referir procura de mercado, keywords de pesquisa, Google Trends nem tendências de procura no title ou body. Ignorar completamente este eixo.
- O title e o body continuam em pt-PT natural — citar a keyword entre aspas (ex.: «fotografia Lisboa») e traduzir "trend_direction": "up" → "tendência em alta", "flat" → "procura estável", "down" → "tendência em queda". Nunca escrever "trend_direction up".
- Exemplo CORRECTO: "A procura por «ia» apresenta sinal médio de 65 e tendência em alta (+22%). Reforçar conteúdos sobre IA nas próximas 4 semanas e medir o envolvimento."
- Exemplo PROIBIDO (genérico, sem número): "Alinhar o conteúdo com as keywords em tendência."

Linguagem do título e do body (obrigatório):
- O array "evidence" é apenas para auditoria interna. NUNCA escrever caminhos técnicos no "title" ou no "body".
- Proibido em "title" e "body":
  - Sufixos snake_case técnicos: tudo o que termine em "_pct", "_count", "_rate", "_per_week", "_summary", "_likes", "_comments".
  - Caminhos com pontos ou colchetes: "content_summary.…", "benchmark.…", "market_signals.…", "competitors_summary.…", "profile.…", "top_posts[0]…".
  - Rótulos crus em inglês como "position below", "position above", "position aligned", "engagement_pct", "benchmark_value_pct", "profile_value_pct", "difference_pct", "dominant_format".
- Traduzir sempre para linguagem natural pt-PT:
  - engagement_pct → "envolvimento médio" ou "taxa de envolvimento".
  - benchmark_value_pct → "referência esperada para perfis semelhantes".
  - profile_value_pct → "valor actual do perfil".
  - difference_pct → "diferença face à referência" (em pontos percentuais, ex.: "-87,38 pp").
  - position below / above / aligned → "abaixo da referência" / "acima da referência" / "alinhado com a referência".
  - top_posts[0].likes → "as publicações com melhor desempenho" ou "o post mais forte".
  - estimated_posts_per_week → "ritmo de publicação semanal".
  - dominant_format → "formato dominante".
- Os números são obrigatórios e devem aparecer no body, mas formatados em pt-PT (vírgula decimal, "%", "pp", "publicações por semana"), nunca como tokens técnicos.
- Exemplo PROIBIDO: "Benchmark indica position below e difference_pct -87.38 face a benchmark_value_pct."
- Exemplo CORRECTO: "O envolvimento médio (0,5%) está muito abaixo da referência esperada para perfis semelhantes (4,0%). Rever o formato dominante e testar variações de criativo durante 4 semanas."
- Exemplo PROIBIDO: "top_posts[0].likes mostra baixa resposta."
- Exemplo CORRECTO: "As publicações com melhor desempenho continuam a ter poucos gostos absolutos (máx. 120). Testar capas mais fortes e chamadas à acção no primeiro slide."

Formato de saída:
Devolver estritamente JSON válido conforme o schema fornecido. Sem texto antes ou depois. Sem markdown. Sem comentários.`;

/** A trimmed top-post entry safe to send to the model. */
interface PromptTopPost {
  format: "Reels" | "Carrosséis" | "Imagens";
  likes: number;
  comments: number;
  engagement_pct: number;
  caption_excerpt: string;
}

/** The shape sent as the user message. JSON-serialised by the caller. */
export interface InsightsUserPayload {
  profile: {
    handle: string;
    display_name: string;
    followers_count: number;
    posts_count: number | null;
    is_verified: boolean;
    has_bio: boolean;
  };
  content_summary: {
    posts_analyzed: number;
    dominant_format: "Reels" | "Carrosséis" | "Imagens";
    average_likes: number;
    average_comments: number;
    average_engagement_rate: number;
    estimated_posts_per_week: number;
  };
  top_posts: PromptTopPost[];
  benchmark:
    | {
        tier_label: string;
        dominant_format: "Reels" | "Carrosséis" | "Imagens";
        benchmark_value_pct: number;
        profile_value_pct: number;
        difference_pct: number;
        position: "above" | "aligned" | "below";
      }
    | null;
  competitors_summary: {
    count: number;
    median_engagement_pct: number | null;
  };
  market_signals: {
    has_free: boolean;
    has_paid: boolean;
    top_keywords?: string[];
    strongest_keyword?: string | null;
    trend_direction?: "up" | "flat" | "down" | null;
    dropped_keywords?: string[];
    strongest_score?: number | null;
    trend_delta_pct?: number | null;
    usable_keyword_count?: number;
    zero_signal_keywords?: string[];
  };
  /**
   * The flat list of `evidence` strings the model is allowed to cite.
   * Mirrored by `validate.ts` so any citation outside this list is
   * rejected. Keep paths short and JSON-pointer-ish.
   */
  available_signals: string[];
  /**
   * Mirror of `available_signals`, surfaced under a more explicit name so
   * the model treats it as a hard allow-list. Same array, same order.
   */
  allowed_evidence_paths: string[];
}

function truncateCaption(raw: string | null | undefined): string {
  if (!raw) return "";
  const cleaned = raw.replace(/\s+/g, " ").trim();
  if (cleaned.length <= PROMPT_CAPTION_MAX) return cleaned;
  return cleaned.slice(0, PROMPT_CAPTION_MAX - 1).trimEnd() + "…";
}

/**
 * Compute the canonical list of signal paths present (non-null) in `ctx`.
 * Order is stable to keep the resulting prompt + hash deterministic.
 */
function computeAvailableSignals(ctx: InsightsContext): string[] {
  const signals: string[] = [];
  const p = ctx.profile;
  if (p.followers_count > 0) signals.push("profile.followers_count");
  if (p.posts_count != null) signals.push("profile.posts_count");
  if (p.bio && p.bio.trim().length > 0) signals.push("profile.bio");
  if (p.is_verified) signals.push("profile.is_verified");

  const cs = ctx.content_summary;
  if (Number.isFinite(cs.posts_analyzed)) signals.push("content_summary.posts_analyzed");
  signals.push("content_summary.dominant_format");
  if (Number.isFinite(cs.average_likes)) signals.push("content_summary.average_likes");
  if (Number.isFinite(cs.average_comments)) signals.push("content_summary.average_comments");
  if (Number.isFinite(cs.average_engagement_rate))
    signals.push("content_summary.average_engagement_rate");
  if (Number.isFinite(cs.estimated_posts_per_week))
    signals.push("content_summary.estimated_posts_per_week");

  // Per-post allow-list. Mirrors the trimmed `top_posts` array sent in
  // `buildInsightsUserPayload` (cap = PROMPT_TOP_POSTS_CAP). Order is
  // deterministic both across posts (index order) and within a post
  // (format → engagement_pct → likes → comments → caption_excerpt). A
  // path is only added when the underlying source field is present and
  // meaningful, so e.g. `top_posts[0].comments` becomes a valid evidence
  // path the moment the source post has `comments > 0`.
  const cappedTopPosts = ctx.top_posts.slice(0, PROMPT_TOP_POSTS_CAP);
  cappedTopPosts.forEach((post, idx) => {
    signals.push(`top_posts[${idx}].format`);
    signals.push(`top_posts[${idx}].engagement_pct`);
    if (Number.isFinite(post.likes)) {
      signals.push(`top_posts[${idx}].likes`);
    }
    if (Number.isFinite(post.comments)) {
      signals.push(`top_posts[${idx}].comments`);
    }
    const caption = (post.caption_excerpt ?? "").trim();
    if (caption.length > 0) {
      signals.push(`top_posts[${idx}].caption_excerpt`);
    }
  });

  if (ctx.benchmark && ctx.benchmark.status === "available") {
    signals.push("benchmark.tier_label");
    signals.push("benchmark.benchmark_value_pct");
    signals.push("benchmark.profile_value_pct");
    signals.push("benchmark.difference_pct");
    signals.push("benchmark.position");
  }

  if (ctx.competitors_summary.count > 0) {
    signals.push("competitors_summary.count");
    if (ctx.competitors_summary.median_engagement_pct != null)
      signals.push("competitors_summary.median_engagement_pct");
  }

  if (ctx.market_signals.has_free) signals.push("market_signals.has_free");
  if (ctx.market_signals.has_paid) signals.push("market_signals.has_paid");

  if (ctx.market_signals.has_free) {
    if (
      ctx.market_signals.strongest_keyword &&
      ctx.market_signals.strongest_keyword.trim().length > 0
    ) {
      signals.push("market_signals.strongest_keyword");
    }
    if (
      typeof ctx.market_signals.strongest_score === "number" &&
      Number.isFinite(ctx.market_signals.strongest_score)
    ) {
      signals.push("market_signals.strongest_score");
    }
    if (
      Array.isArray(ctx.market_signals.top_keywords) &&
      ctx.market_signals.top_keywords.length > 0
    ) {
      signals.push("market_signals.top_keywords");
    }
    if (
      ctx.market_signals.trend_direction &&
      ["up", "flat", "down"].includes(ctx.market_signals.trend_direction)
    ) {
      signals.push("market_signals.trend_direction");
    }
    if (
      typeof ctx.market_signals.trend_delta_pct === "number" &&
      Number.isFinite(ctx.market_signals.trend_delta_pct)
    ) {
      signals.push("market_signals.trend_delta_pct");
    }
    if (
      typeof ctx.market_signals.usable_keyword_count === "number" &&
      ctx.market_signals.usable_keyword_count > 0
    ) {
      signals.push("market_signals.usable_keyword_count");
    }
    if (
      Array.isArray(ctx.market_signals.zero_signal_keywords) &&
      ctx.market_signals.zero_signal_keywords.length > 0
    ) {
      signals.push("market_signals.zero_signal_keywords");
    }
    if (
      Array.isArray(ctx.market_signals.dropped_keywords) &&
      ctx.market_signals.dropped_keywords.length > 0
    ) {
      signals.push("market_signals.dropped_keywords");
    }
  }

  return signals;
}

/**
 * Build the JSON-safe user payload sent to OpenAI as the user message.
 * Captions truncated, top posts capped, benchmark normalised. Pure.
 */
export function buildInsightsUserPayload(
  ctx: InsightsContext,
): InsightsUserPayload {
  const signals = computeAvailableSignals(ctx);
  const benchmark =
    ctx.benchmark && ctx.benchmark.status === "available"
      ? {
          tier_label: ctx.benchmark.accountTierLabel,
          dominant_format: ctx.benchmark.dominantFormat,
          benchmark_value_pct: round2(ctx.benchmark.benchmarkValue),
          profile_value_pct: round2(ctx.benchmark.profileValue),
          difference_pct: round2(ctx.benchmark.differencePercent),
          position: ctx.benchmark.positionStatus,
        }
      : null;

  return {
    profile: {
      handle: ctx.profile.username,
      display_name: ctx.profile.display_name,
      followers_count: ctx.profile.followers_count,
      posts_count: ctx.profile.posts_count,
      is_verified: ctx.profile.is_verified,
      has_bio: !!ctx.profile.bio && ctx.profile.bio.trim().length > 0,
    },
    content_summary: {
      posts_analyzed: ctx.content_summary.posts_analyzed,
      dominant_format: ctx.content_summary.dominant_format,
      average_likes: Math.round(ctx.content_summary.average_likes),
      average_comments: Math.round(ctx.content_summary.average_comments),
      average_engagement_rate: round2(
        ctx.content_summary.average_engagement_rate,
      ),
      estimated_posts_per_week: round2(
        ctx.content_summary.estimated_posts_per_week,
      ),
    },
    top_posts: ctx.top_posts.slice(0, PROMPT_TOP_POSTS_CAP).map((post) => ({
      format: post.format,
      likes: Math.round(post.likes),
      comments: Math.round(post.comments),
      engagement_pct: round2(post.engagement_pct),
      caption_excerpt: truncateCaption(post.caption_excerpt),
    })),
    benchmark,
    competitors_summary: {
      count: ctx.competitors_summary.count,
      median_engagement_pct:
        ctx.competitors_summary.median_engagement_pct != null
          ? round2(ctx.competitors_summary.median_engagement_pct)
          : null,
    },
    market_signals: {
      has_free: ctx.market_signals.has_free,
      has_paid: ctx.market_signals.has_paid,
      ...(ctx.market_signals.has_free &&
      ctx.market_signals.strongest_keyword
        ? { strongest_keyword: ctx.market_signals.strongest_keyword }
        : {}),
      ...(ctx.market_signals.has_free &&
      Array.isArray(ctx.market_signals.top_keywords) &&
      ctx.market_signals.top_keywords.length > 0
        ? { top_keywords: ctx.market_signals.top_keywords }
        : {}),
      ...(ctx.market_signals.has_free && ctx.market_signals.trend_direction
        ? { trend_direction: ctx.market_signals.trend_direction }
        : {}),
      ...(ctx.market_signals.has_free &&
      Array.isArray(ctx.market_signals.dropped_keywords) &&
      ctx.market_signals.dropped_keywords.length > 0
        ? { dropped_keywords: ctx.market_signals.dropped_keywords }
        : {}),
    },
    available_signals: signals,
    allowed_evidence_paths: signals,
  };
}

/**
 * Stable 16-char hex hash of `systemPrompt + "\n" + JSON.stringify(payload)`.
 * Used to detect drift between runs (same inputs → same hash). Not a
 * security primitive; SHA-256 picked for availability in the Worker
 * runtime via `node:crypto`.
 */
export function hashInsightsPrompt(
  systemPrompt: string,
  userPayload: InsightsUserPayload,
): string {
  const serialised = `${systemPrompt}\n${stableStringify(userPayload)}`;
  return createHash("sha256").update(serialised).digest("hex").slice(0, 16);
}

/**
 * Deterministic JSON stringify with sorted object keys. Avoids hash drift
 * caused by accidental key ordering in upstream payloads.
 */
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

function round2(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 100) / 100;
}