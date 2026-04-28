/**
 * OpenAI insights generator (server-only).
 *
 * Calls the OpenAI Chat Completions API directly (no Lovable AI Gateway).
 * Pure HTTP via global `fetch` — no SDK to keep the Worker bundle lean
 * and the runtime predictable.
 *
 * THIS MODULE IS NOT YET WIRED INTO `analyze-public-v1`. Importing it
 * elsewhere is intentional only when the next prompt activates the
 * controlled run for `frederico.m.carvalho`.
 *
 * Cost protection (in order):
 *   1. `isOpenAiAllowed(handle)` — kill-switch + testing-mode allowlist.
 *   2. `OPENAI_API_KEY` presence check — no key → no call.
 *   3. `AbortController` 25s timeout to bound runaway requests.
 *   4. `recordProviderCall` always invoked (success or failure) so the
 *      admin ledger never loses a paid call.
 */

import { isOpenAiAllowed, isOpenAiEnabled } from "@/lib/security/openai-allowlist";

import { recordProviderCall } from "@/lib/analysis/events";

import { calculateOpenAiCost, DEFAULT_OPENAI_MODEL } from "./cost";
import {
  buildInsightsUserPayload,
  hashInsightsPrompt,
  INSIGHTS_SYSTEM_PROMPT,
} from "./prompt";
import type {
  AiInsightsV1,
  InsightsContext,
  InsightsGenerationResult,
} from "./types";
import { validateInsights } from "./validate";

const OPENAI_URL = "https://api.openai.com/v1/chat/completions";
const REQUEST_TIMEOUT_MS = 25_000;
const MAX_OUTPUT_TOKENS = 1200;
const TEMPERATURE = 0.4;

/**
 * JSON schema sent to OpenAI via `response_format`. `strict: true` means
 * the model is forced to obey the structure; `additionalProperties: false`
 * blocks hallucinated fields.
 */
const RESPONSE_JSON_SCHEMA = {
  name: "ai_insights_v1",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    required: ["insights"],
    properties: {
      insights: {
        type: "array",
        minItems: 3,
        maxItems: 5,
        items: {
          type: "object",
          additionalProperties: false,
          required: ["id", "title", "body", "evidence", "confidence", "priority"],
          properties: {
            id: { type: "string" },
            title: { type: "string" },
            body: { type: "string" },
            evidence: {
              type: "array",
              minItems: 1,
              items: { type: "string" },
            },
            confidence: {
              type: "string",
              enum: ["baseado em dados observados", "sinal parcial"],
            },
            priority: { type: "integer", minimum: 1, maximum: 100 },
          },
        },
      },
    },
  },
} as const;

function resolveModel(): string {
  const fromEnv = process.env.OPENAI_INSIGHTS_MODEL;
  if (fromEnv && fromEnv.trim().length > 0) return fromEnv.trim();
  return DEFAULT_OPENAI_MODEL;
}

function failResult(
  reason: InsightsGenerationResult["reason"],
  detail?: string | null,
): InsightsGenerationResult {
  return { ok: false, insights: null, reason, detail: detail ?? null };
}

/**
 * Generate insights for a single Instagram profile context.
 *
 * Never throws — all error paths are folded into `InsightsGenerationResult`
 * so callers can keep the deterministic-recommendation fallback path
 * trivial.
 */
export async function generateInsights(
  ctx: InsightsContext,
): Promise<InsightsGenerationResult> {
  // 1. Gate: kill-switch + allowlist.
  if (!isOpenAiEnabled()) return failResult("DISABLED");
  if (!isOpenAiAllowed(ctx.profile.username)) return failResult("NOT_ALLOWED");

  // 2. Gate: API key.
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey || apiKey.trim().length === 0) {
    return failResult("CONFIG_ERROR", "OPENAI_API_KEY missing");
  }

  const model = resolveModel();
  const userPayload = buildInsightsUserPayload(ctx);
  const inputsHash = hashInsightsPrompt(INSIGHTS_SYSTEM_PROMPT, userPayload);
  const handle = ctx.profile.username.toLowerCase();
  const startedAt = Date.now();

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  let httpStatus: number | null = null;
  let promptTokens = 0;
  let completionTokens = 0;

  try {
    const res = await fetch(OPENAI_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        temperature: TEMPERATURE,
        max_tokens: MAX_OUTPUT_TOKENS,
        response_format: { type: "json_schema", json_schema: RESPONSE_JSON_SCHEMA },
        messages: [
          { role: "system", content: INSIGHTS_SYSTEM_PROMPT },
          { role: "user", content: JSON.stringify(userPayload) },
        ],
      }),
      signal: controller.signal,
    });
    httpStatus = res.status;

    if (!res.ok) {
      const errText = await safeText(res);
      const cost = calculateOpenAiCost({ model, promptTokens: 0, completionTokens: 0 });
      await logCall({
        handle,
        model,
        status: "http_error",
        httpStatus,
        durationMs: Date.now() - startedAt,
        cost,
        errorMessage: errText.slice(0, 500),
      });
      return failResult("OPENAI_ERROR", `HTTP ${httpStatus}`);
    }

    const json = (await res.json()) as OpenAiChatResponse;
    promptTokens = json.usage?.prompt_tokens ?? 0;
    completionTokens = json.usage?.completion_tokens ?? 0;
    const cost = calculateOpenAiCost({ model, promptTokens, completionTokens });

    const content = json.choices?.[0]?.message?.content;
    if (!content) {
      await logCall({
        handle,
        model,
        status: "http_error",
        httpStatus,
        durationMs: Date.now() - startedAt,
        cost,
        errorMessage: "empty completion content",
      });
      return failResult("SCHEMA_INVALID", "empty content");
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(content);
    } catch (err) {
      await logCall({
        handle,
        model,
        status: "http_error",
        httpStatus,
        durationMs: Date.now() - startedAt,
        cost,
        errorMessage: `json parse: ${(err as Error).message}`,
      });
      return failResult("SCHEMA_INVALID", "json parse");
    }

    const validation = validateInsights(parsed, ctx);
    if (!validation.ok) {
      await logCall({
        handle,
        model,
        status: "http_error",
        httpStatus,
        durationMs: Date.now() - startedAt,
        cost,
        errorMessage: `${validation.reason}: ${validation.detail}`,
      });
      return failResult("SCHEMA_INVALID", `${validation.reason}: ${validation.detail}`);
    }

    await logCall({
      handle,
      model,
      status: "success",
      httpStatus,
      durationMs: Date.now() - startedAt,
      cost,
      errorMessage: null,
    });

    const out: AiInsightsV1 = {
      schema_version: 1,
      generated_at: new Date().toISOString(),
      model: json.model ?? model,
      source_signals: {
        inputs_hash: inputsHash,
        has_market_signals:
          ctx.market_signals.has_free || ctx.market_signals.has_paid,
        has_dataforseo_paid: ctx.market_signals.has_paid,
      },
      insights: validation.insights,
      cost: {
        prompt_tokens: cost.promptTokens,
        completion_tokens: cost.completionTokens,
        total_tokens: cost.totalTokens,
        estimated_cost_usd: cost.estimatedCostUsd,
      },
    };
    return { ok: true, insights: out, reason: null };
  } catch (err) {
    const isAbort = (err as { name?: string })?.name === "AbortError";
    const cost = calculateOpenAiCost({ model, promptTokens, completionTokens });
    await logCall({
      handle,
      model,
      status: isAbort ? "timeout" : "network_error",
      httpStatus,
      durationMs: Date.now() - startedAt,
      cost,
      errorMessage: (err as Error)?.message ?? "unknown error",
    });
    return failResult(isAbort ? "TIMEOUT" : "OPENAI_ERROR", (err as Error)?.message);
  } finally {
    clearTimeout(timeout);
  }
}

interface OpenAiChatResponse {
  model?: string;
  choices?: Array<{ message?: { content?: string } }>;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
  };
}

async function safeText(res: Response): Promise<string> {
  try {
    return await res.text();
  } catch {
    return "";
  }
}

interface LogCallInput {
  handle: string;
  model: string;
  status: "success" | "timeout" | "http_error" | "network_error" | "config_error";
  httpStatus: number | null;
  durationMs: number;
  cost: ReturnType<typeof calculateOpenAiCost>;
  errorMessage: string | null;
}

async function logCall(input: LogCallInput): Promise<void> {
  await recordProviderCall({
    network: "instagram",
    provider: "openai",
    actor: `insights:${input.model}`,
    handle: input.handle,
    status: input.status,
    httpStatus: input.httpStatus,
    durationMs: input.durationMs,
    estimatedCostUsd: input.cost.estimatedCostUsd,
    model: input.model,
    promptTokens: input.cost.promptTokens,
    completionTokens: input.cost.completionTokens,
    totalTokens: input.cost.totalTokens,
    errorMessage: input.errorMessage ?? undefined,
  });
}