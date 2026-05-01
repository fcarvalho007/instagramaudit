
# Refinement Pass — Bloco 02 / Perguntas 04–07

11 tasks, 3 files to edit, 0 new files, no schema/provider/locked-file changes.

---

## 1. Subtitle count in `block-config.ts`

**Current**: "Oito perguntas que qualquer marketer faz..."
**Problem**: Block 02 now renders 7 visible question sections (Q01–Q07), not 8.
**Fix**: Replace with count-agnostic copy:
> "Perguntas essenciais que qualquer marketer faz ao olhar para um perfil — respondidas pelo cruzamento dos dados recolhidos."

Also update the `prompt-v2.ts` line 82 reference to "8 perguntas (01–08)" to "7 perguntas (01–07)".

**File**: `src/components/report-redesign/v2/block-config.ts` (line 34), `src/lib/insights/prompt-v2.ts` (line 82)

---

## 2. React keys in `report-diagnostic-block.tsx`

Current keys are misaligned with visible numbering:
- `renderAudienceCard`: `key="q05"` -- correct
- `renderIntegrationCard`: `key="q06"` -- correct
- `renderObjectiveCard`: `key="q08"` -- **wrong**, should be `key="q07"`

**File**: `src/components/report-redesign/v2/report-diagnostic-block.tsx` (line 597)

---

## 3. Caption Intelligence hygiene (`report-caption-intelligence.tsx`)

- Imports are already consolidated (single `lucide-react` import on line 1). No duplicate.
- The header subtitle (line 87) already has `leading-relaxed`. No change needed.
- Indentation is consistent. No changes required.

**Result**: No changes needed for this task.

---

## 4. Premium teaser refinement

**Current** (line 383): "Análise Premium: inclui transcrição de Reels/vídeos..."
**Fix**: Rename to "Análise completa de Reels e vídeo" as the teaser title.
Keep the PRO badge. Adjust copy to:
> "Inclui transcrição de Reels/vídeos, hooks falados e comparação entre o que é dito e o que é escrito na legenda."

**File**: `src/components/report-redesign/v2/report-caption-intelligence.tsx` (lines 382-384)

---

## 5. ActionBridge visual separation

**Current**: `priorityType === "alta"` uses `bg-amber-50/60 ring-amber-200` + amber icon.
**Problem**: Amber/gold collides with the Premium teaser palette (memory rule: gold is reserved for premium).
**Fix**:
- "alta" priority: switch to `bg-rose-50/60 ring-rose-200` + `text-rose-600` (genuinely critical).
- Non-alta (opportunity): keep `bg-blue-50/50 ring-blue-100` (already correct).

**File**: `src/components/report-redesign/v2/report-caption-intelligence.tsx` (lines 399-409)

---

## 6. Unavailable state — add Premium teaser

**Current**: When `available === false`, only shows a text message.
**Fix**: Add `<PremiumTeaserStrip />` below the unavailable message, inside the Shell. This preserves transparency: user sees the teaser knows video/audio analysis exists as a future upgrade, without implying the current analysis covers it.

**File**: `src/components/report-redesign/v2/report-caption-intelligence.tsx` (lines 25-34)

---

## 7. Audience Response — `topConversationPost` evidence

**Current**: `renderAudienceCard` passes data to `DiagnosticAudienceHighlight` but ignores `topConversationPost`.
**Fix**: When `r.topConversationPost` exists and `comments > 0`, render a compact evidence row below the averages bar inside `DiagnosticAudienceHighlight`:
- Label: "Post com mais conversa"
- Show: comments count, likes count, short caption excerpt (truncated)
- Keep compact (1-2 lines max)

**Files**:
- `src/components/report-redesign/v2/report-diagnostic-block.tsx` — pass `topConversationPost` to component
- `src/components/report-redesign/v2/report-diagnostic-card.tsx` — add prop + render inside `DiagnosticAudienceHighlight`

---

## 8. Audience unavailable badge

**Current**: Unavailable state uses `sourceType="automatic"` with detail "Gostos + comentários".
**Problem**: Shows a data source badge when there's no meaningful data.
**Fix**: Remove `sourceType` and `sourceDetail` from the unavailable state. The card body already explains the situation.

**File**: `src/components/report-redesign/v2/report-diagnostic-block.tsx` (lines 457-458)

---

## 9. Mobile safety — `DiagnosticAudienceHighlight`

**Current**: Averages bar uses `flex items-center gap-3` with `flex-1` for likes and `shrink-0` for comments.
**Problem**: At 375px, the two stat blocks could compress or overflow.
**Fix**: Change the averages bar to `flex flex-wrap` so comments wrap below likes on narrow screens. Add `min-w-0` to prevent overflow.

**File**: `src/components/report-redesign/v2/report-diagnostic-card.tsx` (line 525)

---

## 10. AI input audit (read-only)

The AI receives via `buildInsightsUserPayload`:
- `content_summary.posts_analyzed`, `dominant_format`, `average_likes`, `average_comments`, `average_engagement_rate`, `estimated_posts_per_week`
- `top_posts[].format`, `likes`, `comments`, `engagement_pct`, `caption_excerpt`
- `profile.has_bio`, `followers_count`, etc.

**What the AI does NOT receive** for caption intelligence:
- Individual caption lengths
- `hasQuestion` / `hasCta` flags per post
- Post index
- Hashtags separately (only top keywords via market signals)
- Extracted themes
- Recurring expressions
- Explicit instruction that video transcription is not included
- Profile bio text (only `has_bio` boolean)

**Assessment**: The AI input for the "language" section is **insufficient** for deep caption analysis. It only gets caption excerpts from top 5 posts (truncated). A follow-up plan should enrich the payload with caption-level metadata.

**Result**: No code changes. Will report finding.

---

## 11. V2 visual QA route

**Current**: No mock data preview route exists for ReportShellV2. The V2 shell only renders via the live pipeline at `/analyze/$username`.

**Assessment**: Creating `/report/v2-preview` with mock data is a separate task (medium effort — requires building a mock `AdapterResult`). Not safe to do in this refinement pass.

**Result**: No code changes. Will recommend as a follow-up.

---

## Files to edit

| File | Changes |
|------|---------|
| `block-config.ts` | Subtitle copy (task 1) |
| `prompt-v2.ts` | Question count reference (task 1) |
| `report-caption-intelligence.tsx` | Premium teaser copy (4), ActionBridge colors (5), unavailable state (6) |
| `report-diagnostic-block.tsx` | React key (2), audience badge (8), pass topConversationPost (7) |
| `report-diagnostic-card.tsx` | Audience evidence (7), mobile safety (9) |

## Files NOT touched

- Supabase schema, providers, PDF, admin, `/report/example`, payment/auth, locked files, OpenAI schema

## Follow-up recommendations

1. **AI input enrichment**: Enrich the v2 user payload with caption-level metadata (length, hasCta, hasQuestion, themes, expressions, bio text) for better "language" section output.
2. **V2 preview route**: Create `/report/v2-preview` with mock `AdapterResult` for safe visual QA without hitting the live pipeline.
