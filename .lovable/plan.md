## Remaining deltas vs current state

Prior turn already shipped: step-3 title/subtitle, "Auditoria Digital completa" / "Workshop para equipa" titles, descriptions, and the four metadata keys (`audit_interest`, `workshop_interest`, `audit_interest_context`, `workshop_interest_context`).

Still to change in `src/components/checkout/upsell-interest.tsx`:

1. **Move price into a microcopy line** under each card description, replacing the right-aligned `priceHint` chip. Spec now wants the audit microcopy to include 499€ (reversing the previous "no 499 in checkout" call — this is the user's explicit new instruction).
   - Card 1 microcopy: "Serviço sob proposta, com planos desde 499€ + IVA."
   - Card 2 microcopy: "Sob proposta, conforme objectivos e duração."
   - Drop the `priceHint` prop entirely.

2. **Per-card checkbox label**:
   - Card 1: "Tenho interesse numa auditoria"
   - Card 2: "Tenho interesse num workshop"
   - Replaces the shared "Tenho interesse, contactem-me".

Implementation: add `microcopy` and `checkboxLabel` props to `InterestCard`, render microcopy as a `text-xs text-content-tertiary` line below the description, drop the `priceHint` span from the header row.

## Untouched

- `checkout.authority-diagnosis.tsx` — payload, metadata, tracking, total, EuPago call.
- `eupago.functions.ts` — zod schema already supports the four metadata keys.
- `/checkout/report-full`, webhook, product codes, pricing values, report generation, onboarding, credits, admin backend.

## Validation

- `bunx tsc --noEmit`
- Grep `src/components/checkout/upsell-interest.tsx` for "300" → must be empty.

## Files changed

- `src/components/checkout/upsell-interest.tsx` (only)