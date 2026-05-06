
# QA Validation — P04 Caption Diagnostics Robustness

## Preliminary Audit Results

| # | Case | Status | Evidence |
|---|------|--------|----------|
| 1 | Old semantic cache (no schemaVersion) | **PASS** | `parseCaptionSemanticAnalysis` at line 62 returns `null` when `r.schemaVersion !== 2`. Card falls back to deterministic rendering. |
| 2 | Valid semantic cache (schemaVersion: 2) | **PASS** | Line 62 accepts `schemaVersion === 2`. Lines 396-416, 420-444, 477-505, 515-543, 669, 674, 680, 686, 695-728 all check `hasSemantic` and render semantic fields when present. |
| 3 | Emoji-only captions | **PASS** | `cleanCaption` at line 225 strips `\p{Extended_Pictographic}`. `countWords` at line 230-233 calls `cleanCaption` first. "🔥🔥🔥" becomes empty string, word count = 0. "#ai #marketing 🔥🔥" becomes empty (hashtags + emojis stripped), word count = 0. |
| 4 | Very short captions (avgWordsPerCaption < 5) | **PASS** | `tooShortForThemes` guard at line 372. When true, line 405 skips deterministic themes and shows "Sem tema dominante claro" (line 415). |
| 5 | English captions | **PASS** | `classifyOpening` at line 265 handles `what/why/how/do you/have you/would you/can you`. `COMMENT_ENGAGEMENT_TERMS` at lines 773-780 include English patterns: "tell me", "let me know", "what do you think", "have you tried", "which one", "would you use", "drop a comment". `OPENING_NEWS_TERMS` and `OPENING_STORY_TERMS` include English terms. |
| 6 | Visual regression | **PASS** | Zero hardcoded `rose-*`, `amber-*`, `red-*`, `green-*`, `yellow-*` classes. All tone indicators use semantic tokens: `text-signal-danger`, `text-signal-success`, `text-signal-warning`, `bg-tint-danger`, `bg-tint-success`, `bg-tint-warning`, `bg-tint-primary`. |

## Remaining Robustness Issues

None identified. All 6 cases pass static audit. One quality improvement would be to detect English question endings ("?") in `classifyOpening` — already handled via the `first.endsWith("?")` check at line 265.

## Plan

**Single deliverable**: Add a new test file `src/lib/report/__tests__/caption-intelligence-robustness.test.ts` covering:

1. `cleanCaption` — emoji stripping, hashtag removal, URL removal, mixed content
2. `countWords` via `buildCaptionStats` — emoji-only, hashtag-only, short captions
3. `classifyOpening` — English question patterns, "What do you think?", "Have you tried this?"
4. `buildCommentEngagement` — English engagement terms: "let me know", "what do you think"
5. `parseCaptionSemanticAnalysis` — old cache (no schemaVersion), valid cache (schemaVersion: 2), missing source
6. `tooShortForThemes` guard behavior (tested via `buildCaptionIntelligence` output)

Then run `bunx tsc --noEmit` and `bunx vitest run`.

**No files modified** except the new test file. No changes to P05, P07, or any other components.
