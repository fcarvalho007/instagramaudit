
# Block 1 — Visual and Copy Consistency Audit

## Component / File Map

| Component | File | Locked? |
|---|---|---|
| Editorial Identity Card | `src/components/report-redesign/v2/overview/editorial-identity-card.tsx` | No |
| Score Orbit Background | `src/components/report-redesign/v2/overview/score-orbit-background.tsx` | No |
| Engagement Benchmark Card | `src/components/report-redesign/v2/report-overview-engagement.tsx` | No |
| Engagement Benchmark Chart | `src/components/report-redesign/v2/report-engagement-benchmark-chart.tsx` | No |
| Frequency Card | `src/components/report-redesign/v2/overview/frequency-card.tsx` | No |
| Format Card | `src/components/report-redesign/v2/overview/format-card.tsx` | No |
| Post Comparison Block | `src/components/report-redesign/v2/report-post-comparison.tsx` | No |
| Block orchestrator | `src/components/report-redesign/v2/report-overview-block.tsx` | No |

**None of the Block 1 files are locked.**

---

## Copy Inconsistencies Found

| Location | Current copy | Issue |
|---|---|---|
| Engagement card header (line 101) | `Taxa de envolvimento` | OK — clear title |
| Engagement KPI 1 label (line 138) | `Deste perfil` | Lowercase "perfil" — acceptable, but lacks context without reading the card title. Consider `Este perfil` or keep as-is. |
| Engagement KPI 2 label (line 171) | `Referência tier` | Mixed case — "tier" is English. Should be `Referência do escalão` for consistency with chart labels which already say "escalão". |
| Engagement reading label (line 286) | `Leitura` | Bare word, no "IA" tag. The post-comparison reading uses `LEITURA IA · COMPARAÇÃO DE EXTREMOS` (line 330). Inconsistent style. |
| Editorial Identity Card (line 132) | `Retrato editorial` | Fine as eyebrow. |
| Editorial Identity Card (line 140) | `IA` / `Auto` chip | Fine. |
| Post comparison reading (line 330) | `LEITURA IA · COMPARAÇÃO DE EXTREMOS` | Uses serif/Fraunces for the fallback headline below it. Consistent with card style. |
| Frequency card header (line 94) | `Frequência de publicação` | OK. |
| Format card header (line 163) | `Tipo de conteúdo` | OK. |
| Frequency card source badge (line 97) | `✦ AUTO` | OK — matches pattern. |
| Format card source badge (line 166) | `⬡ DADOS` | Different glyph from `✦`. Minor inconsistency — both are data-driven cards but use different symbols. |

---

## Typography Inconsistencies Found

All five Block 1 components use `font-display` (Fraunces) for their main headlines — this is **consistent**:

- Editorial Identity Card: `font-display text-xl` for the hero sentence
- Engagement card: `font-display text-lg` for "Taxa de envolvimento"
- Frequency card: `font-display text-[22px]` for the human headline
- Format card: `font-display text-[22px]` for the human headline
- Post comparison: `font-display text-[24px]` for "Os extremos do conteúdo" + `font-display text-[18px]` for AI reading headline

**No serif/typography inconsistency detected.** All cards follow the Fraunces headline + Inter body pattern.

---

## Missing Engagement % in Post Cards

The post cards (`PostCard` component, lines 350-431) display:
- Thumbnail
- Format chip
- Date
- Caption
- Likes count
- Comments count

**Engagement percentage (`post.engagementPct`) is NOT displayed** in the post card, even though it exists on the data object and is used in the `VsBar` and multiplier calculations above.

---

## Data Availability Confirmation

| Data point | Available? | Source |
|---|---|---|
| Posting days (calendar) | Yes | `enriched.postingTimeline` → passed to FrequencyCard as `calendarDays` |
| Number of posts per day | Yes | Derived from `calendarDays` (each entry has `count`) |
| Post thumbnails | Yes | `post.thumbnailUrl` — proxied via `/api/public/ig-thumb` |
| Post format | Yes | `post.format` — displayed as chip on each post card |
| Engagement % per post | Yes | `post.engagementPct` — available but **not rendered** in post cards |
| Likes per post | Yes | `post.likes` — rendered |
| Comments per post | Yes | `post.comments` — rendered |

---

## Implementation Plan

### 1. Normalize "Referência tier" to "Referência do escalão"
**File:** `report-overview-engagement.tsx` (line 171)
Change `Referência tier` to `Referência do escalão`.

### 2. Normalize reading label pattern
**File:** `report-overview-engagement.tsx` (line 286)
Change bare `Leitura` to `LEITURA · ENVOLVIMENTO` (eyebrow style matching the post comparison pattern). Remove the redundant "IA" prefix since the card already has a `✦ MERCADO` source badge.

### 3. Normalize source badge glyphs
**File:** `format-card.tsx` (line 166)
Change `⬡ DADOS` to `✦ DADOS` so both Zone D cards use the same glyph style. (Or keep both — this is a minor detail; your call.)

### 4. Add engagement % to post cards
**File:** `report-post-comparison.tsx` (PostCard component, ~line 416)
Add `engagementPct` display next to the likes/comments metrics row, formatted as e.g. `0,08%`.

### 5. Validation
- `bunx tsc --noEmit`
- `bunx vitest run`
- Visual QA at desktop and 375px
- Confirm no horizontal overflow in post cards

### Files to Edit
1. `src/components/report-redesign/v2/report-overview-engagement.tsx`
2. `src/components/report-redesign/v2/report-post-comparison.tsx`
3. `src/components/report-redesign/v2/overview/format-card.tsx` (optional — badge glyph)

### Files NOT to Touch
All locked files listed in `LOCKED_FILES.md`, plus:
- `report-overview-block.tsx` (orchestrator — no changes needed)
- `editorial-identity-card.tsx` (already refined in previous prompt)
- `frequency-card.tsx` (no issues found)
- `score-orbit-background.tsx` (animation — no changes needed)
- `report-engagement-benchmark-chart.tsx` (chart — no changes needed)
