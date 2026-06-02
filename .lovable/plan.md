# Auditoria + refinamento dos KPIs de /admin/visao-geral

## 1. Cost source audit — `fetchExpense30d().total`

`expense.total` lê **todas as linhas** de `provider_call_logs` com `status IN ('success','cache')` nos últimos 30 dias (`aggregateCostsFromLogs`, `system-queries.server.ts:581`). **Não distingue** origem da chamada — inclui:

- ✅ análises públicas via `/analyze/$username`
- ✅ refreshes admin
- ✅ Apify Lab runs (`apify_lab_runs` gera entradas em `provider_call_logs`)
- ✅ enriquecimentos OpenAI (visual cover, captions, insights)
- ✅ thumbnail processing quando passa por providers
- ⚠️ retries de falhas que terminem em `success`
- ❌ falhas (excluídas: `status != 'success'/'cache'`)
- ⚠️ smoke/diagnostic se rodadas em produção

→ `expense.total` **não é adequado** como numerador de "custo por lead" porque inclui custo administrativo (lab + refreshes) que não pertence ao funil de aquisição. É adequado para "custo total da plataforma".

## 2. Denominator audit (30d na BD agora)

| Métrica | Fonte | Valor atual |
|---|---|---|
| `leads_30d` | `leads.count` | **12** |
| `analyses_total` | `analysis_events.count` | 2323 (todos os outcomes) |
| `fresh_analyses_30d` | `analysis_events where data_source='fresh' AND outcome='success'` | **35** |
| `cache_analyses_30d` | `analysis_events where data_source='cache' AND outcome='success'` | 1962 |
| `completed_reports_30d` | `analysis_snapshots.count` | já calculado em `expense.completed_reports` |
| `fresh_reports_30d` | já calculado em `expense.fresh_reports` | 35 |
| `reports_unlocked_30d` | `lead_reports.count` (30d) | **a expor** |
| `onboarding_success_30d` | `product_events where event_type='onboarding_success'` | **a expor** |
| `paid_customers_30d` | `lead_payments where status='paid' AND paid_at>=30d` | **0** (tabela existe, vazia) |

→ Denominador recomendado por métrica:
- `cost_per_lead` = **custo público** / `leads_30d` (não custo total)
- `cost_per_analysis` = `expense.fresh_avg_cost_per_report` (já existe, exato)
- `cost_per_unlocked_report` = custo público / `reports_unlocked_30d`
- `margin_per_lead` = `(revenue_30d − custo_público_30d) / leads_30d` — só calcular quando `revenue_active`

## 3. Revenue audit

`lead_payments` existe (`status`, `amount_cents`, `currency`, `paid_at`, `provider`). Hoje **0 linhas**. Nenhum webhook EuPago/Stripe ativo. `revenue_total_30d` é forçado a 0 no endpoint.

→ Introduzir flag `revenue_active`:
```sql
SELECT COALESCE(SUM(amount_cents),0)/100.0 AS eur, COUNT(*) AS paid_count
FROM lead_payments
WHERE status='paid' AND paid_at >= now() - interval '30 days';
```
`revenue_active = paid_count_alltime > 0` (verifica se já houve algum pagamento, não só nos 30d). Enquanto `false`, KPI mostra "Receita ainda não activa" e margem fica `null`.

## 4. Funnel audit

Etapas atuais em `AcquisitionFunnel`:
1. "Report público visto" — **placeholder** (já marcado `unavailable: 'sem tracker'`) ✅
2. "Email submetido" — `beta-funnel.unlock_iniciado` ✅ real
3. "Conta criada" — `beta-funnel.unlock_concluido` ✅ real
4. "Feedback recebido" — `beta-funnel.feedback_recebido` ✅ real
5. "Convertido (pago)" — `beta-funnel.convertido` (depende de `lead_payments`) → hoje 0, marcar como "checkout por ligar" em vez de "0%".

→ Sem alterações de queries — só copy mais honesta na etapa 5.

## 5. Margin alert logic — bug atual

Hoje: alerta dispara sempre que `margin_per_lead < 0`. Como receita está fixa em 0 e há custo > 0, **dispara sempre que houver leads**. É ruído, não sinal.

→ Nova regra:
- `revenue_active === false` → **não mostrar** alerta de margem negativa; mostrar `AdminCallout` informativo: *"Receita ainda não activa. Acompanha custo por lead (${X}) e custo por análise (${Y}) até ligar o checkout."*
- `revenue_active === true && margin_per_lead < 0` → alerta atual (negativo).
- `revenue_active === true && margin_per_lead >= 0` → nada.

## 6. UI copy provisional

- KPI "Receita" quando `!revenue_active` → valor: **"—"**, eyebrow mantém "Receita", sub: **"ainda não activa"**
- KPI "Margem / lead" quando `!revenue_active` → valor: **"em validação"** (não mostrar número), sub: `custo/lead $X · receita pendente`
- Funnel etapa 5 quando `!revenue_active` → label mantém, pct: **"— checkout por ligar"**

## 7. Novo contrato de `OverviewKpis`

```ts
{
  // contagens
  leads_30d, leads_7d,
  analyses_30d,                  // events fresh+cache success
  fresh_analyses_30d,            // events fresh success
  reports_unlocked_30d,          // lead_reports 30d

  // custos
  cost_total_30d,                // expense.total (plataforma)
  cost_public_30d,               // custo atribuído a fresh com event_id (proxy honesto)
  cost_per_lead,                 // cost_public_30d / leads_30d
  cost_per_analysis,             // expense.fresh_avg_cost_per_report
  cost_per_unlocked_report,      // cost_public_30d / reports_unlocked_30d

  // receita / margem
  revenue_active: boolean,       // já houve algum lead_payment paid?
  revenue_30d,                   // 0 quando inactive
  revenue_per_lead: number|null,
  margin_per_lead: number|null,  // null quando !revenue_active
  margin_status: "inactive" | "negative" | "positive",

  // outros
  avg_cost_per_report, reliability_pct, checkout_enabled, providers
}
```

`cost_public_30d` ≈ `fresh_linked_total_usd` (já calculado em `fetchExpense30d`) — custo de chamadas reais ligadas a `analysis_event_id` (exclui lab/órfãs). É o melhor proxy honesto disponível sem alterar o backend de custos.

## Ficheiros a tocar

1. `src/routes/api/admin/overview-kpis.ts` — alargar contrato + queries (`lead_payments`, `lead_reports`, `product_events.onboarding_success`, contagens de `analysis_events`).
2. `src/components/admin/v2/visao-geral/overview-kpi-row.tsx` — copy "Receita ainda não activa", "Margem em validação".
3. `src/components/admin/v2/visao-geral/margin-alert.tsx` — branch `revenue_active` (info vs warning).
4. `src/components/admin/v2/visao-geral/acquisition-funnel.tsx` — copy etapa 5 quando `!revenue_active`.
5. `src/components/admin/v2/visao-geral/cost-summary-card.tsx` — mostrar **custo público** ao lado de **custo total** para honestidade.
6. `src/lib/admin/__tests__/overview-kpis.test.ts` (novo) — testes puros das fórmulas.

**Fora de âmbito** (não tocar): `system-queries.server.ts` core de custos, providers, onboarding, reports, pricing, `/admin/sistema`, `/admin/receita`.

## Testes

`src/lib/admin/overview-formulas.ts` (novo, função pura `computeKpis(input)`) + Vitest cobrindo:
- `leads_30d=0` → `cost_per_lead=null`, sem divisão por zero
- `revenue_active=false` → `margin_per_lead=null`, `margin_status="inactive"`
- `revenue_active=false` → `MarginAlert` não dispara warning (snapshot do branch)
- `cost_per_lead = cost_public / leads`
- `cost_per_analysis = fresh_avg_cost_per_report` (pass-through)
- `revenue_active=true, revenue<cost` → `margin_status="negative"`

## Validação

- `bunx tsc --noEmit`
- `bunx vitest run src/lib/admin/__tests__/overview-kpis.test.ts`
- Confirmar visualmente em /admin/visao-geral que "Receita ainda não activa" aparece, alerta de margem deixa de aparecer, e os 4 valores batem (`leads=12`, custos = mesmos do /admin/receita).

## Checkpoint

- ☐ Endpoint devolve novo contrato com `revenue_active`, `cost_public_30d`, `analyses_30d`, `reports_unlocked_30d`
- ☐ `OverviewKpiRow`: copy "ainda não activa" / "em validação" quando aplicável
- ☐ `MarginAlert`: info-card quando `!revenue_active`, warning só quando real
- ☐ `AcquisitionFunnel`: etapa 5 com "checkout por ligar"
- ☐ `CostSummaryCard`: distinção custo total vs custo público
- ☐ Testes puros de fórmulas verdes
- ☐ `tsc --noEmit` limpo
