
## Audit: P05 "O público responde ou só consome?"

### 1. Components that render P05

| Component | File | Role |
|-----------|------|------|
| `renderAudienceCard()` | `report-diagnostic-block.tsx` (L511-585) | Orchestrator: builds `ReportDiagnosticCard` with header/answer/tone, renders two children |
| `DiagnosticAudienceHighlight` | `report-diagnostic-card.tsx` (L507-621) | Status icon + 4 MiniStat KPIs + editorial callout + next-step callout + top conversation post + disclaimer |
| `CommentIntelligenceSection` | `report-comment-intelligence.tsx` (L326-473) | Brand reply analysis: status badge + editorial + 6-metric grid + signal chips + recommended action + top brand-reply post + transparency strip + scope notes |
| `CommentIntelligenceUnavailable` | `report-comment-intelligence.tsx` (L278-315) | Fallback when comment data is unavailable |

### 2. Real fields available

**From `AudienceResponseResult`:**
- `avgLikes` (number) -- average likes per post
- `avgComments` (number) -- average comments per post
- `totals.likes` (number|null) -- total likes across sample
- `totals.comments` (number|null) -- total comments across sample
- `totals.postsWithComments` (number) -- posts that have comments
- `totals.analysedPosts` (number) -- total posts in sample
- `sampleSize` (number) -- sample size
- `commentsToLikesPct` (number) -- ratio
- `topConversationPost` -- { index, comments, likes, captionExcerpt } | null
- `status` -- active / moderate / silent / concentrated / unavailable
- `label` -- human-readable status label
- `explanation` -- auto-generated editorial text

**From `CommentIntelligence`:**
- `ownerRepliesCount` (number) -- brand reply count
- `ownerReplyRatePct` (number) -- brand reply rate %
- `postsWithOwnerReplyPct` (number) -- % posts where brand replied
- `audienceCommentsCount` (number) -- non-owner comments
- `sampleComments` (number) -- total comments analysed
- `samplePosts` (number) -- posts sampled
- `sampleReplies` (number) -- reply-level comments
- `uniqueAudienceCommentersCount` (number)
- `questionsFromAudienceCount`, `praiseCount`, `complaintOrIssueCount`, `buyingIntentCount`, `spamOrLowQualityCount`
- `dominantConversationSignals` (string[])
- `recommendedConversationAction` (string)
- `topConversationPost` -- { postUrl, commentsCount, ownerRepliesCount } | null
- `limitations` (string[])

### 3. Can the proposed 5-zone layout be built from existing data?

| Zone | Feasibility |
|------|-------------|
| **Z1 — Header + dominant answer** | YES — already exists via `ReportDiagnosticCard` props (question, answer, tone, body) |
| **Z2 — Three KPI cards** | YES — use `avgLikes`, `avgComments`, `ownerReplyRatePct` (or `commentsToLikesPct` as a ratio card). All available. |
| **Z3 — Conversation flow diagram ("Elo Perdido")** | YES — can be built purely from `avgLikes` vs `avgComments` vs `ownerRepliesCount`. A 3-step funnel: Gostos → Comentários → Respostas da marca, with proportional sizing. No new data needed. |
| **Z4 — Top conversation post** | YES — `topConversationPost` exists in both `AudienceResponseResult` and `CommentIntelligence`. Use the one with the caption excerpt (AudienceResponseResult). |
| **Z5 — Works / Fails / Next** | YES — map from `status`: Works = what's positive (editorial), Fails = what's missing, Next = `recommendedConversationAction` or status-specific suggestion. All derivable from existing fields. |

### 4. Advanced details — remove or relocate?

Currently displayed details that can be removed from the visible card:
- TransparencyStrip (6-metric amostra grid) → move to a methodology tooltip or keep in code for future PRO
- Signal chips (perguntas, elogios, queixas, buying intent, spam) → keep in code, remove from visible card
- 6-metric grid in CommentIntelligenceSection → consolidated into Z2 KPIs
- ScopeNote + limitations → move to a small info icon tooltip
- Brand reply disclaimer → fold into Z3 diagram caption

**No data logic changes.** All classifications, calculations, and extraction remain untouched.

### 5. Files to edit

| File | Change |
|------|--------|
| `src/components/report-redesign/v2/report-diagnostic-block.tsx` | Rewrite `renderAudienceCard()` (L511-585) to compose the 5-zone layout using the refactored sub-components |
| `src/components/report-redesign/v2/report-diagnostic-card.tsx` | Replace `DiagnosticAudienceHighlight` (L507-631) with the new 5-zone internal components (Z2 KPIs, Z3 diagram, Z4 highlight, Z5 works/fails/next) |
| `src/components/report-redesign/v2/report-comment-intelligence.tsx` | Keep `CommentIntelligenceUnavailable` unchanged. Simplify `CommentIntelligenceSection` to only export the data needed by the new zones (brand reply status + recommended action). Remove the standalone 6-grid + signal chips + transparency strip from the visible render. |

**Not touched:** P01-P04, P06-P07, KPI cards, verdict, priorities, CTA, backend, adapter, comment scraper, data extraction, global tokens, locked files.

### 6. Risk level

**Low-medium.** Changes are confined to 3 files, all within the same card's render tree. No data contracts change. The `CommentIntelligenceUnavailable` fallback is preserved as-is.

### 7. Implementation plan

**Step 1 — Z2: Three KPI cards**
Replace the 4-item MiniStat grid in `DiagnosticAudienceHighlight` with 3 focused KPI cards:
- "Gostos médios" (`avgLikes`)
- "Comentários médios" (`avgComments`)
- "Taxa de resposta da marca" (`ownerReplyRatePct` from CommentIntelligence, or fallback "—" if unavailable)

Use `grid-cols-3` on desktop, `grid-cols-1` on mobile. Each KPI gets a subtle icon + label + large number.

**Step 2 — Z3: Conversation flow diagram**
A horizontal 3-step funnel rendered with CSS:
```text
[ 👍 Gostos ] ──→ [ 💬 Comentários ] ──→ [ ↩️ Respostas ]
   {avgLikes}        {avgComments}       {ownerReplies}
```
Proportional bar widths or step sizing. A brief editorial sentence below (e.g., "De cada X gostos, apenas Y geram comentário — e a marca responde a Z%."). Built from existing numbers, no new calculation.

**Step 3 — Z4: Top conversation post**
Reuse existing `topConversationPost` data. Clean card with caption excerpt, comment count, like count. Styled as a soft evidence card.

**Step 4 — Z5: Works / Fails / Next**
Three-column strip (stacked on mobile):
- **Funciona**: Derived from `status` — what's working (e.g., "Bom volume de gostos")
- **Falha**: What's missing (e.g., "Poucos comentários em proporção aos gostos")
- **Próximo passo**: From `recommendedConversationAction` or status-based fallback

**Step 5 — Simplify CommentIntelligenceSection**
Remove the standalone grid/chips/transparency render. The section now only provides `ownerReplyRatePct` and `recommendedConversationAction` data to the parent. Keep `CommentIntelligenceUnavailable` unchanged.

**Step 6 — Validation**
- `bunx tsc --noEmit`
- `bunx vitest run`
- Confirm no other cards changed
- Confirm data logic untouched
