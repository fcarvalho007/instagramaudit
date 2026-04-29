/**
 * R5 — local validation harness for editorial_patterns in the OpenAI
 * insights flow. Three cases:
 *   1. POSITIVE: insight cites editorial_patterns evidence + numeric body → ok.
 *   2. NEGATIVE: model leaks "editorial_patterns.market_demand_content_fit"
 *      in the body → reason="TECHNICAL_LEAK".
 *   3. NEGATIVE: generic recommendation, no number → reason="GENERIC_OUTPUT".
 *
 * Run: `bun src/lib/insights/__tests__/validate-editorial.test.ts`.
 * Pure: no OpenAI call, no I/O.
 */

import assert from "node:assert/strict";

import { buildInsightsUserPayload } from "../prompt";
import type { InsightsContext } from "../types";
import { validateInsights } from "../validate";

function makeCtx(): InsightsContext {
  return {
    profile: {
      username: "frederico.m.carvalho",
      display_name: "Frederico Carvalho",
      followers_count: 1200,
      posts_count: 42,
      is_verified: false,
      bio: "Marketing & IA",
      avatar_url: null,
      following_count: null,
    },
    content_summary: {
      posts_analyzed: 12,
      dominant_format: "Reels",
      average_likes: 80,
      average_comments: 4,
      average_engagement_rate: 0.5,
      estimated_posts_per_week: 1.5,
    },
    top_posts: [
      {
        format: "Reels",
        likes: 120,
        comments: 8,
        engagement_pct: 1.2,
        caption_excerpt: "Reel sobre IA aplicada a marketing",
      },
    ],
    benchmark: null,
    competitors_summary: { count: 0, median_engagement_pct: null },
    market_signals: { has_free: false, has_paid: false },
    editorial_patterns: {
      engagement_trend: { direction: "up", confidence: "média", sample_size: 8 },
      caption_length: {
        best_bucket: "Média (80–250)",
        best_avg_engagement_pct: 2.4,
        sample_size: 5,
      },
      hashtag_count: {
        best_bucket: "5–10",
        best_avg_engagement_pct: 2.1,
        sample_size: 6,
      },
      collaboration_lift: { delta_pct: 42, with_count: 3, without_count: 9 },
      comments_to_likes_ratio: { ratio_pct: 5.2, sample_size: 12 },
    },
  };
}

function passingResponse() {
  return {
    insights: [
      {
        id: "COLLAB_LIFT",
        title: "Colaborações elevam o envolvimento",
        body: "Publicações com colaborações geram +42% de envolvimento face às sem colaborações (3 vs 9 publicações). Planear 2 colaborações por mês durante 8 semanas e medir.",
        evidence: [
          "editorial_patterns.collaboration_lift.delta_pct",
          "editorial_patterns.collaboration_lift.with_count",
          "editorial_patterns.collaboration_lift.without_count",
        ],
        confidence: "baseado em dados observados",
        priority: 80,
      },
      {
        id: "POSTING_CADENCE",
        title: "Ritmo semanal abaixo do recomendado",
        body: "O ritmo actual é de 1,5 publicações por semana. Subir para 3 publicações semanais durante 4 semanas e reavaliar.",
        evidence: ["content_summary.estimated_posts_per_week"],
        confidence: "baseado em dados observados",
        priority: 60,
      },
      {
        id: "ENG_LOW",
        title: "Envolvimento médio baixo",
        body: "O envolvimento médio (0,5%) está aquém do esperado. Testar capas mais fortes nos próximos 4 Reels e medir o impacto.",
        evidence: ["content_summary.average_engagement_rate"],
        confidence: "baseado em dados observados",
        priority: 50,
      },
    ],
  };
}

function clone<T>(x: T): T {
  return JSON.parse(JSON.stringify(x)) as T;
}

let failed = 0;
function run(name: string, fn: () => void) {
  try {
    fn();
    console.log(`  ok  ${name}`);
  } catch (err) {
    failed += 1;
    console.log(`  FAIL ${name}`);
    console.error(err);
  }
}

console.log("validate-editorial.test.ts");

const ctx = makeCtx();

run("payload exposes editorial_patterns + new evidence paths", () => {
  const payload = buildInsightsUserPayload(ctx);
  assert.ok(payload.editorial_patterns, "editorial_patterns must be present");
  assert.equal(
    payload.editorial_patterns!.collaboration_lift!.delta_pct,
    42,
  );
  assert.ok(
    payload.available_signals.includes(
      "editorial_patterns.collaboration_lift.delta_pct",
    ),
  );
  assert.ok(
    payload.available_signals.includes(
      "editorial_patterns.engagement_trend.direction",
    ),
  );
});

run("CORRECT editorial_patterns insight passes the validator", () => {
  const res = validateInsights(passingResponse(), ctx);
  if (!res.ok) {
    throw new Error(`expected ok, got ${res.reason}: ${res.detail}`);
  }
  assert.equal(res.insights[0].id, "COLLAB_LIFT");
});

run("technical-token leak in body is rejected", () => {
  const raw = clone(passingResponse());
  // Model literally writes the snake_case path in the body — must fail.
  raw.insights[0].body =
    "O editorial_patterns.collaboration_lift.delta_pct é 42. Reforçar colaborações nas próximas 4 semanas.";
  const res = validateInsights(raw, ctx);
  assert.equal(res.ok, false);
  if (res.ok) throw new Error("unreachable");
  assert.equal(res.reason, "TECHNICAL_LEAK");
});

run("generic recommendation without number is rejected", () => {
  const raw = clone(passingResponse());
  raw.insights[0].body =
    "Apostar em mais colaborações para crescer mais depressa.";
  const res = validateInsights(raw, ctx);
  assert.equal(res.ok, false);
  if (res.ok) throw new Error("unreachable");
  assert.equal(res.reason, "GENERIC_OUTPUT");
});

if (failed > 0) {
  console.log(`\n${failed} failure(s)`);
  process.exit(1);
}
console.log("\nall passed");
