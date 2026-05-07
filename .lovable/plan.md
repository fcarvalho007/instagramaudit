
# Public MVP Report — Beta Readiness Audit

## Overall Assessment: CONDITIONAL PASS

The report is structurally solid, editorially intentional, and safe for a controlled beta launch. One issue (English labels in navigation) should be fixed before sharing with external users.

---

## PASS/FAIL Table

| # | Check | Result | Notes |
|---|-------|--------|-------|
| 1 | First impression | **PASS** | 6-block structure with human questions as headings feels editorial, not generic SaaS. Hero + comparison header + sidebar nav gives strong "professional audit" first impression. |
| 2 | Complete enough for beta | **PASS** | All 6 blocks serve a clear purpose. Post-blocks (methodology, tier teaser, feedback) round out the experience. |
| 3 | Unfinished/experimental sections | **PASS with note** | Visual cover analysis and caption diagnostics show clean Pro teasers when data is unavailable in public_mvp. No broken/empty states leak. |
| 4 | Copy too technical | **PASS** | Block subtitles, diagnostic labels, and methodology use clear pt-PT editorial language. Source labels (DADOS, MERCADO, AUTO, IA) are concise. |
| 5 | English/internal labels visible | **FAIL** | `shortLabel` values "Overview", "Performance", "Benchmark" appear in: sidebar nav, mobile bottom bar, and block section eyebrows. All other labels are pt-PT. |
| 6 | Forbidden words in public MVP | **PASS** | `payload` — only in code props, never rendered. `debug` — gated by `debugLabels === "hidden"`. `enrichment` — not rendered. `missing` — rendered as "Ausente" (pt-PT). `unavailable` — fallback states show pt-PT copy or Pro teasers. `em desenvolvimento` — hidden when `debugLabels === "hidden"`. `comment_intelligence` — not rendered. |
| 7 | P05 clarity (comments disabled) | **PASS** | Post-level conversation metrics (likes, comments ratio) show normally. Detailed comment intelligence shows a gold-accent Pro teaser: "Análise aprofundada de comentários — Disponível em relatórios avançados." |
| 8 | Pro teaser for comments | **PASS** | Teaser is brief, honest, and explains what it does without frustration. Good balance. |
| 9 | Captions/legends block safety | **PASS** | `captionsDiagnostics` is `"lightweight"` in public_mvp. The `CaptionEvidenceFallback` returns `null` when `debugLabels === "hidden"`. Safe for public. |
| 10 | Market signals + benchmark reliability | **PASS** | Market signals silently hides when disabled/blocked (no error states). Benchmark gauge renders from cached data. Block 05 includes a clear disclaimer about Google Trends indices. |
| 11 | Report length | **PASS with note** | 6 blocks + methodology + tier comparison + feedback banner. Long but scannable thanks to sidebar/bottom nav. Consider if tier comparison block adds value at beta stage. |
| 12 | Mobile readability | **PASS** | Bottom nav with 3 contextual icons + hamburger drawer. `overflow-x-clip` on shell. `h-20` spacer for bottom nav. `pb-[env(safe-area-inset-bottom)]` for safe area. No obvious risks. |
| 13 | CTA/feedback path | **PASS** | Beta feedback banner at bottom with mailto link. Tier teaser for upsell path. Both render correctly in public_mvp. |

---

## Critical Issues

1. **English labels in navigation and block eyebrows** — "Overview", "Performance", "Benchmark" appear untranslated in the sidebar, mobile bottom bar, and block section headers. A beta user seeing a fully pt-PT report with 3 random English words will notice.

   Fix: Add `eyebrowOverride` to the 3 blocks in `block-config.ts`:
   - Overview → `"Visão geral"`
   - Performance → `"Performance"` (already common in pt-PT, OR `"Desempenho"`)
   - Benchmark → `"Benchmark"` (loan word, acceptable) or add override anyway for consistency

   Also update `shortLabel` for sidebar/mobile nav, or add a separate `navLabel` field.

---

## Important Issues

(none)

---

## Nice-to-Have Improvements

1. "Performance" and "Benchmark" are acceptable loan words in pt-PT marketing context, but "Overview" is not. At minimum, translate "Overview" to "Visão geral".
2. The tier comparison block (`TierComparisonBlock`) at the bottom is a full feature comparison table — consider if it adds clarity or noise for a first beta where Pro doesn't exist yet.
3. Block 05 (Procura) intro paragraph could be shorter — it explains Google Trends methodology inline; the methodology section already covers this.

---

## Recommended Block Lists

### public_mvp (keep as-is)
- Overview (hero + KPIs + editorial identity)
- Diagnostic Q01-Q07
- Performance (temporal + heatmap + best days)
- Content (top posts + formats + hashtags + mentions)
- Market Signals
- Benchmark + Competitors
- Methodology
- Beta Feedback Banner

### internal_lab only
- Debug labels
- Full caption evidence detail
- Full comment intelligence (when scraper re-enabled)
- Visual cover AI score panel (when available)

### Pro teaser (currently correct)
- Comment Intelligence detailed analysis
- Visual cover AI score
- Caption semantic deep dive

---

## Recommended Copy Changes

| Location | Current | Suggested |
|----------|---------|-----------|
| `block-config.ts` → overview.shortLabel | "Overview" | "Visão geral" |
| `block-config.ts` → overview (add eyebrowOverride) | (none, falls back to "OVERVIEW") | `"Visão geral"` |

"Performance" and "Benchmark" can stay as loan words (both are widely used in pt-PT marketing/business context). If you prefer full translation: "Desempenho" and "Referência de mercado".

---

## Implementation

Single file edit: `src/components/report-redesign/v2/block-config.ts` — change `shortLabel: "Overview"` to `"Visão geral"` and add `eyebrowOverride: "Visão geral"`. Optionally translate the other two.

No other files need changes. No backend, provider, PDF, or cost logic touched.
