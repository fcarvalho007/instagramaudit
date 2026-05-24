## Lote E — Localize the public Report (Block 1 + shell)

Following Lotes A–D (shells, auth, landing, analyze flow & gateway), the next surface to translate is the public **Report** — the most-shared page in the product. Admin stays PT-only (internal) and is deferred to Lote F.

### Scope

Public report at `/analyze/$username`, sections rendered in `report-redesign/v2/`:

1. **Shell & navigation**
   - `report-shell-v2.tsx`, `report-block-nav.tsx`, `report-block-section.tsx`
   - `cache-status-badge.tsx`, `source-badge.tsx`, `report-source-label.tsx`
   - `premium-callout.tsx`, `premium-interest-dialog.tsx`

2. **Hero (Prism editorial)**
   - `report-hero-v2.tsx`: handle metadata, metric labels (Posts, Followers, Following, Engagement), action stack ("Novo relatório", "Comparar concorrente", PRO badge, tooltips).

3. **Block 1 — Overview**
   - `overview/editorial-identity-card.tsx`: verdict bands (Excelente/Sólido/A melhorar), gauge label, "O que funciona" / "O que limita" columns, reference mark copy.
   - `overview/frequency-card.tsx`: "Resumo da semana", "Mais ativo" / "Mais calmo", weekday short names (Seg–Dom / Mon–Sun via `format.ts`), verdict copy.
   - `overview/format-card.tsx`: format legend (Reels, Carrossel, Imagem, Vídeo), donut tooltip, "do total" suffix.

### New i18n namespace

- `src/i18n/locales/{pt,en}/report.json` with sub-sections: `shell`, `hero`, `block1.identity`, `block1.frequency`, `block1.format`, `verdicts`, `common`.
- Re-use `errors.json` for failure states and `common.json` for shared verbs.

### Locale-aware formatting

- Use existing `src/lib/i18n/format.ts` for numbers (followers `1.2M` vs `1,2M`), percentages, and dates.
- Add `formatWeekdayShort(date, lng)` helper for the Frequency mini-chart axis.
- Keep AI-generated copy (`aiInsightsV2.sections.hero.text`) **as-is** — it already comes from the snapshot in the requested language; do not re-translate at runtime. Fallback strings (`deriveCopyFromAi` / `buildFallbackCopy`) move to `report.json`.

### Out of scope (next lotes)

- Blocks 2–5 (engagement, diagnostics, themes, benchmark) → Lote F
- `/admin` interface → stays PT-only
- `/report.example` → mockup only, untouched per project rules

### Checkpoint

- ☐ `report.json` created (PT + EN) with all keys used by Block 1 + shell
- ☐ Hero, Identity, Frequency, Format cards consume `useTranslation('report')`
- ☐ Weekday + number formatting routed through `format.ts`
- ☐ AI hero text preserved; only fallback copy localized
- ☐ Language toggle in header switches the entire report live (no reload)
- ☐ Typecheck passes; 375px mobile layout unchanged
