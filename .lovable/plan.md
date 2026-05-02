
## Current State

The foundational components already exist:
- `InsightCallout` (editorial/suggestion/warning tones) — used in `DiagnosticAudienceHighlight` only
- `PremiumCallout` (gold island) — used in caption intelligence + engagement chart
- `ReportSourceLabel` with 5 types (dados/mercado/auto/ia/pro)
- Accent borders on `PremiumCard` and `ReportDiagnosticCard`

**Gaps identified:**

1. `ActionBridgeStrip` in caption-intelligence duplicates `InsightCallout` pattern manually instead of using the component
2. `DominantFormatCard` (Block 01) has no accent tone applied
3. Several editorial body texts in diagnostic cards are plain `<p>` tags that could benefit from `InsightCallout` wrapping for visual consistency
4. `ReadingLine` in caption-intelligence uses ad-hoc styling that partially overlaps with `InsightCallout`
5. Some source badges appear at both header and section level within the same card (caption intelligence) — minor redundancy

## Plan

### 1. Refactor `ActionBridgeStrip` to use `InsightCallout`

In `report-caption-intelligence.tsx`, replace the manual box in `ActionBridgeStrip` with `InsightCallout`:
- `priorityType === "alta"` → `tone="warning"`, label "Próximo passo recomendado"
- else → `tone="suggestion"`, same label

### 2. Add accent tone to `DominantFormatCard`

In `report-overview-cards.tsx`, add `accentTone="slate"` to the Format card's `PremiumCard` — neutral extraction/calculation accent.

### 3. Add `InsightCallout` to key diagnostic card bodies

In `report-diagnostic-block.tsx`:
- **Q07 (Objective)**: wrap the disclaimer text at the bottom of `DiagnosticObjectiveSynthesis` in `InsightCallout tone="suggestion"` for consistency
- **Q02 (Funnel)**: when `label === "Comunicação dispersa"`, use `InsightCallout tone="warning"` for the interpretation body

### 4. Clean up source badge duplication in caption intelligence

In `report-caption-intelligence.tsx`:
- Remove `SourceBadge` from individual sub-section headers (`ThemesAndExpressionsBlock`, `CtaBlock`, `EditorialReadingBlock`) since the shell already has the Q04 eyebrow context
- Keep only the `SourceBadge` next to "Expressões recorrentes" sub-label (it's a different source from the section)

### 5. Accessibility and mobile checks

- Verify all `InsightCallout` instances wrap text correctly at 375px
- Confirm no truncated labels or badges
- Run `tsc --noEmit` and `vitest`

## Files to change

1. `src/components/report-redesign/v2/report-caption-intelligence.tsx` — refactor ActionBridgeStrip; reduce source badge duplication
2. `src/components/report-redesign/v2/report-overview-cards.tsx` — add accentTone to Format card
3. `src/components/report-redesign/v2/report-diagnostic-block.tsx` — add InsightCallout to Q07 disclaimer and Q02 dispersa case
4. `src/components/report-redesign/v2/report-diagnostic-card.tsx` — wrap Q07 disclaimer in InsightCallout (in `DiagnosticObjectiveSynthesis`)

No locked files touched. No data/calculation/schema changes.
