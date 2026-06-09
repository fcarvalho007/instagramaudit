# Post-MVP `card_readings` AI enrichment — architecture

Reuses the patterns already proven by `comparison_readings` (Lovable AI Gateway + provider gate + budget cap + idempotent cache in `normalized_payload`). The differences are scope (solo report, no competitor), card surface, and the schema's lack of a "primary vs competitor" axis.

## 1. Card IDs

```ts
export const CARD_READING_CARD_IDS = [
  "engagement",
  "cadence",
  "format_mix",
  "weekday_rhythm",
  "bio_conversion_path",
  "top_posts",
  "competitor_comparison",
] as const;
```

`competitor_comparison` is included as a thin meta-card that summarises the entire vs-competitor block when one exists. It is OPTIONAL — emitted only when `competitors[0].success === true`. Otherwise the model omits that card_id entirely (schema allows `min(1)`, not `min(7)`).

## 2. Evidence payload per card

The generator builds a per-card evidence pack from the snapshot, so the model only sees what is needed for that card. Keeps tokens small and the `evidence_hash` stable across cosmetic snapshot churn.

| card_id | Evidence fields (all sourced from `normalized_payload`) |
| --- | --- |
| `engagement` | `summary.average_engagement_rate`, `benchmark.tier`, `benchmark.expected_er_range`, `posts_analyzed`, `followers_count` |
| `cadence` | `summary.posts_per_week`, `cadence.consecutive_silent_days`, `cadence.last_post_at`, `posts_analyzed` |
| `format_mix` | `format_stats.{reels,carousels,images}.{share, avg_er}`, `summary.dominant_format` |
| `weekday_rhythm` | `weekday.iso_distribution` (7 ints), `weekday.best_weekday`, `weekday.worst_weekday`, `posts_analyzed` |
| `bio_conversion_path` | `profile.{biography, external_url, is_business, category}`, `profile.followers_count`, `summary.average_engagement_rate` |
| `top_posts` | top-3 posts: `{shortcode, format, likes, comments, er, caption_excerpt(120ch), days_old}` |
| `competitor_comparison` | symmetric deltas vs `competitors[0]`: `{er_delta_pp, posts_per_week_delta, dominant_format_match, sample_n_primary, sample_n_competitor}` |

Global evidence (always included): `{ window_label, posts_analyzed_total, snapshot_generated_at }`.

Numeric values are rounded to 2 decimals before hashing to avoid `evidence_hash` churn from float noise.

## 3. JSON schema

Two-layer schema mirroring `comparison-readings/types.ts`.

```ts
// Per-card reading
export const CardReadingSchema = z.object({
  card_id: z.enum(CARD_READING_CARD_IDS),
  headline: z.string().min(1).max(120),       // editorial title
  key_reading: z.string().min(1).max(420),    // 1–2 sentences, pt-PT
  evidence_points: z.array(z.object({
    label: z.string().min(1).max(80),
    field: z.string().min(1).max(80),         // dotted snapshot path
    value: z.union([z.string(), z.number(), z.null()]),
  })).max(4).default([]),
  recommendation: z.string().max(280).nullable(),
  confidence: z.enum(["low", "medium", "high"]),
  caveats: z.array(z.string().max(160)).max(4).default([]),
});

// Whole-snapshot payload (one call returns all cards)
export const CardReadingsPayloadSchema = z.object({
  version: z.literal("1"),
  language: z.literal("pt-PT"),
  cards: z.array(CardReadingSchema).min(1).max(7),
});

// Persisted wrapper, lives under normalized_payload.ai_card_readings_v1
export const StoredCardReadingsSchema = z.object({
  version: z.literal("1"),
  model: z.string(),
  prompt_version: z.string(),
  evidence_hash: z.string(),
  window: z.string().nullable(),
  generated_at: z.string(),                            // ISO
  status: z.enum(["ready", "failed", "skipped"]),
  readings: CardReadingsPayloadSchema.nullable(),
  error: z.string().optional(),
  skip_reason: z.string().optional(),                  // e.g. LOVABLE_AI_BUDGET_EXCEEDED
});
```

Constants:
```
CARD_READINGS_KEY            = "ai_card_readings_v1"
CARD_READINGS_PROMPT_VERSION = "v1"
CARD_READINGS_MODEL          = "google/gemini-3-flash-preview"
```

## 4. Idempotency key

`evidence_hash = sha256( JSON.stringify({ pack, prompt_version, model }) )`

Cache hit when ALL of these match the stored row:
- `snapshot_id` (implicit — payload lives inside the snapshot)
- `card_set_id` (the literal `"ai_card_readings_v1"` — bumped only on schema change)
- `evidence_hash`
- `prompt_version`
- `model`

Generator short-circuits when `cached.status === "ready"` AND all four match — same idempotency contract as `comparison_readings`.

## 5. Cache location

`analysis_snapshots.normalized_payload.ai_card_readings_v1` (typed by `StoredCardReadingsSchema`).

Rationale: snapshot is the single source of truth, already serves the report renderer, already survives Pro upgrade, already part of admin diagnostics. No new table. No schema migration.

## 6. Paid-only gate

Add to `src/lib/enrichment/types.ts`:
- New `EnrichmentType = "card_readings"`.
- `PAID_ENRICHMENT_TYPES` gains `card_readings`.
- `FREE_ENRICHMENT_TYPES` stays `[]` → `buildFreeEnrichmentStatus()` pre-marks `card_readings = "skipped_free"`. Free reports never enqueue or read it.
- Renderer guard: solo-report cards read `ai_card_readings_v1` only when `report.mode !== "free_with_engagement"`. Free mode keeps its `PremiumTeaserCard`s unchanged.

## 7. Provider budget gate

Reuse the gates added in the previous PR — no new infrastructure:
- `isLovableAiAllowed(handle)` (kill-switch + optional allowlist).
- `assertLovableAiDailyBudgetAvailable()` (sums `provider_call_logs WHERE provider='lovable_ai'`).
- On skip: return `{ ok: true, payloadPatch: null, skipReason: "LOVABLE_AI_*" }` so the driver writes `enrichment_jobs.status='skipped'` with the reason.
- Every gateway call is logged via `recordProviderCall({ provider: "lovable_ai", actor: "card_readings:${model}", ... })`, contributing to the SAME daily $5 cap as `comparison_readings`. Both features share one cap intentionally — no double accounting, easy ops.

Optional follow-up (out of scope here): split caps via `LOVABLE_AI_{COMPARISON,CARD}_DAILY_CAP_USD` if usage shows they need independent throttling.

## 8. UI placement

A small `<CardReadingPanel />` rendered inside the existing solo-report cards, BELOW the deterministic data — never replacing it. Same pattern as today's competitor cards.

```
┌─ EngagementCard ──────────────────────┐
│  ER 3.4%  ·  vs benchmark micro       │  ← deterministic (always)
│  [chart]                               │
│  ─────────────────────────────────────│
│  Leitura IA                            │  ← only when card_readings.status=ready
│  headline · key_reading                │     AND cards[card_id].confidence != null
│  ▸ evidence_points (≤2 inline chips)   │
│  💡 recommendation                     │
│  caveats (italic, small)               │
└────────────────────────────────────────┘
```

Rules:
- Mounted in: `engagement-card`, `cadence-card`, `format-card`, `weekday-card`, `bio-card`, `top-posts-card`, `competitor-comparison-hero`.
- Hidden when: payload missing, `status !== "ready"`, or `cards[card_id]` absent. No skeleton, no "AI failed" toast — silent fallback to deterministic-only view (UX parity with `comparison_readings`).
- Styling: existing surface tokens, Inter only, no JetBrains Mono. Light theme (Ocean Breeze palette). Confidence pill = `low/medium/high` chip on the right.
- Mobile: panel collapses to 2 lines + expand button (`375px` budget per `Core` memory).
- A single shared component — `<CardReadingPanel cardId="engagement" />` — keeps the snapshot lookup centralised and prevents copy/style drift.

## 9. Cost estimate per paid report

Input pack (all 7 cards + global): ≈ 2,000–2,800 tokens of structured JSON in the user prompt. System prompt ≈ 600 tokens. Output cap = 1,500 tokens (set `max_tokens` like `comparison_readings`).

Gemini 3 Flash on Lovable AI Gateway (current `COMPARISON_READINGS_MODEL`):
- ~3,400 input × $0.000075/1k ≈ **$0.00026**
- ~1,500 output × $0.0003/1k  ≈ **$0.00045**
- **Total ≈ $0.0007–$0.0010 per paid report** (rounded up for safety: ≤ $0.002).

Combined with `comparison_readings` (similar magnitude), one fully-enriched paid report stays ≲ **$0.003 in AI cost** — the daily $5 cap then guards ≈ 1,500+ paid reports/day with both features active. If we ever move to a larger model (`gemini-2.5-pro`, GPT-5-mini), expect a 5–10× jump and revisit caps before flipping.

Numbers above are estimates from current published gateway pricing — track actual cost via the `provider_call_logs` rows the generator already writes.

## 10. Batch vs per-card — recommendation: **single batched call**

| Dimension | Single batched call (recommended) | One call per card (7×) |
| --- | --- | --- |
| Cost | 1× model call, shared system prompt | 7× system prompt overhead → ~3–5× higher $ per report |
| Latency | ~1.5–3s | ~7× sequential or complex parallelisation |
| Cross-card coherence | High — model sees all evidence, can avoid contradicting itself between cards | Low — each card answered in isolation, headlines may collide |
| Budget accounting | 1 `provider_call_logs` row per snapshot | 7 rows, finer per-card visibility but noisier admin |
| Partial regen | Whole payload re-generated when ANY card's evidence changes (acceptable — evidence_hash usually changes for the same reason: snapshot refresh) | Per-card invalidation possible |
| Failure mode | Atomic — if call fails, all cards fall back to deterministic | Partial — some cards may render AI, others not (UX inconsistency) |
| Idempotency complexity | 1 hash, 1 cache slot | 7 hashes, 7 cache slots, harder to reason about |

Pick batched. Per-card regen is a future optimisation only if a real product reason emerges (e.g. user-triggered "regenerate this card" button — phase 4).

---

## Cost-control rules (summary)

1. **Paid-only**: `card_readings` lives exclusively in `PAID_ENRICHMENT_TYPES`. Free path renders teasers, never enqueues.
2. **Shared kill-switch**: `LOVABLE_AI_ENABLED=false` disables both `card_readings` and `comparison_readings` instantly.
3. **Shared daily cap**: same `LOVABLE_AI_DAILY_CAP_USD` (default $5) governs the sum of both features.
4. **Allowlist for staging**: `LOVABLE_AI_TESTING_MODE=true` + `LOVABLE_AI_ALLOWLIST=handle1,handle2` limits both features to whitelisted profiles before public rollout.
5. **Idempotency**: re-enrichment of the same snapshot is a no-op when `evidence_hash + prompt_version + model` already match.
6. **Hard ceilings on output**: `max_tokens=1500`, `temperature=0.4`, `response_format=json_object` — same as `comparison_readings`.
7. **Silent skip**: on gate/budget/schema-validation failure, return `{ok:true, payloadPatch:null, skipReason}` so admin sees a `skipped` job and the report keeps rendering deterministic data.
8. **No retry loop on AI errors**: enrichment_jobs already retries up to `max_attempts`; do not add per-call retries inside the generator (a single timeout-bound call only).

## Implementation phases (no code in this PR)

**Phase 1 — Types & cache scaffolding**
- New folder `src/lib/card-readings/` with `types.ts` (schemas above), `build-evidence.ts` (extract + hash), `prompt.ts` (SYSTEM_PROMPT_V1 + user-prompt builder).
- Extend `EnrichmentType` + `PAID_ENRICHMENT_TYPES` + `buildFreeEnrichmentStatus` + `ENRICHMENT_PRIORITY` (priority `45`, after `comparison_readings`).
- No UI, no model calls. Snapshot still works.

**Phase 2 — Generator + job wiring**
- `card-readings/generate.server.ts` mirroring `comparison-readings/generate.server.ts`: fetch → parse → validate → log to `provider_call_logs` as `lovable_ai` with actor `card_readings:${model}`.
- Add `runCardReadings` branch in `run-enrichment.server.ts` with the same gate order: `isLovableAiAllowed → assertLovableAiDailyBudgetAvailable → generator(handle, analysisEventId)`.
- Vitest: gate skips, budget skip, schema-validation failure → stored `status:"failed"` (no UI render).

**Phase 3 — UI panels**
- `<CardReadingPanel cardId={...} />` shared component reading from `report.aiCardReadings`.
- Mount in each existing paid-only card. No copy/typography drift — single component.
- 375px mobile QA. Light theme. Hidden when `status !== "ready"`.

**Phase 4 — Admin & ops (optional)**
- Admin sistema card listing per-snapshot `card_readings` status + cost + evidence_hash + last error (mirrors `comparison_readings` diagnostics).
- Per-card "regenerate" button (admin-only) that invalidates `evidence_hash` for one snapshot.
- Optional split cap envs if usage warrants it.

## Out of scope (explicit)
- No new DB tables / migrations.
- No new provider — Lovable AI Gateway only.
- No streaming UI.
- No "regenerate" button in the public report.
- No prompt/copy changes to `comparison_readings`.
- No Free/Public regression — `FREE_ENRICHMENT_TYPES` stays empty.
- No model upgrade in this design; revisit only after Phase 4 telemetry.

## Risks
- **Card_id drift**: schema may add cards over time. Mitigation: bump `CARD_READINGS_PROMPT_VERSION` (auto-invalidates cache via hash composition) instead of renaming the storage key.
- **Hallucinated evidence_points**: model could cite values not in the pack. Mitigation: enforce `evidence_points[].field` is a dotted path present in the pack at validation time (server-side post-check, drop rogue items).
- **Cost surprise on model change**: if we ever bump to Gemini 2.5 Pro or GPT-5, the $5/day cap may exhaust in <100 reports. Mitigation: re-estimate before changing `CARD_READINGS_MODEL`; budget cap is the safety net regardless.
- **Single shared budget**: a spike in `comparison_readings` could starve `card_readings` (or vice versa). Acceptable today; if it bites, split caps as noted in §7.
