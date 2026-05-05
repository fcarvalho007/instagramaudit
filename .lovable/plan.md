
# P04 Caption Diagnostics Card — Visual Refinement

**File changed:** `src/components/report-redesign/v2/caption-diagnostics-card.tsx` (single file)

No data logic, no helper file, no other cards, no locked files touched.

---

## Changes

### 1. KPI Cards — "Características" prominence

Replace the plain `<ul>` in the "Características" KPI card with a layout where the numeric values are large and prominent:

- Primary number (`~{avgWords}`) at ~22px, `font-semibold tabular-nums`
- Unit label (`palavras / post`) at 12px muted below
- Same treatment for emoji count

"Temas Dominantes" and "Intenção Principal" keep current bullet list style but get slightly tighter spacing.

### 2. Openings — Lucide icons per type

Add a small icon to each opening row in the "Como começam as legendas?" section, mapped by `CaptionOpeningType`:

| Type | Icon |
|------|------|
| `bold_statement` | `Type` (bold A icon) |
| `news_or_update` | `Zap` |
| `question` | `HelpCircle` |
| `story` | `BookOpen` |

Icons render at 14px, muted, left of the label. The `DistributionBar` component gets an optional `icons` map prop, or the openings section uses a dedicated variant.

### 3. Endings — "Com pergunta" emphasis when low

When `type === "question"` and `pct < 20`:
- Row background: `bg-rose-50` (light rose tint)
- Label text: `text-rose-600 font-medium`
- Bar color: `bg-rose-400` instead of generic danger

When `pct >= 20`, keep the current neutral style. This replaces the existing `highlightType`/`highlightClass` approach with a conditional per-row style inside the endings section.

### 4. Length distribution — dominant segment highlight

Add a subtle ring or slightly taller bar segment for whichever bucket has the highest `pct`. The dominant bucket gets `h-4` instead of `h-3`, creating a visual bump. Legend unchanged.

### 5. Diagnostic editorial box — text polish

- Keep `font-sans` (Inter) for the diagnostic paragraph — no Fraunces.
- Audit `buildDiagnosticStatement`, `buildWhatWorks`, `buildCriticalPoint`, `buildToWatch` for any "tu/teu/tua/apostas/deves" wording. Current copy looks clean but will verify and fix if needed.
- No `dangerouslySetInnerHTML`.

### 6. Responsive QA

No structural layout changes — current grid breakpoints (`sm:grid-cols-3`, `md:grid-cols-2`) are correct. The icon additions and KPI prominence changes use flex/inline layout that stacks naturally.

---

## Not touched

- Block 1, P03, P05, P06, P07
- `caption-intelligence.ts` (no type or logic changes needed)
- Backend, auth, admin, PDF, global tokens, locked files
- No "Leitura IA" / "Leitura editorial" labels in active UI

## Validation

- `bunx tsc --noEmit`
- `bunx vitest run`
