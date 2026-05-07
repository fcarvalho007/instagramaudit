
# Desativar o Comment Scraper para MVP/Beta

## Assessment: PASS

The system is already fully prepared for this change. The kill switch, fallback UI, and enrichment status tracking all exist.

---

## What happens today when `COMMENT_SCRAPER_ENABLED=false`

1. `analyze-public-v1.ts` line 822: reads the env var, evaluates to `false`
2. Line 885: calls `setEnrichmentStatusAtomic(snapshotId, "comments", "disabled")` -- correct
3. No `comment_enrichment_jobs` row is created -- no Apify call
4. No `comment_intelligence` is patched into `normalized_payload`
5. Q05 renders using post-level metrics (likes, comments counts, top posts) from `classifyAudienceResponse()`
6. `CommentIntelligenceUnavailable` renders with `data={null}` -- shows default copy

## Verified answers

| # | Question | Answer |
|---|----------|--------|
| 1 | Which env var controls this? | `COMMENT_SCRAPER_ENABLED` (already defaults to `"false"`, line 822) |
| 2 | Does setting it to `false` prevent new jobs? | **Yes.** The `if (runComments)` guard at line 830 prevents job creation entirely |
| 3 | Does `enrichment_status.comments` become `"disabled"`? | **Yes.** Line 885 explicitly sets it |
| 4 | Does Q05 still render? | **Yes.** `classifyAudienceResponse()` uses only post-level data. The audience card renders fully |
| 5 | Are cached reports with `comment_intelligence` unaffected? | **Yes.** Existing `normalized_payload` is untouched. The UI checks `commentIntel?.available` |
| 6 | Are admin chips and cost attribution coherent? | **Yes.** `provider_call_logs` are historical. No new comment-scraper entries will appear |
| 7 | Does any UI copy need adjustment? | **Minor.** When `commentIntel` is `null`, the default fallback says "A aguardar análise de comentários" which implies it's pending. Should say something neutral |

---

## Implementation Plan

### Step 1: Verify current secret value (no code change)

Check whether `COMMENT_SCRAPER_ENABLED` is currently `true` or `false`. The code defaults to `false` if unset, but a secret may override it to `true`.

### Step 2: Set `COMMENT_SCRAPER_ENABLED` to `false` (env-only change)

Use the secrets tool to set `COMMENT_SCRAPER_ENABLED=false`. This is the only change needed to stop all future comment scraping.

### Step 3: Improve fallback copy (optional, small code change)

In `src/components/report-redesign/v2/report-comment-intelligence.tsx`, line 281-282, the default fallback when `data` is `null` currently says:

- Title: "A aguardar análise de comentários"
- Body: "A análise de comentários não ficou disponível nesta execução."

Change the default to something neutral that does not imply pending/waiting:

- Title: "Análise de comentários indisponível"  
- Body: "O relatório base utiliza métricas agregadas de interação. A análise detalhada de comentários poderá ser incluída numa versão futura."

This is a 2-line string change in one file.

---

## Files affected

| File | Change | Risk |
|------|--------|------|
| Secret: `COMMENT_SCRAPER_ENABLED` | Set to `false` | None (already the code default) |
| `src/components/report-redesign/v2/report-comment-intelligence.tsx` | 2-line string change in fallback copy (lines 281-282) | Minimal |

## Files NOT to touch

- `src/routes/api/analyze-public-v1.ts` -- no changes needed
- `src/routes/api/public/enrich-comments.ts` -- no changes needed
- `src/lib/analysis/comment-scraper.server.ts` -- no changes needed
- `src/lib/analysis/comment-intelligence.ts` -- no changes needed
- `src/lib/report/block02-diagnostic.ts` -- Q05 logic is already correct
- `src/components/report-redesign/v2/report-diagnostic-block.tsx` -- rendering logic is already correct
- All P01-P04 components
- PDF pipeline
- Admin cost/revenue logic

## Rollback plan

Set `COMMENT_SCRAPER_ENABLED=true` via secrets. Revert the 2-line copy change if desired. Cached reports are never affected in either direction.

## Validation checklist

- [ ] Confirm `COMMENT_SCRAPER_ENABLED` secret is `false`
- [ ] TypeScript passes (`tsc --noEmit`)
- [ ] Tests pass (`vitest run`)
- [ ] Load cached report for frederico.m.carvalho -- Q05 renders with post-level metrics
- [ ] Load cached report for martimsilvai -- Q05 renders with post-level metrics
- [ ] Existing `comment_intelligence` in cached snapshots still renders if present
- [ ] No new `provider_call_logs` with actor `apify/instagram-comment-scraper` are created
- [ ] Fallback copy is neutral, not "waiting"
