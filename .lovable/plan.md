## Goal

Refine the visual design of Phase 1 comparison cards (Overview, Engagement, Cadence) to match the approved mockup: tinted side panels (blue vs indigo), large editorial number, per-side deterministic text below each value, plain `vs` separator, white outer card with Fraunces title. Padrão 2 (paired bars) explicitly out of scope.

## Mockup deltas (vs current)

| Element | Current | Mockup |
|---|---|---|
| Outer card | `bg-surface-secondary` + `rounded-xl` + small padding, eyebrow-only header | White `bg-surface-primary` + `rounded-2xl` + `shadow-card`, Fraunces H3 title, generous padding |
| Side panels | White card + 1px subtle border + small number `text-2xl` | Tinted bg (blue 50 / indigo 50), 1.5px accent border (blue / indigo), large number `text-3xl sm:text-4xl` |
| Handle | Dot + truncated handle in muted grey | Handle in accent color (`text-accent-primary` / `text-compare-competitor`), small |
| Centered delta chip | Coloured pill below the pair (`+12 %`, `−0,42 pp`) | Removed. Replaced by per-side text inline under each value: primary side gets directional text ("↓ abaixo do concorrente"), competitor side gets relational text ("4,8× o teu valor") |
| `vs` separator | Pill with border | Plain uppercase eyebrow text, no border |
| Table headers (Padrão 3) | Eyebrow + dot | Eyebrow underlined with accent color (blue/indigo) |

## Edits

### 1. `src/components/report-redesign/v2/compare/compare-stat-block.tsx` — refactor side panels + delta

- Side panel: switch from `bg-surface-primary border-border-subtle` to:
  - primary → `bg-accent-primary/8 border border-accent-primary/30` (or `bg-[hsl(var(--accent-primary)/0.06)]` if tokens require explicit form)
  - competitor → `bg-compare-competitor/8 border border-compare-competitor/30`
- Handle: `text-xs font-medium` colored `text-accent-primary` / `text-compare-competitor`.
- Value: `text-3xl sm:text-4xl font-semibold tabular-nums`.
- Add `subText?: string` field to each `CompareSide` (rendered as small `text-xs text-content-secondary` row under the value, with arrow `↓`/`↑`/`=` symbol prefix when caller supplies tone).
- Replace centered delta chip with: caller-provided `primary.subText` / `competitor.subText`. **Fallback**: when neither is provided, compute deterministic two-sided text via `buildDeltaPair()` (new helper) using existing `buildDelta`.
- Center column: `<span>vs</span>` with `text-eyebrow-sm text-content-tertiary` (no border, no bg).
- Padding/spacing: outer `p-5 sm:p-6`, panel `px-4 py-4 sm:py-5`, `gap-4`.

### 2. `src/components/report-redesign/v2/compare/compare-delta.ts` — add helper

Export `buildDeltaPair(primary, competitor, unit, higherIsBetter)` → `{ primarySubText, competitorSubText, tone }`. Reuses `buildDelta` for the numeric calc; produces pt-PT text:

- Primary side text rule:
  - `ratio ≥ 1.05` → `"↑ acima do concorrente"`
  - `ratio ≤ 0.95` → `"↓ abaixo do concorrente"`
  - else → `"≈ em linha com o concorrente"`
- Competitor side text rule:
  - `ratio < 0.95` → `${(1/ratio).toFixed(1)}× o teu valor` (e.g. `4,8× o teu valor`)
  - `ratio > 1.05` → `${ratio.toFixed(1)}× menos que tu`
  - else → `"em linha com o teu valor"`
- For `unit === "pp"` use absolute pp diff text: `"+0,38 pp acima"` / `"−0,38 pp abaixo"` on the appropriate side.
- Zero/edge cases: degrade to neutral phrasing, never throw.

Existing `buildDelta` keeps its current signature and callers (tests stay green).

### 3. `src/components/report-redesign/v2/compare/compare-types.ts` — extend `CompareSide`

Add optional `subText?: string`. No breaking change.

### 4. Outer comparison cards — Fraunces title + white shell

Apply consistent shell to the three Phase 1 comparison sections (they currently have ad-hoc shells):

- `src/components/report-redesign/v2/overview/competitor-overview-compare.tsx`
- `src/components/report-redesign/v2/competitor-engagement-compare.tsx`
- `src/components/report-redesign/v2/competitor-cadence-compare.tsx`

Shell pattern:
```text
<section class="rounded-2xl border border-border-default bg-surface-primary shadow-card p-5 sm:p-6">
  <header class="space-y-1 mb-5">
    <span class="text-eyebrow-sm text-content-tertiary">{eyebrow}</span>
    <h3 class="font-serif text-xl sm:text-2xl text-content-primary">{title}</h3>
    {hint && <p class="text-xs text-content-tertiary">{hint}</p>}
  </header>
  {/* CompareStatBlock(s) without their own outer chrome */}
</section>
```

`CompetitorCadenceCompare` currently has no outer chrome (just the inner `CompareStatBlock` + p verdict). Add the white card shell so it matches the mockup's "card de relatório premium" feel.

For `CompetitorEngagementCompare`, drop the legacy `SupportRow` rows (Likes/Comments) — they duplicate the headline metric. Keep only: title + 1 `CompareStatBlock` (ER) + verdict line. (Likes/comments comparison already lives in the Overview identity grid; removing here eliminates duplication and matches mockup's single-metric pattern.)

For `CompetitorOverviewCompare`: title becomes "Identidade vs concorrente"; the inner grid keeps 2 `CompareStatBlock` cards (Seguidores, Publicações analisadas) under `scope="identity"`.

To prevent double-shell when `CompareStatBlock` is used inside a parent shell, add `variant?: "card" | "bare"` to `CompareStatBlock`. `"card"` (default) keeps today's wrapping for back-compat; `"bare"` drops the outer `<section>` + border/bg/padding and renders only the header + grid + per-side subtext. The three Phase 1 cards pass `variant="bare"` since they sit inside the new white shell.

### 5. `compare-table.tsx` — header underline accents (Padrão 3)

- Desktop `<thead>`: replace dot with `border-b-2` accent under each column header text (blue under primary handle, indigo under competitor handle). Implement via wrapping the handle text in a `<span class="inline-block pb-1.5 border-b-2 border-accent-primary">` / `border-compare-competitor`.
- Mobile cells: unchanged (already legible).

This affects `CompetitorBioCompare` (the only consumer). No data changes.

## Out of scope (untouched)

- Data shape, schema, providers, credits, payments, checkout, entitlements, Add Competitor, Free/Public report, `ReportCompetitors` legacy gauge.
- Padrão 2 (paired bars) — Format Mix card not implemented this phase.
- `EngagementCardRefined`, `FrequencyCard`, `EditorialIdentityCard`, `MethodologyLine`, `FormatCard`, `PostComparisonBlock`.
- Tests under `compare/__tests__` continue to pass (`buildDelta` signature unchanged; `CompareStatBlock` default visual behavior preserved when no `subText`/`variant` passed).

## Risks

- **Two delta systems coexist** (chip fallback for legacy callers, per-side text for new Phase 1 cards). Mitigated by `variant`/`subText` being optional. Documented in JSDoc.
- **Accent color tokens** — `bg-accent-primary/8` requires Tailwind to support alpha modifier on CSS variable token. Verified at build time; if it fails, fall back to explicit utility classes in `tokens-light.css` (`.bg-compare-primary-tint`, `.bg-compare-competitor-tint`).
- Removing Likes/Comments support rows from `CompetitorEngagementCompare` is a perceived data loss — but they already exist in Overview identity card scope (Likes/Comments are part of `competitorBreakdown`). Documented in PR summary.

## Validation

1. `nunomarkl` (Pro + competitor): Overview/Engagement/Cadence cards have white shell, Fraunces H3, tinted side panels, large number, per-side text, plain `vs`, no centered chip.
2. `frederico.m.carvalho` (no competitor): unchanged.
3. Free / `free_with_engagement`: unchanged.
4. Bio compare (`Padrão 3`) shows underline accents under column headers.
5. 375px viewport: panels stack vertically with `vs` centered above competitor side; no horizontal overflow.
6. `bun tsc --noEmit` passes; existing compare tests pass.
7. Existing `CompareStatBlock` consumers without `variant`/`subText` render identically.

## Output after build

- Files changed: 6 (`compare-stat-block.tsx`, `compare-delta.ts`, `compare-types.ts`, `competitor-overview-compare.tsx`, `competitor-engagement-compare.tsx`, `competitor-cadence-compare.tsx`, `compare-table.tsx`).
- Before/after visual summary with mobile note.
