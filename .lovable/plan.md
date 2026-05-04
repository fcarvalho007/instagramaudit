
# Refine Engagement Rate Card — Layout / Spacing

**File:** `src/components/report-redesign/v2/report-overview-engagement.tsx`

**Scope:** Only the 3-column hero row (lines 62-139). No other files or components changed.

## Changes

1. **Column proportions:** Change `grid-cols-3` to weighted columns (`grid-cols-[2fr_1.5fr_1.5fr]` on `sm+`) so the profile rate column gets more room for the large number, and the gap column doesn't overflow.

2. **Column 3 label:** Shorten from "Diferença percentual: Perfil VS Média perfis" to just "Gap" — consistent with the other card variant in `report-overview-cards.tsx`.

3. **Remove `~` prefix:** The tilde before the gap number adds noise without value.

4. **Simplify subtitle:** Change the redundant "98% abaixo da média · gap ~−4,12 pontos percentuais" to just "X% abaixo/acima da média" — the gap is already shown in the number.

5. **Consistent vertical alignment:** Ensure all 3 columns use the same vertical padding and `items-start` alignment for clean top-alignment.
