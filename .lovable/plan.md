
## QA Audit Results

### 1. JSX and Code Integrity

**Files inspected:** All 7 focus files.

**Issues found:**

| File | Issue | Severity |
|---|---|---|
| `report-overview-cards.tsx` L239 | Duplicate section comment `// ─── Card 2 — Ritmo de publicação` (same as L272). Should be `// ─── Engagement helpers`. | Cosmetic |
| `report-overview-cards.tsx` L254 | Tooltip uses `left-1/2 -translate-x-1/2` — on 375px viewport, the 260px tooltip can clip left edge when the info icon is near the card's left margin. Change to `left-0 sm:left-1/2 sm:-translate-x-1/2` with `w-[240px] sm:w-[260px]`. | Mobile safety |

**No issues found in:**
- `report-diagnostic-verdict.tsx` — clean, no duplicates, no unused imports
- `report-diagnostic-group.tsx` — clean
- `report-diagnostic-card.tsx` — clean, all 5 lucide icons are used, `ranking` prop properly integrated
- `report-diagnostic-block.tsx` — clean, all imports used, `SnapshotPayload` used in Props
- `report-caption-intelligence.tsx` — clean
- `report-engagement-benchmark-chart.tsx` — clean

### 2. Typography Consistency

**Confirmed hierarchy:**
- Block section titles: `font-display text-[1.25rem] md:text-[1.5rem]` (Caption Intelligence) / `text-[1.15rem] md:text-[1.3rem]` (overview primary) — consistent
- Card questions: `font-display text-[1.125rem] md:text-[1.25rem]` (half) / `text-[1.25rem] md:text-[1.375rem]` (full) — consistent
- Numbers/percentages: `font-mono` everywhere — correct
- Eyebrows: `text-eyebrow` / `text-eyebrow-sm` (Inter) — consistent, no font-mono misuse
- Body: `text-sm` (14px) or `text-[13px]` — consistent
- Meta/disclaimer: `text-[12px]` — consistent

**Minor inconsistency:** `text-[11.5px]` used in engagement chart tooltip and legend (L395, L257). This sits between tiers but is intentional for chart micro-text — not worth changing.

### 3. Visual Rhythm

Spacing is consistent across all blocks:
- Verdict → groups: `space-y-10 md:space-y-12` (from block container)
- Groups internally: `space-y-4 md:space-y-5`
- Caption Intelligence: `gap-6` internal, fits well
- Priorities: integrated in block flow

No excessive gaps or cramping detected.

### 4. Mobile Safety (375px)

**Potential issue:** Tooltip in `EngagementInfoTooltip` (overview-cards L254) — `left-1/2 -translate-x-1/2` with `w-[260px]` can overflow on 375px. Fix: left-align on mobile.

**All other elements verified safe:**
- Ranking bars in `DiagnosticObjectiveSynthesis` use `w-[7.5rem] sm:w-40` — fits 375px
- Distribution bar labels: `w-20 sm:w-28` — correct
- Badge wrapping: `flex-wrap` present on all badge containers
- Caption Intelligence grid: `grid-cols-1 md:grid-cols-2` — stacks on mobile
- Audience card metrics: `grid-cols-1 sm:grid-cols-2` — stacks correctly
- Funnel stack bars: `minWidth: "fit-content"` prevents clipping

### 5. Engagement Benchmark Chart

- Chart has strong visual prominence (2-col span on desktop)
- Reference line label "Referência do escalão" is readable at 7.5px SVG
- Profile value visible even when low (marker is clamped to min Y)
- Source references [1], [2], [3] are discreet and clickable (L417-L425)
- No brand names used as large links — numeric references only
- Source context is concise (L432-L437)

### 6. Audience Response Card

- "Audiência silenciosa" uses `MessageCircleOff` with `bg-rose-50` + `text-rose-500` — looks like a neutral observation, not an error/destructive state. The icon is appropriately muted.
- Average likes/comments labels are fully readable via `MiniStat` component
- Zero comments handled: `postsWithComments ?? 0` with clear "X de Y" format
- Icons are accessible: `aria-hidden="true"` on decorative icon, parent has editorial text
- Brand reply disclaimer present: "disponível numa análise avançada com dados de comentários" — no false claims

### 7. Caption Intelligence

- Q04 clearly states "legendas públicas" (L59, L89) — no audio/video claim
- Hashtags explicitly separated: "não confundir com hashtags" (L170)
- AI reading has consistent visual identity: blue accent when AI, slate when auto
- Premium teaser uses gold only (`amber-*` tokens) — visually separated in footer
- Action bridge uses `bg-blue-50/50` or `bg-rose-50/60` — does NOT compete with gold premium teaser

### 8. V2 Preview Route

There is no stable mock route for `ReportShellV2`. The component is only rendered on `/analyze/$username` which requires a live Apify snapshot. **Recommended as a separate task:** "Create `/report/v2-preview` with mock `AdapterResult` for safe visual QA."

---

## Changes to make

Only 2 fixes needed:

1. **`report-overview-cards.tsx` L239** — Change duplicate comment from `// ─── Card 2 — Ritmo de publicação` to `// ─── Engagement helpers`
2. **`report-overview-cards.tsx` L254** — Fix tooltip mobile positioning: change `left-1/2 -translate-x-1/2` to `left-0 sm:left-1/2 sm:-translate-x-1/2` and `w-[260px]` to `w-[240px] sm:w-[260px]`

No other files need changes. No logic, data, or API changes.
