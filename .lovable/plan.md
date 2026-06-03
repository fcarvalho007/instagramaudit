## Goal

Fix the two smoke-test blockers on `/checkout/authority-diagnosis`:

1. The route renders all 4 steps even without a `lead_session`, then only fails at the final payment server fn.
2. The focused checkout still shows the global marketing header + footer.

No changes to pricing, EuPago helper, webhook, product codes, schemas, onboarding, report logic, providers, admin, or homepage.

## Changes

### 1. Hide global chrome on `/checkout/*`

File: `src/components/layout/app-shell.tsx`

Add `"/checkout"` to `PUBLIC_CHROME_DISABLED_PREFIXES` so the marketing `Header` and `Footer` are skipped for any `/checkout/*` URL. The existing `CheckoutShell` (logo, progress, secure-payment note, container) already provides the focused chrome.

Effect: `/checkout/authority-diagnosis` renders inside `CheckoutShell` only. Homepage, `/precos`, `/analyze/*`, and every other public route keep their current layouts (only `/admin` and `/checkout` are stripped).

### 2. Lead-session guard

New tiny server fn that reports whether the current request carries a valid `lead_session` cookie. No auth middleware (the cookie is HttpOnly so the client cannot read it directly; the fn just inspects it server-side). No DB call — pure cookie decode using the existing `getLeadFromCookie` helper.

File: `src/lib/leads/lead-session.functions.ts` (new)

```ts
import { createServerFn } from "@tanstack/react-start";

export const getLeadSessionStatus = createServerFn({ method: "GET" }).handler(
  async () => {
    const { getLeadFromCookie } = await import("./lead-cookie.server");
    return { hasLead: getLeadFromCookie() !== null };
  },
);
```

File: `src/routes/checkout.authority-diagnosis.tsx`

- Add a route `loader` that calls `getLeadSessionStatus` via `context.queryClient.ensureQueryData` with `queryOptions` (TanStack Query is already wired). Read it in the component via `useSuspenseQuery`.
- If `hasLead === false`, render a focused message inside the existing `<div>` shell instead of the step flow:

  Heading (Fraunces): "Para reservar o diagnóstico, começa por criar a tua conta gratuita."
  Body (Inter, secondary): short one-liner explaining the next step.
  Primary CTA: "Voltar aos preços" → `navigate({ to: "/precos" })`.
  Secondary CTA: "Analisar perfil" → `navigate({ to: "/" })` (the analyze entry point is the homepage hero).

- If `hasLead === true`, render the existing 4-step `CheckoutFlow` unchanged.

- Keep `errorComponent` / `notFoundComponent` minimal (consistent with other routes) so a failed status check doesn't blank the page; on error, fall back to showing the same "missing session" CTA.

The server-side `createEupagoCheckout` lead-session check is untouched — it stays as the authoritative backstop.

### 3. Preserved

- Step 1 → 4 flow, copy, tracking events, metadata sent to `createEupagoCheckout`.
- `CheckoutShell`, `StepProgress`, `OfferCard`, `QualificationForm`, `UpsellInterest`, `BillingForm`, `OrderSummary`.
- All payment / webhook / provider code.

## Files changed

- `src/components/layout/app-shell.tsx` — add `/checkout` to the chrome-disabled prefix list.
- `src/lib/leads/lead-session.functions.ts` — new server fn `getLeadSessionStatus`.
- `src/routes/checkout.authority-diagnosis.tsx` — loader + suspense query, gated render with focused "missing session" view.

## How the guard works

1. Browser hits `/checkout/authority-diagnosis`.
2. Route loader calls `getLeadSessionStatus` server fn.
3. Server fn reads + HMAC-verifies the `lead_session` cookie via `getLeadFromCookie()`.
4. Component reads `{ hasLead }` with `useSuspenseQuery`:
   - `true` → render the 4-step checkout.
   - `false` → render the focused "criar conta gratuita" message with `Voltar aos preços` / `Analisar perfil` CTAs.
5. `createEupagoCheckout` keeps its own lead-session check, so even a forged client cannot reach payment.

## How the layout is isolated

`AppShell` already has a chrome-skip path for `/admin`. Adding `/checkout` to the same prefix list means any `/checkout/*` URL bypasses `Header` + `Footer` + `DarkFooter` and renders the children straight, where `routes/checkout.tsx` wraps them in `CheckoutShell` (logo + progress + secure note). No other route is affected.

## Validation

- `bunx tsc --noEmit`.
- Manual:
  - Visit `/checkout/authority-diagnosis` with no cookie → focused message, no step UI, no global header/footer.
  - Visit with a valid lead session → 4 steps render, header/footer absent.
  - `/`, `/precos`, `/analyze/<u>` keep their current layouts.
  - No payment is created (we stop before the final CTA).

## Risks

- If `SESSION_SECRET` is missing in the runtime env, `getLeadFromCookie` throws; the loader's `errorComponent` fallback must show the same "missing session" CTA, not a crash.
- The cookie is set with `SameSite=None; Secure; Partitioned`. In sandboxed previews where cookies are blocked, every visit will look like "no lead session". This is correct behaviour but worth flagging during smoke tests.
