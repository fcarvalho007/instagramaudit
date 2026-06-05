## Unify pricing/premium CTA destinations

Routing is already correct everywhere — only label strings and one minor route detail need fixing. Most of the destination map was wired in previous turns.

### Current state (audit)

| Surface | Destination | Status |
|---|---|---|
| Landing teaser free | `#hero` smooth scroll | ✅ |
| Landing teaser 9€ | `/checkout/report-full?source=landing_pricing_teaser` | ✅ |
| Landing teaser 97€ | `/checkout/authority-diagnosis?source=landing_pricing_teaser` | ✅ |
| Pricing page free | `navigate({ to: "/" })` | ⚠ no `#hero` hash |
| Pricing page 9€ | `/checkout/report-full` | ✅ |
| Pricing page 97€ | `/checkout/authority-diagnosis` | ✅ |
| PremiumInterestDialog free | closes dialog | ✅ |
| PremiumInterestDialog 9€ | `/checkout/report-full` | ✅ |
| PremiumInterestDialog 97€ | `/checkout/authority-diagnosis` | ✅ |
| Services CTA in dialog | `/servicos` | ✅ |

No remaining `/precos` paid redirects, no EuPago direct calls from `/precos`, no `PricingInterestModal` usage. Payment creation already happens only inside checkout final steps.

### CTA label changes

| File | Locale | Before | After |
|---|---|---|---|
| `src/i18n/locales/pt/landing.json` | `dark.pricing.single.cta` | "Desbloquear" | "Obter relatório completo" |
| `src/i18n/locales/pt/landing.json` | `dark.pricing.diagnosis.cta` | "Reservar" | "Reservar diagnóstico" |
| `src/i18n/locales/en/landing.json` | `dark.pricing.single.cta` | "Unlock" | "Get full report" |
| `src/i18n/locales/en/landing.json` | `dark.pricing.diagnosis.cta` | "Book" | "Reserve diagnosis" |
| `src/i18n/locales/pt/report.json` | `premium.dialog.free.cta` | "Continuar grátis" | "Começar grátis" |
| `src/i18n/locales/pt/report.json` | `premium.dialog.single.cta` | "Desbloquear relatório" | "Obter relatório completo" |
| `src/i18n/locales/en/report.json` | `premium.dialog.free.cta` | "Keep it free" | "Start free" |
| `src/i18n/locales/en/report.json` | `premium.dialog.single.cta` | "Unlock report" | "Get full report" |
| `src/components/pricing/pricing-page.tsx` | free button | "Continuar grátis" | "Começar grátis" |
| `src/components/pricing/pricing-page.tsx` | 9€ button | "Desbloquear relatório" | "Obter relatório completo" |

Landing teaser `dark.pricing.free.cta` ("Começar grátis" / "Start free") and pricing page 97€ ("Reservar diagnóstico") already match — no change.

### Route detail

`src/components/pricing/pricing-page.tsx`: free button `navigate({ to: "/" })` → `navigate({ to: "/", hash: "hero" })` so it lands on the hero input.

### Tracking

Already in place:
- Pricing page tracks `pricing_option_clicked` with `pricing_option = free | report_full_9 | authority_diagnosis_97`.
- PremiumInterestDialog tracks `payment_cta_clicked` with `product_code = report_full_9` (9€) and `product_code = authority_diagnosis_97` (97€), preserving `source_component`.

Landing teaser currently has no tracking. Out of scope unless asked — adding it would require wiring an analytics call per tier; nothing in the brief specifies the event name and the existing tiers go through anchor `<a href>`, not buttons. Will skip to keep the diff minimal.

### Files changed

1. `src/i18n/locales/pt/landing.json`
2. `src/i18n/locales/en/landing.json`
3. `src/i18n/locales/pt/report.json`
4. `src/i18n/locales/en/report.json`
5. `src/components/pricing/pricing-page.tsx`

### Validation

`bunx tsc --noEmit` after edits. JSON-only + one component, very low risk.
