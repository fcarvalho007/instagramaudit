
# Convert Comment Intelligence to Free Report Feature

## Problem

Comment intelligence is currently gated behind a PRO/plan check. The product decision is to make it part of the free report. Six locations reference PRO/Premium in relation to this feature.

## PRO References Found

| # | File | Line(s) | What says PRO | Action |
|---|------|---------|---------------|--------|
| 1 | `src/lib/analysis/types.ts` | 107 | `PRO-only — absent for FREE reports…` | Update comment to reflect free availability |
| 2 | `src/lib/analysis/types.ts` | 132 | `// Comment Intelligence (PRO feature)` | Remove PRO label |
| 3 | `src/lib/analysis/comment-scraper.server.ts` | 87-100 | `CommentScraperGateInput.isProAnalysis` + `shouldRunCommentScraper` requires PRO or internal test | Simplify: only require `featureEnabled` |
| 4 | `src/routes/api/analyze-public-v1.ts` | 1039-1043 | Passes `isProAnalysis: false` to gate — currently only runs with `INTERNAL_TEST` | Remove plan gate; run when `featureEnabled` is true |
| 5 | `src/components/report-redesign/v2/report-comment-intelligence.tsx` | 5-6, 124-157 | `CommentIntelligenceTeaser` with Lock icon + "No plano Pro…" text | Remove teaser component; show "unavailable" state without PRO upsell |
| 6 | `src/components/report-redesign/v2/report-comment-intelligence.tsx` | 161 | `// Full Comment Intelligence Section (PRO)` comment | Remove PRO label |

## Changes Per File

### 1. `src/lib/analysis/types.ts`
- Line 107: Change comment to "Absent when COMMENT_SCRAPER_ENABLED=false or scraper failed."
- Line 132: Change section header to "Comment Intelligence"

### 2. `src/lib/analysis/comment-scraper.server.ts`
- Remove `isProAnalysis` from `CommentScraperGateInput` interface
- Simplify `shouldRunCommentScraper`: return `input.featureEnabled` (keep `isInternalTest` as optional override for when feature flag is off during dev)
- Update JSDoc accordingly

### 3. `src/routes/api/analyze-public-v1.ts`
- Remove `isProAnalysis` from the `shouldRunCommentScraper` call (line ~1041)
- Keep `isInternalTest` for dev convenience

### 4. `src/components/report-redesign/v2/report-comment-intelligence.tsx`
- Replace `CommentIntelligenceTeaser` (PRO upsell with Lock icon) with a neutral "unavailable" state — e.g. a note saying comment analysis is not available for this report (no plan mention, no upsell)
- Remove all PRO/Premium comments and labels
- Keep `ScopeNote` component as-is

### 5. `src/lib/analysis/__tests__/comment-intelligence.test.ts`
- Update gate tests: `shouldRunCommentScraper` should return true when only `featureEnabled` is true (no plan check needed)
- Remove/update test cases that assert PRO-gating behaviour

## Cost Controls (Unchanged)

All cost guardrails remain intact — this is not about removing controls, only removing plan-gating:

- `COMMENT_SCRAPER_ENABLED` env kill switch
- `COMMENT_SCRAPER_MAX_POSTS` (default 5, max 12)
- `COMMENT_SCRAPER_RESULTS_LIMIT` (default 50, max 200)
- `COMMENT_SCRAPER_MAX_CHARGE_USD` (default $1.50, max $5.00)
- Cache reuse via snapshot (scraper only runs on fresh analyses)
- Failure-safe: comment scraper errors never break the main analysis
- `provider_call_logs` records every run with cost, duration, status

## Files Changed Summary

| File | Type of change |
|------|---------------|
| `src/lib/analysis/types.ts` | Comments only |
| `src/lib/analysis/comment-scraper.server.ts` | Remove `isProAnalysis` from gate |
| `src/routes/api/analyze-public-v1.ts` | Remove `isProAnalysis` from call |
| `src/components/report-redesign/v2/report-comment-intelligence.tsx` | Replace PRO teaser with neutral state |
| `src/lib/analysis/__tests__/comment-intelligence.test.ts` | Update gate tests |

## Validation

- `bunx tsc --noEmit` — zero errors
- `bunx vitest run` — all tests pass
- Existing free report flow unaffected
- Other PRO features (competitors, export, white-label) untouched
