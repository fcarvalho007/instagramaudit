# Step 7 — UI/UX & metadata consistency pass for `/admin/email-lab` and `/admin/automacoes`

Pure admin UI, copy, badges, KPI metrics and visual hierarchy. No edits to senders, routes, EuPago, prices, credits, entitlements, report generation, schema, kill-switches or trigger wiring.

---

## A. `/admin/email-lab` — `src/lib/admin/email-template-registry.ts`

Metadata-only edits to existing entries. No new keys, no removed keys, no render changes.

1. `report_saved`
   - `title` → "Relatório guardado" (already)
   - `shortDescription` → **"Email principal automático após unlock. Substitui boas-vindas + resumo."**
   - `statusBadges` → `["ligado", "transaccional"]` + add a new `"main_lifecycle"` semantic (see §A.3 — keep current badges array, the lifecycle role is rendered separately).

2. `report_ready`
   - `title` → **"Relatório pronto — envio manual / signed URL"**
   - `shortDescription` → **"Variante manual ou legacy-compatible. Não é o email principal do novo lifecycle."**
   - `statusBadges` unchanged: `["ligado", "manual", "transaccional"]`

3. `welcome_beta`
   - `title` → **"Boas-vindas à beta — legado"**

4. `report_summary`
   - `title` → **"Resumo do relatório — legado"**

5. `personal_area_saved`
   - `title` → **"Área pessoal guardada — planeado"**
   - `statusBadges` → `["planeado", "sem_trigger"]` (reordered so "Planeado" leads).

6. Add a new optional field to `EmailTemplateEntry`:
   ```ts
   lifecycleRole?:
     | "main_lifecycle"      // "Email principal do lifecycle"
     | "manual_fallback"     // "Fallback manual / signed URL"
     | "transactional"       // "Email transaccional"
     | "legacy"              // "Template legado"
     | "planned";            // "Template futuro · planeado"
   ```
   Populate per template:
   - `request_received` → `transactional`
   - `report_saved` → `main_lifecycle`
   - `report_ready` → `manual_fallback`
   - `feedback_request` → `manual_fallback`
   - `commercial_followup` → `manual_fallback`
   - `payment_confirmed` → `transactional`
   - `welcome_beta`, `report_summary` → `legacy`
   - `personal_area_saved` → `planned`

   Export `LIFECYCLE_ROLE_LABELS` map (PT-PT).

---

## A.2 `/admin/email-lab` page — `src/components/admin/v2/email-lab/email-lab-page.tsx`

1. **Badge hierarchy clarification.** Group rendering in `StatusBadgeRow` into three logical sub-groups (one row, three visually-distinct mini-clusters):
   - Operational status: `ligado` / `desactivado` / `planeado`
   - Mode: `manual` / `transaccional` (+ implicit "automático" when none and ligado)
   - Risk/control: `kill_switch_off` / `legado` / `sem_trigger`
   
   Implementation: keep existing `StatusBadgeRow` API but partition badges into the three buckets via a small `groupBadges()` helper and render with subtle separators (`·`) between non-empty groups. No new badge keys.

2. **`DetailHeader` — add "Papel no lifecycle" row** right below the lifecycle chip + title, before badges:
   ```
   Papel no lifecycle · {LIFECYCLE_ROLE_LABELS[template.lifecycleRole]}
   ```
   Labels:
   - `main_lifecycle` → "Email principal do lifecycle"
   - `manual_fallback` → "Variante manual / fallback"
   - `transactional` → "Email transaccional"
   - `legacy` → "Template legado"
   - `planned` → "Template futuro · planeado"

3. **Quieter legacy cards in the left list.** In `TemplateCard`:
   - When `lifecycleOf(t) === "legado"` → wrap card content in `opacity-70`, replace border with `1px solid rgb(var(--admin-text-tertiary) / 0.25)`, force background `rgb(var(--admin-surface-muted))` (unless active).
   - Ensure a visible `"Legado"` badge is always part of the rendered badge row for these templates (already in registry — confirm visible after grouping).
   - Active state still wins (selection ring + accent).

4. **Preview sanity walk-through (no code change unless something is wrong).** Run renderers for `report_saved`, `feedback_request`, `commercial_followup`, `payment_confirmed` via the existing `template.render()` and confirm in the preview iframe:
   - Dark navy header band, white body card, blue restrained CTA, mobile-readable spacing, no `{{placeholder}}` leaks, PT-PT copy. **No template renderer file is edited** — these templates were finalised in earlier steps. If a defect is found, list it in the closing report so the user can approve a follow-up; do not fix it in this pass.

---

## B. `/admin/automacoes`

### B.1 KPI row — `automation-flow-page.tsx` (`KpiRow`) + `automation-flow.ts` (`kpis`)

Replace the misleading "X automações activas" tile.

**Backend (`/api/admin/automation-flow.ts`):** extend `AutomationKpis.systemActive` to carry the breakdown the frontend already needs. Add fields without removing existing ones (back-compat for any other reader):
```ts
systemActive: {
  activeCount: number;     // automatic flows that are wired AND not legacy AND not kill-switch-off
  manualCount: number;     // wired flows whose lifecycleBadges include "manual"
  killSwitchOffCount: number;
  legacyCount: number;     // stage === "99_legado"
  totalCount: number;      // unchanged
}
```
Compute by iterating `flows` and inspecting `stage` + `lifecycleBadges` + `status`. No event changes, no DB changes.

Mirror the new fields in `AutomationKpis` (`src/lib/admin/automation-flow-types.ts`) as required fields.

**Frontend `KpiRow`:** replace the four tiles with:
1. **Fluxos operacionais** — value = `activeCount`, hint line: `"{manualCount} manuais · {killSwitchOffCount} kill-switch OFF · {legacyCount} legado"` (tertiary text, small).
2. **Enviados 30d** — unchanged.
3. **A aguardar** — unchanged.
4. **Falhas 30d** — unchanged.

### B.2 `02 Entrega` hierarchy — `automation-flow-page.tsx` (`FlowStages`)

Reorder flows inside stage `02_entrega` so that `report_saved` renders first, `link_enviado` (report_ready) second, `relatorio_visto` last. Implementation: small `STAGE_ORDER` map keyed by `flow.key` applied via stable sort within each stage before rendering. Then visually downgrade `link_enviado`:
- In `AutomationNode`, accept an optional `variant?: "primary" | "secondary"` prop.
- Pass `variant="secondary"` only for `link_enviado` (handled in `FlowStages` by checking `flow.key`).
- Secondary variant: remove `shadow-admin-card`, reduce icon tile saturation (use 8% mix instead of 13%), wrap header content in a quieter title weight (`font-medium` 14px instead of 16px semibold), add a small inline note line under the description: `"Variante manual / signed URL — não é o email principal de entrega."`. Functionality unchanged.

### B.3 `99 Legado / desactivado` stage treatment — `stage-group.tsx`

Add optional `variant?: "default" | "muted"` to `StageGroup` (default keeps current style). Used by `FlowStages` when `stage.key === "99_legado"`.

Muted variant:
- Background uses `rgb(var(--admin-surface-muted))` regardless of `tokenBg`.
- Border uses neutral `rgb(var(--admin-text-tertiary) / 0.2)`.
- Title and number rendered in `text-admin-text-tertiary`.
- After the description line, append an explanatory note:
  > "Mantido para histórico, compatibilidade e auditoria. Não dispara em produção."

Inside the muted stage, `AutomationNode` already shows the `Legado` badge via `lifecycleBadges`. Add visual quieting at the node level when its flow's stage is `99_legado`: wrap node article in `opacity-80` and remove primary shadow. Implementation: thread an optional `muted?: boolean` prop down from `FlowStages` → `AutomationNode` based on `stage.key === "99_legado"`.

### B.4 `payment_confirmed` card — pure metadata (`automation-flow.ts` decls)

Already carries `["activo", "transaccional", "kill_switch_off"]`. Add an explanatory note below the card body. Two changes:
- In `automation-flow-types.ts` add optional `note?: string | null` to `AutomationFlow`.
- In the `payment_confirmed` decl, set:
  ```
  note: "Activar apenas em validação controlada antes de produção."
  ```
- In `AutomationNode`, render `flow.note` as a small italic line under the timing strip (only if present) using `text-admin-text-tertiary`.

The displayed metadata then surfaces clearly: status badges already say `Activo · Transaccional · Kill-switch OFF`; trigger pill already shows `EuPago webhook · paid`; new note pinpoints why kill-switch is OFF.

### B.5 `commercial_followup` card — metadata note

Same `note` field, populated for `follow_up_comercial` decl:
```
note: "Auto-trigger não activo nesta fase."
```
Badges already correct (`Activo · Manual`). No trigger wiring change.

### B.6 `feedback_request` (flow key `feedback_pedido`) card — metadata note

Same `note` field, populated:
```
note: "Sem auto-trigger nesta fase. Opcional futuro: automático D+1."
```
Badges already `Activo · Manual`. No trigger change.

### B.7 Stage 02 description tweak (optional polish)

In `STAGE_DEFS["02_entrega"]` update `description`:
> "Entrega do relatório ao lead. `report_saved` é o email principal; `report_ready` é a variante manual / signed URL."

---

## Files touched (estimate)

- `src/lib/admin/email-template-registry.ts` — titles, shortDescriptions, `lifecycleRole`, `LIFECYCLE_ROLE_LABELS`.
- `src/components/admin/v2/email-lab/email-lab-page.tsx` — grouped badge rendering, lifecycle role row, quieter legacy cards.
- `src/lib/admin/automation-flow-types.ts` — extend `AutomationKpis.systemActive`, add `AutomationFlow.note`.
- `src/routes/api/admin/automation-flow.ts` — fill new KPI breakdown, set `note` on the three target decls. **No event types, no queries, no DB writes changed.**
- `src/components/admin/v2/automacoes/automation-flow-page.tsx` — new KPI tile layout, stage-02 reordering, pass `muted`/`variant` props.
- `src/components/admin/v2/automacoes/automation-node.tsx` — `variant` + `muted` props, render `flow.note`.
- `src/components/admin/v2/automacoes/stage-group.tsx` — `muted` variant + legado footer note.

## Safety guarantees

- No edits under `src/routes/api/admin/send-*`, `src/lib/email/send-*`, `src/routes/api/public/eupago-webhook.ts`, `src/lib/email/lead-magnet-sequence.server.ts`, `src/lib/email/templates/**`, or any pricing / checkout / credits / entitlement / report-generation file.
- No DB migrations.
- No env / kill-switch flips.
- No new triggers, no new product_events written.
- No emails sent.

## Closing report will include

1. Exact files changed.
2. Diff summary of every label/description.
3. Explicit confirmation that no trigger wiring, no email send path, no price, no payment, no credit, no entitlement, no report-generation, no schema was modified.
4. Before/after note explaining what's now clearer (KPI no longer over-counts; legacy stage visually demoted; lifecycle role explicit; `report_saved` clearly primary in Entrega).
5. Any preview defects spotted during the §A.4 visual walk-through (reported only — fix would need a separate approval).