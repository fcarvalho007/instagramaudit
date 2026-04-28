/**
 * Editorial + structural validator for OpenAI insights output.
 *
 * Pure module. The OpenAI response (already JSON-parsed) is fed in
 * together with the original `InsightsContext` so the validator can
 * cross-check that every cited `evidence` corresponds to a signal that
 * actually existed in the input.
 *
 * Failure modes returned via `reason`:
 *   - "SCHEMA_INVALID"  — Zod parse failed (wrong types / missing fields)
 *   - "WRONG_COUNT"     — fewer than 3 or more than 5 insights
 *   - "EMPTY_FIELD"     — title/body/id is empty after trim
 *   - "BODY_TOO_LONG"   — body length > 280 chars
 *   - "BAD_CONFIDENCE"  — confidence string not in the allowed set
 *   - "EVIDENCE_EMPTY"  — evidence array empty
 *   - "EVIDENCE_INVALID" — citation not in `available_signals`
 *   - "GENERIC_OUTPUT"  — body lacks numeric marker / signal mention
 *   - "PTBR_LEAK"       — Brazilian-Portuguese token detected
 */

import { z } from "zod";

import {
  buildInsightsUserPayload,
  type InsightsUserPayload,
} from "./prompt";
import type { AiInsightItem, InsightsContext } from "./types";

/** Zod schema mirroring the JSON the model is required to return. */
const aiInsightItemSchema = z.object({
  id: z.string().min(1).max(64),
  title: z.string().min(1).max(120),
  body: z.string().min(1),
  evidence: z.array(z.string().min(1)).min(1),
  confidence: z.enum(["baseado em dados observados", "sinal parcial"]),
  priority: z.number().int().min(1).max(100),
});

export const aiInsightsResponseSchema = z.object({
  insights: z.array(aiInsightItemSchema),
});

export type AiInsightsResponseRaw = z.infer<typeof aiInsightsResponseSchema>;

const PTBR_TOKENS: RegExp[] = [
  /\bvocê\b/i,
  /\btela\b/i,
  /\bcelular(es)?\b/i,
  /\busuári[oa]s?\b/i,
  /\barquivos?\b/i,
  /\bengajamento\b/i,
  /\baplicativo\b/i,
  /\bmídia\b/i,
  /\btime\b/i, // ambiguous, but rarely used in pt-PT
];

/**
 * Deterministic alias map: short evidence keys the model sometimes emits,
 * pointing at the canonical JSON-pointer-ish path used by the prompt.
 * Lookup is O(1). Aliases are only accepted when the canonical path is
 * present in `available_signals` for the current context.
 */
const EVIDENCE_ALIASES: Record<string, string> = {
  average_comments: "content_summary.average_comments",
  average_likes: "content_summary.average_likes",
  average_engagement_rate: "content_summary.average_engagement_rate",
  engagement_rate: "content_summary.average_engagement_rate",
  posts_per_week: "content_summary.estimated_posts_per_week",
  estimated_posts_per_week: "content_summary.estimated_posts_per_week",
  followers: "profile.followers_count",
  followers_count: "profile.followers_count",
  posts_count: "profile.posts_count",
  dominant_format: "content_summary.dominant_format",
};

/**
 * Normalize an `evidence` string to its canonical path when a known alias
 * is detected. Pure and idempotent. If the input is already canonical
 * (present in `allowed`), it is returned unchanged. If it is an alias
 * whose canonical form is in `allowed`, the canonical form is returned.
 * Otherwise the input is returned unchanged so the validator can reject
 * it with `EVIDENCE_INVALID`.
 */
export function normalizeEvidencePath(
  path: string,
  allowed: ReadonlySet<string>,
): string {
  const trimmed = path.trim();
  if (allowed.has(trimmed)) return trimmed;
  const canonical = EVIDENCE_ALIASES[trimmed];
  if (canonical && allowed.has(canonical)) return canonical;
  return trimmed;
}

/** Maximum allowed body length (characters). */
export const INSIGHT_BODY_MAX = 280;
/** Minimum number of insights expected from the model. */
export const INSIGHT_MIN_COUNT = 3;
/** Maximum number of insights accepted from the model. */
export const INSIGHT_MAX_COUNT = 5;

export type ValidateResult =
  | { ok: true; insights: AiInsightItem[] }
  | { ok: false; reason: string; detail: string };

function fail(reason: string, detail: string): ValidateResult {
  return { ok: false, reason, detail };
}

/**
 * Detects whether `body` contains a quantitative marker — either a digit
 * or a token from one of the cited evidence paths. Used to reject vague,
 * non-grounded prose like "melhorar a presença".
 */
function hasQuantitativeMarker(body: string, evidence: string[]): boolean {
  if (/\d/.test(body)) return true;
  // Mention check: split paths on dots/brackets to extract leaf tokens
  // (e.g. `content_summary.average_engagement_rate` → ["engagement"]).
  const tokens = evidence
    .flatMap((path) => path.split(/[.[\]]+/))
    .map((t) => t.trim())
    .filter((t) => t.length >= 5);
  const lower = body.toLowerCase();
  return tokens.some((t) => lower.includes(t.toLowerCase()));
}

function detectPtBrLeak(text: string): string | null {
  for (const re of PTBR_TOKENS) {
    const m = re.exec(text);
    if (m) return m[0];
  }
  return null;
}

/**
 * Validate the parsed model response against editorial + structural rules.
 *
 * On success returns insights sorted by `priority` desc.
 */
export function validateInsights(
  raw: unknown,
  ctx: InsightsContext,
): ValidateResult {
  const parsed = aiInsightsResponseSchema.safeParse(raw);
  if (!parsed.success) {
    return fail("SCHEMA_INVALID", parsed.error.issues[0]?.message ?? "zod");
  }
  const items = parsed.data.insights;
  if (items.length < INSIGHT_MIN_COUNT || items.length > INSIGHT_MAX_COUNT) {
    return fail(
      "WRONG_COUNT",
      `expected ${INSIGHT_MIN_COUNT}-${INSIGHT_MAX_COUNT}, got ${items.length}`,
    );
  }

  // Re-derive available signals from ctx so the validator does not trust
  // the model echo of `available_signals`.
  const allowedEvidence = new Set(
    buildInsightsUserPayloadSignals(buildInsightsUserPayload(ctx)),
  );

  for (const item of items) {
    if (!item.id.trim() || !item.title.trim() || !item.body.trim()) {
      return fail("EMPTY_FIELD", `id=${item.id}`);
    }
    if (item.body.length > INSIGHT_BODY_MAX) {
      return fail("BODY_TOO_LONG", `id=${item.id} len=${item.body.length}`);
    }
    if (item.evidence.length === 0) {
      return fail("EVIDENCE_EMPTY", `id=${item.id}`);
    }
    // Normalize aliases (e.g. `average_comments` →
    // `content_summary.average_comments`) before checking the allow-list,
    // and persist the canonical form back onto the item so downstream
    // consumers store canonical paths, not model aliases.
    item.evidence = item.evidence.map((ev) =>
      normalizeEvidencePath(ev, allowedEvidence),
    );
    for (const ev of item.evidence) {
      if (!allowedEvidence.has(ev)) {
        return fail("EVIDENCE_INVALID", `id=${item.id} evidence=${ev}`);
      }
    }
    if (!hasQuantitativeMarker(item.body, item.evidence)) {
      return fail("GENERIC_OUTPUT", `id=${item.id}`);
    }
    const ptbrTitle = detectPtBrLeak(item.title);
    const ptbrBody = detectPtBrLeak(item.body);
    if (ptbrTitle || ptbrBody) {
      return fail("PTBR_LEAK", `id=${item.id} token=${ptbrTitle ?? ptbrBody}`);
    }
  }

  const sorted: AiInsightItem[] = [...items]
    .sort((a, b) => b.priority - a.priority)
    .map((i) => ({
      id: i.id,
      title: i.title.trim(),
      body: i.body.trim(),
      evidence: [...i.evidence],
      confidence: i.confidence,
      priority: i.priority,
    }));

  return { ok: true, insights: sorted };
}

/** Pull the `available_signals` array from a built payload. */
function buildInsightsUserPayloadSignals(
  payload: InsightsUserPayload,
): string[] {
  return payload.available_signals;
}