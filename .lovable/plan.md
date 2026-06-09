## Status

The previous turn already shipped the checkout-aware OnboardingModal (`purpose="checkout"`), removed the phone field from the UI for all flows, added the required qualification step, wired the OTP path through `claim-existing`, and updated `CheckoutAccountGate`. Query params are already preserved (the gate never navigates; only invalidates `["checkout","lead-session"]`).

What's left is **copy alignment with the spec** (a handful of strings still read like the old "free report" flow or don't match the literal wording you asked for) and **QA tests**.

## 1. Copy fixes (PT + mirror in EN)

`src/i18n/locales/pt/gate.json` (and the equivalent keys in `en/gate.json`):

| Key | Now | Change to |
| --- | --- | --- |
| `onboarding.entry.titleCheckout` | "Cria a tua conta para continuar" | **"Continua para o checkout"** |
| `onboarding.entry.subtitleCheckout` | "Em ~30 segundos. Usamos o teu email…" | **"Indica o teu email para associarmos a compra à tua conta."** |
| `onboarding.final.left.bullets.reportCheckout` | "Conta privada onde guardamos a tua compra e os relatórios" | **"A tua compra fica associada à tua conta"** |
| `onboarding.final.right.footnoteCheckout` | "Sem subscrição. RGPD." | **"RGPD · sem spam"** |

All other checkout strings already match (`ANTES DE PAGAR`, `Só faltam alguns dados`, the three remaining bullets, `Criar conta e continuar`, OTP `Confirma o acesso à tua conta` / `Confirmar e continuar`, trust line `Sem subscrição. Sem cobrança automática. RGPD.`).

No component code edits needed for the copy pass — the components already branch on `purpose === "checkout"` and read the `*Checkout` keys.

## 2. Phone field

Already removed from the UI (`FinalStepBody` does not render it). The backend `start.ts` and `unlock-flow.ts` keep `phone` as `optional()` for backwards compatibility — leave as-is (out of scope: "Do not modify payment products / EuPago / credit grants").

## 3. Tests to add

New file `src/components/checkout/__tests__/checkout-account-gate.test.tsx`:

1. Renders `OnboardingModal` with `purpose="checkout"` when no session.
2. Entry step does NOT contain "Criar conta grátis", "2 créditos grátis", "Gerar o meu relatório".
3. Entry step shows "ANTES DE PAGAR", "Continua para o checkout", "Continuar" CTA.
4. After `onSuccess`, `queryClient.invalidateQueries({ queryKey: ["checkout","lead-session"] })` is called before `onSignedIn`.

Extend `src/components/onboarding/__tests__/` (or add new `onboarding-modal.checkout.test.tsx`):

5. `purpose="checkout"` Final step does NOT render any input with `name="phone"` or label "Telemóvel".
6. `purpose="checkout"` Final step requires `qualification` (submit blocked until a value is picked).
7. `purpose="checkout"` Final left panel renders the four checkout bullets and no "2 créditos grátis".
8. OTP panel in checkout mode shows "Confirma o acesso à tua conta" / "Confirmar e continuar".

Routing test (lightweight) in `src/routes/__tests__/checkout.credits.test.tsx` (or extend existing): when `getLeadSessionStatus` resolves `{ hasLead: false }`, the gate is rendered (not `MissingLeadSession`).

Query-param preservation is covered by inspection: the gate never calls `navigate`; assert in the gate test that `useNavigate` is only invoked from the "Voltar" button.

## 4. Manual QA checklist (post-merge)

- `/precos` → click pack CTA with no session → checkout email step renders the new copy, no free-report wording.
- New email → qualification → final form (no phone field, qualification required) → OTP → returns to `CheckoutSteps` with `?source=&pack=&coupon=` intact.
- Existing email → OTP directly → "Confirma o acesso à tua conta" → checkout steps.
- With active `lead_session` cookie, `/checkout/credits` skips the gate entirely.

## Files changed

- `src/i18n/locales/pt/gate.json` (4 string updates)
- `src/i18n/locales/en/gate.json` (4 mirrored updates)
- `src/components/checkout/__tests__/checkout-account-gate.test.tsx` (new)
- `src/components/onboarding/__tests__/onboarding-modal.checkout.test.tsx` (new)
- (optional) `src/routes/__tests__/checkout.credits.test.tsx` (extend or create)

## Risks

- Tests depend on i18n init in the test setup; reuse the existing test helper if present (`src/test/setup.ts`), otherwise stub `useTranslation` per test.
- No schema/migration changes; payment/EuPago/credit code untouched.
