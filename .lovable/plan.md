
# Section Header Redesign — Chapter Marker Editorial

## Strategy: Option A (Global)

Apply the new chapter marker style to **all 6 sections** uniformly. Rationale:

- `ReportBlockSection` is a single component rendering all 6 blocks with identical props shape.
- Adding a variant/conditional for only 2 sections introduces complexity with no architectural benefit — all 6 sections deserve the same hierarchy treatment.
- The `block-config.ts` data already provides `number`, `shortLabel`, `question`, `subtitle` for every block — no new data needed.

Trade-off: sections 03–06 (currently placeholders or lighter content) will also get the stronger header. This is a positive — it creates consistent rhythm across the full report.

## Files to edit

1. **`src/components/report-redesign/v2/report-block-section.tsx`** — JSX layout change
2. **`src/components/report-redesign/report-tokens.ts`** — update `h2Section` scale, add `chapterNumber` and `chapterMeta` tokens

**Not touched:** block-config.ts, report-shell-v2.tsx, any card component, Block 1/2 internals, P01–P04, Groups C/D, backend, auth, admin, PDF, global tokens, locked files.

## Proposed JSX structure

```text
┌─────────────────────────────────────────────────────┐
│                                                     │
│  01          CAPÍTULO PRIMEIRO                      │  ← mobile: stacked
│              OVERVIEW                               │
│              Como está o perfil em geral?            │  ← serif, ~2rem md:2.5rem
│              Identidade do perfil, indicadores...    │  ← Inter, muted
│                                                     │
│  ─────────────────────────────────────────────────── │  ← border-b slate-200/50
│                                                     │
│  [cards below]                                      │
└─────────────────────────────────────────────────────┘
```

Desktop: flex row — large number left, text stack right.
Mobile (< md): flex col — number above text, slightly smaller.

### Chapter metadata map

A simple lookup for the ordinal label:

```
01 → CAPÍTULO PRIMEIRO
02 → CAPÍTULO SEGUNDO
03 → CAPÍTULO TERCEIRO
04 → CAPÍTULO QUARTO
05 → CAPÍTULO QUINTO
06 → CAPÍTULO SEXTO
```

### Token updates in `report-tokens.ts`

- `h2Section`: increase to `text-[1.75rem] md:text-[2.25rem]` (currently `1.5rem/1.75rem` — too close to card titles at `text-xl/2xl`).
- New `chapterNumber`: `font-display text-[3.5rem] md:text-[4.5rem] font-semibold leading-none tracking-tight text-blue-100` — lighter than current `text-5xl/7xl`, more refined.
- New `chapterMeta`: `text-eyebrow-sm text-slate-400 tracking-widest` — the "CAPÍTULO PRIMEIRO" line.

### Responsive behaviour

- **md+**: `flex flex-row items-start gap-6` — number on left, text stack on right.
- **< md**: `flex flex-col gap-3` — number stacks above text, scaled down to `text-[3rem]`.
- Divider: `border-b border-slate-200/50` below the header, with `pb-6 md:pb-8` spacing before cards.

## Risks

- **Low**: visual-only change inside one component. No data, no logic, no routing.
- **Low**: all 6 sections already pass through `ReportBlockSection` — uniform change, no conditional branches.
- The number color `text-blue-100` is already used in the current implementation — no new palette introduced.

## Validation

1. `bunx tsc --noEmit` — 0 errors
2. `bunx vitest run` — 103/103 pass
3. Visual check: section titles visually larger than card `h3` titles
4. Mobile: number stacks above title
5. No changes outside the 2 listed files
