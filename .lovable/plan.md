## Plan

### Task 1 — Step 4 Payment Button Icon
File: `src/routes/checkout.report-full.tsx`
- In the `lucide-react` import, add `Lock` alongside existing icons.
- Inside Step 4's `CheckoutPrimaryButton`, replace `<ArrowRight className="size-4" />` with `<Lock className="size-4" />` in the non-submitting state.
- Keep text "Confirmar e pagar", keep `CheckoutPrimaryButton`, keep handler.

### Task 2 — MissingLeadSession Primary CTA
File: `src/components/checkout/missing-lead-session.tsx`
- Import `CheckoutPrimaryButton` from `@/components/checkout/checkout-primary-button`.
- Replace the `<Button variant="primary" ...>` primary CTA with `<CheckoutPrimaryButton ...>`.
- Keep the same `onClick` navigation, label, and `ArrowRight` icon.
- The ghost "Analisar perfil" button stays unchanged.

### Out of scope
No changes to pricing, EuPago request, metadata, schema, credits, entitlements, product config, or any global button variant.