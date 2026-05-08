
# Hero Card Visual Polish

Single file: `src/components/report-redesign/v2/report-hero-v2.tsx`

## Changes

### 1. Avatar/Profile block — more breathing room
- Increase avatar from `size-14 md:size-[72px]` → `size-16 md:size-20` (64→80px)
- Increase gap between avatar and text from `gap-5` → `gap-5 lg:gap-6`
- Remove hard `pl-[76px] md:pl-[92px]` on bio/metadata — let them flow naturally under the text column (already handled by flex layout)

### 2. Handle/title refinement
- Handle `h1`: keep Fraunces, bump to `text-2xl sm:text-[1.75rem]`, add `tracking-[-0.025em]`
- fullName subtitle: `text-sm` → `text-[13px]`, `text-content-secondary` stays

### 3. Bio readability
- `text-[13px]` → `text-sm`, `leading-relaxed` → `leading-[1.65]`
- Remove left padding alignment hack — bio sits under full profile text block naturally with `mt-3`

### 4. KPI labels & numbers
- Labels: keep `text-eyebrow-sm`, already small and correct
- Engagement number: `text-[2rem] lg:text-[2.5rem]` → `text-[2.25rem] lg:text-[2.75rem]` — slightly bolder anchor
- Secondary KPIs: `text-xl lg:text-2xl` → `text-2xl lg:text-[1.75rem]` — consistent weight
- Add `tracking-[-0.02em]` to all KPI numbers for tighter numerals

### 5. Dividers → whitespace
- Already no hard dividers. Increase `lg:gap-10` → `lg:gap-14` between zones for more air

### 6. Buttons less dominant
- Export PDF: `h-8` → `h-7`, `text-xs` stays, `bg-accent-primary` → `bg-accent-primary/90` with `hover:bg-accent-primary`
- Share/Novo: `h-8` → `h-7`, lighten border to `border-border-default/60`
- Reduce `gap-2` between buttons → `gap-1.5`

### 7. Card padding
- Outer padding: `px-7 py-7 sm:px-8 sm:py-8 lg:px-10 lg:py-9` → `px-6 py-6 sm:px-8 sm:py-7 lg:px-10 lg:py-10` — more vertical room on desktop

### 8. Mobile stacking
- Mobile actions: same `h-7` buttons, keep horizontal row
- Stack cleanly: profile → KPIs (2-col grid) → actions → footer

### 9. Footer
- Keep as-is, no changes

No data, logic, provider, PDF, or visibility changes.
