## Goal

Reduce operational confusion in `/admin/email-lab` and `/admin/automacoes` so that **active**, **manual**, **transactional**, **planned**, **kill-switch OFF** and **legacy** templates/flows are visually and semantically distinct. Metadata + admin UI only. No senders, triggers, copy, prices, checkout, EuPago, credits, entitlements, report generation or schema are touched.

---

## Files to change

1. `src/lib/admin/email-template-registry.ts`
2. `src/components/admin/v2/email-lab/email-lab-page.tsx`
3. `src/lib/admin/automation-flow-types.ts`
4. `src/routes/api/admin/automation-flow.ts` (metadata only — `stage` reassignment + KPI exclusion of `planeado`; no behaviour, no email logic)
5. `src/components/admin/v2/automacoes/automation-flow-page.tsx`
6. `src/components/admin/v2/automacoes/stage-group.tsx` (only if a new "planned" variant note is needed; otherwise reuse `muted`)

Nothing else is edited. No email template HTML/text, no sender file, no webhook, no payment/credit/entitlement file.

---

## 1. `/admin/email-lab`

### 1A. New "Planeado" lifecycle stage

In `email-template-registry.ts`:
- Extend `EmailLifecycleStage` with `"planeado"`.
- Insert `"planeado"` in `LIFECYCLE_ORDER` **before** `"legado"` (so order becomes: captacao → entrega → retencao → conversao → pagamento → planeado → legado).
- Add `LIFECYCLE_LABELS.planeado = "Planeado / a ligar"`.
- Reclassify `personal_area_saved`:
  - `lifecycleStage: "planeado"` (was `"legado"`).
  - `title: "Área pessoal guardada — planeado"` (already close; keep).
  - `shortDescription: "Reservado para futura área pessoal com signup real. Ainda sem trigger em produção."`
  - Keep `statusBadges: ["planeado", "sem_trigger"]` and `lifecycleRole: "planned"`.

### 1B. Clarify active main-lifecycle templates

In `email-template-registry.ts`:
- `report_saved`:
  - `title: "Relatório guardado"`
  - `shortDescription: "Email principal automático após unlock. Substitui boas-vindas + resumo."`
- `report_ready`:
  - `title: "Relatório pronto — envio manual / signed URL"` (already set)
  - `shortDescription: "Variante manual ou legacy-compatible. Não é o email principal do lifecycle actual."` (already set; verify)

No copy inside the rendered email files is touched.

### 1C. Hide legacy templates by default in Email Lab

In `email-lab-page.tsx`:
- Add `const [showLegacy, setShowLegacy] = useState(false);`
- In the `grouped` memo, filter out groups whose stage is `"legado"` when `!showLegacy`.
- Render a toggle row above the list (or just below the filter chips):
  - Label: `"Mostrar legados (welcome_beta, report_summary)"`
  - Hidden state hint: `"2 templates ocultos · mantidos apenas para auditoria"`.
- When the active `selectedKey` is legacy and `showLegacy` is `false`, fall back to `report_saved` so the right-hand detail panel never goes blank.
- The `"legado"` chip in `FILTER_CHIPS` automatically forces `showLegacy=true` (selecting the chip flips the toggle on).

### 1D. KPI tiles — show real composition

Replace the current 4-tile row (Total / Ligados / Sem trigger / Envios 30d) with a breakdown that mirrors the operational reality. New tiles, computed in-page from `TEMPLATES`:

- `Total registados` = 9
- `Operacionais` = templates with `lifecycleRole = "main_lifecycle"` OR `statusBadges` includes `"ligado"` AND `lifecycleStage` not in `{legado, planeado}`
- `Manuais` = `statusBadges` includes `"manual"`
- `Transaccionais` = `statusBadges` includes `"transaccional"`
- `Planeados` = `lifecycleStage === "planeado"`
- `Legados` = `lifecycleStage === "legado"`
- Keep `Envios (30d)` tile as a secondary row (uses the existing automation-flow KPI fetch).

Layout: 6 small tiles on desktop (`sm:grid-cols-6`), 2 columns on mobile. The pure "Total registados" tile is muted; "Operacionais" stays as the dominant green tile.

### 1E. Group order in the left list

Render groups in `LIFECYCLE_ORDER`. With the new order, "Planeado" appears as its own section between "Pagamento" and (hidden by default) "Legado / desactivado".

---

## 2. `/admin/automacoes`

### 2A. New `98_planeado` stage

In `automation-flow-types.ts`:
- Extend `FlowStage` with `"98_planeado"`.
- Insert a new entry in `STAGE_DEFS` **before** `99_legado`:
  ```text
  number: "98"
  eyebrow: "Planeado · sem trigger"
  title: "A ligar futuramente"
  description: "Reservado para signup real / área pessoal. Não dispara em produção."
  tokenColor/tokenBg: reuse admin-stage-legado tokens (muted) until dedicated tokens are added.
  ```

### 2B. Move `personal_area_saved` out of Legado

In `routes/api/admin/automation-flow.ts`:
- For decl `personal_area_saved`:
  - `stage: "98_planeado"` (was `"99_legado"`)
  - `lifecycleBadges: ["planeado", "sem_trigger"]` (already set)
  - `note: "A ligar futuramente ao evento handle_new_user ou signup real."`

No trigger, no event, no wiring changed.

### 2C. Keep `welcome_beta` + `report_summary` in `99_legado`, with stronger note

In `routes/api/admin/automation-flow.ts`:
- Set `note` on both legacy decls: `"Absorvido por report_saved. Mantido apenas para histórico, overrides e auditoria."`
- Keep `stage: "99_legado"` and `lifecycleBadges: ["legado"]`.

In `automation-flow-page.tsx` / `stage-group.tsx`:
- The legacy stage already renders with `variant="muted"` and "Mantido para histórico, compatibilidade e auditoria. Não dispara em produção." — keep as is. No collapse interaction required (the stage is already visually demoted and last).

### 2D. KPI clarity (top tiles)

In `routes/api/admin/automation-flow.ts`, update `AutomationKpis.systemActive`:
- `operationalActiveCount`: already excludes `99_legado` and `kill_switch_off`. Also exclude `98_planeado` (status `"preparing"` already prevents counting, but exclude explicitly via stage filter for clarity).
- Extend `systemActive` with `plannedCount = flows in stage 98_planeado`.

In `automation-flow-types.ts` interface `AutomationKpis.systemActive`, add `plannedCount: number`.

In `automation-flow-page.tsx` `KpiRow`, update the hint string for the first tile to include `plannedCount`:
- `"{manuais} manuais · {killSwitch} kill-switch OFF · {planeados} planeados · {legado} legado"`

### 2E. Main visible sequence

With the changes above, the rendered sequence becomes exactly:

```text
01 Pedido recebido
02 Relatório guardado
   - report_saved   (primary)
   - link_enviado   (secondary / manual / signed URL — already rendered as variant="secondary")
03 Pedido de feedback
04 Follow-up comercial
05 Pagamento confirmado
98 Planeado · sem trigger    (personal_area_saved)
99 Legado / auditoria        (welcome_beta, report_summary)
```

The existing `STAGE_FLOW_ORDER["02_entrega"]` keeps `report_saved` first.

---

## 3. Safety guarantees (must hold for the implementation)

- No file under `src/lib/email/templates/**` is edited (no copy, no HTML/text changes).
- No file under `src/lib/email/send-*.ts` or `src/lib/email/lead-magnet-sequence.ts` is edited.
- No webhook (`src/routes/api/public/eupago-webhook.ts`), no payment / credit / entitlement / report-generation file is touched.
- No DB migration. No schema change. No `supabase.from(...).update(...)` added.
- No env / secret added or read.
- `wired`, `triggerEvent`, `idempotencyEvent` and `FLOW_EVENTS` entries are NOT changed for any flow.
- `personal_area_saved.wired` stays `false`, `wiring.automatic` stays `false`, `idempotencyEvent` unchanged — only the stage label and description move.

---

## 4. Manual validation checklist (after implementation)

Email Lab (`/admin/email-lab`):
1. KPI tiles show: Total 9, Operacionais 3, Manuais 3, Transaccionais 3, Planeados 1, Legados 2 (counts will be derived; verify they match the categorisation table).
2. Left list shows groups in order Captação → Entrega → Retenção → Conversão → Pagamento → Planeado → (Legado hidden).
3. `personal_area_saved` appears under **Planeado**, not Legado, with the new description and `planeado` + `sem_trigger` badges.
4. Toggle "Mostrar legados" reveals `welcome_beta` and `report_summary` under "Legado / desactivado"; toggle off hides them and the right pane falls back to `report_saved` if a legacy template was selected.
5. `report_saved` detail header shows `lifecycleRole = "Email principal do lifecycle"` and the new description.
6. `report_ready` detail header shows it as `Variante manual / fallback` (already in place).

Automations (`/admin/automacoes` → Fluxo):
7. Stage `98 · Planeado · sem trigger` exists with `personal_area_saved` only, muted, with the new note.
8. Stage `99 · Legado` contains only `welcome_beta` and `report_summary`, with the "Absorvido por report_saved" note.
9. Stage `02 · Entrega` shows `report_saved` first (primary), then `link_enviado` (secondary).
10. Top KPI "Fluxos operacionais" hint shows `manuais · kill-switch OFF · planeados · legado`, and the numerator does NOT include legacy, kill-switch OFF or planned.
11. No automation actually fires (read-only page). No email is sent. No payment row, no credit, no entitlement is touched.

---

## 5. Out of scope (will not be done in this prompt)

- Editing email copy or HTML for any template (including `payment_confirmed` mockup alignment).
- Adding new triggers or wiring `personal_area_saved`.
- Changing `PAYMENT_CONFIRMATION_EMAIL_ENABLED` default.
- Deleting legacy templates from disk.
- Any DB migration or schema change.
