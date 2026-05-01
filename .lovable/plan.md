
# Block 02 Visual Hierarchy Refinement

## 1. Editorial verdict hero (`report-diagnostic-verdict.tsx`)

- Increase main text size from `text-[15px] md:text-base` to `text-[16px] md:text-[17px]`
- Increase padding from `px-5 py-4 md:px-6 md:py-5` to `px-6 py-5 md:px-7 md:py-6`
- Make left accent border thicker: `border-l-4` → `border-l-[5px]`
- Increase icon box from `h-8 w-8` to `h-9 w-9` and icon from `size-4` to `size-[18px]`
- Already uses `border-l-blue-500` (accent-primary) — keep

## 2. Group labels (`report-diagnostic-group.tsx`)

- Add `mt-8 md:mt-10` top margin for breathing room (first group excluded via `first:mt-0` on parent or explicit prop)
- Increase label size: replace `text-eyebrow-sm` with `text-[11px] font-semibold tracking-[0.1em] uppercase`
- Make letter bolder: `text-slate-500 font-bold` instead of `text-slate-400`
- Add `pt-6 md:pt-8` before the border for more separation
- Keep the bottom `border-b` divider line

## 3. Remove redundant answer labels (`report-diagnostic-card.tsx`)

- Change `answerLabel` default from `"Resposta dominante"` to `undefined`
- When `answerLabel` is `undefined`/empty, skip rendering the `<p>` label entirely — show only the large highlighted answer text
- This removes "Resposta dominante" from all cards that don't explicitly override it

In `report-diagnostic-block.tsx`:
- Remove `answerLabel="Fase dominante"` (Q02) — the large answer "Topo do funil" is self-explanatory
- Remove `answerLabel="Síntese estratégica"` (Q07) — same reasoning
- Keep `answerLabel="Hashtags mais utilizadas"` (Q03) — this one is clarifying, not redundant
- Remove `answerLabel="Estado"` (Q05) — "Audiência silenciosa" is already clear

Also in `report-diagnostic-card.tsx` for the `DiagnosticObjectiveSynthesis`:
- Remove the visible `<p>` "Hipótese principal" label; keep the answer text. Add `aria-label="Hipótese principal"` to the container for accessibility.

## 4. Distribution bars dominant emphasis (`report-diagnostic-card.tsx`)

In `DiagnosticDistributionBar` (vertical-list variant):
- Accept a new optional `dominantIndex` prop (default `0`)
- Dominant bar: full opacity (as-is via color prop)
- Non-dominant bars: apply `opacity-30` to the bar fill

In `DiagnosticRanking`:
- First item bar: full opacity `bg-blue-500`
- Remaining items: `bg-blue-500/30`

## 5. Source badges

Already unified in previous task. No changes needed — already using `∿ AUTO`, `⬡ DADOS`, `✦ IA`, `◈ MERCADO`. The `ReportSourceLabel` component renders at 10px, 50% opacity, no pill.

## 6. Audience response card icon

The card already has `StatusIcon` rendered at `size-14 sm:size-16` in a rounded box. This is good.

Add a code comment above the audience highlight component:
```
// Public Apify profile/post payload does not reliably indicate whether the
// brand replied inside comment threads unless comment-level data with
// authors is collected.
```

## 7. No word clipping

- In `DiagnosticRanking` (valuePosition="left"): change label `w-44` to `min-w-0 flex-1 truncate` to prevent overflow on mobile
- In `DiagnosticDistributionBar` (vertical-list): change label `w-28` to `w-24 sm:w-28` for mobile safety
- In `DiagnosticChecklist`: the truncate is already there — fine

## Files changed

- `report-diagnostic-verdict.tsx` — hero sizing
- `report-diagnostic-group.tsx` — stronger separators
- `report-diagnostic-card.tsx` — remove answerLabel default, distribution bar dominant emphasis, ranking opacity, mobile width fixes, code comment
- `report-diagnostic-block.tsx` — remove specific answerLabel overrides

## Files NOT changed

- `report-caption-intelligence.tsx` — structurally acceptable per spec
- `source-badge.tsx` / `report-source-label.tsx` — already unified
- No logic, no schema, no admin, no locked files
