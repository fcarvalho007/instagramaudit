# Step 6A — `/admin/email-lab` operational redesign

Goal: reshape Email Lab into a lifecycle control room that mirrors the consolidated email map (Steps 1–5). Pure admin UI + metadata work — no email sending, no trigger code, no schema, no pricing/checkout/credits/report-generation changes.

## Files changed

1. **`src/lib/admin/email-template-registry.ts`** — extend `EmailTemplateEntry` with operational metadata. Backward compatible (current `category`, `wired`, `wiredAt`, `wiredNote` kept).
2. **`src/components/admin/v2/email-lab/email-lab-page.tsx`** — re-group by lifecycle, add status-badge system, filter chips, richer Detail panel and Wiring tab, refined preview frame.

Not changed:
- `src/routes/api/admin/email-templates*` — preview endpoint is fine as-is; we work entirely off the in-process registry render.
- `src/routes/api/admin/send-*` — manual send routes untouched.
- `src/lib/email/templates/*` — template renderers untouched.
- Pricing, checkout, EuPago, credit ledger, report generation, migrations, schema.

## 1) Registry extension — `email-template-registry.ts`

Add new types and per-entry fields. None replace existing fields; the page reads the new ones, the old API stays valid for any other consumer.

```ts
export type EmailLifecycleStage =
  | "captacao"   // CAPTAÇÃO
  | "entrega"    // ENTREGA
  | "retencao"   // RETENÇÃO
  | "conversao"  // CONVERSÃO
  | "pagamento"  // PAGAMENTO
  | "legado";    // LEGADO / DESACTIVADO

export type EmailStatusBadge =
  | "ligado"            // green
  | "manual"            // blue
  | "transaccional"    // navy
  | "kill_switch_off"   // amber
  | "planeado"          // amber
  | "legado"            // grey
  | "sem_trigger"       // amber
  | "desactivado";      // grey

export interface EmailWiringMeta {
  triggerEvent?: string | null;        // e.g. "EuPago webhook · branch paid"
  delay?: string | null;                // e.g. "imediato", "após unlock"
  sourceFile?: string | null;           // mirrors wiredAt, but stable name
  provider?: "Resend" | "Brevo" | null;
  automatic?: boolean;                  // true=automático, false=manual
  killSwitchEnv?: string | null;        // e.g. "PAYMENT_CONFIRMATION_EMAIL_ENABLED"
  killSwitchDefault?: "on" | "off" | null;
  idempotencyEvent?: string | null;     // e.g. "report_saved_email_sent"
  knownRisks?: string | null;
}

export interface EmailTemplateEntry {
  // …existing fields…
  lifecycleStage: EmailLifecycleStage;
  statusBadges: EmailStatusBadge[];
  requiredVariables?: string[];
  optionalVariables?: string[];
  fallbackBehaviour?: string | null;
  wiring?: EmailWiringMeta;
}
```

**Stage assignments (per spec):**

| Lifecycle | Templates |
| --- | --- |
| `captacao` | `request_received` |
| `entrega` | `report_saved`, `report_ready` |
| `retencao` | `feedback_request` |
| `conversao` | `commercial_followup` |
| `pagamento` | `payment_confirmed` |
| `legado` | `welcome_beta`, `report_summary`, `personal_area_saved` |

**Badge rules per template:**

- `request_received`: `["ligado","transaccional"]`, wiring.automatic=true, idempotencyEvent="beta_request_received_email_sent".
- `report_ready`: `["ligado","manual","transaccional"]`, automatic=false (admin action).
- `report_saved`: `["ligado","transaccional"]`, automatic=true, killSwitchEnv="LEAD_MAGNET_EMAIL_SEQUENCE_ENABLED", killSwitchDefault="on", idempotencyEvent="report_saved_email_sent". knownRisks="Concurrent unlocks could race past dedup before SENT event is recorded (no DB unique constraint)."
- `feedback_request`: `["ligado","manual"]`, automatic=false.
- `commercial_followup`: `["ligado","manual"]`, automatic=false. knownRisks="Auto-trigger intencionalmente não activo nesta fase."
- `payment_confirmed`: `["ligado","transaccional","kill_switch_off"]` (badge surfaces when `PAYMENT_CONFIRMATION_EMAIL_ENABLED` default is OFF), automatic=true, killSwitchEnv="PAYMENT_CONFIRMATION_EMAIL_ENABLED", killSwitchDefault="off", idempotencyEvent="payment_confirmation_email_sent".
- `welcome_beta`: `["legado","desactivado"]`. fallbackBehaviour="Substituído por report_saved."
- `report_summary`: `["legado","desactivado"]`.
- `personal_area_saved`: `["sem_trigger","planeado"]` (planeado para fluxo de criação de conta).

`requiredVariables`/`optionalVariables` split per template (e.g. `payment_confirmed` required: firstName, instagramHandle, amountLabel, paymentMethod; optional: paymentReference, reportUrl).

`fallbackBehaviour` populated for templates with graceful degradation (`report_saved`: "credit card e insights são omitidos quando dados ausentes"; `commercial_followup`: "narrativa genérica quando insights ausentes; CTA degrada para mailto/reply"; `payment_confirmed`: "campos opcionais omitidos sem placeholders partidos").

**Preview sample data** — update `SAMPLE` so EmailLab matches the spec values; tests use literal handles, not SAMPLE, so impact is preview-only:

- `instagramHandle: "webhspt"`
- `reportUrl: "https://example.com/analyze/webhspt"`
- `analyzeAnotherUrl: "https://example.com/"`
- `followersLabel: "10,2 mil"`, `dominantFormat: "carrosséis"`, `engagementRate: "4,2%"`, `benchmarkDelta: "+1,1 pp acima da média"`, `topPostFormat: "carrossel"`, `topPostEngagement: "0,15%"` (already present, kept).
- `totalFreeCredits: 2`, `usedCredits: 1`, `remainingCredits: 1` (already present, kept).
- `paymentMethod: "MB WAY"`, `paymentReference: "AP-2026-0142"` (already present, kept).

Also update the hardcoded `payment_confirmed.preheader` string (`"… @frederico.m.carvalho …"`) to use `SAMPLE.instagramHandle` so it stays in sync.

**Helper exports** added next to `CATEGORY_*`:

```ts
export const LIFECYCLE_ORDER: EmailLifecycleStage[] = [
  "captacao","entrega","retencao","conversao","pagamento","legado",
];
export const LIFECYCLE_LABELS: Record<EmailLifecycleStage,string> = {
  captacao:"Captação", entrega:"Entrega", retencao:"Retenção",
  conversao:"Conversão", pagamento:"Pagamento", legado:"Legado / desactivado",
};
export const STATUS_BADGE_LABELS: Record<EmailStatusBadge,string> = {
  ligado:"Ligado", manual:"Manual", transaccional:"Transaccional",
  kill_switch_off:"Kill-switch OFF", planeado:"Planeado",
  legado:"Legado", sem_trigger:"Sem trigger", desactivado:"Desactivado",
};
```

## 2) Page redesign — `email-lab-page.tsx`

**Grouping**: replace category grouping with `LIFECYCLE_ORDER`. Legacy group rendered last with a muted accent and a sectional caption "Mantidos em disco para auditoria — não disparam".

**Filter chips** (above the search box):
`Todos · Ligados · Manuais · Transaccionais · Kill-switch · Legado · Sem trigger`

Filter is a single-select state; AND-combines with the search text. Predicates read `statusBadges`:
- `ligados`: `badges.includes("ligado")`
- `manuais`: `badges.includes("manual")`
- `transaccionais`: `badges.includes("transaccional")`
- `kill-switch`: `badges.includes("kill_switch_off")`
- `legado`: `lifecycleStage === "legado" || badges.includes("legado")`
- `sem trigger`: `badges.includes("sem_trigger")`

**Template card**: replace single `StatusPill` with a compact row of up to 3 badge chips using the colour map below. Long lists collapse to "+N".

**Badge palette** (Tailwind tokens already present):
- ligado → success-500/12 bg + success-500 text
- manual → leads-500/12 + leads-500 (calm blue)
- transaccional → text-primary/12 + text-primary (navy)
- kill_switch_off, planeado, sem_trigger → warning-500/12 + warning-500 (amber)
- legado, desactivado → text-tertiary/12 + text-tertiary (grey)
- Reserved: danger-500 only used for real failure surfaces (not used here).

**Detail header**: add a "Lifecycle stage" chip next to the title and a badge stack underneath instead of the single pill. Internal key stays mono and small.

**Tabs**: keep the three tabs (Pré-visualização / Variáveis / Wiring). Inside Preview, keep existing HTML/Text toggle and email-client frame — only adjust the inbox label to "Inbox · AuditProfiles" so it stops saying "Mira".

**Variables tab**: split into two tables — `Obrigatórias` and `Opcionais` — using `requiredVariables` / `optionalVariables` when present; fall back to the current flat `variables` list. Append a "Comportamento de fallback" block beneath when `fallbackBehaviour` is set.

**Wiring tab**: expanded layout. Rows shown in this order, each via existing `MetaRow`:
- Estado (badges row)
- Lifecycle stage
- Trigger / evento (`wiring.triggerEvent` or "—")
- Delay (`wiring.delay` or "imediato")
- Automático / Manual
- Provider (`Resend`/`Brevo` or "—")
- Origem / source file (mono, from `wiring.sourceFile` ?? `wiredAt`)
- Kill-switch (env name + default; amber callout when default is "off")
- Idempotência (event name, mono)
- Notas (current `wiredNote` muted block)
- Riscos conhecidos (`wiring.knownRisks` amber callout when set)
- Existing "Sem trigger" callout kept for `!wired`.

**KPI tiles** at the top keep the current 4 cards. Add **no new endpoint** — per-template sent/failed counts are not available from `/api/admin/automation-flow` today, only the aggregate. The aggregate `sentLast30d` continues to show in the global KPI strip; per-template counts are intentionally out of scope for 6A (Step 6B candidate). Detail header gets a small placeholder line "Envios 30d: —" with a tooltip "Disponível quando o automation-flow expor totais por template." — explicit, never silently zero.

**Safety preserved**:
- `SendTestButton` stays disabled with the "Disponível em breve" tooltip — no new send path.
- `ReadOnlyBanner` stays. Copy updated to "Esta página é só leitura — nada é enviado a partir daqui."
- Legacy templates are visible, never silently hidden; they live in the `legado` group with muted styling.
- HTML preview iframe keeps `sandbox=""` (no scripts, no network).

## Validation checklist

1. Open `/admin/email-lab`. Confirm groups appear in order: **Captação → Entrega → Retenção → Conversão → Pagamento → Legado / desactivado**.
2. Each card shows the right badges:
   - `request_received` → Ligado · Transaccional
   - `report_saved` → Ligado · Transaccional
   - `report_ready` → Ligado · Manual · Transaccional
   - `feedback_request` → Ligado · Manual
   - `commercial_followup` → Ligado · Manual
   - `payment_confirmed` → Ligado · Transaccional · Kill-switch OFF (amber)
   - `welcome_beta`, `report_summary` → Legado · Desactivado (grey)
   - `personal_area_saved` → Sem trigger · Planeado (amber)
3. Filter chip "Legado" shows only the legacy group. "Kill-switch" shows only `payment_confirmed`. "Manuais" shows `report_ready`, `feedback_request`, `commercial_followup`.
4. Search keeps working and AND-combines with the chip.
5. Select `report_saved`. Preview renders with handle `@webhspt`, credit card showing `Começaste com 2 análises · 1 usada em @webhspt · 1 disponível`, three insights using the spec values.
6. Variables tab shows Obrigatórias (firstName, instagramHandle, reportUrl, analyzeAnotherUrl) and Opcionais (credits + insights). Fallback box: "credit card e insights são omitidos quando dados ausentes".
7. Wiring tab shows: Trigger = "Lead-magnet sequence · após unlock", Delay = "imediato", Provider = "Resend", Source = `src/lib/email/lead-magnet-sequence.server.ts`, Kill-switch = `LEAD_MAGNET_EMAIL_SEQUENCE_ENABLED` (default ON), Idempotência = `report_saved_email_sent`, Riscos = race-condition note.
8. Select `payment_confirmed` — Wiring shows kill-switch amber callout `PAYMENT_CONFIRMATION_EMAIL_ENABLED` (default OFF).
9. Select `welcome_beta` — appears under Legado, badges Legado · Desactivado, Wiring note explains substitution by `report_saved`.
10. "Enviar teste" button stays disabled with tooltip; HTML preview iframe is sandboxed; no network call leaves the page beyond the existing `/api/admin/automation-flow` aggregate fetch.
11. Run `bunx vitest run src/lib/email` — `registry-parity` and template tests still pass (no template content changes).

## Output after implementation

1. **Files changed**: `src/lib/admin/email-template-registry.ts`, `src/components/admin/v2/email-lab/email-lab-page.tsx`.
2. **No real emails sent**: SendTestButton remains disabled; no fetch added to a sender; preview iframe is sandboxed.
3. **Triggers not changed**: zero edits under `src/routes/api/admin/send-*`, webhook routes, `lead-magnet-sequence.server.ts`, or any sender module. Wiring metadata is descriptive only.
4. **Prices / payment / credits / report generation untouched**: no edits to `pricing*`, EuPago files, credit ledger, snapshots, RPCs, migrations.
5. **Validation checklist**: the 11 items above.

## Risks / follow-ups

- Per-template sent/failed counters require extending `/api/admin/automation-flow` to bucket by `event_type` or `template_name` — defer to Step 6B.
- Updating `SAMPLE.instagramHandle` from `frederico.m.carvalho` → `webhspt` changes preview only; tests use literal handles and are unaffected. The hardcoded preheader on `payment_confirmed` will be re-pointed to `SAMPLE.instagramHandle` to avoid drift.
- Kill-switch state shown is the **declared default**, not the live env value. Surfacing live env would require a server fn; out of scope for 6A.
