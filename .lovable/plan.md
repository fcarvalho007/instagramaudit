## Goal

Refine the existing paid/pro sidebar confirmation dialog to match the new spec (titles, copy, CTAs, balance line, empty state) and rename tracking events to the `beta_credit_used_*` family. Backend consumption is **not** wired here — UI confirmation only, because the period/competitor data-fetch orchestrators don't yet accept a credit reservation. This is reported as remaining work.

## What's already in place (no changes needed)

- `ConsumeCreditDialog` component (`src/components/report-redesign/v2/consume-credit-dialog.tsx`)
- Sidebar paid/free branching in `report-block-nav.tsx`: free → `PremiumInterestDialog`, paid → `ConsumeCreditDialog`
- Balance loading via `getMyCreditBalance` server fn (lead-cookie scoped, only fetched when `premiumUnlocked`)
- Subtle balance line under the explore section ("{n} créditos beta disponíveis" / "0 créditos disponíveis")
- Free-user pricing modal flow stays untouched

## What changes

### 1. Dialog copy + i18n (`src/i18n/locales/{pt,en}/report.json`)

Update keys under `nav.explore.consume_dialog`:

| Key | New PT value |
|---|---|
| `title_period` (new) | "Gerar nova análise?" |
| `title_competitor` (new) | "Adicionar concorrente à comparação?" |
| `description_period` | "Para analisar este perfil noutro período, o AuditProfiles precisa de recolher e processar novos dados públicos do Instagram." |
| `description_competitor` | "Vamos recolher e processar os dados públicos deste perfil para comparar com a análise actual." |
| `credit_line` (new) | "Esta operação usa 1 crédito." |
| `balance_hint` (new) | "Tens {{count}} créditos beta disponíveis." (singular/plural) |
| `cta_use_period` (new) | "Usar 1 crédito e gerar análise" |
| `cta_use_competitor` (new) | "Usar 1 crédito e adicionar concorrente" |
| `empty_body` | "Neste momento não tens créditos disponíveis." |
| `empty_cta` | "Pedir mais créditos" |

Keep `cta_cancel`, `balance_label`, `balance_after`, `soon_note`. EN mirrors PT.

### 2. `ConsumeCreditDialog` component

- Title resolves by `intent.kind` (`title_period` vs `title_competitor`).
- Body renders: description → `credit_line` → `balance_hint` (only when `balance >= 1`).
- Confirm CTA label resolves by intent kind.
- Empty state: replace body with `empty_body`, primary CTA `empty_cta` ("Pedir mais créditos") — keeps current `onEmptyFeedback` callback (mailto / feedback handler stays as is; no new purchase flow).
- Keep the existing `balance_label` / `balance_after` mini-panel (educational, premium feel).

### 3. Tracking events (`report-block-nav.tsx` `ExploreSection`)

- `credit_consume_dialog_opened` → keep on open (no behavior change).
- On confirm, rename `credit_consume_confirmed` → emit one of:
  - `beta_credit_used_period` (metadata: `{ days }`)
  - `beta_credit_used_competitor`
  - plus generic `beta_credit_used` with `{ action_type: "period" | "competitor", days? }` for downstream aggregation.

No real credit is consumed (see §4).

### 4. Backend consumption — explicitly NOT wired

Existing `reserveCredit` / `confirmReservation` / `releaseReservation` exist but are tied to the initial-analysis orchestrator (`uniq_credit_ledger_reserve_per_report` per `cache_key`). There is no server fn today that:

- runs a new period analysis for an unlocked report, or
- queues a competitor fetch tied to an existing report.

Faking consumption would desynchronise the ledger. So this step:

- Opens the modal.
- On confirm, fires the tracking event and closes the dialog.
- Does **not** call `reserveCredit`.
- Does **not** trigger any data fetch.

Remaining backend work (separate prompt, requires approval):

1. Server fn `requestPeriodAnalysis({ days })` that `reserveCredit` + enqueues fetch + on success `confirmReservation`, on failure `releaseReservation`.
2. Server fn `requestCompetitorAdd({ handle })` with same lifecycle.
3. Wire success → invalidate `getMyCreditBalance` query in sidebar.
4. Surface in-progress / failure states in the sidebar.

## Files likely edited

- `src/components/report-redesign/v2/consume-credit-dialog.tsx` (copy/title/CTA per intent, balance hint line)
- `src/components/report-redesign/v2/report-block-nav.tsx` (event names only)
- `src/i18n/locales/pt/report.json`
- `src/i18n/locales/en/report.json`

## Untouched

Product price, checkout, EuPago, entitlement logic, report calculations, scraping, DB schema, free unlock modal, `PremiumInterestDialog`, `credits.server.ts`, `credits.functions.ts`.

## Risks & safeguards

- **Risk**: a future reader assumes the confirm button actually spends a credit. **Mitigation**: keep the existing code comment ("consumo real fica como follow-up") and surface remaining backend work in the response.
- **Risk**: empty-state CTA "Pedir mais créditos" implies a purchase flow. **Mitigation**: reuse existing `onEmptyFeedback` (mailto/feedback) and label it explicitly; no new store created.
- **Risk**: i18n key renames break unrelated callers. **Mitigation**: add new keys side-by-side; remove old `title` / `cta_use` only after grepping for orphan refs.

## Manual validation checklist

1. Paid user clicks 30d → dialog title "Gerar nova análise?", body shows period copy + "Esta operação usa 1 crédito." + "Tens N créditos beta disponíveis." (when N≥1), CTA "Usar 1 crédito e gerar análise".
2. Paid user clicks 90d → same dialog, days substituted in any dynamic copy.
3. Paid user clicks Add competitor → title "Adicionar concorrente à comparação?", competitor copy, CTA "Usar 1 crédito e adicionar concorrente".
4. Paid user with 0 credits → empty title, body "Neste momento não tens créditos disponíveis.", CTA "Pedir mais créditos".
5. Confirm fires `beta_credit_used_period|competitor` + generic event, closes dialog, does NOT trigger fetch (verified: balance unchanged).
6. Cancel closes dialog with no event side-effects beyond `dialog_opened`.
7. Free user clicks 30d / 90d / Add competitor → still opens `PremiumInterestDialog` (pricing), not the credit dialog.
8. Sidebar balance line still reads "{n} créditos beta disponíveis" or "0 créditos disponíveis".
9. EN locale renders parallel copy.

Approve to implement, or ask for changes (e.g. wire real consumption now, different empty-state CTA, etc.).