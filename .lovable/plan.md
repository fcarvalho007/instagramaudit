# Final action cards — close the remaining gaps

The previous turn shipped extended `PriorityItem`, evidence-gated deterministic rules, the new UI (chips, source pill, "Baseado em:" footer), and per-card AI source mapping. Tests pass.

This plan covers only what's still missing relative to the latest spec.

## 1) AI context — feed comment intelligence + visual sub-scores

Files: `src/lib/insights/types.ts`, `src/lib/insights/build-context.ts`, `src/lib/insights/prompt.ts`, `src/lib/insights/prompt-v2.ts`.

- Add `comment_intelligence?` to `InsightsContext` and to the user payload built by `buildInsightsUserPayload`:
  ```ts
  comment_intelligence?: {
    sample_posts: number;
    sample_comments: number;
    owner_reply_rate_pct: number;
    questions_from_audience_count: number;
    complaint_or_issue_count: number;
    buying_intent_count: number;
    top_conversation_post?: { comments: number; dominant_signal: string };
  };
  ```
  Only included when `commentIntelligence.available === true` AND it has at least one non-zero signal (avoid forcing the model to mention neutral data).
- Extend `visual_cover` payload block with `sub_scores` (recognizability, visualVariety) when present — already partial, just surface the two numbers most useful for priorities.
- Add a single paragraph to the priorities section of `prompt-v2.ts`:
  > "Quando `comment_intelligence` estiver presente com sinais não-neutros, pelo menos 1 prioridade deve citar um número real dele (reply rate, perguntas, fricção, intenção de compra). Quando `visual_cover` estiver presente com `overall_score < 70` ou sub-score baixo, pelo menos 1 prioridade pode citar esse número. Nunca inventar números fora do payload."
- No change to provider, schema cap (3 items), budget, or any other prompt rule.

## 2) AI priority number-sanitization guard

File: `src/lib/insights/validate-v2.ts` + `src/components/report-redesign/v2/report-diagnostic-block.tsx`.

- After Zod validation, for each AI priority `body`, extract every numeric token (`\d+(?:[.,]\d+)?%?`). Compare against the set of numbers present in the user payload (collected once into a `Set<string>` with both `,` and `.` decimal variants and ±1 rounding tolerance for percentages).
- If a number is **unsupported**:
  - First attempt: strip the offending number + the surrounding parenthetical fragment if it leaves a grammatical sentence.
  - If stripping would gut the sentence, keep the card but mark it `numbersSanitized: true` (internal flag, not persisted to AI snapshot — applied at read time in the diagnostic-block).
- Never fail the whole validation just because numbers were unsupported — degrade gracefully.
- This is implemented as a pure helper `sanitizeAiPriorityNumbers(payload, item)` used at the moment we map AI items into `PriorityItem` in `report-diagnostic-block.tsx` (so it can be added without churning the validator's return type).

## 3) Smarter dedup — by meaning, not only title

File: `src/lib/report/block02-diagnostic.ts` (the ranker in `derivePriorities`) and the AI-merge in `report-diagnostic-block.tsx`.

- Replace the current `seen by title` filter with a composite dedup key:
  ```
  key = normalize(title) | category | basedOn.slice(0,2).join("·")
  ```
- When an AI and deterministic item collide (same key), prefer the AI item; otherwise highest `_score` wins.
- Output still capped at 6.

## 4) Defensive UI when category cannot be inferred

File: `src/components/report-redesign/v2/report-diagnostic-priorities.tsx`.

- Today: missing `category` falls back to `"oportunidade"`. Change to: hide the category chip entirely when `it.category` is `undefined` (so legacy snapshots never get a misleading label). Inference path in `inferAiPriorityItem` already returns a concrete category, so this only affects truly legacy AI snapshots.

## 5) Tests

- `src/lib/report/__tests__/block02-priorities.test.ts`: add a case where two rules produce different titles but same `(category, basedOn)` and assert one is dropped.
- `src/lib/insights/__tests__/sanitize-ai-priorities.test.ts` (new):
  - body with a supported `25%` → kept verbatim.
  - body with an unsupported `47%` → stripped or whole-card downgraded; never crashes.
  - body with no numbers → unchanged.
  - rounding tolerance: payload has `24.6%`, body says `25%` → kept.
- `src/lib/insights/__tests__/cadence-payload.test.ts` style: snapshot test asserting `comment_intelligence` shows up in the payload when present, and is omitted when all signals are zero.

## 6) Validation

- `bunx vitest run src/lib/report/ src/lib/insights/` (target 162+ → still all green).
- Manual: `/analyze/$username` for `@frederico.m.carvalho` (no paid enrichments) — no fabricated cover/comment cards, ≥ 3 cards rendered, no "Pergunta NN" text. Then a snapshot with comment intel — ≥ 1 "Resposta do público" card with evidence chip.

## Out of scope (unchanged)

Visual cover pipeline, comment scraping pipeline, payments, EuPago, checkout, credits, 30/90d gates, competitor gates, Free report structure, AI provider, budget caps, `/report.example`.
