# Step 6B — `/admin/automacoes` lifecycle map redesign

Goal: reshape the automations cockpit so every block maps cleanly onto the consolidated email lifecycle (00 Onboarding → 01 Captação → 02 Entrega → 03 Retenção → 04 Conversão → 05 Pagamento → Legado). Pure metadata/UI work — no triggers, prices, payments, credits, schema or sends are touched.

## Files changed

1. **`src/lib/admin/automation-flow-types.ts`** — extend `FlowStage`, `FlowKey`, `STAGE_DEFS`, `FLOW_EVENTS`; add `LifecycleBadge` + `lifecycleBadges?: LifecycleBadge[]` on `AutomationFlow`; add optional `description?` on `StageDef`.
2. **`src/routes/api/admin/automation-flow.ts`** — declare two new flows (`report_saved`, `payment_confirmed`), re-stage existing flows, populate `lifecycleBadges`, point legacy flows at the new `99_legado` stage. No DB writes, no new tables, no schema.
3. **`src/components/admin/v2/automacoes/automation-flow-page.tsx`** — KPI label wording (Sistema operacional / Enviados 30d / A aguardar / Falhas 30d); add a compact legend; thread stage `description` into `StageGroup`; update `computeStageMeta` for the new stages.
4. **`src/components/admin/v2/automacoes/stage-group.tsx`** — optional `description` line under the title.
5. **`src/components/admin/v2/automacoes/automation-node.tsx`** — render the optional `lifecycleBadges` row next to the existing status pill (additive, non-breaking).
6. **`src/styles/admin-tokens.css`** — add `--admin-stage-retencao`, `--admin-stage-pagamento`, `--admin-stage-legado` (and `*-bg` pairs) to keep cores tokenised.

Not changed:
- `src/lib/admin/email-template-registry.ts` (already carries the metadata after Step 6A).
- Any sender, webhook, EuPago module, pricing, credit ledger, report generation, RPC, migration.
- `template-editor.tsx`, `metrics-tab.tsx`, `people-tab.tsx` — out of scope.

## 1) Types — `automation-flow-types.ts`

```ts
export type FlowStage =
  | "00_onboarding"
  | "01_captacao"
  | "02_entrega"
  | "03_retencao"
  | "04_conversao"
  | "05_pagamento"
  | "99_legado";

export type FlowKey =
  | "welcome_beta"
  | "pedido_recebido"
  | "relatorio_gerado"
  | "link_enviado"
  | "report_saved"          // NEW
  | "personal_area_saved"
  | "relatorio_visto"
  | "feedback_pedido"
  | "report_summary"
  | "feedback_recebido"
  | "follow_up_comercial"
  | "payment_confirmed";    // NEW

export type LifecycleBadge =
  | "activo"
  | "manual"
  | "transaccional"
  | "kill_switch_off"
  | "planeado"
  | "bloqueado"
  | "legado"
  | "sem_trigger";

export const LIFECYCLE_BADGE_LABELS: Record<LifecycleBadge, string> = {
  activo: "Activo",
  manual: "Manual",
  transaccional: "Transaccional",
  kill_switch_off: "Kill-switch OFF",
  planeado: "Planeado",
  bloqueado: "Bloqueado",
  legado: "Legado",
  sem_trigger: "Sem trigger",
};

export interface StageDef {
  key: FlowStage;
  number: string;
  eyebrow: string;
  title: string;
  description?: string;        // NEW — short text per stage
  tokenColor: string;
  tokenBg: string;
}

export interface AutomationFlow {
  // …existing fields…
  lifecycleBadges?: LifecycleBadge[];  // NEW (optional, additive)
}
```

`STAGE_DEFS` rewritten:

| number | key | eyebrow | title | description |
| --- | --- | --- | --- | --- |
| 00 | `00_onboarding` | Onboarding · Beta | Entrada na plataforma | Boas-vindas e acesso. (Mostrado só se houver fluxos activos.) |
| 01 | `01_captacao` | Captação | Pedido recebido até relatório gerado | Antes do relatório ficar disponível. |
| 02 | `02_entrega` | Entrega | Relatório guardado e consumido | O relatório torna-se útil para o lead. |
| 03 | `03_retencao` | Retenção | Pedido de feedback | Após valor entregue. |
| 04 | `04_conversao` | Conversão | Follow-up comercial manual | Conversão para o relatório completo — manual nesta fase. |
| 05 | `05_pagamento` | Pagamento | Confirmação de pagamento | Branch paid do EuPago — transaccional. |
| 99 | `99_legado` | Legado / desactivado | Mantidos para auditoria | Não disparam em produção. |

`FLOW_EVENTS` adds:
- `report_saved: { types: ["report_saved_email_sent"], instrumented: true }`
- `payment_confirmed: { types: ["payment_confirmation_email_sent"], instrumented: true }`

The legacy entries (`welcome_beta`, `report_summary`, `personal_area_saved`) stay so existing event counts still work — only their `stage` is reassigned.

## 2) API — `automation-flow.ts`

Re-stage and add declarations. **No DB writes**; only the in-memory declarations and the existing aggregation queries change.

| FlowKey | Stage | `kind` | `wired` | `lifecycleBadges` |
| --- | --- | --- | --- | --- |
| `pedido_recebido` | `01_captacao` | automatic | true | `["activo", "transaccional"]` |
| `relatorio_gerado` | `01_captacao` | manual | false (system) | `["bloqueado"]` |
| `report_saved` (NEW) | `02_entrega` | automatic | true | `["activo", "transaccional"]` |
| `link_enviado` (= report_ready) | `02_entrega` | manual | true | `["activo", "manual", "transaccional"]` |
| `relatorio_visto` | `02_entrega` | automatic | true | `["bloqueado"]` (system event, no email) |
| `feedback_pedido` | `03_retencao` | manual | true | `["activo", "manual"]` |
| `follow_up_comercial` | `04_conversao` | manual | true | `["activo", "manual"]` (was `wired:false` and `timing.undefined`; switch to `kind:"immediate"` event `commercial_followup_sent` since Step 5 wired it to the admin route) |
| `feedback_recebido` | `04_conversao` | automatic | true | `["bloqueado"]` (classification) |
| `payment_confirmed` (NEW) | `05_pagamento` | automatic | true | `["activo", "transaccional", "kill_switch_off"]` |
| `welcome_beta` | `99_legado` | automatic | false | `["legado"]` |
| `report_summary` | `99_legado` | automatic | false | `["legado"]` |
| `personal_area_saved` | `99_legado` | automatic | false | `["sem_trigger", "planeado"]` |

`report_saved` declaration:
```ts
{
  key: "report_saved",
  title: "Relatório guardado",
  description: "Confirma o save e mostra saldo de créditos.",
  trigger: { kind: "event", label: "report unlock" },
  action: { kind: "email", label: "Email \"relatório guardado\"" },
  kind: "automatic",
  fromStatus: null,
  toStatus: null,
  stage: "02_entrega",
  visualKind: "email",
  extraTag: "primary_delivery",
  timing: {
    kind: "immediate",
    eventName: "report_unlocked",
    contextHint: "lead-magnet sequence",
  },
  templateKey: "report_saved",
  lifecycleBadges: ["activo", "transaccional"],
  counts: () => ({ eligibleCount: 0, inFlightCount: 0, completedLeads: null }),
  failures: 0,
  wired: FLOW_EVENTS.report_saved.instrumented,
}
```

`payment_confirmed` declaration (no schema change — counts stay null/0):
```ts
{
  key: "payment_confirmed",
  title: "Pagamento confirmado",
  description: "Recibo + confirmação de acesso pago.",
  trigger: { kind: "event", label: "EuPago webhook · paid" },
  action: { kind: "email", label: "Email \"pagamento confirmado\"" },
  kind: "automatic",
  fromStatus: null,
  toStatus: null,
  stage: "05_pagamento",
  visualKind: "email",
  extraTag: null,
  timing: {
    kind: "immediate",
    eventName: "payment_succeeded",
    contextHint: "branch paid, fire-and-forget",
  },
  templateKey: "payment_confirmed",
  lifecycleBadges: ["activo", "transaccional", "kill_switch_off"],
  counts: () => ({ eligibleCount: 0, inFlightCount: 0, completedLeads: null }),
  failures: 0,
  wired: FLOW_EVENTS.payment_confirmed.instrumented,
}
```

The existing `flows.map(...)` already derives `status` from `visualKind`/`wired`/`timing`. We extend that mapper to copy `lifecycleBadges` straight through (defensive default: derive from `status` if a decl omits it). No new SQL queries.

## 3) Page — `automation-flow-page.tsx`

- Rename KPI labels to **Sistema operacional · Enviados 30d · A aguardar · Falhas 30d** (current already uses three of them — only "Enviados" → "Enviados 30d" and "Falhas" → "Falhas 30d").
- Add `<LifecycleLegend />` directly above `FlowStages`: a compact chip row mapping each `LifecycleBadge` to its colour (Activo · Manual · Transaccional · Kill-switch OFF · Planeado · Bloqueado · Legado · Sem trigger). Wraps to multiple rows on mobile.
- `computeStageMeta` extended:
  - `02_entrega`: prefer `report_saved.sentEvents` for the headline (`N envios de relatório guardado`), keep the open-rate string when present.
  - `03_retencao`: `${eligible} elegíveis · ${sent} pedidos enviados` using `feedback_pedido`.
  - `04_conversao`: same shape, driven by `follow_up_comercial`.
  - `05_pagamento`: `${sent} confirmações · kill-switch OFF` when default OFF; otherwise just the count.
  - `99_legado`: `${count} flows mantidos para auditoria`.

## 4) `stage-group.tsx`

Add an optional `description?: string` prop rendered as a 12px secondary line under the `<h2>`. For `99_legado`, the description also serves as the explicit "non-firing" note so legacy flows stay visible but are clearly marked.

## 5) `automation-node.tsx`

Insert a `LifecycleBadgeRow` (after the existing `StatusPill` / `ExtraPill` block) when `flow.lifecycleBadges?.length`:

```tsx
{flow.lifecycleBadges?.length ? (
  <LifecycleBadgeRow badges={flow.lifecycleBadges} />
) : null}
```

The badge palette reuses existing admin tokens (no new colours):
- `activo` → `admin-pill-active-*` (green)
- `manual` → `admin-pill-info-*` (blue)
- `transaccional` → `admin-button-dark` / inverted (navy on light)
- `kill_switch_off`, `planeado`, `sem_trigger` → `admin-pill-warn-*` (amber)
- `bloqueado` → `admin-pill-blocked-*` (grey)
- `legado` → `admin-text-tertiary` on `admin-surface-muted` (grey)

The existing `StatusPill` and "Configurar trigger / Bloqueado / Editar" buttons stay — additive only, no behaviour change.

## 6) Tokens — `admin-tokens.css`

Append:
```css
--admin-stage-retencao: 186 117 23;      /* alias warning-500 amber */
--admin-stage-retencao-bg: 253 246 232;
--admin-stage-pagamento: 29 158 117;     /* alias revenue-500 */
--admin-stage-pagamento-bg: 234 247 241;
--admin-stage-legado: 130 138 152;       /* neutral grey */
--admin-stage-legado-bg: 244 246 249;
```

## Safety

- No email sends, no automation activations from this page.
- All "Edit" / "Ver logs" / "Configurar trigger" buttons remain disabled-with-tooltip or link to existing template editor — wiring is unchanged.
- No edits to senders, webhooks, EuPago, pricing, credit, report generation, or any migration.
- API still reads only `leads`, `report_requests`, `product_events`; no writes.

## Validation checklist

1. Open `/admin/automacoes`. KPIs read **Sistema operacional · Enviados 30d · A aguardar · Falhas 30d** with the same numbers as before.
2. Legend chip row shows 8 labels; colours match the badges on the cards.
3. Stages render in order 00 → 01 → 02 → 03 → 04 → 05 → 99 (empty stages collapse). 00_onboarding is empty (welcome_beta moved to legacy) and is hidden by the existing `if (stageFlows.length === 0) return null` guard.
4. `report_saved` card appears under **02 Entrega** with badges **Activo · Transaccional**, subject from the registry, trigger "report unlock", source lead-magnet sequence.
5. `feedback_pedido` is now under **03 Retenção** with **Activo · Manual**.
6. `follow_up_comercial` is under **04 Conversão** with **Activo · Manual**; old "Sem trigger" warning is gone because Step 5 wired the manual sender.
7. `payment_confirmed` card appears under **05 Pagamento** with **Activo · Transaccional · Kill-switch OFF**; trigger "EuPago webhook · paid".
8. **Legado / desactivado** group lists `welcome_beta`, `report_summary`, `personal_area_saved` with the explanatory description "Mantidos para auditoria — não disparam em produção". Cards are visible (never hidden) but visually de-emphasised.
9. Edit / logs buttons behave exactly as before — none of them sends anything.
10. Mobile width (375px): cards stack, legend wraps to 2–3 rows, KPI grid stays 2-col.
11. `bunx tsc --noEmit` clean; `bunx vitest run` still green (no test changes needed).

## Output after implementation

1. **Files changed**: the 6 files listed above.
2. **Lifecycle stages coherent**: 00..05 + Legado mapped 1:1 to the consolidated email model.
3. **No real emails sent**: zero touches to sender modules / send routes / webhook handler.
4. **No triggers / prices / payments / credits changed**: only API metadata + UI; no edits to `lead-magnet-sequence.server.ts`, `eupago-webhook.ts`, pricing, credit ledger, RPCs, or migrations.
5. **Validation checklist**: the 11 items above.

## Risks / follow-ups

- Sent/failures counts for `payment_confirmed` will show 0 until the kill-switch is turned ON and the first webhook fires; that is the correct read of `product_events.payment_confirmation_email_sent`. No fake counts.
- `feedback_recebido` stays marked **Bloqueado** because it's a classification step, not an email — matches its `visualKind: "report"`.
- Per-template sent counts in Email Lab (deferred from Step 6A) remain a separate follow-up; this step does not duplicate them here.
