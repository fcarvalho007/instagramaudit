# Fix Pro Report — under-filled premium blocks

## Phase 1 — Audit summary

### Block 1: "Prioridades de ação" (P07)

- Component: `src/components/report-redesign/v2/report-diagnostic-block.tsx` (priorities section) reading `block02.priorities` produced by `src/lib/report/block02-diagnostic.ts` (`derivePriorities`).
- Data source: deterministic rules on `summary`, `metrics`, `posts` + optional AI insights from `enrichment_jobs` (`insights_analysis`).
- Why under-filled: `derivePriorities` only has 4 rules (engagement < benchmark, frequency < 3/week, weak hook, no CTA on top posts). For `@frederico.m.carvalho` only 1 triggers. AI-generated priorities were skipped for the original Free snapshot and not re-enqueued after Pro upgrade, so the fallback list is the only source.
- Fix: extend `derivePriorities` to a scored ruleset (~9 rules) that always yields ≥3 distinct cards.

### Block 2: "O público responde ou só consome?" (P05)

- Component: `src/components/report-redesign/v2/report-comment-intelligence.tsx`, reading `normalized_payload.comment_intelligence` + `metrics.comments_avg`, `likes_avg`, `brand_reply_rate`.
- Enrichment path: `src/lib/providers/apify/comment-scraper.server.ts` (Apify comments actor) → writes `classifiedExcerpts`, `themes`, `questions`, `praiseCriticism`, `topConversationPosts` to snapshot.
- Gate: `shouldRunCommentScraper` requires `COMMENT_SCRAPER_ENABLED=true` AND tier=pro AND fresh analysis.
- Current status on snapshot: scraper was globally disabled at creation; payload has only base metrics, no `classifiedExcerpts`. Also, after Pro upgrade `enqueuePaidEnrichmentsForSnapshot` does NOT enqueue comment scraping — only insights + visual cover.
- UI gap: component renders metrics + verdict but ignores `classifiedExcerpts` / `topConversationPosts` when present, and has no differentiated empty states.
- Fix: 
  1. Enable comment scraping in post-payment enqueue (`src/server/payments/enqueue-paid.server.ts`) and on Pro force-refresh.
  2. Render `classifiedExcerpts` as "Voz da audiência" (3 insights: temas, perguntas, elogios/críticas) + populate "Posts que geraram mais conversa" from `topConversationPosts`.
  3. Differentiate states: `disabled` / `pending` / `failed` / `empty` / `ok` using `enrichment_status.comments` + presence of data.

### Block 3: "O que as capas comunicam em 1 segundo"

- Component: `src/components/report-redesign/v2/visual-cover-analysis-card.tsx`, reading `normalized_payload.visual_cover_analysis`.
- Enrichment path: `src/lib/enrichment/visual-cover.server.ts` (OpenAI vision) triggered by `enrichment_jobs` row of type `visual_cover_analysis`.
- Status on current snapshot: job exists but original snapshot was Free → enrichment was skipped; post-payment hook DOES enqueue it but for fresh future snapshots, not retroactively for the loaded one.
- UI gap: title H3 uses small mono size (looks like a dev label), and fallback text shows raw dev strings ("not_available", "skipped") instead of Pro-friendly copy. Block appears blank/broken to a Pro user.
- Fix: 
  1. Increase title typography to match other H3 blocks (Fraunces, text-2xl).
  2. Add Pro-specific copy for pending / failed / skipped states.
  3. Trigger retroactive enrichment via admin or auto-enqueue on Pro report load when `enrichment_status.visual_cover ∈ {skipped, missing}` and snapshot is Pro.

## Phase 2 — Implementation

### Files to change

1. `src/lib/report/block02-diagnostic.ts` — expand `derivePriorities`:
   - Add rules: low hashtag usage, no link in bio, weak caption length, low save rate, narrow format mix, no recurring format, low video share when video outperforms, comments-to-likes ratio low, posting time concentration.
   - Score each triggered rule by impact; return top N (min 3, max 5) distinct categories. Guarantee ≥3 by relaxing thresholds if fewer trigger.
   - Each item: `{ category: 'testar'|'corrigir'|'repetir'|'oportunidade', title, body, evidence, impact }`.

2. `src/lib/providers/apify/comment-scraper.server.ts` — allow execution when `tier=pro` AND `force=true` even if scraper was previously skipped (still respect `COMMENT_SCRAPER_ENABLED` kill-switch).

3. `src/server/payments/enqueue-paid.server.ts` — add `enqueueCommentScrapingForPayment(snapshotId)` alongside insights + visual cover.

4. `src/routes/api/eupago-webhook.ts` — call new enqueue helper after payment confirmed (already calls insights/visual cover; just add comments).

5. `src/components/report-redesign/v2/report-comment-intelligence.tsx`:
   - Render "Voz da audiência" subsection with 3 insight cards from `classifiedExcerpts` (themes / questions / praise-criticism).
   - Render "Posts que geraram mais conversa" from `topConversationPosts`.
   - Add 5 honest empty/loading states keyed off `enrichment_status.comments` + payload presence.

6. `src/components/report-redesign/v2/visual-cover-analysis-card.tsx`:
   - H3 title bumped to Fraunces text-2xl, always rendered.
   - Pro-only fallback copy for pending / failed / missing (no "coming soon", no locked language).

7. `src/i18n/locales/{pt,en}/report.json` — add keys:
   - `comments.voiceOfAudience.title`, `.themes`, `.questions`, `.praiseCriticism`
   - `comments.states.disabled|pending|failed|empty`
   - `cover.title`, `cover.fallback.pending|failed|missing`
   - `priorities.categories.testar|corrigir|repetir|oportunidade`

8. `src/components/admin/enrichment-status-panel.tsx` (existing) — surface `comments` enrichment status alongside `insights` and `visual_cover` if not already shown.

### Manual one-off for current snapshot

`@frederico.m.carvalho` snapshot was created Free. To populate visual cover + comments retroactively, after deploy run:
```sql
-- enqueue from admin or via internal API
SELECT enqueuePaidEnrichmentsForSnapshot('<snapshot_id>');
```
Or click "Forçar nova análise" in the Pro report (now also enqueues comments).

## Phase 3 — Validation

- Typecheck.
- Existing tests: `priorities.test.ts` (extend with ≥3 rule assertion), `comment-scraper.test.ts`, `enqueue-paid.test.ts`.
- New test: `report-comment-intelligence.test.tsx` for the 5 states.
- Manual: load Pro report for `@frederico.m.carvalho`, verify:
  - ≥3 priority cards with distinct categories.
  - Comments block shows real `classifiedExcerpts` OR clean honest empty state.
  - Cover block always shows title + content or labelled fallback.

## Out of scope

Checkout, EuPago, pricing, emails, Free report, 30d/90d gates, competitor gates, landing.
