
# Phase 1A.1 — Stabilise the six-block report

Fix-only structural pass. No new features, no provider calls, no PDF or `/report/example` changes, no new libraries. Three locked files are touched (header, report-ai-reading, report-kpi-grid) — explicitly approved by the user — with surgical edits only.

---

## 1. Fix sticky navigation — `report-shell-v2.tsx`

Root cause: the outermost wrapper has `overflow-x-hidden`, which creates a scroll containing block and breaks `position: sticky` for the desktop sidebar (`<aside class="sticky top-6">`) and the mobile tabs (`<nav class="sticky top-0">`).

Change:
- Remove `overflow-x-hidden` from the root `<div>` of `ReportShellV2`. Page-level horizontal overflow is fixed at its real source in step 2, not masked here.
- Keep `min-h-screen` and the page canvas class.

Acceptance:
- At 1366×768, `ReportBlockSidebar` remains visible while scrolling through all six blocks.
- At 768×1024 and 375×812, `ReportBlockTopTabs` remains stuck to the top of the viewport while scrolling.

---

## 2. Fix horizontal overflow at 768px — `header.tsx` (locked, minimal)

Root cause at 768px: at the `md` breakpoint the header simultaneously shows the brand, the "Instagram Benchmark" subtitle, the full 4-item desktop nav, the theme button **and** the "Analisar agora" CTA. The Container's content exceeds 768 − padding and pushes the document horizontally.

Minimal change (no visual loss for the typical desktop case):
- Move the desktop nav from `md:block` to `lg:block` and the mobile drawer trigger from `md:hidden` to `lg:hidden`. Tablets (768–1023) get the drawer; ≥1024 keeps the inline nav. This is the smallest safe fix and removes the overflow without touching brand/CTA styling.
- Keep the "Instagram Benchmark" subtitle visible from `lg` instead of `md` (`hidden md:flex` → `hidden lg:flex`) so the tablet header has breathing room.
- "Analisar agora" stays `hidden sm:inline-flex` (unchanged).

The hero already collapses correctly at 768 (`flex-col` until `lg:flex-row`); no edit needed there.

Acceptance:
- No horizontal scrollbar at 1366, 768 or 375.
- Tablet header shows: brand, theme toggle, "Analisar agora", drawer trigger — no clipping.

---

## 3. Reduce duplicated block headings

Each of the six blocks already renders one dominant serif `<h2>` from `ReportBlockSection`. Inside blocks 02 and 05, child components render a second `<h2>` via `ReportSectionFrame`, creating stacked headings.

3a. `report-section-frame.tsx` (not locked): add an optional `compact?: boolean` prop. When true, the section drops the entire `<header>` (eyebrow + h2 + subtitle), tightens vertical padding to `py-6 md:py-8`, and the `aria-label` on the outer `<section>` continues to use `ariaLabel ?? title`. Default behaviour is unchanged for every existing consumer.

3b. `report-ai-reading.tsx` (locked, surgical): add `compact?: boolean` to `Props` and forward it to `ReportSectionFrame`. No other change.

3c. `report-market-signals.tsx` (not locked): add `compact?: boolean` to `ReportMarketSignalsSectionProps`, forward to `ReportSectionFrame`. The cached-disabled short-circuit stays intact.

3d. `report-shell-v2.tsx`: pass `compact` to `ReportAiReading` (block 02) and `ReportMarketSignalsSection` (block 05). The block question becomes the only large serif heading in each block.

Acceptance:
- Each block has exactly one dominant serif H2 (the block question).
- Other consumers of `ReportSectionFrame` and `ReportAiReading` (e.g. legacy `report-shell.tsx`, `/report/example`) render unchanged because `compact` defaults to `false`.

---

## 4. Rewrite "Procura fora do Instagram" framing — `report-shell-v2.tsx`

In block 05, replace the current paragraph + trailing mono note with a single short framing paragraph using the user-supplied PT-PT copy:

> O Instagram mostra como a audiência atual reage. A procura fora da plataforma ajuda a perceber se os mesmos temas também despertam interesse em pesquisa. Os valores atuais são índices relativos do Google Trends, não volume absoluto de pesquisas.

- The market signals component below now renders in `compact` mode (step 3) so the explanation is not repeated inside it.
- Keep `renderInsight("marketSignals")` after the component.
- Drop the duplicate trailing mono disclaimer line (info is now in the framing paragraph).

Acceptance:
- One framing paragraph, no repeated explanations, no invented search volumes.

---

## 5. Improve active block detection — `use-active-block.ts`

Two issues today:
- `rootMargin: "-20% 0px -60% 0px"` activates blocks too high on the page, often skipping the very first block.
- The "best ratio wins" tiebreaker doesn't favour the topmost section.

Changes:
- Tune to `rootMargin: "-10% 0px -75% 0px"` and `threshold: [0, 0.05, 0.2, 0.5, 1]`. This narrows the active band to roughly the upper third.
- Re-derive the active id by reading each observed element's `getBoundingClientRect().top` and choosing the section whose top is the largest negative value still above a small offset (i.e. the topmost block that has crossed into the active band). Fall back to the first id when nothing has crossed yet.
- Initialise to the first id and, on click via `scrollToBlock`, optimistically set the active id so the highlight responds immediately even before the observer fires.

Acceptance:
- "01 Overview" highlights at top of page.
- Highlight transitions block-by-block in order while scrolling at 1366 and 375.
- Clicking any nav item scrolls to and highlights the right block.

---

## 6. KPI grid hygiene — `report-kpi-grid.tsx` (locked, surgical)

6a. Word break on dominant format: replace `break-words` on the value container with `break-normal [overflow-wrap:normal] [hyphens:none]`. Long single words (e.g. "Carrousels") will overflow gracefully rather than break mid-word; the value cell already uses `min-w-0` and the grid auto-sizes — at 375 the value falls onto its own line as a whole word.

6b. Benchmark status card (`Estado do benchmark`):
- It already uses a chip (`BenchPill`) instead of a number, but it sits in a `KpiCard` shell that visually pretends to be a metric. Keep the same outer card structure (so the grid stays aligned), but:
  - Remove the help line (no `help` prop) — it never had one.
  - Add a subtle `ring-1 ring-blue-100/0` distinction by giving this single card a slightly different inner layout: the chip is centred vertically inside the value slot with `items-center` and a small explanatory line below the chip ("estado actual") rendered as `kpiHelp`. This signals "status card", not "missing metric".
- The change is local to the JSX of the 5th `KpiCard` call site; no token or API change.

Acceptance:
- "Carrousels" / "Carrosséis" never breaks mid-word at any tested viewport.
- The benchmark status card reads as an intentional status chip card, aligned with the other four KPI cards.

---

## Validation

1. `bunx tsc --noEmit`
2. `bunx vitest run`
3. Visual QA via the browser tools at `/analyze/frederico.m.carvalho`:
   - 1366×768 — sidebar sticky, no h-scroll, single H2 per block, KPI clean.
   - 768×1024 — top tabs sticky, drawer in header, no h-scroll, hero readable.
   - 375×812 — top tabs sticky, KPI grid clean, framing copy readable.

Report back with: files changed, exact fixes, tsc/vitest results, viewport-by-viewport QA notes, remaining issues if any. No Phase 1B work.

---

## Files touched

Not locked:
- `src/components/report-redesign/v2/report-shell-v2.tsx`
- `src/components/report-redesign/v2/use-active-block.ts`
- `src/components/report-redesign/v2/report-block-nav.tsx` *(only if optimistic-active wiring needs it)*
- `src/components/report-redesign/report-section-frame.tsx`
- `src/components/report-market-signals/report-market-signals.tsx`

Locked (approved, surgical):
- `src/components/layout/header.tsx`
- `src/components/report-redesign/report-ai-reading.tsx`
- `src/components/report-redesign/report-kpi-grid.tsx`

## Out of scope
PDF, `/report/example`, admin, Supabase schema, providers, AI prompts, validators, new libraries, redesign of any block.
