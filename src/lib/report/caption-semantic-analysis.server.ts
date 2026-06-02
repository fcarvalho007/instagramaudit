/**
 * Caption Semantic Analysis — OpenAI text integration (server-only).
 *
 * Calls the OpenAI Chat Completions API with caption texts to produce
 * semantic interpretation of themes, intent, and editorial diagnostics.
 * Same gating pattern as visual-cover-analysis.server.ts.
 *
 * Pure HTTP via global `fetch` — no SDK.
 * NEVER imported by client code (`.server.ts` suffix).
 */

import {
  isOpenAiAllowed,
  isOpenAiEnabled,
} from "@/lib/security/openai-allowlist";
import { recordProviderCall } from "@/lib/analysis/events";
import type { ProviderCallStatus } from "@/lib/analysis/events";
import { calculateOpenAiCost } from "@/lib/insights/cost";
import {
  CAPTION_SEMANTIC_SYSTEM_PROMPT,
  CAPTION_SEMANTIC_JSON_SCHEMA,
} from "./caption-semantic-prompt";
import type { CaptionSemanticAnalysis } from "./caption-semantic-types";

const OPENAI_URL = "https://api.openai.com/v1/chat/completions";
const REQUEST_TIMEOUT_MS = 30_000;
const MAX_OUTPUT_TOKENS = 2000;
const TEMPERATURE = 0.3;
const MODEL = "gpt-5.4-mini";

const LOG_PREFIX = "[caption-semantic]";

export interface CaptionSemanticInput {
  handle: string;
  /** Cleaned caption texts, max 12. */
  captions: string[];
  /** Link cost to analysis event. */
  analysisEventId?: string | null;
}

export interface CaptionSemanticResult {
  ok: boolean;
  analysis: CaptionSemanticAnalysis | null;
  reason: string | null;
}

function fail(reason: string): CaptionSemanticResult {
  return { ok: false, analysis: null, reason };
}

/**
 * Generate semantic analysis for Instagram captions.
 * Never throws — all error paths are folded into CaptionSemanticResult.
 */
export async function generateCaptionSemanticAnalysis(
  input: CaptionSemanticInput,
): Promise<CaptionSemanticResult> {
  const { handle, captions } = input;
  const _eventId = input.analysisEventId ?? null;

  if (captions.length === 0) return fail("NO_CAPTIONS");

  if (!isOpenAiEnabled()) return fail("DISABLED");
  if (!isOpenAiAllowed(handle)) return fail("NOT_ALLOWED");

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey || apiKey.trim().length === 0) return fail("CONFIG_ERROR");

  const startedAt = Date.now();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const captionBlock = captions
      .slice(0, 12)
      .map((c, i) => `[Legenda ${i + 1}]\n${c}`)
      .join("\n\n---\n\n");

    const res = await fetch(OPENAI_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        temperature: TEMPERATURE,
        max_completion_tokens: MAX_OUTPUT_TOKENS,
        response_format: {
          type: "json_schema",
          json_schema: CAPTION_SEMANTIC_JSON_SCHEMA,
        },
        messages: [
          { role: "system", content: CAPTION_SEMANTIC_SYSTEM_PROMPT },
          {
            role: "user",
            content: `Analisa as ${captions.length} legendas seguintes (por ordem cronológica inversa). Responde exclusivamente com o JSON estruturado pedido.\n\n${captionBlock}`,
          },
        ],
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      console.error(LOG_PREFIX, "OpenAI HTTP error", res.status, errText.slice(0, 300));
      await logCall(handle, "http_error", res.status, Date.now() - startedAt, 0, 0, errText.slice(0, 200), undefined, _eventId);
      return fail(`OPENAI_ERROR_HTTP_${res.status}`);
    }

    const json = await res.json() as {
      choices?: Array<{ message?: { content?: string } }>;
      usage?: {
        prompt_tokens?: number;
        completion_tokens?: number;
        prompt_tokens_details?: { cached_tokens?: number };
      };
    };

    const promptTokens = json.usage?.prompt_tokens ?? 0;
    const completionTokens = json.usage?.completion_tokens ?? 0;
    const cachedTokens = json.usage?.prompt_tokens_details?.cached_tokens ?? 0;

    const rawContent = json.choices?.[0]?.message?.content;
    if (!rawContent) {
      await logCall(handle, "http_error", 200, Date.now() - startedAt, promptTokens, completionTokens, "empty_response", undefined, _eventId);
      return fail("EMPTY_RESPONSE");
    }

    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(rawContent);
    } catch {
      console.error(LOG_PREFIX, "JSON parse failed", rawContent.slice(0, 200));
      await logCall(handle, "http_error", 200, Date.now() - startedAt, promptTokens, completionTokens, "parse_error", undefined, _eventId);
      return fail("PARSE_ERROR");
    }

    const analysis = validateResult(parsed);
    if (!analysis) {
      await logCall(handle, "http_error", 200, Date.now() - startedAt, promptTokens, completionTokens, "validation_error", undefined, _eventId);
      return fail("VALIDATION_ERROR");
    }

    const cost = calculateOpenAiCost({
      model: MODEL,
      promptTokens,
      completionTokens,
      cachedTokens,
    });
    await logCall(handle, "success", 200, Date.now() - startedAt, promptTokens, completionTokens, undefined, cost.estimatedCostUsd, _eventId);

    console.info(LOG_PREFIX, "analysis complete", {
      handle,
      themes: analysis.dominantThemes.length,
      tokens: promptTokens + completionTokens,
      costUsd: cost.estimatedCostUsd,
    });

    return { ok: true, analysis, reason: null };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unknown";
    if (msg.includes("abort")) {
      console.error(LOG_PREFIX, "timeout after", REQUEST_TIMEOUT_MS, "ms");
      await logCall(handle, "timeout", null, Date.now() - startedAt, 0, 0, "timeout", undefined, _eventId);
      return fail("TIMEOUT");
    }
    console.error(LOG_PREFIX, "unexpected error", err);
    await logCall(handle, "network_error", null, Date.now() - startedAt, 0, 0, msg.slice(0, 200), undefined, _eventId);
    return fail("EXCEPTION");
  } finally {
    clearTimeout(timeout);
  }
}

// ─── Helpers ──────────────────────────────────────────────────────

function validateResult(raw: Record<string, unknown>): CaptionSemanticAnalysis | null {
  try {
    const r = raw as {
      analyzedCaptions: number;
      dominantThemes: Array<{
        label: string; explanation: string; postsCount: number;
        evidence: string[]; confidence: string;
      }>;
      contentIntent: { primary: string; secondary?: string | null; explanation: string };
      commentEngagement: {
        asksForCommentsCount: number; asksForCommentsPct: number;
        strategyLabel: string; examples: string[]; explanation: string;
      };
      recurringExpressionsInterpretation: Array<{
        expression: string; count: number; meaning: string; risk?: string | null;
      }>;
      diagnostic: { main: string; works: string; critical: string; watch: string };
      hookQuality?: { rating: string; explanation: string };
      brandVoice?: { rating: string; explanation: string };
      formulaicPatterns?: { hasFormulas: boolean; examples: string[]; explanation: string };
    };

    if (typeof r.analyzedCaptions !== "number") return null;
    if (!Array.isArray(r.dominantThemes) || r.dominantThemes.length === 0) return null;
    if (!r.contentIntent?.primary) return null;
    if (!r.diagnostic?.main) return null;

    // Validate score ranges
    for (const theme of r.dominantThemes) {
      if (typeof theme.postsCount !== "number" || theme.postsCount < 0) return null;
      if (!["high", "medium", "low"].includes(theme.confidence)) return null;
    }

    if (typeof r.commentEngagement?.asksForCommentsPct !== "number") return null;
    if (r.commentEngagement.asksForCommentsPct < 0 || r.commentEngagement.asksForCommentsPct > 100) return null;

    return {
      source: "openai",
      schemaVersion: 2,
      analyzedCaptions: r.analyzedCaptions,
      dominantThemes: r.dominantThemes.map((t) => ({
        label: t.label,
        explanation: t.explanation,
        postsCount: t.postsCount,
        evidence: t.evidence ?? [],
        confidence: t.confidence as "high" | "medium" | "low",
      })),
      contentIntent: {
        primary: r.contentIntent.primary,
        secondary: r.contentIntent.secondary ?? undefined,
        explanation: r.contentIntent.explanation,
      },
      commentEngagement: {
        asksForCommentsCount: r.commentEngagement.asksForCommentsCount,
        asksForCommentsPct: r.commentEngagement.asksForCommentsPct,
        strategyLabel: r.commentEngagement.strategyLabel as "active" | "occasional" | "passive",
        examples: r.commentEngagement.examples ?? [],
        explanation: r.commentEngagement.explanation,
      },
      recurringExpressionsInterpretation: (r.recurringExpressionsInterpretation ?? []).map((e) => ({
        expression: e.expression,
        count: e.count,
        meaning: e.meaning,
        risk: e.risk ?? undefined,
      })),
      diagnostic: r.diagnostic,
      hookQuality: r.hookQuality && ["strong", "moderate", "weak"].includes(r.hookQuality.rating)
        ? { rating: r.hookQuality.rating as "strong" | "moderate" | "weak", explanation: r.hookQuality.explanation }
        : undefined,
      brandVoice: r.brandVoice && ["consistent", "mixed", "inconsistent"].includes(r.brandVoice.rating)
        ? { rating: r.brandVoice.rating as "consistent" | "mixed" | "inconsistent", explanation: r.brandVoice.explanation }
        : undefined,
      formulaicPatterns: r.formulaicPatterns
        ? { hasFormulas: !!r.formulaicPatterns.hasFormulas, examples: r.formulaicPatterns.examples ?? [], explanation: r.formulaicPatterns.explanation }
        : undefined,
    };
  } catch {
    return null;
  }
}

async function logCall(
  handle: string,
  status: ProviderCallStatus,
  httpStatus: number | null,
  durationMs: number,
  promptTokens: number,
  completionTokens: number,
  errorMessage?: string,
  estimatedCostUsd?: number,
  analysisEventId?: string | null,
): Promise<void> {
  try {
    await recordProviderCall({
      provider: "openai",
      actor: "caption-semantic-analysis",
      handle,
      status,
      httpStatus,
      durationMs,
      promptTokens,
      completionTokens,
      totalTokens: promptTokens + completionTokens,
      model: MODEL,
      estimatedCostUsd: estimatedCostUsd ?? null,
      errorMessage: errorMessage ?? null,
      analysisEventId: analysisEventId ?? null,
      sourceContext: "public_analysis",
    });
  } catch (err) {
    console.error(LOG_PREFIX, "failed to log provider call", err);
  }
}
