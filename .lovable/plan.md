
## Changes

### 1. `src/components/report-redesign/v2/report-diagnostic-block.tsx`

**P06 — renderIntegrationCard:**
- Change `span` from default ("half") to explicitly `"half"` (already default, no change needed).
- Replace generic `body` paragraph with a short dynamic line based on `r.label`:
  - "Integração clara" → "Existe infraestrutura de saída do Instagram."
  - "Integração parcial" → "Há sinais parciais de saída do Instagram."
  - "Sem integração" → "Sem infraestrutura de saída do Instagram."
- Update the `DiagnosticChecklist` items to include the detected URL path/domain and count values more prominently (already present via `hint`, just ensure the labels are compact).

**P07 — renderObjectiveCard:**
- Change `span` from `"full"` to `"half"` so it sits beside P06 in the 2-col grid.
- Shorten the `answer` to show only the first part before " · " (e.g. "Notoriedade" instead of "Notoriedade · marca pessoal"). The full label stays in the ranking.
- Shorten the `body` to a one-line subtitle (e.g. "Marca pessoal acima de leads." derived from primary/secondary).

### 2. `src/components/report-redesign/v2/report-diagnostic-card.tsx`

**DiagnosticObjectiveSynthesis — simplify:**
- Remove the "Objetivo secundário" box (redundant with ranking).
- Remove the `InsightCallout` "Nota metodológica" block. Replace with a single `<p>` footer: "Hipótese derivada dos sinais públicos analisados."
- Keep ranking bars but make them more compact (reduce label width, tighten spacing).
- Keep support signal chips (already compact).
- Keep confidence chip.

**DiagnosticChecklist — minor polish:**
- Add subtle tinted background for detected items: `bg-tint-success/30` when status is "detected".

### Files NOT touched
- Block 1 cards, P01-P05, backend, auth, admin, PDF, global tokens, locked files, report-tokens.

### Validation
- `bunx tsc --noEmit`
- `bunx vitest run`
- Confirm P06 and P07 side by side on desktop (both `span="half"` in the `md:grid-cols-2` Group D grid)
- Confirm mobile stacks correctly
- No data/scoring logic changes
