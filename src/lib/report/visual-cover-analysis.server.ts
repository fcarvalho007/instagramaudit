/**
 * Visual Cover Analysis — OpenAI vision integration (server-only).
 *
 * Calls the OpenAI Chat Completions API with image_url content parts to
 * analyze up to 12 Instagram post thumbnails. Same pattern as
 * `openai-insights.server.ts`: gated by allowlist, daily cap, API key.
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
  VISUAL_COVER_SYSTEM_PROMPT,
  VISUAL_COVER_JSON_SCHEMA,
} from "./visual-cover-prompt";
import type { VisualCoverAnalysis } from "./visual-cover-types";

const OPENAI_URL = "https://api.openai.com/v1/chat/completions";
const REQUEST_TIMEOUT_MS = 45_000;
const MAX_OUTPUT_TOKENS = 2500;
const TEMPERATURE = 0.3;
const VISION_MODEL = "gpt-5.4-mini";

const LOG_PREFIX = "[visual-cover]";

export interface VisualCoverInput {
  handle: string;
  /** Absolute thumbnail URLs (already proxied if needed). Max 12. */
  thumbnailUrls: string[];
  /** Post IDs matching thumbnailUrls order, for mapping results. */
  postIds: string[];
  /** Link cost to analysis event. */
  analysisEventId?: string | null;
}

export interface VisualCoverResult {
  ok: boolean;
  analysis: VisualCoverAnalysis | null;
  reason: string | null;
}

function fail(reason: string): VisualCoverResult {
  return { ok: false, analysis: null, reason };
}

/**
 * Generate visual cover analysis for a set of Instagram thumbnails.
 *
 * Never throws — all error paths are folded into `VisualCoverResult`.
 */
export async function generateVisualCoverAnalysis(
  input: VisualCoverInput,
): Promise<VisualCoverResult> {
  const { handle, thumbnailUrls, postIds } = input;
  const _eventId = input.analysisEventId ?? null;

  if (thumbnailUrls.length === 0) {
    return fail("NO_THUMBNAILS");
  }

  // 1. Gate: kill-switch + allowlist
  if (!isOpenAiEnabled()) return fail("DISABLED");
  if (!isOpenAiAllowed(handle)) return fail("NOT_ALLOWED");

  // 2. Gate: API key
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey || apiKey.trim().length === 0) {
    return fail("CONFIG_ERROR");
  }

  const startedAt = Date.now();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    // Build image content parts (detail: "low" for cost saving)
    const imageContentParts = thumbnailUrls.slice(0, 12).map((url, idx) => ({
      type: "image_url" as const,
      image_url: {
        url,
        detail: "low" as const,
      },
    }));

    const userContent = [
      {
        type: "text" as const,
        text: `Analisa os ${imageContentParts.length} thumbnails seguintes (apresentados por ordem cronológica inversa, do mais recente ao mais antigo). Responde exclusivamente com o JSON estruturado pedido.`,
      },
      ...imageContentParts,
    ];

    const res = await fetch(OPENAI_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: VISION_MODEL,
        temperature: TEMPERATURE,
        max_completion_tokens: MAX_OUTPUT_TOKENS,
        response_format: {
          type: "json_schema",
          json_schema: VISUAL_COVER_JSON_SCHEMA,
        },
        messages: [
          { role: "system", content: VISUAL_COVER_SYSTEM_PROMPT },
          { role: "user", content: userContent },
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

    // Map postIndex → postId in thumbnails
    const analysis = mapAnalysisResult(parsed, postIds);
    if (!analysis) {
      await logCall(handle, "http_error", 200, Date.now() - startedAt, promptTokens, completionTokens, "validation_error", undefined, _eventId);
      return fail("VALIDATION_ERROR");
    }

    // Log success
    const cost = calculateOpenAiCost({
      model: VISION_MODEL,
      promptTokens,
      completionTokens,
      cachedTokens,
    });
    await logCall(handle, "success", 200, Date.now() - startedAt, promptTokens, completionTokens, undefined, cost.estimatedCostUsd, _eventId);

    console.info(LOG_PREFIX, "analysis complete", {
      handle,
      overallScore: analysis.overallScore,
      status: analysis.status,
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

function mapAnalysisResult(
  raw: Record<string, unknown>,
  postIds: string[],
): VisualCoverAnalysis | null {
  try {
    const r = raw as {
      analyzedCount: number;
      overallScore: number;
      status: string;
      summary: string;
      subScores: Record<string, number>;
      thumbnails: Array<{
        postIndex: number;
        visualScore: number;
        status: string;
        hasHumanPresence: boolean;
        hasReadableText: boolean;
        dominantColors: string[];
        notes: string;
      }>;
      aggregate: {
        humanPresencePct: number;
        textInImagePct: number;
        dominantPalette: string[];
        repeatedTemplateCount: number;
        repeatedTemplateNote: string | null;
      };
      diagnostic: {
        main: string;
        works: string;
        critical: string;
        watch: string;
      };
    };

    // Validate required fields
    if (typeof r.overallScore !== "number" || typeof r.status !== "string") {
      return null;
    }

    return {
      analyzedCount: r.analyzedCount,
      overallScore: r.overallScore,
      status: r.status as VisualCoverAnalysis["status"],
      summary: r.summary,
      subScores: {
        recognizability: r.subScores.recognizability,
        colorCoherence: r.subScores.colorCoherence,
        composition: r.subScores.composition,
        visualVariety: r.subScores.visualVariety,
        textDensity: r.subScores.textDensity,
      },
      thumbnails: r.thumbnails.map((t) => ({
        postId: postIds[t.postIndex] ?? `post-${t.postIndex}`,
        thumbnailUrl: "", // not persisted; reconstructed from snapshot posts
        visualScore: t.visualScore,
        status: t.status as "good" | "medium" | "weak",
        hasHumanPresence: t.hasHumanPresence,
        hasReadableText: t.hasReadableText,
        dominantColors: t.dominantColors,
        notes: t.notes,
      })),
      aggregate: r.aggregate,
      diagnostic: r.diagnostic,
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
      actor: "visual-cover-analysis",
      handle,
      status,
      httpStatus,
      durationMs,
      promptTokens,
      completionTokens,
      totalTokens: promptTokens + completionTokens,
      model: VISION_MODEL,
      estimatedCostUsd: estimatedCostUsd ?? null,
      errorMessage: errorMessage ?? null,
      analysisEventId: analysisEventId ?? null,
      sourceContext: "public_analysis",
    });
  } catch (err) {
    console.error(LOG_PREFIX, "failed to log provider call", err);
  }
}