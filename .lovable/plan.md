
# Add Transparency Strip to Q05 Comment Intelligence

## Audit Results

### Fields in `CommentIntelligence` (types.ts L135-188)

| Field | In type | Displayed in UI | Notes |
|---|---|---|---|
| `available` | Yes | Yes (gates section) | |
| `source` | Yes | No | Always "apify_comments" |
| `reason` | Yes | Yes (unavailable state) | 6 reason codes |
| `samplePosts` | Yes | Yes (bottom line) | |
| `sampleComments` | Yes | Yes (bottom line) | |
| `sampleReplies` | Yes | Yes (bottom line, conditional) | |
| `ownerUsername` | Yes | No | Used internally |
| `ownerRepliesCount` | Yes | Yes (metric cell) | |
| `ownerReplyRatePct` | Yes | Yes (metric cell) | |
| `postsWithOwnerReplyPct` | Yes | Yes (metric cell) | |
| `audienceCommentsCount` | Yes | **No** | Available but not shown |
| `uniqueAudienceCommentersCount` | Yes | **No** | Available but not shown |
| `postsWithConversationPct` | Yes | **No** | Available but not shown |
| `questionsFromAudienceCount` | Yes | Yes (metric cell) | |
| `praiseCount` | Yes | Yes (signal chip) | |
| `complaintOrIssueCount` | Yes | Yes (metric cell) | |
| `buyingIntentCount` | Yes | Yes (metric cell) | |
| `spamOrLowQualityCount` | Yes | Yes (signal chip) | |
| `dominantConversationSignals` | Yes | Yes (signal chips) | |
| `recommendedConversationAction` | Yes | Yes (insight callout) | |
| `topConversationPost` | Yes | Yes (sub-card) | URL shown but not clickable |
| `limitations` | Yes | Yes (bottom notes) | |

**Fields available but not displayed:** `audienceCommentsCount`, `uniqueAudienceCommentersCount`, `postsWithConversationPct`.

**Fields not persisted:** None missing for this use case. All needed data is already in the type.

### Unavailable reasons supported (types.ts L139-145):
- `comment_scraper_failed`
- `comment_scraper_disabled`
- `no_posts_with_comments`
- `no_valid_post_urls`
- `budget_blocked`
- `processing`

---

## Changes

### File: `src/components/report-redesign/v2/report-comment-intelligence.tsx`

**1. Add "Amostra analisada" transparency strip** (inside `CommentIntelligenceSection`, after the 6-metric grid):

A compact card with a thin blue-grey left border showing:
- Publicacoes analisadas: `samplePosts` / 12
- Comentarios publicos recolhidos: `sampleComments`
- Respostas em thread: `sampleReplies` (only if > 0)
- Comentarios da audiencia: `audienceCommentsCount`
- Respostas da marca: `ownerRepliesCount`
- Taxa de resposta da marca: `ownerReplyRatePct`%

Layout: 2-column grid at 375px, 3-column at sm+. Small eyebrow labels, tabular-nums values. Contained in a subtle `bg-slate-50/40 border border-slate-100` card.

Below the grid, a single-line methodological note in `text-[11px] text-slate-400`:
"Leitura baseada em comentarios publicos visiveis nos posts analisados. Nao inclui DMs, comentarios apagados ou comentarios apenas visiveis apos login."

**2. Replace the existing bottom "Amostra:" line** (L401-406) which currently duplicates some of this info — remove it since the new strip is more complete.

**3. Improve `CommentIntelligenceUnavailable`:**
- Keep the existing neutral design.
- Add all 6 reason codes to the `UNAVAILABLE_REASONS` map (verify `budget_blocked` and `no_valid_post_urls` have entries — currently checking).
- Ensure the fallback text is neutral and informative without PRO/Premium wording.

**4. Remove `topConversationPost` URL display** — currently the post URL is stored but I'll verify it's not rendered as a clickable link (it's not — only comment counts are shown, the URL is in the data but not displayed to users, which is correct).

### No changes to:
- `snapshot-to-report-data.ts` (already maps `comment_intelligence` correctly at L1144)
- `comment-intelligence.ts` (aggregation logic is complete)
- `types.ts` (all fields needed are present)
- Supabase schema, admin, auth, payments

### Validation
- `bunx tsc --noEmit`
- `bunx vitest run`
- Visual QA at 375px and desktop
- Confirm zero raw comments/PII/usernames displayed
- Confirm zero PRO/Premium wording
