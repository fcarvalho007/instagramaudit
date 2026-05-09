## Diagnóstico

Infraestrutura já preparada — falta apenas a UI e o "fio elétrico":

- ✅ `trackEvent` server fn com `unlock_clicked` e `pricing_option_clicked` no allowlist
- ✅ Resolução automática `lead_id` via `snapshot_id` (em `tracking.functions.ts`)
- ✅ Timeline já tem `EVENT_LABELS` e `EVENT_ICONS` para ambos os eventos
- ❌ Não existe botão "DESBLOQUEAR" nem grelha de preços no relatório público
- ❌ Timeline não mostra metadata (qual opção foi clicada)

`PremiumCallout` é a peça central já usada (ex.: em `report-engagement-benchmark-chart.tsx`), atualmente sem CTA.

---

## UX escolhida — opção mais leve

**Modal único de "Registar interesse"** disparado a partir do botão **DESBLOQUEAR** dentro do `PremiumCallout`:

1. Click em **DESBLOQUEAR** → regista `unlock_clicked` → abre dialog
2. Dialog mostra 4 cartões de preço (sem checkout):
   - **single_3_eur** — €3 + IVA · "Relatório único"
   - **bundle_13_eur** — €13 + IVA · "Bundle 5 relatórios"
   - **monthly** — "Plano mensal · em breve"
   - **agency** — "Agência · falamos contigo"
3. Click num cartão → regista `pricing_option_clicked` com `pricing_option` no metadata → cartão muda para estado **"Interesse registado ✓"** (idempotente; não dispara segunda vez para o mesmo cartão)
4. Footer: "Sem pagamento. Voltamos a falar contigo."

Sem checkout, sem provider, sem coleta de email (já temos do beta tester via lead).

---

## Implementação

### 1. Novo dialog `src/components/report-redesign/v2/premium-interest-dialog.tsx`

Props:
```ts
interface Props {
  open: boolean
  onOpenChange: (v: boolean) => void
  snapshotId: string | null
  handle: string | null
  variant: string                  // "public_mvp"
  sourceComponent: string          // ex. "engagement_benchmark_chart"
}
```

Comportamento:
- Lista de 4 opções tipadas: `type PricingOption = "single_3_eur" | "bundle_13_eur" | "monthly" | "agency"`
- Estado local `Set<PricingOption>` para marcar cliques já registados
- Ao clicar: chama `trackEvent({ data: { eventType: "pricing_option_clicked", snapshotId, handle, metadata: { pricing_option, variant, source_component } }}).catch(()=>{})`
- Usa `Dialog` do shadcn já existente
- Estilo: cartões em grid 2×2 mobile-first, tons leves (sem amber agressivo), badge "Em breve" para `monthly`/`agency`
- Tokens: usar `surface-muted`, `border-default`, `accent` — sem cores hardcoded

### 2. Atualizar `PremiumCallout`

Adicionar props opcionais (backward compatible):
```ts
unlockEnabled?: boolean
snapshotId?: string | null
handle?: string | null
sourceComponent?: string
variant?: string
```

Quando `unlockEnabled === true`, renderizar internamente:
- Botão "DESBLOQUEAR" (ícone `Sparkles`) abaixo da descrição
- Estado local `dialogOpen`
- Click no botão → `trackEvent({ data: { eventType: "unlock_clicked", snapshotId, handle, metadata: { variant, source_component } }}).catch(()=>{})` → `setDialogOpen(true)`
- Inclui `<PremiumInterestDialog>` controlado por esse estado

Sem alterar a aparência atual quando `unlockEnabled` é falsy (default).

### 3. Ativar nos pontos de uso

Em `src/components/report-redesign/v2/report-engagement-benchmark-chart.tsx` (única utilização atual), passar:
```tsx
<PremiumCallout
  unlockEnabled
  snapshotId={snapshotId}
  handle={handle}
  variant="public_mvp"
  sourceComponent="engagement_benchmark_chart"
  ...
/>
```

`snapshotId` e `handle` precisam fluir até este componente. Se ainda não chegam, propagam-se via props (sem alterar dados do relatório nem PDF).

### 4. Timeline mostra a opção clicada

`src/components/admin/v2/beta-leads/lead-detail-sheet.tsx` — no map de eventos, adicionar uma linha de metadata abaixo do label quando `event_type` ∈ {`pricing_option_clicked`, `unlock_clicked`}:

```tsx
{ev.event_type === "pricing_option_clicked" && ev.metadata?.pricing_option && (
  <p className="admin-meta text-admin-text-tertiary m-0 mt-0.5">
    Opção: <code>{String(ev.metadata.pricing_option)}</code>
    {ev.metadata.source_component ? ` · ${String(ev.metadata.source_component)}` : ""}
  </p>
)}
```

(Verificar primeiro que `ev.metadata` é exposto pela API da timeline — se não for, expandir o `select` em `src/routes/api/admin/lead-timeline.ts`.)

### 5. Testes

`src/components/report-redesign/v2/__tests__/premium-interest-dialog.test.tsx`:
- Renderiza 4 opções
- Click no cartão `single_3_eur` chama `trackEvent` com payload correto
- Segundo click no mesmo cartão não duplica
- Click em `monthly` continua a registar evento (mesmo com badge "em breve")

Mock simples de `trackEvent` via `vi.mock("@/lib/tracking.functions")`.

---

## Não tocado

- Pipeline PDF
- Geração / scoring de relatório
- Dados / providers
- Schema / migrations
- Checkout / payment

---

## Validação

- `bunx tsc --noEmit` limpo
- `bunx vitest run` 100% verde
- Manual:
  - Abrir `/analyze/<handle>` → ver botão DESBLOQUEAR no callout
  - Click → DB tem evento `unlock_clicked` com `lead_id` resolvido (se snapshot tem report_request)
  - Click numa opção → `pricing_option_clicked` com `metadata.pricing_option`
  - Lead detail sheet → timeline mostra "CTA de desbloqueio clicado" e "Opção de preço clicada · single_3_eur"

---

## Ficheiros tocados

**Criados (2)**
- `src/components/report-redesign/v2/premium-interest-dialog.tsx`
- `src/components/report-redesign/v2/__tests__/premium-interest-dialog.test.tsx`

**Editados (3-4)**
- `src/components/report-redesign/v2/premium-callout.tsx` — botão DESBLOQUEAR + estado dialog
- `src/components/report-redesign/v2/report-engagement-benchmark-chart.tsx` — passa props
- `src/components/admin/v2/beta-leads/lead-detail-sheet.tsx` — metadata na timeline
- (se necessário) `src/routes/api/admin/lead-timeline.ts` — incluir `metadata` no select

---

## Checkpoint

- ☐ Dialog renderizado com 4 opções de preço
- ☐ `unlock_clicked` registado ao abrir dialog
- ☐ `pricing_option_clicked` registado por opção, com metadata correto
- ☐ `lead_id` resolvido server-side via snapshot
- ☐ Timeline do lead mostra ambos os eventos com a opção visível
- ☐ Sem checkout, sem alterações de dados/PDF
- ☐ `tsc --noEmit` limpo · `vitest` verde