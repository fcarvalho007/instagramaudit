## Status

The flow you asked for is already shipped:

- Entry modal with dual paths (new-user card with "Novo por aqui" badge + "Entrar com email" link) — matches screenshot 2.
- Old step 2 (relationship/goal) removed.
- Final 2-column step (navy left, white right) implemented.
- Existing-email security: `/api/onboarding/start` returns `EMAIL_REQUIRES_VERIFICATION`; user is routed to a 6-digit OTP panel (`supabase.auth.signInWithOtp` → `verifyOtp` → `/api/onboarding/claim-existing`).
- Mobile: stacks navy panel above form.

What still doesn't match the attached screenshots is **copy and a few layout details on the final step**. This plan is the minimum to close that gap — no logic changes.

## Changes (final step only)

### `src/i18n/locales/pt/gate.json` — `onboarding.final`

- Left panel
  - `eyebrow`: "VAIS LER O RELATÓRIO DE" → **"ÚLTIMO PASSO"**
  - Replace `handle` / `tagline` with a single editorial headline `title`: **"O teu relatório fica a um clique"**
  - Bullets become:
    - `report`: **"Relatório de @{{handle}}"**
    - `credits`: **"Conta privada com 2 créditos grátis"**
    - `save`: **"Todos os relatórios futuros guardados"**
  - Drop `privacy` bullet (moves to footer micro-copy).
- Right panel
  - Remove `title` ("Últimos detalhes") and `subtitle` — form starts directly with Nome, matching the screenshot.
  - `consentText`: **"Aceito o <a>tratamento de dados</a>"** + `(obrigatório)` chip.
  - `marketingText`: **"Quero dicas e benchmarks"** + `(opcional)` chip.
  - `cta`: "Abrir relatório →" → **"Gerar o meu relatório →"** (já existe em `onboarding.cta.final`, reaproveitar).
  - Add `footnote`: **"RGPD · sem spam"** (mostrado abaixo do CTA).
- Mirror the same keys in `src/i18n/locales/en/gate.json`.

### `src/components/onboarding/onboarding-modal.tsx` — `FinalStepBody`

- Left aside:
  - Render eyebrow "ÚLTIMO PASSO" + display headline "O teu relatório fica a um clique" (Fraunces, 28–32 px).
  - Render 3 bullets in the new order (report / credits / save) with the existing `FinalBullet` (cyan check).
  - Remove the `@handle` block and `tagline` paragraph.
- Right panel:
  - Remove the `DialogHeader` (title + subtitle) so the form starts at Nome.
  - Update consent label markup so the `(obrigatório)` / `(opcional)` text sits inline with the checkbox label exactly as in the screenshot.
  - Add a small footnote under the submit button: `RGPD · sem spam` (text-tertiary, 12 px, centered).
- Keep validation, honeypot, back button, and submit handler untouched.

### Out of scope (explicitly NOT touched)

- Entry modal (`EntryStepBody`) — already matches.
- OTP panel and `/api/onboarding/*` routes.
- Checkout, credits, Free/Pro, competitor, 30d/90d, report sections, admin.
- Auth flows outside the OTP verification already wired.

## Risks

- i18n key removal (`right.title`, `right.subtitle`, `left.handle`, `left.tagline`, `left.bullets.privacy`) — will grep for stragglers before deleting; if referenced elsewhere they stay as deprecated until that consumer is updated.
- No test changes required; existing onboarding tests assert state machine + payload, not copy.

## Deliverables after build

1. Files changed (gate.json PT/EN + onboarding-modal.tsx).
2. Confirmation that no step-2 remnants exist.
3. Note that existing-email verification continues to use the already-shipped OTP path.
4. Mobile stacking unchanged (still navy-on-top).
5. Follow-ups: optional A/B on OTP vs magic link; optional resend-cooldown copy polish.
