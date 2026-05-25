## Goal
Remove Pro / Agency / "Em breve" copy from authenticated app surfaces so they match the simplified pricing model (€7 single / €28 pack, no subscription).

## Files touched
- `src/routes/app.plan.tsx` — replace with a redirect to `/precos`
- `src/components/app/pro-tracking-teaser.tsx` — neutral copy + remove plan CTA
- `src/routes/app.account.tsx` — replace `planLabels` with a single "Conta ativa" status
- `src/lib/brand/contact.ts` — add `mailtoProfessionalAccess`; deprecate `mailtoPro`/`mailtoAgency` as thin aliases

Not touched (per scope): `post-analysis-conversion-layer.tsx`, public report sidebar, premium modal, `/precos`, feedback/email templates, subscriptions/checkout, RLS, providers.

## Changes

### 1. `src/routes/app.plan.tsx`
Rewrite as a thin redirect using `beforeLoad`:
```ts
import { createFileRoute, redirect } from "@tanstack/react-router";
export const Route = createFileRoute("/app/plan")({
  beforeLoad: () => { throw redirect({ to: "/precos" }); },
});
```
Removes all Pro/Agency tiers, manifesto card, Supabase profile fetch, and "Em breve" badges in one shot. Any deep link or stale bookmark to `/app/plan` lands on `/precos` (which holds the canonical €7/€28 copy).

### 2. `src/components/app/pro-tracking-teaser.tsx`
- Remove the violet "PRO" pill, the `<Lock>` "Disponível em breve" overlay, and the "Saber mais sobre os planos →" `Link` to `/app/plan`.
- Header label changes from "Tracking diário" to neutral "Acompanhamento recorrente".
- Replace the body paragraph with the supplied neutral copy:
  - PT: "Acompanhamento recorrente ficará disponível numa fase futura."
  - EN: "Recurring tracking will be available in a future phase."
- Component currently has no i18n wiring (hardcoded PT). Add `useTranslation("app")` and use `app.tracking_teaser.title` / `app.tracking_teaser.note` keys (added to both `pt/app.json` and `en/app.json`). If `app` namespace does not exist, fall back to hardcoded PT only and note it — quick check during implementation will confirm. The mini-chart visual stays as a non-interactive placeholder with a neutral inline label instead of the "Em breve" pill.
- Drop the `Link`, `to="/app/plan"` import.

### 3. `src/routes/app.account.tsx`
- Delete `planLabels` constant.
- Change the rendered block from `{planLabels[account.plan] ?? account.plan}` to a fixed string:
  - PT: "Conta ativa"
- The page is currently hardcoded PT; keep that pattern.
- Keep the `plan` field in `AccountData` (DB still has it) — just don't render its value.
- Optionally relabel the field caption from "Plano" to "Estado da conta".

### 4. `src/lib/brand/contact.ts`
- Add new generic helper:
  ```ts
  export function mailtoProfessionalAccess(email: string): string {
    const subject = encodeURIComponent("Acesso profissional — InstaBench");
    const body = encodeURIComponent("Gostaria de saber mais sobre acesso profissional ao InstaBench.");
    return `mailto:${email}?subject=${subject}&body=${body}`;
  }
  ```
- Mark `mailtoPro` and `mailtoAgency` as `@deprecated` with a JSDoc note pointing to `mailtoProfessionalAccess`, and have them delegate internally:
  ```ts
  /** @deprecated Use mailtoProfessionalAccess. */
  export const mailtoPro = mailtoProfessionalAccess;
  /** @deprecated Use mailtoProfessionalAccess. */
  export const mailtoAgency = mailtoProfessionalAccess;
  ```
- This avoids touching `post-analysis-conversion-layer.tsx` (out of scope) while ensuring both CTAs already in the wild now open the same generic subject line.

## Validation
- `bunx tsc --noEmit`
- `bunx vitest run`
- `rg -n "\\bPro\\b|\\bAgency\\b|plano mensal|monthly plan|subscription|subscrição|€3|€13" src/` and classify residuals.

### Expected residual matches (acceptable, to be reported back, not removed in this prompt)
- `src/components/product/post-analysis-conversion-layer.tsx` — Pro/Agency tier cards (out-of-scope public marketing component; flagged as obsolete, to be addressed in a follow-up prompt).
- `src/lib/feedback/feedback-schema.ts`, `src/lib/email/templates/commercial-followup.ts`, related tests — already identified P0s, explicitly excluded by user scope.
- `src/lib/admin/mock-data.ts`, `src/lib/__tests__/unlock-flow.test.ts`, `gate.json` — internal/admin/tests; not user-facing.
- `src/i18n/locales/*/report.json` premium copy keys (e.g. `premium.*`) — segmentation labels, not pricing.
- `mailtoPro` / `mailtoAgency` symbol names in `contact.ts` — kept as deprecated aliases for back-compat.

## Out of scope (will be separate prompts)
- `post-analysis-conversion-layer.tsx` (Pro/Agency cards in public analysis dashboard)
- Feedback form options €3/€13
- Commercial follow-up email templates with €3/€13
- Brand contact helpers being fully removed