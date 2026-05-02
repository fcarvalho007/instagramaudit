
## Typography Consistency Audit — Block 01 + Block 02

### Issues Found

#### 1. "Veredito editorial" is visually exaggerated

The verdict box uses `text-[18px] md:text-[20px] font-medium` — this makes it nearly the same visual weight as card question titles (`text-[1.125rem]–[1.375rem] font-semibold`). Combined with the large blue gradient background, thick left border, and Bot icon, it reads as a **second block heading** rather than an interpretive paragraph.

**Proposed refinement:**
- Reduce text size from `text-[18px] md:text-[20px]` to `text-[15px] md:text-[16px]`
- Change weight from `font-medium` to regular (drop `font-medium`)
- Increase line-height from `leading-[1.6]` to `leading-relaxed` (1.625) for readability at smaller size
- Reduce the icon box from `h-10 w-10` to `h-8 w-8` and icon from `size-5` to `size-4`
- Reduce the border-left from `border-l-[6px]` to `border-l-[4px]`
- Reduce padding from `px-7 py-6 md:px-8 md:py-7` to `px-6 py-5 md:px-7 md:py-6`

Result: the verdict becomes an editorial pull-quote — readable, present, but clearly subordinate to the block heading and card questions.

#### 2. Group heading label inconsistent with eyebrow system

The group label uses `text-[12px] font-semibold tracking-[0.1em] uppercase` — a custom tier between `text-eyebrow` (11px/500) and `text-eyebrow-sm` (10px/500). It should use `text-eyebrow` for consistency since it's a structural separator heading.

**Proposed fix:** Replace inline styles with `text-eyebrow text-slate-500` class in `report-diagnostic-group.tsx`.

#### 3. Card title color inconsistency (slate-900 vs slate-950)

Block 01 card titles use `text-slate-900`. Block 02 diagnostic card questions use `text-slate-950`. These should match.

**Proposed fix:** Align diagnostic card titles to `text-slate-900` (same as Block 01 and Caption Intelligence).

#### 4. Body text size cleanup (four tiers to three)

Current body text uses 4 different sizes: 14px, 13px, 12.5px, 11.5px. This is too many gradations for two blocks.

**Proposed simplification:**
- **Primary body**: `text-sm` (14px) — card body text, editorial reading
- **Secondary body**: `text-[13px]` — chart explanations, descriptions
- **Tertiary/meta**: `text-[12px]` — footnotes, disclaimers, theme descriptions

Instances of `text-[12.5px]` and `text-[11.5px]` should round to `text-[12px]` or `text-[13px]` as appropriate.

This change touches multiple lines across several files. I'll identify each instance and align to the closest tier.

### Files to Change

1. `src/components/report-redesign/v2/report-diagnostic-verdict.tsx` — verdict styling refinement
2. `src/components/report-redesign/v2/report-diagnostic-group.tsx` — group label to use `text-eyebrow`
3. `src/components/report-redesign/v2/report-diagnostic-card.tsx` — title color, body text alignment
4. `src/components/report-redesign/v2/report-overview-cards.tsx` — body text alignment
5. `src/components/report-redesign/v2/report-caption-intelligence.tsx` — body text alignment

### What Will NOT Change

- No calculations, AI logic, data sources, copy content, or backend
- No locked files
- Card structure and layout remain identical
- Block order unchanged
- Desktop/mobile responsive behaviour unchanged
