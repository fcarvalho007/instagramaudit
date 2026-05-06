
## Overview

Transform P05 Conversation Card to show classified comment excerpts (who said what), remove the "Sinais dominantes" chip section, clarify the actionable comments summary, and replace the single "top conversation post" with a 2-post highlight sorted by comment count with thumbnails (following the Top 5 Publicações card model).

---

## Pipeline change: persist classified comment excerpts

Currently, `aggregateCommentIntelligence` classifies comments but discards the text (GDPR note). Since these are public Instagram comments, we will persist up to 5 truncated excerpts per signal category.

### 1. Add `classifiedExcerpts` to `CommentIntelligence` type

**File:** `src/lib/analysis/types.ts`

Add new optional field:

```ts
classifiedExcerpts?: {
  questions: Array<{ username: string; text: string }>;
  praise: Array<{ username: string; text: string }>;
  complaints: Array<{ username: string; text: string }>;
  buyingIntent: Array<{ username: string; text: string }>;
};
```

Each array: max 5 items, text truncated to 120 chars. Username stored as-is.

### 2. Collect excerpts during aggregation

**File:** `src/lib/analysis/comment-intelligence.ts`

In `aggregateCommentIntelligence`, when a non-owner comment is classified into a signal category, push `{ username, text }` into a per-category collector (capped at 5). Include them in the returned `CommentIntelligence`.

### 3. Expand `topConversationPosts` to top 2

**File:** `src/lib/analysis/comment-intelligence.ts`

Track the top 2 posts by comment count (not owner replies). Store `postUrl` and `commentsCount` for each.

**File:** `src/lib/analysis/types.ts`

Add:

```ts
topCommentPosts?: Array<{
  postUrl: string;
  commentsCount: number;
}>;
```

### 4. Enrich `AudienceResponseResult` with top 2 posts

**File:** `src/lib/report/block02-diagnostic.ts`

In `classifyAudienceResponse`, build `topCommentPosts` (top 2 posts sorted by comment count) with:
- `index`, `comments`, `likes`, `captionExcerpt`, `format`, `date`, `thumbnailUrl`, `permalink`

Use the same thumbnail proxy pattern as `buildTopPosts` (`/api/public/ig-thumb?url=...`).

Update `AudienceResponseResult` type to include `topCommentPosts` array alongside existing `topConversationPost`.

---

## UI changes

### 5. Add expandable excerpts to AudienceVoiceBreakdown

**File:** `src/components/report-redesign/v2/report-diagnostic-card.tsx`

For each voice category row (Perguntas, Elogios, Queixas, Intenção de compra):
- Add a chevron/expand icon button on the right
- On click, toggle a collapsed list showing up to 5 excerpts: `@username: "text truncado"`
- Style: muted background, small text, within the existing row
- Only show the toggle when excerpts exist for that category

### 6. Remove "Sinais dominantes" section

**File:** `src/components/report-redesign/v2/report-diagnostic-card.tsx`

Delete the `dominantConversationSignals` chip block (lines ~1036-1058). Redundant with the voice breakdown bars.

### 7. Improve "Comentários acionáveis" summary

**File:** `src/components/report-redesign/v2/report-diagnostic-card.tsx`

Replace the current "X comentários acionáveis" block with a clearer summary:
- Label: "Comentários que pedem ação"
- Show breakdown: "N perguntas · N intenção de compra · N problemas"
- Add one-line actionable insight based on which category dominates (e.g. "A maioria dos comentários acionáveis são perguntas — considere um FAQ nos destaques.")
- Remove the vague percentage that references "da amostra"

### 8. Replace top conversation post with top 2 comment posts

**File:** `src/components/report-redesign/v2/report-diagnostic-card.tsx`

Remove the current single `topConversationPost` highlight. Replace with:

- Section title: "Posts que geraram mais comentários"
- 2 cards side-by-side (1 column on mobile), each showing:
  - Thumbnail (proxied via `/api/public/ig-thumb`, with gradient fallback)
  - Format badge (Reel, Carrossel, etc.)
  - First line of caption (truncated)
  - Comment count prominently displayed
  - Date
  - Permalink (clickable to Instagram)
- Explicitly hide likes/engagement — this section is about conversation only
- Follow the visual pattern from `report-top-posts.tsx` (PostCardShell, thumbnail with fallback, format badge, caption excerpt)

### 9. Wire new props

**File:** `src/components/report-redesign/v2/report-diagnostic-block.tsx`

Pass `classifiedExcerpts` and `topCommentPosts` from `commentIntel` / `AudienceResponseResult` to the card components.

---

## Files changed

| File | Change |
|---|---|
| `src/lib/analysis/types.ts` | Add `classifiedExcerpts` and `topCommentPosts` to `CommentIntelligence` |
| `src/lib/analysis/comment-intelligence.ts` | Collect excerpts during classification; track top 2 posts by comments |
| `src/lib/report/block02-diagnostic.ts` | Enrich `AudienceResponseResult` with `topCommentPosts` (thumbnail, permalink, caption, format, date) |
| `src/components/report-redesign/v2/report-diagnostic-card.tsx` | Expandable excerpts, remove sinais dominantes, improve actionable summary, top 2 posts section |
| `src/components/report-redesign/v2/report-diagnostic-block.tsx` | Wire new props |

## Files NOT touched

Block 1, P03, P04, P06/P07, visual cover analysis, PDF pipeline, auth/admin, global tokens, locked files, comment-scraper.server.ts (no scraping changes).

## Validation

- `bunx tsc --noEmit`
- `bunx vitest run`
- Existing comment-intelligence tests updated for new fields
