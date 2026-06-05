## Status

The previous build turn already implemented almost all of this request. Only one tweak remains.

## Already done (verified just now)

- Section heading: "Quando o diagnóstico precisa de ir mais longe." ✓
- Audit card: title "Auditoria Digital completa", price "Planos desde 499€ + IVA", new description, CTA "Pedir proposta de auditoria", microcopy "Serviço alinhado com os planos oficiais de Auditoria Digital." ✓
- Workshop card: title "Workshop para equipa", price "Sob proposta", new description, CTA "Falar sobre formação", microcopy "Formato ajustado à equipa, objectivos e duração." ✓
- All 300€ / 1.500€ references removed from `pricing-page.tsx`, `services-page.tsx`, and `checkout/upsell-interest.tsx` ✓
- CTAs still link to `/servicos?topico=auditoria|formacao` (no checkout, no payment) ✓
- Main 0€/9€/97€ cards and their checkout routes untouched ✓

## Remaining change

The current subtitle reads:

> "Para marcas e equipas que querem transformar a análise em estratégia e execução."

User wants:

> "Para marcas e equipas que querem transformar a análise em estratégia, plano e execução."

One-line edit in `src/components/pricing/pricing-page.tsx` (the dark services section header).

## Validation

- `bunx tsc --noEmit`
- `grep` confirms no `300€` / `a partir de 300` / `desde 300` / `auditoria social` remain in `src/`.

## Files to change

- `src/components/pricing/pricing-page.tsx` (subtitle only)

## Out of scope

Checkout, EuPago, webhook, product codes, payments, onboarding, report generation, admin backend — all untouched.