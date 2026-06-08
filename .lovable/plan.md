# Plan — Editorial "Ritmo por dia da semana" comparison

Scope: presentation-only rewrite of `src/components/report-redesign/v2/competitor-weekday-compare.tsx`. The shared `CompareBarPair` primitive stays as-is (used by other cards); this card switches to a bespoke paired-bar chart so we can control thickness, contrast, spacing, and per-side peak chips without affecting siblings.

No backend, no provider calls, no schema changes, no other components touched. Callsite (`report-overview-block.tsx`) and Props contract unchanged.

## Visual structure

```text
┌──────────────────────────────────────────────────────────────┐
│ CompareCardShell                                             │
│   title: Ritmo por dia da semana                             │
│   subtitle: Distribuição de publicações por dia (Seg–Dom)    │
│                                                              │
│   [Per-side chips row]                                       │
│   ● PERFIL  Dia mais forte: Terça (32 %)                     │
│   ● CONCORRENTE  Dia mais forte: Sexta (28 %)                │
│                                                              │
│   Seg  ████░░░░░░  3   ▏▏▏▏▏▏    1                           │
│   Ter  ████████░░  6 ★ ▏▏▏▏▏▏    1                           │
│   Qua  ██░░░░░░░░  2   ▏▏▏▏▏▏▏▏  2                           │
│   Qui  ███░░░░░░░  3   ▏▏▏▏▏▏▏▏▏ 3 ★                         │
│   ...                                                        │
│                                                              │
│   Com base nas publicações analisadas nesta amostra.         │
│                                                              │
│   footer: deterministic insight                              │
└──────────────────────────────────────────────────────────────┘
```

When competitor weekday data is missing → render the seven rows with the primary side only and a single neutral block (not seven fake zeros) for the competitor column:

```text
Seg  ████░░░░░░  3
Ter  ████████░░  6 ★
...                  ┌────────────────────────────────────┐
                     │ Sem dados suficientes do            │
                     │ concorrente para comparar o ritmo   │
                     │ semanal.                            │
                     └────────────────────────────────────┘
```

## Behaviour

### 1. Missing vs real-zero competitor data
- Compute `competitorHasData = competitor.hasWeekdayData !== false && competitorIso.reduce(...) > 0`.
- When `competitorHasData === false`: do NOT render competitor bars at all (no 7 fake zero rows). Instead show a single neutral side panel beside (md) or below (mobile) the primary chart with the copy: **"Sem dados suficientes do concorrente para comparar o ritmo semanal."**
- Real zero (competitor has weekday data but a given day is 0) still renders a thin track + "0" — that's truthful.

### 2. Both sides have data → paired bars per weekday
- Custom bespoke chart inside this card only. Each weekday row is a 3-column grid: `[day label] [bar pair] [counts]`.
- Bar pair: two stacked horizontal bars (primary on top, competitor on bottom).
  - Track: `bg-surface-muted` height `h-3` (was `h-1.5` ish in shared primitive). Stronger contrast.
  - Fill primary: `bg-accent-primary` (blue), competitor: `bg-compare-competitor` (indigo). Width = `(value / maxAcrossBoth) * 100%`.
  - Each side gets a star/dot marker on its own peak day cell (small `★` inline next to the count).
- Row gap: `gap-y-3 sm:gap-y-4` for breathing room.

### 3. Per-side peak chips (above chart)
- Two chips, one per side, each showing `● PERFIL · Dia mais forte: {day} ({share}%)`. Blue dot for primary, indigo dot for competitor. Only render when that side has ≥3 posts and a real peak. Hidden otherwise.

### 4. Deterministic insight (footer of CompareCardShell)
Ladder (kept from existing `buildWeekdayInsight`, expanded):
1. Either side has fewer than 3 posts → fallback: "Amostra pequena para concluir um padrão semanal estável."
2. Same peak day → "Os dois perfis concentram publicações em {dia} — {pShare}% no teu lado, {cShare}% no concorrente."
3. Different peak days → "Tu concentras {pShare}% em {dia}; o concorrente concentra {cShare}% em {dia2}."
4. Same peak day but one side ≥1.5x more concentrated (share) → "Tu/O concorrente concentra mais o ritmo nesse dia ({pShare}% vs {cShare}%)."
- When competitor data missing → footer becomes: "Sem dados suficientes do concorrente — leitura limitada ao perfil." (single line, no fake comparison).

### 5. Sample note
- Small line under the chart, above CompareCardShell footer: `text-sm text-content-secondary` — **"Com base nas {N} publicações analisadas nesta amostra."** where N = `totalPrimary` (or sum across sides when both have data).

### 6. Mobile
- 3-col row grid: `grid-cols-[2.25rem_1fr_3.25rem]` (label / bars / counts). No horizontal overflow.
- Day label uses short `Seg`/`Ter`/... (already in `WEEKDAY_LABELS`); counts column right-aligned, `text-xs sm:text-sm` tabular-nums, never wraps.
- Peak chips wrap to two rows when needed.

### 7. Editorial polish
- `CompareCardShell` already provides large title/subtitle. We slightly bump subtitle copy to "Distribuição de publicações por dia (Seg–Dom)".
- Card body uses `mt-1 space-y-5` for clearer rhythm.

## Out of scope
- Shared `CompareBarPair` primitive (still used by other cards) — untouched.
- `compare-card-shell.tsx`, adapter, snapshot pipeline, providers, schema, credits, Free/Public, other competitor cards.

## Validation
- `nunomarkl` preview (competitor lacks weekday data) — primary chart renders fully, neutral "Sem dados suficientes…" panel appears in place of competitor bars. No 7 fake zero rows.
- A profile/competitor with real weekday data on both sides — paired bars render, each side's peak day has a star and chip.
- 375px viewport — no horizontal overflow; labels and counts readable.
- Sample note visible; deterministic insight in footer matches the chart.
- Typecheck passes.
