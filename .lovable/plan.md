## Diagnóstico

Auditei `/admin/receita` e o que está lá **já é honesto** — não há mockup estático. Mas a organização é confusa e o título da página promete mais do que entrega.

**Estado actual:**

| Secção | Origem | Estado |
|---|---|---|
| Métricas principais (MRR/ARR/ARPU/churn) | `EmptyStateCard` | Vazio · "depende de checkout" |
| Anatomia do MRR (waterfall) | `EmptyStateCard` | Vazio · "depende de checkout" |
| Custos da plataforma (`ExpenseSection`) | `provider_call_logs` + `provider_billing_imports` | **Real** ✓ |
| MRR por plano | `EmptyStateCard` | Vazio · "depende de checkout" |
| Cohort de retenção | `EmptyStateCard` | Vazio · "depende de checkout" |
| Últimas faturas | `EmptyStateCard` | Vazio · "depende de checkout" |

Confirmei na BD: `lead_payments` tem **0 linhas**, não existe tabela de subscrições, e o knowledge do projeto proíbe ligar checkout nesta fase ("Do not implement payments yet").

**Problemas reais:**

1. **5 cartões vazios consecutivos** com a mesma razão ("depende de checkout") inflam a página e fazem parecer que está incompleta. Devia ser **um** bloco consolidado.
2. **Título "Receita e despesas"** está desalinhado: 5/6 secções não têm receita. Ou se assume que hoje é "Despesas + preparação de receita", ou se renomeia.
3. **`ExportCsvButton`** é um stub silencioso (`toast.info("em breve")`) — botão a fingir trabalho que não faz. Remover até ter export real.
4. **`PeriodSelect`** só afecta `ExpenseSection`; os outros 5 cartões ignoram-no. Sugere falsamente que filtra a página toda.
5. **Sinais reais de pré-receita que já existem na BD e não estão na página:**
   - `pricing_interest` — quem disse que pagaria e quanto (sinal de WTP real)
   - `beta_feedback.purchase_intent` + `pricing_preference` — intenção de compra dos utilizadores beta
   - `lead_payments` — contador a zero (mas pronto para quando passar a 1)
   - `leads` por `commercial_status` — funil comercial em direção à receita

## Proposta

Reorganizar a página em **3 blocos honestos**, sem mockup, com dados reais onde existem:

```text
┌─ Receita e custos ────────────────────────────────────────┐
│  (subtítulo: "Hoje: custos reais + sinais de demanda.    │
│   Métricas de subscrição activam quando o checkout for   │
│   ligado.")                                              │
│  [PeriodSelect afecta só os blocos que dependem dele]    │
└──────────────────────────────────────────────────────────┘

BLOCO 1 — Despesas reais (mantém ExpenseSection tal como está)
  · Custo por fornecedor 30d, custo por análise, reconciliação

BLOCO 2 — Sinais de pré-receita (NOVO, dados reais)
  · KPI: Pagamentos confirmados (lead_payments status='paid')
  · KPI: Receita acumulada (sum amount_cents)
  · KPI: Intenção de compra beta (% beta_feedback.purchase_intent ∈ {'sim','talvez'})
  · KPI: Sinais em /preços (pricing_interest.would_pay='sim' nos últimos 30d)
  · Tabela compacta: top respostas pricing_interest (opção + faixa + comentário)

BLOCO 3 — Receita recorrente (1 cartão consolidado, não 5)
  · Único EmptyStateCard explicando que MRR/ARR/cohort/faturas
    acendem quando o checkout EuPago/Stripe ligar
  · Lista as 4 métricas que vão aparecer (não 4 cartões separados)
```

## Ficheiros a alterar

| Ficheiro | Acção |
|---|---|
| `src/routes/admin.receita.tsx` | Recompor: remover `ExportCsvButton`, remover `MetricsSection`/`WaterfallSection`/`PlansSection`/`CohortSection`/`InvoicesSection` separados, adicionar `PreRevenueSignalsSection` e `FutureRecurringRevenueCard` |
| `src/components/admin/v2/receita/pre-revenue-signals-section.tsx` | **Novo** · KPIs + tabela alimentados por novo endpoint |
| `src/components/admin/v2/receita/future-recurring-revenue-card.tsx` | **Novo** · 1 `EmptyStateCard` consolidado (substitui os 5) |
| `src/routes/api/admin/pre-revenue-signals.ts` | **Novo** · endpoint server route que agrega `lead_payments`, `beta_feedback`, `pricing_interest` |
| `src/components/admin/v2/receita/metrics-section.tsx` | **Apagar** (substituído pelo cartão consolidado) |
| `src/components/admin/v2/receita/waterfall-section.tsx` | **Apagar** |
| `src/components/admin/v2/receita/plans-section.tsx` | **Apagar** |
| `src/components/admin/v2/receita/cohort-section.tsx` | **Apagar** |
| `src/components/admin/v2/receita/invoices-section.tsx` | **Apagar** |

Sem migração: todas as tabelas usadas já existem.

## Checkpoint

- ☐ Página passa a ter 3 blocos em vez de 6
- ☐ Zero mockup; cada número exibido vem de query real
- ☐ KPIs de pré-receita mostram valores actuais (`lead_payments`=$0, contadores de `pricing_interest` e `beta_feedback` reais)
- ☐ Botão "Exportar CSV" removido enquanto não houver export
- ☐ Subtítulo da página explica honestamente o que está e o que falta
- ☐ `bunx tsc --noEmit` limpo

Confirma se avanço, ou se preferes manter os 5 cartões MRR separados (mesmo vazios) por uma questão de "promessa visual" do produto futuro.