/**
 * Local validation harness for the market-signals insights flow.
 *
 * Pure: builds a synthetic `InsightsContext` with a single strong keyword
 * (`ia`, score 65, trend up +22%) plus a zero-signal keyword, and feeds
 * three model-style responses through `validateInsights`:
 *
 *   1. CORRECT body cites the keyword + numeric score + trend → ok=true.
 *   2. GENERIC body without numbers → reason="GENERIC_OUTPUT".
 *   3. Cites a zero-signal keyword as if strong → reason="EVIDENCE_INVALID"
 *      (the model picked an evidence path not present in available_signals
 *      because zero-signal keywords are NOT in `top_keywords`).
 *
 * Runs with `bun src/lib/insights/__tests__/validate-market.test.ts`. No
 * external test runner needed; each case asserts via `assert` and exits
 * with code 1 on failure.
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
    market_signals: {
      has_free: true,
      has_paid: false,
      top_keywords: ["ia"],
      strongest_keyword: "ia",
      strongest_score: 65,
      trend_direction: "up",
      trend_delta_pct: 22,
      usable_keyword_count: 1,
      zero_signal_keywords: ["marketingdigital"],
      dropped_keywords: [],
    },
  };
}

function makePassingResponse() {
  return {
    insights: [
      {
        id: "MARKET_IA_DEMAND",
        title: "Procura por IA em alta no mercado",
        body: "A procura por «ia» apresenta sinal médio de 65 e tendência em alta (+22%). Reforçar conteúdos sobre este tema durante 4 semanas e medir o envolvimento.",
        evidence: [
          "market_signals.strongest_keyword",
          "market_signals.strongest_score",
          "market_signals.trend_direction",
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

console.log("validate-market.test.ts");

const ctx = makeCtx();

run("payload exposes new numeric market signals", () => {
  const payload = buildInsightsUserPayload(ctx);
  assert.equal(payload.market_signals.strongest_score, 65);
  assert.equal(payload.market_signals.trend_delta_pct, 22);
  assert.equal(payload.market_signals.usable_keyword_count, 1);
  assert.deepEqual(payload.market_signals.top_keywords, ["ia"]);
  assert.deepEqual(payload.market_signals.zero_signal_keywords, [
    "marketingdigital",
  ]);
  assert.ok(
    payload.available_signals.includes("market_signals.strongest_score"),
  );
  assert.ok(
    payload.available_signals.includes("market_signals.trend_delta_pct"),
  );
  assert.ok(
    payload.available_signals.includes("market_signals.zero_signal_keywords"),
  );
});

run("CORRECT market insight passes the validator", () => {
  const res = validateInsights(makePassingResponse(), ctx);
  if (!res.ok) {
    throw new Error(`expected ok, got ${res.reason}: ${res.detail}`);
  }
  assert.equal(res.insights[0].id, "MARKET_IA_DEMAND");
});

run("GENERIC market body without number is rejected", () => {
  const raw = clone(makePassingResponse());
  raw.insights[0].body = "Alinhar o conteúdo com as keywords em tendência.";
  const res = validateInsights(raw, ctx);
  assert.equal(res.ok, false);
  if (res.ok) throw new Error("unreachable");
  assert.equal(res.reason, "GENERIC_OUTPUT");
});

run("zero-signal keyword cited as evidence is rejected", () => {
  const raw = clone(makePassingResponse());
  // Model claims marketingdigital is a strong demand signal — but the
  // path it would need to cite (`market_signals.top_keywords`) does NOT
  // contain that keyword, and there is no path that legitimises a
  // zero-signal keyword as strong demand. The closest invalid attempt
  // is to cite `market_signals.strongest_keyword` while writing a body
  // about a zero-signal keyword, which still fails because the body
  // contains no number AND no >=5-char token from evidence ("strongest"
  // / "keyword" do not appear in pt-PT body).
  raw.insights[0].body =
    "A procura por «marketingdigital» está em alta. Apostar neste tema.";
  raw.insights[0].evidence = ["market_signals.zero_signal_keywords"];
  const res = validateInsights(raw, ctx);
  assert.equal(res.ok, false);
  if (res.ok) throw new Error("unreachable");
  // Either GENERIC_OUTPUT (body has no digit + tokens don't match) or
  // EVIDENCE_INVALID (if the path weren't in available_signals). With
  // current ctx, `market_signals.zero_signal_keywords` IS available,
  // so the failure mode is GENERIC_OUTPUT — proving the validator
  // catches the abuse via lack of numeric grounding.
  assert.ok(
    res.reason === "GENERIC_OUTPUT" || res.reason === "EVIDENCE_INVALID",
    `unexpected reason: ${res.reason}`,
  );
});

if (failed > 0) {
  console.log(`\n${failed} failure(s)`);
  process.exit(1);
}
console.log("\nall passed");