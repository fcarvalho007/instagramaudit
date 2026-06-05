## Current Checkout Copy Audit (`/checkout/authority-diagnosis`, step 3)

**Step header** (in `checkout.authority-diagnosis.tsx`, lines 287–293):
- Title: "Queres ir além do Instagram?" ✓ already matches desired
- Subtitle: "Marca os temas que te interessam — falamos depois, sem compromisso."

**Cards** (in `upsell-interest.tsx`):
- Intro line: "Estes serviços não são cobrados agora. É apenas um sinal de interesse — entramos em contacto se fizer sentido."
- Card 1 — "Auditoria Digital completa" / "desde 499€ + IVA" / "Website, Google, concorrência, conteúdo, reputação, email e redes sociais."
- Card 2 — "Workshop para equipa" / "sob proposta" / "Sessão prática para transformar dados em decisões, calendário editorial e processos de marketing."

**State + persistence** (in `eupago.functions.ts`):
- Client passes `upsell_interest: { audit, workshop }` to `createEupagoCheckout`.
- Server stores it under `lead_payments.metadata.upsell_interest` (line 217).
- Tracking event `checkout_upsell_interest` is fired only if at least one is checked, with metadata `{ audit, workshop }`.

## Recommendation: 499€ vs "sob proposta"

Use **"Serviço sob proposta"** for the audit card inside the 97€ checkout. Reasons:
- The user is mid-purchase of a 97€ product; surfacing "499€ + IVA" introduces sticker shock and competes with the current conversion.
- A vague price keeps it a true interest signal, not a price comparison.
- Keeps `/precos` (which already shows "Planos desde 499€ + IVA") as the single public price anchor for the audit.

The workshop card stays "Sob proposta" (already correct).

## Final Copy

**Step 3 header**
- Title: "Queres ir além do Instagram?" (unchanged)
- Subtitle (NEW): "Se fizer sentido, podemos transformar este diagnóstico numa auditoria mais completa ou numa sessão para a tua equipa."

**Intro line above cards** (kept, slightly trimmed):
"Estes serviços não são cobrados agora. É apenas um sinal de interesse — entramos em contacto se fizer sentido."

**Card 1 — Auditoria Digital completa**
- Title: "Auditoria Digital completa"
- Price hint: "Serviço sob proposta"
- Description: "Website, Google, concorrência, conteúdo, reputação, email e redes sociais."

**Card 2 — Workshop para equipa**
- Title: "Workshop para equipa"
- Price hint: "Sob proposta"
- Description: "Sessão prática para transformar dados em plano editorial, decisões e processos."

## Files Likely to Change

1. `src/routes/checkout.authority-diagnosis.tsx` — update the step 3 subtitle (line 290–293); update the payload passed to `createEupagoCheckout` to include the new context keys; enrich `checkout_upsell_interest` tracking metadata.
2. `src/components/checkout/upsell-interest.tsx` — change card 1 priceHint from "desde 499€ + IVA" → "Serviço sob proposta"; tighten card 2 description to match the new wording.

No server-side changes needed: `eupago.functions.ts` already persists the full `upsell_interest` object verbatim under `metadata.upsell_interest`, so any extra keys we add client-side flow through automatically.

## Metadata Plan

Extend the client-side `UpsellValue` from `{ audit, workshop }` to:

```ts
{
  audit: boolean,
  workshop: boolean,
  audit_interest: boolean,            // mirror of audit (named per spec)
  workshop_interest: boolean,         // mirror of workshop (named per spec)
  audit_interest_context: "full_digital_audit" | null,
  workshop_interest_context: "team_workshop" | null,
}
```

Resolved on submit (server already stores the object as-is):
- `audit_interest = audit`, `workshop_interest = workshop`
- `audit_interest_context = audit ? "full_digital_audit" : null`
- `workshop_interest_context = workshop ? "team_workshop" : null`

The mirror keys (`audit_interest`, `workshop_interest`) are added to match the spec's metadata names without breaking existing readers of `audit` / `workshop`.

The same enriched object is sent in the `checkout_upsell_interest` tracking event metadata.

## Rules Preserved

- Step is optional — both checkboxes default false, "Continuar" works unchecked.
- Selecting a card does not change `OrderSummary` (no amount math touches `upsell`).
- No EuPago call is made for audit/workshop — they are pure metadata flags on the 97€ payment row.
- Product code remains `authority_diagnosis_97`, amount unchanged.

## Validation

- `bunx tsc --noEmit`
- Manual: render step 3, confirm both cards say "Serviço sob proposta" / "Sob proposta", confirm no "499" string in the checkout flow.
- After a checkout attempt with both boxes checked, confirm `lead_payments.metadata.upsell_interest` contains the four new keys.

## Out of Scope

Checkout amount, EuPago flow, webhook, product codes, payments table schema, onboarding, report generation, admin backend.