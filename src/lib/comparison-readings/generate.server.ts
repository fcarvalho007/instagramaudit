/**
 * Server-only: generate cached AI editorial readings for a comparison.
 *
 * - Single-shot per snapshot/competitor (idempotent via evidence_hash).
 * - Result persisted in `normalized_payload.ai_comparison_readings_v1`.
 * - Never throws — failures return a stored payload with status="failed".
 * - Caller is the enrichment runner; UI never invokes this directly.
 */

import type { EnrichmentResult } from "@/lib/enrichment/types";
import { buildComparisonEvidence, hashEvidencePack } from "./build-evidence";
import { buildUserPrompt, SYSTEM_PROMPT_V1 } from "./prompt";
import {
  COMPARISON_READINGS_KEY,
  COMPARISON_READINGS_MODEL,
  COMPARISON_READINGS_PROMPT_VERSION,
  ComparisonAIReadingsSchema,
  type StoredComparisonReadings,
} from "./types";

const LOG = "[comparison-readings]";
const AI_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
const REQUEST_TIMEOUT_MS = 30_000;

type AnyRecord = Record<string, unknown>;

function extractJson(text: string): unknown {
  // Strip optional ```json fences and surrounding text.
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1] : text;
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start < 0 || end < 0 || end <= start) {
    throw new Error("no JSON object in model output");
  }
  return JSON.parse(candidate.slice(start, end + 1));
}

export async function generateComparisonReadingsForSnapshot(
  normalizedPayload: AnyRecord,
): Promise<EnrichmentResult> {
  const window =
    typeof (normalizedPayload.meta as AnyRecord | undefined)?.windowLabel ===
    "string"
      ? ((normalizedPayload.meta as AnyRecord).windowLabel as string)
      : null;

  const pack = buildComparisonEvidence(normalizedPayload, 0, window);
  if (!pack) {
    console.info(`${LOG} no usable competitor — skipping`);
    return { ok: true, payloadPatch: null };
  }

  const model = COMPARISON_READINGS_MODEL;
  const promptVersion = COMPARISON_READINGS_PROMPT_VERSION;
  const evidenceHash = hashEvidencePack(pack, promptVersion, model);

  // Idempotency: skip if a ready cache for the same evidence already exists.
  const cached = normalizedPayload[COMPARISON_READINGS_KEY] as
    | StoredComparisonReadings
    | undefined;
  if (
    cached &&
    cached.status === "ready" &&
    cached.evidence_hash === evidenceHash &&
    cached.model === model &&
    cached.prompt_version === promptVersion
  ) {
    console.info(`${LOG} cached match — skipping AI call`);
    return { ok: true, payloadPatch: null };
  }

  const apiKey = process.env.LOVABLE_API_KEY;
  if (!apiKey) {
    console.warn(`${LOG} LOVABLE_API_KEY missing — skipping`);
    return { ok: true, payloadPatch: null };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  const startedAt = Date.now();

  let stored: StoredComparisonReadings;
  try {
    const res = await fetch(AI_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Lovable-API-Key": apiKey,
      },
      body: JSON.stringify({
        model,
        temperature: 0.4,
        max_tokens: 1500,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: SYSTEM_PROMPT_V1 },
          { role: "user", content: buildUserPrompt(pack) },
        ],
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`gateway ${res.status}: ${body.slice(0, 200)}`);
    }
    const data = (await res.json()) as AnyRecord;
    const content =
      ((data.choices as AnyRecord[] | undefined)?.[0]?.message as AnyRecord | undefined)
        ?.content;
    if (typeof content !== "string") {
      throw new Error("no string content in response");
    }

    const parsed = extractJson(content);
    const result = ComparisonAIReadingsSchema.safeParse(parsed);
    if (!result.success) {
      throw new Error(`schema validation failed: ${result.error.message.slice(0, 200)}`);
    }

    stored = {
      version: "1",
      model,
      prompt_version: promptVersion,
      evidence_hash: evidenceHash,
      competitor_handle: pack.competitor.handle,
      window: pack.window,
      generated_at: new Date().toISOString(),
      status: "ready",
      readings: result.data,
    };
    console.info(
      `${LOG} ok in ${Date.now() - startedAt}ms (${result.data.cards.length} cards)`,
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`${LOG} failed`, msg);
    stored = {
      version: "1",
      model,
      prompt_version: promptVersion,
      evidence_hash: evidenceHash,
      competitor_handle: pack.competitor.handle,
      window: pack.window,
      generated_at: new Date().toISOString(),
      status: "failed",
      readings: null,
      error: msg.slice(0, 500),
    };
  } finally {
    clearTimeout(timer);
  }

  return {
    ok: stored.status === "ready",
    payloadPatch: { [COMPARISON_READINGS_KEY]: stored },
    error: stored.status === "failed" ? stored.error : undefined,
  };
}