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
import { supabaseAdmin } from "@/integrations/supabase/client.server";

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
 * Default daily spending cap (USD) for OpenAI insights calls. Acts as a
 * dynamic kill-switch on top of the binary `OPENAI_ENABLED` flag — even
 * with the flag on, no new call is made once successful spend in the
 * trailing 24h exceeds this cap. Override with `OPENAI_DAILY_CAP_USD`.
 */
const DEFAULT_DAILY_CAP_USD = 5;

function resolveDailyCapUsd(): number {
  const raw = process.env.OPENAI_DAILY_CAP_USD;
  if (!raw) return DEFAULT_DAILY_CAP_USD;
  const n = Number.parseFloat(raw);
  if (!Number.isFinite(n) || n <= 0) return DEFAULT_DAILY_CAP_USD;
  return n;
}

/**
 * Sums `estimated_cost_usd` across the trailing 24h of successful OpenAI
 * calls. Best-effort: a query failure returns 0 (fails open) rather than
 * blocking insights generation on a transient DB hiccup. Logs the error
 * so the admin can see it.
 */
async function getOpenAiSpendLast24hUsd(): Promise<number> {
  try {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data, error } = await supabaseAdmin
      .from("provider_call_logs")
      .select("estimated_cost_usd")
      .eq("provider", "openai")
      .eq("status", "success")
      .gte("created_at", since);
    if (error) {
      console.error("[insights] daily-cap query failed", error.message);
      return 0;
    }
    let total = 0;
    for (const row of data ?? []) {
      const v = (row as { estimated_cost_usd: number | string | null })
        .estimated_cost_usd;
      const n = typeof v === "string" ? Number.parseFloat(v) : (v ?? 0);
      if (Number.isFinite(n)) total += n;
    }
    return total;
  } catch (err) {
    console.error("[insights] daily-cap query threw", err);
    return 0;
  }
}

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

  // 3. Gate: daily spend cap. Independent of OPENAI_ENABLED; protects
  // against runaway costs from a bug or a fan-out loop. Failing open on
  // a query error is intentional — infra hiccups must not silently
  // disable the feature without a visible signal in the logs above.
  const cap = resolveDailyCapUsd();
  const spent = await getOpenAiSpendLast24hUsd();
  if (spent >= cap) {
    return failResult(
      "DAILY_CAP_REACHED",
      `spent_usd=${spent.toFixed(4)} cap_usd=${cap.toFixed(2)}`,
    );
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
        // GPT-5 family only accepts max_completion_tokens.
        // Older 4.x models also accept this name, so it is safe across the board.
        max_completion_tokens: MAX_OUTPUT_TOKENS,
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
      const parsed = parseOpenAiError(errText);
      const cost = calculateOpenAiCost({ model, promptTokens: 0, completionTokens: 0 });
      await logCall({
        handle,
        model,
        status: "http_error",
        httpStatus,
        durationMs: Date.now() - startedAt,
        cost,
        errorMessage: parsed.summary.slice(0, 500),
      });
      return failResult(
        "OPENAI_ERROR",
        `HTTP ${httpStatus}${parsed.code ? ` ${parsed.code}` : ""}`,
      );
    }

    const json = (await res.json()) as OpenAiChatResponse;
    promptTokens = json.usage?.prompt_tokens ?? 0;
    completionTokens = json.usage?.completion_tokens ?? 0;
    const cachedTokens = json.usage?.prompt_tokens_details?.cached_tokens ?? 0;
    const cost = calculateOpenAiCost({
      model,
      promptTokens,
      completionTokens,
      cachedTokens,
    });

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
    prompt_tokens_details?: {
      cached_tokens?: number;
    };
  };
}

async function safeText(res: Response): Promise<string> {
  try {
    return await res.text();
  } catch {
    return "";
  }
}

/**
 * OpenAI error responses are JSON of the shape
 * `{ error: { message, type, code, param } }`. When parseable we keep
 * `code`/`type` separately so the admin ledger does not have to grep raw
 * payloads; otherwise we fall back to the raw text.
 */
function parseOpenAiError(raw: string): { summary: string; code: string | null } {
  if (!raw) return { summary: "", code: null };
  try {
    const json = JSON.parse(raw) as {
      error?: { message?: string; type?: string; code?: string };
    };
    const err = json.error;
    if (err && (err.message || err.code || err.type)) {
      const parts: string[] = [];
      if (err.code) parts.push(`code=${err.code}`);
      if (err.type) parts.push(`type=${err.type}`);
      if (err.message) parts.push(err.message);
      return {
        summary: parts.join(" · "),
        code: err.code ?? err.type ?? null,
      };
    }
  } catch {
    // not JSON — fall through
  }
  return { summary: raw, code: null };
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