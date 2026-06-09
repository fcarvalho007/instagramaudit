
# Premium report — fix 3 Pro blocks (P05, P07, Capas)

## Root cause

Pro snapshots for `@frederico.m.carvalho` show `enrichment_status` =
`{ comments: "disabled", visual_cover: "skipped_free", insights_v2: "skipped_free", caption_semantic: "skipped_free", dataforseo: "skipped_free" }`
in every recent row. The 3 broken blocks share one root cause: **the paid
enrichment set was never executed for this Pro report.** Plus 3 UI gaps.

| Block | Backend cause | UI gap |
|---|---|---|
| P07 Prioridades | `insights_v2` skipped → no AI priorities → falls to `derivePriorities` which only emits 1 item for this profile | `derivePriorities` rule pool too narrow (4 rules, all gated on rare conditions) |
| P05 Resposta | `COMMENT_SCRAPER_ENABLED=false` globally; no Pro pathway to enable it post-payment | `CommentIntelligenceSection` doesn't render `classifiedExcerpts` (Voz da audiência examples exist in the schema but aren't shown) |
| Capas | `visual_cover` skipped → `analysis === null` → card renders the public-fallback panels which look broken on a Pro report | H3 size inconsistent with other section H3s; eyebrow `cover.header` and H3 `cover.title` both render, but visually weak so user reports "no title" |

## Data path summary

- **Priorities**: `result.enriched.aiInsightsV2?.priorities` (AI, when `insights_v2` enrichment ran) → fallback `derivePriorities()` in `src/lib/report/block02-diagnostic.ts`.
- **P05 Comments**: `result.enriched.commentIntelligence` populated from `payload.comment_intelligence`, produced by `aggregateCommentIntelligence` in `enrich-comments` route, triggered from `analyze-public-v1` only when `shouldRunCommentScraper({ featureEnabled, isInternalTest })` returns true. Currently `featureEnabled=false`.
- **Visual cover**: `payload.visual_cover_analysis`, written by `enrich-snapshot` runner when `visual_cover` enrichment job runs. Only enqueued via `enqueuePaidEnrichmentsForPayment` (EuPago webhook) or `enqueuePaidEnrichmentsForSnapshot`.

## Plan

### Task 1 — P07 Prioridades de ação (always ≥3 items)

**File:** `src/lib/report/block02-diagnostic.ts` (extend `derivePriorities`)

Expand the rule pool from 4 to ~9 rules, each producing a `PriorityItem` with an internal `score` (impact × evidence). New rules (all deterministic, all evidence-gated):

1. *(existing)* Audiência silenciosa → "Adicionar perguntas no fim das captions" — score 10
2. *(existing)* Formato dominante ≥60% → "Diversificar formatos além de X" — score 7
3. *(existing)* Funil sem meio + CTA fraco → "Reforçar conteúdo de meio de funil" — score 6
4. **NEW** Hashtags ruidosas (`hashtags.label === "Excesso de hashtags repetidas"` ou `>15 hashtags/post`) → "Reduzir hashtags repetitivas" — score 5
5. **NEW** Bio sem link (`integration.signals.bioLink.detected === false`) → "Adicionar link na bio" — score 8
6. **NEW** CTA quase ausente (`integration.signals.explicitCta.sharePct < 10`) → "Testar 1 CTA explícito por semana" — score 7
7. **NEW** Cadência irregular (variância alta entre intervalos) → "Estabilizar cadência semanal" — score 4 (skip se cadence data não disponível)
8. **NEW** Top-format ≠ format mais usado → "Repetir mais o formato X que teve melhor desempenho" — score 6
9. **NEW** Captions muito curtas (`caption.label === "Captions curtas"` + audiência não-silenciosa) → "Testar legendas mais longas em 2 posts" — score 4

Output: sort by score desc, return **min(items.length, 6) but pad to at least 3**. If after all rules <3 items, append generic but useful "Testar" fallbacks based on highest-engagement post (e.g., "Repetir o tema do post com mais interação"). Pure deterministic; no nonsense.

Add tests in `src/lib/report/__tests__/block02-diagnostic.test.ts` (or create) confirming `derivePriorities` always returns ≥3 items for a realistic snapshot.

UI: no change to `report-diagnostic-priorities.tsx` (already supports N items).

### Task 2 — P05 O público responde ou só consome?

**2a — Enable comment scraper on Pro snapshots** (server)

Files: `src/lib/analysis/comment-scraper.server.ts`, `src/routes/api/analyze-public-v1.ts`, `src/lib/enrichment/enqueue-paid.server.ts` (new helper).

- Extend `shouldRunCommentScraper` input with `isPro?: boolean` → returns true when `featureEnabled || isInternalTest || isPro`.
- In `analyze-public-v1`, pass `isPro = parsed.data.force_refresh && hasEntitlement(leadId, "report_full_9")` so a Pro-initiated force_refresh triggers comments without flipping the global env.
- Add `enqueueCommentScrapingForPayment({ reportCacheKey, origin })` mirroring `enqueuePaidEnrichmentsForPayment`: when EuPago webhook upgrades a Pro snapshot, create a `comment_enrichment_jobs` row and POST to `/api/public/enrich-comments`. Hook this into `eupago-webhook.ts` next to `enqueuePaidEnrichmentsForPayment`.
- Budget/cap controls already exist (`planCommentBudget` $0.20 hard cap per profile) — no new caps needed.

**2b — Render "Voz da audiência" examples** (UI)

File: `src/components/report-redesign/v2/report-comment-intelligence.tsx`

After the existing 6-metric grid, add a `VozDaAudienciaSection` rendering `data.classifiedExcerpts` (already in the schema, populated by `aggregateCommentIntelligence`). Show up to 2 excerpts per non-empty category (questions / praise / complaints / buyingIntent) as quoted cards with `@username — "text"` and category chip. When `classifiedExcerpts` is missing or all categories empty, render an honest sub-empty-state "Comentários sem padrões claros nesta amostra" and keep the rest of the card. Add i18n keys under `report.json:comments.voice.*` (PT + EN).

Pro empty-state (when `commentIntel === null` and snapshot is Pro): replace current `CommentIntelligenceUnavailable` "public_mvp Pro teaser" branch with a Pro-specific honest empty state: "Comentários públicos não disponíveis nesta análise. Pode forçar uma análise nova para tentar recolher mais comentários (consome 1 crédito)." — drives action without faking richness.

### Task 3 — "O que as capas comunicam em 1 segundo"

**3a — Trigger visual_cover for this snapshot** (no new code needed): admin operator can call `enqueuePaidEnrichmentsForSnapshot(snapshotId)` for the existing snapshot or the user can `force_refresh` (which re-runs the pipeline and the post-payment hook). Document this in the admin runbook.

**3b — UI fixes** in `src/components/report-redesign/v2/visual-cover-analysis-card.tsx`:

- Promote the H3 typography to match other section H3s: `font-display text-[1.5rem] md:text-[1.75rem] tracking-tight` (currently `text-lg md:text-xl`) — this is the "missing title" perception fix.
- Keep the eyebrow `cover.header` and badge unchanged.
- `ScorePanelUnavailable` / `VisualAnalysisFallback`: when `useVariantFeatures().debugLabels !== "hidden"` (Pro / Lab), show a clear Pro state — "Análise visual a ser gerada" with a small spinner when `coverState === 'pending'` was lifted from `report-diagnostic-block` (or "Não foi possível gerar a leitura visual desta análise. Forçar nova análise para tentar novamente." when `error`). Currently the Pro fallback uses the `dev_*` strings which sound technical; replace with user-facing PT copy.
- Update PT/EN i18n: `cover.fallback.pro_title`, `cover.fallback.pro_body`, `cover.fallback.pro_pending_title`, `cover.fallback.pro_pending_body`, `cover.fallback.pro_error_title`, `cover.fallback.pro_error_body`. Map `report-diagnostic-block.tsx` `renderCoverSlot()` to pass these (it already handles pending/error placeholders; remove duplication or align copy).

### Admin observability

Already covered: `analysis-cost-breakdown.ts` reports `comment_scraper_status` per snapshot; `enrichment_status` is queryable per snapshot. No new admin features needed. Add one note in `docs/BETA_RUNBOOK.md` (or replacement) explaining how to manually re-enqueue paid enrichments for a snapshot that was created Free and later upgraded.

## Files to change

| File | Change |
|---|---|
| `src/lib/report/block02-diagnostic.ts` | Expand `derivePriorities` with 5 new rules + scoring + ≥3 padding |
| `src/lib/report/__tests__/block02-diagnostic.test.ts` *(new or extend)* | Tests for ≥3 items + ranking |
| `src/lib/analysis/comment-scraper.server.ts` | Add `isPro` to `shouldRunCommentScraper` |
| `src/routes/api/analyze-public-v1.ts` | Pass `isPro` derived from entitlement + force_refresh |
| `src/lib/enrichment/enqueue-paid.server.ts` | Add `enqueueCommentScrapingForPayment` |
| `src/routes/api/public/eupago-webhook.ts` | Call the new helper alongside existing paid enrichments |
| `src/components/report-redesign/v2/report-comment-intelligence.tsx` | Render `classifiedExcerpts` as "Voz da audiência"; Pro-specific empty state |
| `src/components/report-redesign/v2/visual-cover-analysis-card.tsx` | Promote H3 size; Pro-aware fallback copy |
| `src/components/report-redesign/v2/report-diagnostic-block.tsx` | Align pending/error placeholder copy with new Pro keys |
| `src/i18n/locales/pt/report.json` | Add `comments.voice.*`, `cover.fallback.pro_*` keys |
| `src/i18n/locales/en/report.json` | Same EN keys |

## Out of scope (explicitly not touched)

Checkout, EuPago payment logic, pricing, payment emails, Free-report structure, competitor gating, 30d/90d gating, legal pages, AI prompts, `/report/example`.

## Validation

1. Unit: `derivePriorities` returns ≥3 items across a sample of representative snapshots.
2. Server: integration test that EuPago webhook → paid enrichments enqueued AND comment scraping enqueued (mock fetch).
3. Visual on `/analyze/frederico.m.carvalho` (Pro): trigger force_refresh → confirm Priorities shows 3+ cards, P05 shows Voz da audiência when comments available OR a clear Pro empty state, Visual cover shows clear H3 title and a clear state (pending/error/full).
4. `bunx vitest run` green.

## Risks

- Comment scraper Pro auto-trigger adds Apify cost per Pro purchase (~$0.10–$0.20). Already capped by `planCommentBudget`. Acceptable; monitor `admin/sistema` after first 10 Pro purchases.
- Re-enqueueing paid enrichments is idempotent (existing code skips when status='success'); safe.
