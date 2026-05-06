
# P05 Conversation Card Refinement

## What changes

### 1. KPI 2 subcopy — comment-to-like ratio
Add `commentsToLikesPct` below the avg comments value. Already available in `AudienceResponseResult` but not passed to `DiagnosticAudienceHighlight`.

- Pass `commentsToLikesPct` as new prop
- Subcopy: `"X% dos gostos geraram comentário"` (smart formatting for values < 0.1: `"<0,1%"`)

### 2. KPI 3 — reply rate instead of raw count
When `commentIntel.ownerReplyRatePct` is available:
- Primary value: `ownerReplyRatePct` (e.g. `"82%"`)
- Subcopy: `"N respostas públicas"`
- Fallback to current raw count when commentIntel is unavailable

### 3. Actionable comments summary strip
Below AudienceVoiceBreakdown, add a compact summary:
- `actionableComments = questions + buyingIntent + complaints`
- Line: `"N comentários acionáveis"`
- Subcopy: `"perguntas + intenção de compra + problemas"`
- Only shown when commentIntel is available and actionableComments > 0

### 4. Percentage base clarification
Add muted label in AudienceVoiceBreakdown header:
`"percentagens sobre sinais classificados"`

### 5. Coverage transparency in methodology footer
When `sampleComments` and `totalComments` are both available and differ:
`"1.378 comentários públicos · 104 recolhidos para análise"`
(Already partially implemented — just ensure the wording is precise)

### 6. Enriched top conversation post
In `block02-diagnostic.ts`, expand `topConversationPost` to include `format`, `date`, and `commentsToLikesPct`:
- `format`: from `posts[index].format`
- `date`: from `posts[index].taken_at_iso`
- Per-post comment/like ratio

In UI: add format badge, date, and comment-to-like ratio alongside existing likes/comments.

### 7. P04 cross-reference — comment engagement strategy
In `report-diagnostic-block.tsx`:
- Parse `captionSemantic.commentEngagement.strategyLabel` (already available via `parseCaptionSemanticAnalysis`)
- Pass as optional prop to `DiagnosticAudienceHighlight`

In `DiagnosticAudienceHighlight`:
- Render small insight line based on strategyLabel:
  - `"active"` → `"As legendas pedem comentários de forma ativa"`
  - `"passive"` → `"As legendas raramente pedem comentários"`
  - `"occasional"` → `"Convite à conversa ocasional"`
- Only shown when data is available. No OpenAI call from P05.

## Files to edit

1. **`src/lib/report/block02-diagnostic.ts`** — Expand `topConversationPost` type and data to include `format`, `date`, per-post ratio
2. **`src/components/report-redesign/v2/report-diagnostic-card.tsx`** — All UI changes in `DiagnosticAudienceHighlight` and `AudienceVoiceBreakdown`
3. **`src/components/report-redesign/v2/report-diagnostic-block.tsx`** — Pass `commentsToLikesPct` and `captionSemantic.commentEngagement.strategyLabel` to P05

## Files NOT touched
- Block 1, P03, P04, P06/P07, visual cover analysis
- Backend auth/admin, PDF pipeline
- Global tokens, locked files
- OpenAI/semantic caption pipeline (only reading existing data)

## Validation
- `bunx tsc --noEmit`
- `bunx vitest run`
