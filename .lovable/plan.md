
## Overview

Add `schemaVersion: 2` to the caption semantic analysis pipeline to invalidate stale cached results, and tighten prompt rules so hookQuality, brandVoice, and formulaicPatterns explanations must reference concrete caption evidence.

## Changes

### 1. `src/lib/report/caption-semantic-types.ts`
- Add `schemaVersion: number` to `CaptionSemanticAnalysis` interface.

### 2. `src/lib/report/caption-semantic-prompt.ts`
- Add `schemaVersion` (const integer = 2) to the JSON schema `required` array and `properties`.
- Append evidence rules to the system prompt for hookQuality, brandVoice, and formulaicPatterns explanations (must cite observed patterns, no generic advice, cautious fallback when evidence is weak).
- Add a global anti-generic rule paragraph.

### 3. `src/lib/report/caption-semantic-analysis.server.ts`
- In `validateResult`, set `schemaVersion: 2` on the returned object (hardcoded, not trusting model output).
- No other changes. Model name stays as-is.

### 4. `src/routes/api/analyze-public-v1.ts`
- In the cache reuse block (line ~1057), add a check: only reuse cached semantic analysis when `(cachedCaptionSemantic as any).schemaVersion === 2`. If missing or lower, fall through to re-run the analysis.

### 5. Validation
- `bunx tsc --noEmit`
- `bunx vitest run`

## Files NOT touched
Block 1, P03, P05, P06/P07, visual cover analysis, PDF pipeline, auth/admin, global tokens, locked files, UI components.
