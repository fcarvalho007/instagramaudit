
# Report Variant Architecture

## Readiness Assessment: PASS

The current `ReportShellV2` is already well-structured into 6 discrete blocks. Comment intelligence already has a graceful fallback (`CommentIntelligenceUnavailable`). No code duplication is needed — a lightweight `ReportVariant` context + per-block visibility config is sufficient.

---

## Proposed Architecture

### Variant type

```typescript
type ReportVariant = "public_mvp" | "internal_lab" | "pro_preview";
```

### Mechanism

1. A new file `src/lib/report/report-variant.ts` exports the type, a React context (`ReportVariantProvider` / `useReportVariant`), and a block visibility map.
2. `ReportShellV2` receives an optional `variant` prop (default: `"public_mvp"`).
3. Each section checks the variant to decide: render fully, render as teaser, or skip.
4. No new route — the existing `/analyze/$username` route passes the variant. Admin preview routes can pass `"internal_lab"`.

### Block Visibility Matrix

| Block | public_mvp | internal_lab | pro_preview |
|-------|-----------|-------------|-------------|
| 01 Overview | Full | Full | Full |
| 02 Diagnóstico (Q01-Q04, Q06) | Full | Full | Full |
| 02 Q05 Conversa | Post-level only (no comment_intelligence) | Full (with comment_intelligence when available) | Teaser |
| 03 Performance | Full | Full | Full |
| 04 Conteúdo | Full | Full | Full |
| 05 Procura (Market Signals) | Full | Full | Full |
| 06 Benchmark | Full | Full | Full |
| AI Reading (v2 insights) | Full when available | Full | Full |
| Editorial Patterns | Full | Full | Full |
| Visual Cover Analysis | Full | Full | Full |
| Caption Semantics | Full | Full | Full |
| Methodology | Full | Full | Full |
| Tier Teaser / Comparison | Full | Full | Full |
| Beta Feedback Banner | Full | Hidden | Hidden |

### P05 Behaviour (public_mvp, comment scraper disabled)

Already working correctly:
- `classifyAudienceResponse()` in `block02-diagnostic.ts` produces post-level metrics (avg comments, likes, ratio, top posts) from main scraper data
- When `commentIntelligence` is `null` or `available === false`, `CommentIntelligenceUnavailable` renders the neutral copy set in previous changes
- No changes needed to P05 for `public_mvp` — just ensure variant context never requests comment enrichment

### Labels to suppress in public_mvp

Audit needed for strings like "payload", "debug", "em desenvolvimento". The variant context lets components hide debug-only UI conditionally.

---

## Files to Touch

| File | Change |
|------|--------|
| `src/lib/report/report-variant.ts` | **NEW** — variant type, context provider, visibility map |
| `src/components/report-redesign/v2/report-shell-v2.tsx` | Add `variant` prop, wrap in `ReportVariantProvider`, conditionally hide/teaser blocks |
| `src/components/report-redesign/v2/report-diagnostic-block.tsx` | Read variant context in Q05 to skip `CommentIntelligenceSection` for `public_mvp` (already falls back gracefully — may need no change) |
| `src/routes/analyze.$username.tsx` | Pass `variant="public_mvp"` (hardcoded for now) |
| `src/routes/admin.report-preview.$username.tsx` | Pass `variant="internal_lab"` |
| `src/routes/admin.report-preview.snapshot.$snapshotId.tsx` | Pass `variant="internal_lab"` |

### Files NOT to Touch

- `src/integrations/supabase/client.ts` / `types.ts` — auto-generated
- `src/components/report/report-page.tsx` — locked legacy shell
- `src/lib/analysis/comment-scraper.server.ts` — already gated by secret
- `src/lib/enrichment/run-enrichment.server.ts` — already respects `COMMENT_SCRAPER_ENABLED`
- PDF pipeline files
- Admin cost/revenue routes
- Supabase schema (no migration needed)

---

## Implementation Order (5 prompts)

1. **Create `src/lib/report/report-variant.ts`** — type, context, hook, visibility config
2. **Wire variant into `ReportShellV2`** — accept prop, wrap provider, apply visibility to blocks that differ between variants
3. **Wire variant into route files** — `analyze.$username` gets `public_mvp`, admin previews get `internal_lab`
4. **Audit and suppress debug labels** — search for "em desenvolvimento", "debug", "payload", "missing" strings visible in public_mvp and gate them behind variant
5. **Validation pass** — tsc, vitest, manual check that cached reports render, Q05 shows post-level fallback

## Risks and Mitigations

| Risk | Mitigation |
|------|-----------|
| Forgetting to pass variant to a new route in future | Default is `public_mvp` (safest) |
| Context not available in deeply nested components | `useReportVariant` returns `"public_mvp"` when outside provider |
| Cached reports with comment_intelligence break | No — `CommentIntelligenceSection` still renders when data is present regardless of variant |
| Variant prop breaks PDF print route | PDF route already uses `ReportShell` (v1), not affected |

## Rollback

Remove the `variant` prop from routes and the `ReportVariantProvider` wrapper from `ReportShellV2`. All blocks render as before (current behaviour = internal_lab equivalent).

## File Locking

After implementation, add to `LOCKED_FILES.md`:
- `src/lib/report/report-variant.ts`
