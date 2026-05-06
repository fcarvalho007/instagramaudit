
# P04 Caption Diagnostics — Robustness Fixes

No locked files are affected. Changes limited to the 3 allowed files that need edits.

## 1. Enforce schemaVersion in semantic parsing

**File**: `src/components/report-redesign/v2/report-diagnostic-block.tsx` (line 61)

Add `schemaVersion` check to `parseCaptionSemanticAnalysis`:

```
// Before:
if (r.source !== "openai" || typeof r.analyzedCaptions !== "number") return null;

// After:
if (r.source !== "openai" || typeof r.analyzedCaptions !== "number" || r.schemaVersion !== 2) return null;
```

Old cached data without `schemaVersion` (or version 1) returns `null` -- card falls back to deterministic rendering. Next OpenAI call will regenerate with v2.

## 2. Emoji-only caption word count fix

**File**: `src/lib/report/caption-intelligence.ts` (lines 220-233)

Update `cleanCaption` to strip emojis before splitting:

```
function cleanCaption(raw: string): string {
  return raw
    .replace(/https?:\/\/\S+/gi, " ")
    .replace(/\b[\w-]+(?:\.[\w-]+){1,}(?:\/\S*)?/g, " ")
    .replace(/[#@][\p{L}\p{N}_]+/gu, " ")
    .replace(/\p{Extended_Pictographic}/gu, " ")   // <-- NEW: strip emojis
    .replace(/\s+/g, " ")
    .trim();
}
```

Result: "fire fire fire" -> 0 words. "Grande novidade fire" -> 2 words.

## 3. Basic English opening + engagement patterns

**File**: `src/lib/report/caption-intelligence.ts`

Add EN patterns to the existing arrays:

`OPENING_NEWS_TERMS`: add `"new ", "launch", "update", "announcing", "just launched"`

`OPENING_STORY_TERMS`: add `"today ", "yesterday", "last week", "i tried", "we tested"`

`classifyOpening`: add EN question starts: `"what ", "why ", "how ", "do you", "have you", "would you", "can you"`

`COMMENT_ENGAGEMENT_TERMS`: add:
- `"comment"`, `"tell me"`, `"let me know"`, `"what do you think"`, `"have you tried"`, `"which one"`, `"would you use"`, `"drop a comment"`

## 4. Replace hardcoded P04 colors

**File**: `src/components/report-redesign/v2/caption-diagnostics-card.tsx`

| Line | Before | After |
|------|--------|-------|
| 265 | `bg-rose-50` | `bg-tint-danger` |
| 269 | `text-rose-600 font-medium` | `text-signal-danger font-medium` |
| 276 | `text-rose-500` | `text-signal-danger` |
| 285 | `bg-rose-400` | `bg-signal-danger` |
| 606 | `bg-amber-50` | `bg-tint-warning` |
| 607 | `bg-rose-50` | `bg-tint-danger` |
| 686 | `text-amber-600` | `text-signal-warning` |

## 5. Theme reliability guard

**File**: `src/components/report-redesign/v2/caption-diagnostics-card.tsx` (around line 364)

When `avgWordsPerCaption < 5` and no semantic data, filter deterministic themes more aggressively -- show "Sem tema dominante claro" if remaining themes after filtering are empty. The existing `isWeakThemeLabel` + fallback on line 413 already handles the display; we just need to widen the guard when captions are very short.

Add after line 364:
```typescript
// When captions are extremely short, deterministic themes are unreliable
const tooShortForThemes = !hasSemantic && data.captionStats.avgWordsPerCaption < 5;
```
Then on line 403, add `!tooShortForThemes &&` before `themes.length > 0`.

## Files changed

1. `src/components/report-redesign/v2/report-diagnostic-block.tsx` -- schemaVersion check (1 line)
2. `src/lib/report/caption-intelligence.ts` -- emoji cleanup + EN patterns (~20 lines)
3. `src/components/report-redesign/v2/caption-diagnostics-card.tsx` -- token colors + theme guard (~10 lines)

## Files NOT touched

P05, P07, Block 1, P03, PDF, auth/admin, global tokens, locked files, OpenAI prompts, Apify logic.
