
# P04 Caption Diagnostics — Audit & Implementation Plan

## Current State Summary

The P04 implementation is **already 90% complete**. A previous iteration created the full OpenAI semantic layer:

- **Types**: `src/lib/report/caption-semantic-types.ts` — `CaptionSemanticAnalysis` interface with themes, intent, engagement, expressions, diagnostic
- **Prompt**: `src/lib/report/caption-semantic-prompt.ts` — system prompt + JSON schema (pt-PT, neutral tone, no fabricated numbers)
- **Server**: `src/lib/report/caption-semantic-analysis.server.ts` — direct `fetch` to OpenAI (`gpt-5.4-mini`), with allowlist gating, timeout, validation, cost logging
- **Pipeline**: `src/routes/api/analyze-public-v1.ts` — calls `generateCaptionSemanticAnalysis`, caches result in `analysis_snapshots.normalized_payload.caption_semantic_analysis`
- **UI**: `src/components/report-redesign/v2/caption-diagnostics-card.tsx` — hybrid rendering: uses `semantic` when available, falls back to deterministic `data`

---

## PASS/FAIL Audit

| Check | Status | Detail |
|-------|--------|--------|
| Deterministic metrics preserved | **PASS** | `captionStats` (totalWords, avgWords, avgEmojis), distributions (length/openings/endings), CTA counts, question counts, recurring expressions — all computed in `caption-intelligence.ts`, never from OpenAI |
| OpenAI only classifies/labels | **PASS** | Prompt explicitly forbids inventing metrics. JSON schema enforces structure. Validation in `validateResult()` checks ranges. |
| Data sent to OpenAI | **PASS** | Only caption text (max 12), no profile data, no likes/comments/followers |
| Cache in snapshot | **PASS** | Stored as `normalized_payload.caption_semantic_analysis`; reused when `existing` snapshot has it |
| No re-call on render | **PASS** | Analysis runs once in `analyze-public-v1.ts` pipeline; UI reads from snapshot payload |
| Fallback when OpenAI fails | **PASS** | `CaptionDiagnosticsCard` checks `hasSemantic`; all blocks fall back to deterministic `data` |
| Cost logging | **PASS** | `recordProviderCall` with actor `"caption-semantic-analysis"`, model, tokens, cost |
| Frontend never sees API key | **PASS** | `.server.ts` suffix; key read inside handler |
| Model name | **ISSUE** | Uses `gpt-5.4-mini` — needs verification this is a valid model. Other project files use same model, so likely intentional. |

---

## What Remains To Do

### 1. Prompt refinement (optional)

The current prompt is solid but could be improved:
- Add explicit instruction about **hook quality** assessment (not currently in schema)
- Add **brand voice consistency** field
- Add **formulaic endings / weak CTAs** field
- These are mentioned in the user's goals but missing from current `CaptionSemanticAnalysis` type and prompt

### 2. Schema expansion

Add to `CaptionSemanticAnalysis`:
- `hookQuality`: { rating: "strong" | "moderate" | "weak", explanation: string }
- `brandVoiceConsistency`: { rating: "consistent" | "mixed" | "inconsistent", explanation: string }
- `formulaicPatterns`: { hasFormulas: boolean, examples: string[], explanation: string }

### 3. UI rendering for new fields

Update `CaptionDiagnosticsCard` to display:
- Hook quality badge/section
- Brand voice consistency indicator
- Formulaic pattern warnings

### 4. No other files need changes

The pipeline, caching, fallback, cost logging, and data flow are all correct.

---

## Files To Edit in Implementation

| File | Change |
|------|--------|
| `src/lib/report/caption-semantic-types.ts` | Add `hookQuality`, `brandVoiceConsistency`, `formulaicPatterns` interfaces |
| `src/lib/report/caption-semantic-prompt.ts` | Extend system prompt and JSON schema with new fields |
| `src/lib/report/caption-semantic-analysis.server.ts` | Update `validateResult()` to handle new optional fields |
| `src/components/report-redesign/v2/caption-diagnostics-card.tsx` | Render new semantic fields with fallback |

No changes to: Block 1, P03, P05, P06/P07, visual covers, backend auth/admin, PDF, global tokens, locked files.

---

## Architecture Diagram

```text
normalized_payload.posts[].caption
        │
        ├──► caption-intelligence.ts (deterministic)
        │       → sampleSize, totalWords, avgWords, avgEmojis
        │       → distributions (length, openings, endings)
        │       → CTA counts, question counts
        │       → recurring expressions (keyword match)
        │       → themes (keyword-based, low quality)
        │       → editorial reading (template text)
        │
        └──► caption-semantic-analysis.server.ts (OpenAI)
                → dominant themes (with evidence + explanation)
                → content intent
                → comment engagement strategy
                → recurring expressions (with meaning + risk)
                → editorial diagnostic (main/works/critical/watch)
                → [NEW] hook quality
                → [NEW] brand voice consistency
                → [NEW] formulaic patterns
                │
                ▼
        analysis_snapshots.normalized_payload.caption_semantic_analysis
                │
                ▼
        CaptionDiagnosticsCard
            hasSemantic? → render OpenAI interpretation
            !hasSemantic → render deterministic fallback
```

---

## Cost Considerations

- Model: `gpt-5.4-mini` (~12 captions, ~1500 input tokens, ~800 output tokens)
- Estimated cost per analysis: ~$0.002–0.005
- Already gated by `isOpenAiEnabled()` + `isOpenAiAllowed(handle)`
- Already logged in `provider_call_logs` with token counts and cost
