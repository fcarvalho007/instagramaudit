## Lote G — Finalize report translation (PT/EN)

The previous lots covered hero, KPI grid, sidebar/tabs, Identity card, Frequency and Format cards. The remaining components in the public report are still hardcoded in Portuguese. This lot closes the gap so the language switch fully localizes every block.

### Scope (all under `src/components/report-redesign/v2/`)

Group 1 — Block 1 closure
- `overview/diagnostic-summary.tsx` — DIAGNOSIS_MAP, primary/secondary labels
- `overview/score-utils.ts` — score labels, family labels, aria-labels, tooltips
- `overview/comparison-header.tsx` — "Comparar com…", "Em breve", network teasers
- `overview/competitor-modal.tsx` — modal headings, CTAs, copy
- `overview/frequency-card.tsx` — residual hardcoded strings (verdict short labels, weekday helpers)

Group 2 — Diagnostic blocks (Block 2/3)
- `report-diagnostic-grid-v2.tsx`
- `report-diagnostic-summary-cards.tsx`
- `report-diagnostic-verdict.tsx`
- `report-diagnostic-priorities.tsx`
- `report-diagnostic-group.tsx`, `report-diagnostic-card.tsx`, `report-diagnostic-cta.tsx`, `report-diagnostic-block.tsx`
- `report-engagement-benchmark-chart.tsx` — axis labels, legends, captions

Group 3 — Content/editorial blocks (Block 3/4)
- `caption-diagnostics-card.tsx` (largest file: pills, ratings, CSV header stays code, copy/labels translated)
- `hashtag-diagnostics-card.tsx`
- `report-themes-feature.tsx`
- `report-post-comparison.tsx`
- `report-overview-attention-row.tsx`, `report-overview-cards.tsx`, `report-overview-engagement.tsx`

Group 4 — Audience/visual blocks (Block 4/5)
- `report-comment-intelligence.tsx`
- `visual-cover-analysis-card.tsx`

Group 5 — Premium / benchmark / positioning
- `premium-callout.tsx`, `premium-interest-dialog.tsx`
- `report-benchmark-evidence.tsx`
- `report-positioning-banner.tsx`

### Approach

1. Extend `src/i18n/locales/{pt,en}/report.json` with new namespaces grouped per file:
   - `report.diagnostic.*`, `report.captions.*`, `report.hashtags.*`, `report.comments.*`, `report.visual.*`, `report.themes.*`, `report.benchmark.*`, `report.positioning.*`, `report.premium.*`, `report.comparison.*`, `report.identity.*` (extend), `report.scores.*`.
2. Each component gains `useTranslation('report')` and replaces literal strings with `t('…')`. Helper functions that build labels (e.g. `pickQuietest`, score builders, DIAGNOSIS_MAP) receive `t` as a parameter.
3. Pluralization handled via i18next `count` interpolation; numbers stay locale-formatted via existing `src/lib/i18n/format.ts` helpers (`formatCompactNumber`, `formatPct`, weekday from `formatDate`).
4. Server-derived strings (AI-generated text) remain pass-through — only deterministic UI chrome and fallback copy are translated.
5. No business logic, no data flow, no token/visual changes. No new dependencies.

### Files NOT touched

- `src/integrations/supabase/*`, `.env`, `supabase/config.toml`
- Legacy `report-redesign/report-*.tsx` v1 files (kept as `/report.example` mockup) per LOCKED_FILES policy
- `report-tracking-context.tsx` (analytics events stay in English code)

### Verification checklist

☐ Switch language toggle and walk through Block 1 → Block 6 — no PT leak in EN mode (and vice versa).
☐ Block 1 cards (Identity, Frequency, Format, KPI) localize verdict + diagnosis copy live.
☐ Diagnostic verdict/priorities/grid render localized severity and CTA labels.
☐ Caption + Hashtag cards translate ratings ("Detetados" / "Detected", "Sem repetição" / "No repetition") and helper sentences.
☐ Comment intelligence + visual cover analysis fallback messages localized.
☐ Premium modal, comparison header and "Em breve · Julho 2026" badges localized.
☐ AI-generated hero text continues to render as-is (no double translation).
☐ Numbers and dates use locale formatters (no "1,234" in PT or "1.234" in EN).
☐ No regression: existing unit tests in `overview/__tests__` pass; add coverage for `pickQuietest` accepting `t`.

### Delivery

Given file count, I'll execute the groups in two build turns to keep diffs reviewable:
- Turn 1: Groups 1 + 2 (Block 1 closure + Diagnostic blocks).
- Turn 2: Groups 3 + 4 + 5 (Content, Audience, Premium/Benchmark/Positioning).

After each turn I confirm in chat which groups landed and what remains.