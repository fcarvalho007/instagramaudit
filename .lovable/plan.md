# Block 1 — Discreet sample + pinned-posts methodology note

The existing `MethodologyLine` (added last turn) already shows analyzed count + observed period and an exclusions hint via a native `title=` tooltip. This task refines the copy to match the new spec and splits the exclusions hint into a dedicated, **counted** pinned-posts note.

## Scope

Only `MethodologyLine` + its i18n keys + its tests. No formulas, no Apify, no other blocks.

## Changes

### 1. i18n copy (`posts.methodology`)

Replace current strings and add new `pinned_*` keys.

`src/i18n/locales/pt/report.json` → `report.posts.methodology`:

- `line_one` → `"Amostra analisada: última publicação disponível · período observado: {{days}} dias."`
- `line_other` → `"Amostra analisada: últimas {{count}} publicações disponíveis · período observado: {{days}} dias."`
- `insufficient` → unchanged
- `pinned_one` (new) → `"1 publicação fixada excluída dos cálculos de desempenho."`
- `pinned_other` (new) → `"{{count}} publicações fixadas excluídas dos cálculos de desempenho."`
- `exclusions_tooltip` (renamed from `exclusions_note`) → `"Para evitar distorções, publicações fixadas ou muito antigas podem ser excluídas das médias de desempenho e cadência."`

`src/i18n/locales/en/report.json` → `report.posts.methodology`:

- `line_one` → `"Analyzed sample: latest available post · observed period: {{days}} days."`
- `line_other` → `"Analyzed sample: latest {{count}} available posts · observed period: {{days}} days."`
- `insufficient` → unchanged
- `pinned_one` → `"1 pinned post excluded from performance calculations."`
- `pinned_other` → `"{{count}} pinned posts excluded from performance calculations."`
- `exclusions_tooltip` → `"To avoid distortion, pinned or unusually old posts may be excluded from performance averages and posting rhythm."`

Old `exclusions_note` key is removed (only consumer is `MethodologyLine`).

### 2. Component — `src/components/report-redesign/v2/overview/methodology-line.tsx`

- Keep the main line behavior (sample/insufficient).
- Replace the single "exclusions" hint with a **conditional pinned note** that:
  - Renders only when `pinnedExcluded > 0`.
  - Uses `pinned_one` for `pinnedExcluded === 1`, `pinned_other` otherwise.
  - Wraps the note in a `<span title={t('posts.methodology.exclusions_tooltip')}>` with dotted underline for the native tooltip.
  - When `pinnedExcluded === 0` but `outliersExcluded > 0`, render no extra text (outliers are a silent defensive guard — not user-facing per spec).
- Continue rendering as a single muted `<p class="text-xs text-content-tertiary">` separated by ` · `.
- Continue accepting `outliersExcluded` in the prop type (data stays available for future premium copy) but no longer rendered.

### 3. Tests — `src/components/report-redesign/v2/__tests__/methodology-line.test.ts`

Update / add cases:
- Renders count + observed days in the sample line (plural).
- Singular form when `count === 1`.
- Insufficient copy when `sufficient=false`.
- Pinned note appears when `pinnedExcluded > 0` (plural copy + count interpolation).
- Pinned note in singular form when `pinnedExcluded === 1`.
- No pinned note when `pinnedExcluded === 0`, even if `outliersExcluded > 0`.
- Tooltip text present on the pinned note via `title` attribute.

### 4. Caller — `src/components/report-redesign/v2/report-overview-block.tsx`

No changes needed. It already passes `pinnedExcluded` and `outliersExcluded` from `buildBlock01Sample`.

## Out of scope

- No new premium section.
- No changes to `pickSubtitleKey`, `posts.subtitle_variants`, scoring, or other blocks.
- No changes to `outliersExcluded` data path — kept available for future detailed methodology.

## Validation

- `bunx tsc --noEmit`
- `bunx vitest run` (expect 12 → ~14 Block 1 tests green; baseline 9 email failures unchanged)
- Visual check desktop + mobile via preview on a snapshot with pinned posts (`pedrocaramez`, has 2) and one without (`susanatrigobarros`).

## Files changed

1. `src/i18n/locales/pt/report.json`
2. `src/i18n/locales/en/report.json`
3. `src/components/report-redesign/v2/overview/methodology-line.tsx`
4. `src/components/report-redesign/v2/__tests__/methodology-line.test.ts`

## Checkpoint

- ☐ Approve copy rewording ("Amostra analisada: …" instead of "Análise baseada nas …")
- ☐ Approve dropping the silent outliers hint from the user-facing line (data stays in props)
- ☐ Approve replacing `exclusions_note` key with `exclusions_tooltip` + `pinned_one/other`
- ☐ Approve keeping the native `title=` tooltip (no shadcn Tooltip dependency added)
