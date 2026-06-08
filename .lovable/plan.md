## Goal

Make every Pro comparison card share **one shell + one grammar** so the report reads as a coherent "comparison mode" instead of single-profile cards plus appended compare blocks.

Presentation-only. No data, providers, payments, schema, entitlements or Free/Public touched.

## Today's inconsistencies (audit)

| Card | Shell | Title | Handle treatment | Baseline chip | Insight footer |
|---|---|---|---|---|---|
| Overview identity (`CompetitorOverviewCompare`) | none (eyebrow only) | none | none | inline text | none |
| Engagement (`CompetitorEngagementCompare`) | `CompareStatBlock variant="card"` (white + Fraunces inside) | Fraunces "Taxa de engagement" | inline pill per side | inline `hint` text | plain `<p>` **outside** the card |
| Cadence (`CompetitorCadenceCompare`) | same as engagement | "Cadência semanal" | same | same | same |
| Format (`CompetitorFormatCompare`) | own white card | Fraunces "Mix de formatos" | legend dot + handle | pill chip | muted panel inside card |
| Weekday (`CompetitorWeekdayCompare`) | own white card | Fraunces "Ritmo por dia da semana" | legend dot | pill chip | muted panel inside card |
| Bio (`CompetitorBioCompare`) | `CompareTable` (smaller surface-secondary shell) | eyebrow only (no Fraunces) | table column header underline | none | tiny caption |

Result: six visually different shells, three different title styles, three handle treatments, three footer treatments.

## Shared compare-card rules (to apply to all six)

1. **Shell** — white surface, `rounded-2xl border border-border-default shadow-card`, padding `p-6 sm:p-8`. Same shell on every compare card.
2. **Title** — Fraunces H3 (`font-serif text-xl sm:text-2xl text-content-primary leading-snug`). Always present.
3. **Subtitle line** (optional) — small Inter text under the title for the metric framing (e.g. "Publicações por semana").
4. **Identity row** — directly under the title: two side-by-side handle pills, primary blue (`#3772E5`) and competitor indigo (`#7664E4`), each with a 24 px avatar when available. Same component on every card so left/right ownership reads instantly.
5. **Baseline hint chip** — pill (`Concorrente em janela baseline`) anchored top-right on `md:` and wrapping under the title on mobile. One placement, every card.
6. **Body** — variant-specific (stat block, bar pair, table) rendered in `bare` mode (no inner shell), so the parent shell is the only visible chrome.
7. **Footer insight** — single shared panel: `rounded-xl border border-border-subtle bg-surface-muted px-4 py-3 text-sm text-content-secondary leading-relaxed`. Always inside the shell, always at the bottom. Hidden when no deterministic insight.
8. **Typography**
   - Metric values: Inter SemiBold tabular-nums.
   - On single-stat cards (engagement, cadence) the primary number scales up to `clamp(2rem, 5vw, 3rem)` — visibly larger than the surrounding body.
   - Labels: Inter normal, `text-sm text-content-secondary`. Eyebrows: `.text-eyebrow-sm`.
9. **Spacing rhythm** — title → identity row: `mt-4`. Identity row → body: `mt-6 md:mt-8`. Body → footer: `mt-6`.
10. **Replacement, not addition** — every compare card already replaces its solo sibling in `report-overview-block.tsx` when `firstCompetitor` exists; this PR preserves that gating and audits there is no duplicate solo card rendered alongside.

## New primitives

| File | Role |
|---|---|
| `src/components/report-redesign/v2/compare/compare-card-shell.tsx` | The shared shell. Props: `title`, `subtitle?`, `windowAligned`, `primary: {handle, avatarUrl?}`, `competitor: {handle, avatarUrl?, isVerified?}`, `footer?: ReactNode`, `children`, `id?`, `aria-label`. Owns the white card, Fraunces title, handle row, baseline chip placement, footer panel. |
| `src/components/report-redesign/v2/compare/compare-handle-row.tsx` | Two-pill identity strip used by the shell. Pill = small avatar (or coloured circle fallback) + `@handle` in the side's accent colour. Reused by `ComparisonHero` for visual harmony. |

## Updated components

| File | Change |
|---|---|
| `src/components/report-redesign/v2/overview/competitor-overview-compare.tsx` | Wrap the row grid in `<CompareCardShell title="Identidade" …/>`. Identity row appears once (not per row). Each row stays as `CompareStatBlock variant="bare"`. Drop the local `<header>` block. |
| `src/components/report-redesign/v2/competitor-engagement-compare.tsx` | Replace `CompareStatBlock variant="card"` + outer `<p>` with `<CompareCardShell title="Taxa de engagement" footer={verdict}> <CompareStatBlock variant="bare" …/> </CompareCardShell>`. |
| `src/components/report-redesign/v2/competitor-cadence-compare.tsx` | Same pattern as engagement (`title="Cadência semanal"`). |
| `src/components/report-redesign/v2/competitor-format-compare.tsx` | Replace ad-hoc `<section>` + `<header>` + footer with `<CompareCardShell title="Mix de formatos" footer={insight}> <CompareBarPair variant="bare" …/> </CompareCardShell>`. Drop the local baseline chip. |
| `src/components/report-redesign/v2/competitor-weekday-compare.tsx` | Same pattern as format (`title="Ritmo por dia da semana"`). |
| `src/components/report-redesign/v2/competitor-bio-compare.tsx` | Wrap `<CompareTable variant="bare" …/>` in `<CompareCardShell title="Bio e pontos de saída" footer={insight}>`. Adds Fraunces title parity with the other cards. |
| `src/components/report-redesign/v2/compare/compare-table.tsx` | Add `variant?: "card" \| "bare"` (default "card" for back-compat); `bare` renders only the table + mobile cards, no outer shell, no eyebrow. |
| `src/components/report-redesign/v2/compare/index.ts` | Export `CompareCardShell`, `CompareHandleRow`. |
| `src/components/report-redesign/v2/overview/comparison-hero.tsx` | Replace inline identity blocks with `<CompareHandleRow size="lg" …/>` so the hero and downstream compare cards share the exact same handle treatment. Keeps the bigger duel layout; just unifies the handle pills. |

## Identity row spec

```text
[ ●avatar  @primary ]      [ ●avatar  @competitor ]
   blue pill, blue text       indigo pill, indigo text
```

- Avatar: 24 px circular, with a 1.5 px ring in the side's accent colour. Fallback initials when missing.
- Pill: `inline-flex items-center gap-2 rounded-full border px-3 py-1 text-sm font-semibold`, border + background tinted at 8% of the accent, text in the accent colour.
- Verified check overlay reuses the existing avatar pattern from `report-hero-v2.tsx` (small green check, ring-2 white).
- Mobile: pills wrap onto two lines if needed; never truncate the handle.

## What stays unchanged

- All single-profile cards (`EditorialIdentityCard`, `EngagementCardRefined`, `FrequencyCard`, `FormatCard`) — they already render only when `!firstCompetitor`; no shared shell needed.
- `CompareStatBlock`, `CompareBarPair` — internals unchanged; only `bare` variant is consumed by the refactored cards. `card` variant kept for back-compat but no longer used by the six compare cards.
- `analyze-public-v1.ts`, snapshot adapter, mock data, providers, credits, entitlements, payments.
- PR1 window gate, PR2 window labels, lock gate, Free/Public flow.
- Design tokens (`src/styles/tokens-light.css`) — primitives use existing accent/surface tokens; no new tokens introduced.
- PDF print pipeline.

## Files changed

- New: `compare/compare-card-shell.tsx`, `compare/compare-handle-row.tsx`
- Edited: 6 compare cards + `compare/compare-table.tsx` + `compare/index.ts` + `overview/comparison-hero.tsx`

Total: 2 new files, 9 edited files.

## Validation

1. `bunx tsc --noEmit` clean.
2. Visit `/admin/report-preview/nunomarkl?variant=pro_preview`:
   - All six compare cards have identical shell, identical title style, identical handle row, identical baseline chip placement, identical footer panel.
   - Engagement and cadence single-number values render visibly larger than before.
   - No duplicate single-profile card is rendered next to any compare card.
3. Visit `/admin/report-preview/frederico.m.carvalho` (no competitor): solo report unchanged — `EditorialIdentityCard`, `EngagementCardRefined`, `FrequencyCard`, `FormatCard` still render as before.
4. 375 px viewport: no horizontal overflow; handle pills wrap, baseline chip wraps under title.
5. `/report/example` mock route: still renders.
6. Network: zero new requests.
