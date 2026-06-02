## 1. Auditoria — onde vive o dinheiro hoje

Mapeei cada secção, o endpoint que serve e a fonte SQL. Resumo:

```
Secção                  Endpoint                                  Fonte de dados                                  source_context filtrado?
────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
Visão Geral · KPIs       /api/admin/overview-kpis                  fetchExpense30d() + lead_payments                ✅ sim (production/lab/other)
Visão Geral · Custos     /api/admin/sistema/expense-30d            fetchExpense30d()                                ✅ sim
Visão Geral · Funil      /api/admin/funnel                         analysis_events + leads + report_requests        n/a (não usa custos)
Receita · Despesas       /api/admin/sistema/expense-30d            fetchExpense30d()  (mesmo helper)                ✅ sim
Receita · Pré-receita    /api/admin/pre-revenue-signals            lead_payments + beta_feedback + pricing_interest n/a
Relatórios · Métricas    /api/admin/report-requests/metrics        SOMA CRUA de provider_call_logs                  ❌ NÃO
Relatórios · Pipeline    /api/admin/report-requests/pipeline       SOMA CRUA de provider_call_logs                  ❌ NÃO
Contactos · Banner       /api/admin/leads-funnel                   leads + report_requests + payments + LM events   n/a
Contactos · Tabela/Kpis  /api/admin/leads-kanban                   leads enriquecidos + lead_payments               n/a
```

### Problemas encontrados

**P1 — Inconsistência grave em /admin/relatorios (KPI "Custo médio por relatório" e "Custo médio por análise")**
`report-requests.metrics.ts` e `report-requests.pipeline.ts` somam `provider_call_logs.estimated/actual_cost_usd` SEM:
- filtrar por `source_context` → corridas Apify Lab (admin_lab) e refreshes inflam o KPI;
- filtrar por `status in (success, cache)` → erros entram na soma;
- usar `resolveCallCost()` → não respeita a regra canónica de actual_cost vs estimated.

Resultado: o "custo médio" mostrado em Relatórios pode estar até 30-50% acima do real quando há Lab activo. Contradiz directamente o `mem://features/cost-source-of-truth` (provider_call_logs como fonte única, com taxonomia source_context).

**P2 — Banner Contactos desactualizado ao novo fluxo LM-first**
O banner mostra "Reports → LM · 100% · 8/8". No fluxo antigo (oferta com piece-of-report → LM) fazia sentido. No novo fluxo (LM é a inscrição inicial, relatório só existe depois) o denominador "leads com relatório" ≈ "subscritores LM" — daí o 100% permanente. KPI deixa de ter sinal.

**P3 — Sem problemas em Visão Geral nem Receita**
Ambas chamam `fetchExpense30d()` que usa `aggregateCostsBySourceContext()` e `resolveCallCost()`. Números coincidem.

---

## 2. Correcções propostas

### A. Unificar Relatórios na mesma fonte das outras secções

Refactor de dois endpoints para passarem a usar `fetchExpense30d()` (ou um helper irmão parametrizado por período) em vez de somarem `provider_call_logs` à mão:

- `src/routes/api/admin/report-requests.metrics.ts`
  - substituir o bloco final de cálculo de custos pelo resultado de `fetchExpense30d()`;
  - `total_cost_usd` ← `production_cost_30d` (consistente com cost-per-lead);
  - `apify_cost_usd` ← passa a ser parte de production_cost (filtrado por actor='apify');
  - `avg_cost_usd` ← `production_cost_30d / total_analyses` (excluindo Lab);
  - adicionar `lab_cost_usd` separado para transparência.
- `src/routes/api/admin/report-requests.pipeline.ts`
  - mesmo tratamento para `avg_cost_usd`.

Generalizar `fetchExpense30d()` para aceitar `sinceIso` (hoje hardcoded a 30d) — preserva back-compat criando wrapper.

### B. Reescrever banner Contactos para reflectir o fluxo LM-first

Substituir os 3 cards actuais por uma sequência alinhada com o novo funil real:

```
Visitantes → Inscrição LM   →  Inscrição LM → Checkout   →  Checkout → Pago
   (—, sem tracker)              (real)                          (real)
```

Onde:
- **Inscrição LM** = leads criados na janela (todos passam por LM agora).
- **Checkout iniciado** = leads com ≥1 linha em `lead_payments` (qualquer status).
- **Pago** = leads com pelo menos um `lead_payments.status='paid'`.

`/api/admin/leads-funnel`:
- remover `reportsToLm` (deixa de ter sinal);
- adicionar opcional `visitorsToLm` (devolve `null` enquanto não houver tracker, igual ao FunnelSection);
- manter `lmToCheckout` e `checkoutToPaid` mas com denominador = todos os leads da janela (em vez de subset LM via marketing_consent + events). Justificação: se LM é inscrição inicial, todo lead é LM-subscriber por construção. O subset `marketing_consent` mede consentimento de marketing, é outra coisa.

`LeadsConversionBanner`:
- 3 cards: "Inscrições LM (30d)" · "Inscrição → Checkout" · "Checkout → Pago".
- O primeiro mostra absoluto (ex.: 8 inscrições), não percentagem.
- Labels em sentence case, sem "REPORTS → LM".

### C. Coerência narrativa

- Renomear `cost_public_30d` → `cost_production_30d` no payload do `/api/admin/overview-kpis` (ou alias) para alinhar com a nova taxonomia já vigente noutros sítios. Não-bloqueador.
- Adicionar uma linha em rodapé do `CostSummaryCard` e do `ExpenseSection`: "Inclui apenas produção (Apify Lab excluído — ver /admin/apify-lab)".

---

## 3. Plano de execução

1. **Refactor de custos em /relatorios** (P1) — `report-requests.metrics.ts` e `report-requests.pipeline.ts` passam a chamar `fetchExpense30d()` parametrizado. Ajustar `MetricsSection` e `PipelineSection` para mostrar `lab_cost_30d` como sub-linha informativa.
2. **Banner Contactos** (P2) — reescrever `/api/admin/leads-funnel` e `LeadsConversionBanner` com a sequência LM→Checkout→Pago, removendo "Reports → LM".
3. **Rodapés explicativos** (C) — adicionar disclaimer "produção (Lab excluído)" em CostSummaryCard e ExpenseSection.
4. **Testes** — actualizar `src/lib/admin/__tests__/overview-kpis.test.ts` e criar smoke test que confirme: `overview-kpis.cost_total_30d ≈ report-requests/metrics.total_cost_usd + lab_cost_30d`.
5. **Validação** — `bunx tsc --noEmit` + browser QA dos KPIs antes/depois com query SQL de controlo em `provider_call_logs`.

## 4. Ficheiros a tocar

- `src/lib/admin/system-queries.server.ts` — `fetchExpense30d(sinceIso?)` parametrizável.
- `src/routes/api/admin/report-requests.metrics.ts` — usar fetchExpense30d, devolver lab_cost separado.
- `src/routes/api/admin/report-requests.pipeline.ts` — idem para avg_cost.
- `src/components/admin/v2/relatorios/metrics-section.tsx` — render lab_cost como secondary.
- `src/routes/api/admin/leads-funnel.ts` — novo shape (visitors/lm/checkout/paid).
- `src/components/admin/v2/beta-leads/leads-conversion-banner.tsx` — 3 cards LM-first.
- `src/components/admin/v2/visao-geral/cost-summary-card.tsx` e `.../expense-section.tsx` — rodapé "Lab excluído".
- `src/lib/admin/__tests__/overview-kpis.test.ts` — novos asserts de coerência.

## 5. Risco e fora-de-escopo

- **Fora**: alterar `aggregateCostsBySourceContext`, mexer em `apify_lab_runs` mirror trigger, ou tocar Receita's pré-receita (já honesto).
- **Risco baixo**: o refactor é puramente de leitura, não escreve em provider_call_logs nem altera RLS. O único risco é cosmético — KPIs em /relatorios vão BAIXAR quando o Lab estiver activo, o que é o comportamento desejado.

---

## Perguntas antes de avançar

Duas decisões para confirmar:

1. **Banner Contactos** — confirmas que o 1.º card passa a ser "Inscrições LM" (número absoluto, sem percentagem) e que se remove de vez "Reports → LM"? Ou preferes manter um "Análise pública → Inscrição LM" se mais tarde tivermos tracker anónimo?
2. **KPI "custo médio por relatório" em /relatorios** — quando refazer com `production_cost_30d`, o denominador deve ser `total_analyses` (todas as análises, incluindo cache) ou apenas `fresh_analyses` (que efectivamente gastaram dinheiro)? Hoje é `total_analyses` (artificialmente baixa o custo médio). Recomendo `fresh_analyses` para alinhar com `cost_per_unlocked_report` da Visão Geral.

Se confirmares ambas, avanço com a implementação tal como descrita.
