## Plan: Refine Sticky Unlock Bar Copy

### Scope
Update two strings in `src/components/report-redesign/v2/sticky-unlock-bar.tsx` to accurately reflect all 5 locked premium sections. No logic, pricing, checkout, entitlements, or trigger behaviour changes.

### Changes

**1. Desktop subcopy (line 124)**
Before: `frequência, formatos, publicações-chave e prioridades`
After:  `frequência, formatos, publicações-chave, diagnóstico e prioridades`

**2. Mobile CTA label (line 194)**
Before: `Ver tudo`
After:  `Desbloquear`

### Invariants preserved
- Title strings remain unchanged.
- `priceLabel` stays dynamic from `PUBLIC_PRODUCTS.report_full_9.priceLabel`.
- `handleUnlock` still routes through `usePremiumCta()` with source `sticky_unlock_bar`.
- `useStickyUnlockTrigger()` logic untouched.
- No component API or prop changes.
- No pricing, checkout, EuPago, entitlement, report-gating, or payment logic changed.

### Validation
1. Desktop sticky bar names all 5 key premium areas (frequência, formatos, publicações-chave, diagnóstico, prioridades).
2. Mobile copy remains compact (single-line title + price subcopy).
3. Price remains dynamic via existing `priceLabel`.
4. CTA still opens existing unlock modal via `handlePremiumAccessClick`.
5. No logic changed — purely copy edits.

### File
- `src/components/report-redesign/v2/sticky-unlock-bar.tsx` (2 line replacements)