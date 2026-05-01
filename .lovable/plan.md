
## Overview

Refine Block 02 visual hierarchy across 3 files. No diagnostic logic changes.

## 1. Editorial Verdict Hero (`report-diagnostic-verdict.tsx`)

Current: `text-[16px] md:text-[17px]`, padding `px-6 py-5 md:px-7 md:py-6`, subtle gradient, thin left border.

Changes:
- Increase text to `text-[18px] md:text-[20px]` with `leading-[1.6]`
- Increase padding to `px-7 py-6 md:px-8 md:py-7`
- Strengthen gradient: deeper blue start (`#E8F0FE` to `#F5F8FF`)
- Widen left accent border from `5px` to `6px`
- Add stronger shadow: `shadow-[0_2px_6px_rgba(37,99,217,0.06),0_8px_24px_-12px_rgba(37,99,217,0.10)]`
- Enlarge Bot icon box from `h-9 w-9` to `h-10 w-10`, icon from `size-[18px]` to `size-5`

## 2. Group Labels (`report-diagnostic-group.tsx`)

Current: `text-[11px]`, `pt-6 md:pt-8`, thin border-b.

Changes:
- Increase top spacing to `pt-8 md:pt-10` (stronger separation)
- Increase label to `text-[12px]`
- Letter gets a faint circular background pill (`size-5 rounded-full bg-slate-100 inline-flex items-center justify-center`)
- Bottom border stays but shifts to `border-slate-200/60` (subtler)
- Bottom padding increases to `pb-4`

## 3. Diagnostic Card Refinements (`report-diagnostic-card.tsx`)

### 3a. Remove redundant answer labels
The `answerLabel` prop renders labels like "Resposta dominante", "Fase dominante" above the large answer. These are redundant when the answer itself is self-explanatory.

Changes:
- Keep `answerLabel` prop for accessibility (`aria-label` on the answer box)
- Stop rendering `answerLabel` as visible text — remove the `<p>` element
- Callers don't need to change (prop is still accepted, just used for a11y)

### 3b. Distribution bars dominant highlight
In `DiagnosticDistributionBar` (vertical-list variant), current bars use `opacity-30` on non-first items but the dominant bar has no special emphasis.

Changes:
- First bar: full opacity + slightly taller (`h-2.5` instead of `h-2`)
- Non-first bars: `opacity-25` (slightly more faded)
- First bar label: `font-medium`

### 3c. Audience icon already implemented
The `DiagnosticAudienceHighlight` already has status-based icons (MessageCircleOff for silent/rose, MessagesSquare for active/emerald, MessageCircleMore for moderate/amber, Target for concentrated/amber). The comment about public payload not showing brand replies is already on line 488. No changes needed here.

## Files changed
- `src/components/report-redesign/v2/report-diagnostic-verdict.tsx`
- `src/components/report-redesign/v2/report-diagnostic-group.tsx`
- `src/components/report-redesign/v2/report-diagnostic-card.tsx`

## What does NOT change
- Diagnostic logic, classifiers, calculations
- `report-diagnostic-block.tsx` (orchestrator — no edits)
- OpenAI schema, Supabase, providers, PDF, admin, auth
- No locked files edited
