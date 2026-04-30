# Block 01 · Overview — visual architecture fix

Five focused fixes across four files. No new libraries, no new data fetches, no touches to Blocks 02–06, providers, PDF, schema, admin, `/report/example`, AI prompts or validators.

## Files changed

- `src/components/report-redesign/v2/report-hero-v2.tsx`
- `src/components/report-redesign/v2/report-overview-cards.tsx`
- `src/components/report-redesign/v2/report-overview-block.tsx`
- `src/components/report-redesign/v2/report-overview-attention-row.tsx` *(no rendering change; component left intact in case of reuse, just unmounted from Block 01)*

The `AIInsightBox` (`src/components/report/ai-insight-box.tsx`) is **not** edited (locked-style shared component); we override its visual treatment by wrapping it in Block 01 with a calm container and forcing `emphasis="neutral"` only in this Block 01 use. The component itself keeps its semantics elsewhere.

## Part A — Hero (`report-hero-v2.tsx`)

Make the first fold feel like a real Instagram profile header while keeping it premium.

1. **Avatar story ring**: wrap the avatar in a subtle conic/linear gradient ring (amber→rose→fuchsia→blue) with a 2px white inset, sized so the avatar still measures 72/96px. Pure CSS via `bg-[conic-gradient(...)]` on a wrapper div + `p-[2px]` + inner white ring. Fallback initials preserved.
2. **Verified badge**: replace the loose `BadgeCheck` Lucide icon with a small filled blue disc (`bg-blue-500`) containing a white tick (`Check` icon, 10px). Sits inline beside the handle. Only renders when `profile.verified === true`.
3. **Identity block**:
   - H1 keeps handle.
   - Full name under handle (kept).
   - Bio: keep `whitespace-pre-line` (already preserves line breaks), tighten `max-w-md`, `line-clamp-4`, `text-[13px]`.
   - **External URL**: if `result.enriched.profile.externalUrls?.[0]` exists, render it as a small `text-[12px] text-blue-600` line below the bio (display only — no anchor navigation, since these are not whitelisted).
4. **IG stats row**: keep exactly `publicações`, `seguidores`, `a seguir`. Already in place — keep current sizing (`text-xl md:text-2xl`).
5. **Report metadata**: kept under hairline divider (already implemented).
6. **Badges**: only `Dados públicos` (already correct).
7. **Actions reduce dominance**:
   - Move the action group below the identity column on desktop too (no longer right-aligned `lg:items-end`), or shrink to compact pill buttons (`h-9`, `text-[13px]`, secondary blue outline for Export PDF instead of solid blue). Keep solid blue for Export PDF but at smaller size.
   - Remove the `lg:max-w-xs` right column emphasis; place actions in a small row aligned right with `mt-0` on desktop, but visually lighter.

## Part B — Overview cards (`report-overview-cards.tsx`)

Asymmetric layout with engagement leading.

1. **Grid**:
   - Mobile/tablet: `grid-cols-1`, engagement first.
   - Desktop (`lg:`): `lg:grid-cols-3` where engagement spans `lg:col-span-2` and the right column stacks rhythm + format vertically (`lg:col-span-1` containing two stacked cards via inner `flex flex-col gap-4`).
2. **Card 1 — Taxa de envolvimento (primary)**:
   - Larger value typography (`text-[3rem] md:text-[3.5rem]`).
   - Helper text rewritten to: **"gostos e comentários face à dimensão do perfil"** (drop "respostas" — shares not in data per spec).
   - Distance bar: cleaner — taller (h-2.5), softer rail (`bg-slate-100`), bar in `bg-blue-500` for neutral/good, `bg-rose-400` only when status is `bad`. Reference marker becomes a slim blue tick + small label `referência` aligned to its position.
   - Status pill at bottom replaces tiny dot+text: small chip with tone color but muted (`bg-slate-50 text-slate-700` for neutral, `bg-rose-50 text-rose-700` only for `bad`).
3. **Card 2 — Ritmo de publicação (secondary, compact)**:
   - Slightly smaller value (`text-[2rem]`), reduced padding (`p-4 md:p-5`).
   - Keep `RhythmDots` + scale label `ritmo semanal · 0 → 7+`.
   - Drop the duplicated "Ritmo elevado/moderado/baixo" wording from the dot+interpretation footer to avoid duplication; keep only the scale label and a brief contextual line "X publicações em Y dias analisados".
4. **Card 3 — Formato mais regular (secondary, compact)**:
   - Same compact treatment as card 2.
   - Percentage stays as primary, `FormatChipContextual` as secondary (already correct).
   - `FormatStackedBar` stays but legend wraps with `min-w-0`/`break-words` to avoid overflow.

## Part C — Remove attention row (`report-overview-block.tsx`)

- Delete the `<ReportOverviewAttentionRow result={result} />` render and its import.
- Update the JSDoc top-of-file to drop the section-3 reference and note that "attention" semantics are now carried by card statuses + AI reading.
- Component file `report-overview-attention-row.tsx` left untouched on disk (no other consumers, but kept for potential future reuse).

## Part D — AI reading calm treatment (`report-overview-block.tsx`)

The current rose look comes from `AIInsightBox` rendering `emphasis="negative"`. Block 01 should always be a calm editorial synthesis.

- Wrap `renderInsight("hero")` output in a custom Block 01 container instead of using the raw `AIInsightBox`. Inline the editorial callout directly in `report-overview-block.tsx`:
  - white background, soft blue ring (`ring-1 ring-blue-100`), `border-l-2 border-blue-300`, generous padding, `max-w-3xl`.
  - small bot icon in a `bg-blue-50 text-blue-600` rounded-md container.
  - eyebrow `Leitura IA` in mono blue.
  - body text in `text-slate-700`, `text-[14px] md:text-[15px]`, leading-relaxed.
- To do this without touching `AIInsightBox`, read the v2 hero insight directly from the shell. Two options:
  - **Chosen**: read insight text via the existing `renderInsight` prop is opaque (returns ReactNode). Instead, extract the text from `result.enriched.aiInsightsV2?.sections.hero` inside `ReportOverviewBlock` (already typed in `AdapterResult`). The `renderInsight` prop is no longer used in Block 01 — it stays for compatibility but Block 01 renders its own editorial callout from the underlying string. This avoids editing the shared `AIInsightBox`.
- Net effect: Block 01 AI reading is **always calm blue/white**, regardless of v2 emphasis.

## Part E — Typography & spacing

- Card titles: `font-display` (already), tightened.
- Labels remain mono uppercase.
- Numbers stay `font-display tabular-nums`.
- Drop any "Visão geral" eyebrow inside the block (none currently rendered — confirmed; no action needed).

## Part F — Validation

- `bunx tsc --noEmit`
- `bunx vitest run`

No browser QA unless asked.

## Report back

After implementation: list of files touched, specific changes per part, attention row no longer rendered, AI reading colour change, TS + Vitest results, scope confirmation, then stop and wait for screenshots.
