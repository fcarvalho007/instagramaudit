
# Block 02 Layout Reflow

## What changes

Only one file: `src/components/report-redesign/v2/report-diagnostic-block.tsx`

No locked files are affected.

## Current grouping vs target

| Current | Target |
|---------|--------|
| Group A: Q01 + Q02 | Group A: Q01 alone (full width via `span="full"`) |
| Group B: Q03 + Q05 | Group B: Q02 + Q03 (side by side, half width each) |
| CaptionIntelligence | Group C: Q05 (full width) then CaptionIntelligence (Q04, full width) |
| Group C: Q06 + Q07 | Group D: Q06 + Q07 (side by side, unchanged) |

## Changes in the file

1. **Recompose the group arrays** (lines ~110-122):
   - `groupA` = [ Q01 contentType ] — single card, renders full-width
   - `groupB` = [ Q02 funnel, Q03 hashtags ] — side by side
   - `groupC` = [ Q05 audience ] — single card, full-width
   - `groupD` = [ Q06 integration, Q07 objective ] — side by side (same as current groupC)

2. **Update the render section** (lines ~126-162):
   - Verdict (unchanged)
   - Group A: letter "A", label "Identidade editorial"
   - Group B: letter "B", label "Posicionamento e descoberta"
   - Group C: letter "C", label "Resposta e linguagem" — renders Q05 audience card, then `<ReportCaptionIntelligence>` below the group grid
   - Group D: letter "D", label "Contexto estratégico"

3. **Update `totalCards`** count to include all four groups.

4. **Remove `span="full"` from Q02 funnel card** (in `renderFunnelCard`) so it renders as half-width inside Group B. Q05 audience already has `span="full"`.

## What does NOT change

- Card internals, copy, colors, badges, calculations, AI logic
- `ReportDiagnosticGroup` component
- `ReportDiagnosticCard` component
- `ReportCaptionIntelligence` component
- Any other file

## Validation

- `bunx tsc --noEmit`
- `bunx vitest run`
