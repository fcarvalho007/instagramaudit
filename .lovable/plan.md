
## Audit Results

### Component & File
- **`src/components/report-redesign/v2/report-block-section.tsx`** renders all section headers
- **`src/components/report-redesign/v2/block-config.ts`** provides static data: `number`, `shortLabel`, `eyebrowOverride`, `question` (serif headline), `subtitle` (Inter description)
- **`src/components/report-redesign/report-tokens.ts`** defines `chapterNumber`, `chapterLabel`, `chapterSubtitle`, `h2Section` tokens

### Available Data
| Field | Source | Example |
|-------|--------|---------|
| `block.number` | static | "01" |
| `block.eyebrowOverride` / `block.shortLabel` | static | "VISAO GERAL" |
| `block.question` | static | "Como esta o perfil em geral?" |
| `block.subtitle` | static | "Identidade do perfil, indicadores principais..." |

### AI/Payload Summary Available?
**No.** There are no fields like `aiHeroText`, `executiveSummary`, or `summary` in the payload or block config. The component receives no dynamic data -- only `BlockConfig` (static copy). The existing static `question` and `subtitle` already serve the editorial purpose well. No provider calls needed.

---

## Plan

### 1. Update `report-block-section.tsx` layout

**Current:** Number and text sit side-by-side in a flat `flex-row`, number is a transparent stroked outline with no background.

**Target:**
```text
 ┌─────────────────────────────────────────────────┐
 │ ── top border (border-t, subtle) ──────────────── │
 │                                                   │
 │  ┌──────────┐                                     │
 │  │          │  VISAO GERAL                        │
 │  │    01    │  Como esta o perfil em geral?        │
 │  │          │  Identidade do perfil, indicadores...│
 │  └──────────┘                                     │
 │                                                   │
 └───────────────────────────────────────────────────┘
```

Changes:
- Move the border from `border-b` to `border-t` on the header (top border, as required)
- Wrap the number span in a light grey rounded box (`bg-slate-100/80 rounded-xl` with fixed dimensions ~120x100px)
- Reduce number font size slightly so it sits centred in the box
- Keep the text stack (eyebrow, serif headline, Inter subtitle) to the right
- Maintain responsive stacking: on mobile the number box sits above the text

### 2. Update tokens in `report-tokens.ts`

- Add `chapterNumberBox` token for the grey background container
- Adjust `chapterNumber` to reduce size slightly (e.g. `text-[4rem] md:text-[5rem]`) and switch from transparent stroke to a solid light colour (`text-slate-300` or `text-blue-200`)

### 3. No changes needed in `block-config.ts`
The existing static copy is well-written and matches the mockup examples exactly.

---

## Risks
- **Minimal.** Pure CSS/layout change to one component and one token file.
- No data flow changes, no provider calls, no new dependencies.
- The `first` prop logic for reduced top padding is preserved.

## Files to change
1. `src/components/report-redesign/v2/report-block-section.tsx`
2. `src/components/report-redesign/report-tokens.ts`
