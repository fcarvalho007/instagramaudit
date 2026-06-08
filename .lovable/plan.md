# Auditoria GTM — Admin AuditProfiles

## TL;DR
**Support Readiness: 52/100.** O admin é tecnicamente completo (toda a informação existe) mas exige que o agente de suporte navegue entre 3-4 secções desconexas e, em 2 perguntas críticas, recorra a SQL. **2 bloqueadores antes de lançamento público**, 7 limitações aceitáveis para beta.

**Recomendação:** Resolver B1 + B2 antes de abrir a utilizadores reais pagantes. Tudo o resto pode entrar em beta com onboarding mínimo do suporte.

---

## 1. Matriz PASS/FAIL por secção × 10 perguntas

| Secção \ Pergunta | Q1 Pagou? | Q2 Produto? | Q3 Entitlement? | Q4 Saldo? | Q5 Ledger? | Q6 Janela? | Q7 Cache/fresh? | Q8 Custo Apify? | Q9 Emails? | Q10 Jornada<2min? |
|---|---|---|---|---|---|---|---|---|---|---|
| **Lead Detail Sheet** | 🟡 | 🟡 | ❌ | ✅ | ✅ | ✅ | ✅ | 🟡 | 🟡 | 🟡 |
| **Receita / Payments** | ✅ | ✅ | 🟡 agreg | – | – | – | – | – | – | ❌ |
| **Report Drawer** | – | 🟡 | – | – | – | ✅ | ✅ | ✅ | ✅ | 🟡 |
| **Sistema / Costs** | – | – | – | – | – | – | – | ✅ | – | ❌ |
| **Email Lab** | – | – | – | – | – | – | – | – | 🟡 agreg | ❌ |
| **Automações** | – | – | – | – | – | – | – | – | 🟡 agreg | ❌ |
| **/admin/clientes + /leads** | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Visão Geral** | – | – | – | – | – | – | – | – | – | ❌ KPI only |

Legenda: ✅ PASS · 🟡 PARTIAL · ❌ FAIL · – N/A

## 2. Score: **52/100**

| Componente | Peso | Score | Pond. |
|---|---|---|---|
| Saldo + ledger de créditos (Q4/Q5) | 15% | 95 | 14.3 |
| Janela + cache badge (Q6/Q7) | 10% | 90 | 9.0 |
| Custo Apify por relatório (Q8) | 10% | 80 | 8.0 |
| Status de pagamento por lead (Q1/Q2) | 15% | 45 | 6.8 |
| Entitlement por lead (Q3) | 15% | 0 | 0.0 |
| Log de emails completo (Q9) | 15% | 55 | 8.3 |
| Drilldown único <2min (Q10) | 20% | 30 | 6.0 |
| **Total** | **100%** | | **52** |

## 3. Bloqueadores antes do lançamento público

### 🚨 B1 — Status de entitlement por lead invisível
Após o webhook EuPago criar `lead_entitlements`, nada na UI confirma se ficou granted. `lead-credit-activity.$id.ts` não dá join à tabela; `leads-kanban.ts` também não. Resultado: se um cliente paga e o webhook falha, o suporte só descobre via SQL.
**Impacto:** alto — diretamente ligado a reclamações de "paguei e não tenho acesso".

### 🚨 B2 — Pagamento não vinculado ao lead no drilldown
Lead Sheet mostra `total_paid_cents` (apenas successful). Não mostra `lead_payments.status` (pending / paid / failed), nem o URL de checkout EuPago, nem o motivo da falha. Tudo isso existe em `/admin/receita` mas sem link bidirecional.
**Impacto:** alto — "tentei pagar e não consigo" obriga a procurar manualmente na tabela global.

### ⚠️ B3 (recomendado, não crítico) — Falhas de email silenciosas por lead
Timeline do lead só mostra emails com `product_events` row. Emails que falharam antes de escrever (kill-switch, dedupe, provider error) só aparecem no ReportDrawer do relatório específico. Não há vista consolidada "3 tentativas, 2 falharam".

### ⚠️ B4 (UX, não crítico) — Sem navegação cruzada
- Receita payment row → Lead Sheet: ❌
- Lead Sheet → ReportDrawer (do relatório específico): ❌
- Lead Sheet → Provider call em Sistema: ❌

## 4. Limitações aceitáveis para beta

| # | Lacuna | Razão |
|---|---|---|
| A1 | Credits tab mostra `estimated_cost_usd`, não `actual` | Volume beta baixo; actual está no ReportDrawer |
| A2 | Email Lab "Enviar teste" desativado | Read-only reference, não workflow de suporte |
| A3 | Provider logs em Sistema são globais, não por lead | Investigação Apify passa por ReportDrawer |
| A4 | Automações = agregado, não per-lead | Funil interno, não cara-a-cara com cliente |
| A5 | Visão Geral sem drilldown | É dashboard de KPI |
| A6 | `email_template_overrides` não tem log per-lead | Funcionalidade ainda não anunciada |
| A7 | ActionLog do ReportDrawer só em memória | Volume beta tolera re-open |

## 5. Prompts exatos de melhoria (se decidires implementar)

### Para B1 (entitlement visibility) — **bloqueador**
```
Adicionar ao Lead Detail Sheet, no header KPI strip, uma chip "Entitlement: granted/pending/none" lendo `lead_entitlements` filtrado por `lead_id`. Estender `lead-credit-activity.$id.ts` (ou criar `lead-entitlements.$id.ts`) para devolver { product_code, granted_at, source_payment_id, status }. Render no Resumo tab como linha "Acesso concedido: <produto> em <data> · pagamento <link>".

Não alterar schema. Não alterar webhook EuPago. Apenas leitura + UI.
```

### Para B2 (per-lead payments) — **bloqueador**
```
Adicionar tab "Pagamentos" no Lead Detail Sheet OU secção no Resumo, listando lead_payments filtrados por lead_id com colunas: data, produto, valor, status (paid/pending/failed), checkout URL (EuPago), motivo de falha. Endpoint novo: lead-payments.$id.ts. Linkar cada row para a global Receita view.

Adicionar deep-link na tabela Receita: "Abrir lead →" que abre o Lead Detail Sheet daquele lead_id.

Não alterar schema. Não alterar EuPago. Apenas leitura + UI.
```

### Para B3 (email completeness) — recomendado pós-MVP
```
Adicionar tab "Emails" no Lead Detail Sheet listando todas as tentativas: success (product_events), failed (provider_call_logs com provider='resend|brevo' e status='error'), skipped (heurística: action='email_*' sem product_events posterior). Mostrar reason, timestamp, template_key, manual vs automatic trigger.

Não alterar schema. Apenas leitura + UI.
```

### Para B4 (cross-navigation) — recomendado pós-MVP
```
1) Receita payments-section: cada row tem botão "Ver lead →" que abre Lead Detail Sheet.
2) Lead Sheet → Relatórios tab: cada row tem botão "Abrir drawer" que abre ReportDrawer do report_request_id.
3) Lead Sheet → Créditos tab: cada analysis_event tem "Abrir custos" que abre ReportDrawer.

Apenas UI; nenhum endpoint novo necessário (ids já presentes).
```

## 6. Verdict final

**NÃO LANÇAR a utilizadores pagantes reais antes de B1 + B2.** Sem entitlement e payment status per-lead visíveis, o primeiro caso de "paguei e não tenho acesso" exige um engenheiro com acesso à DB — não escala para suporte de primeira linha.

**OK lançar em modo beta privado** (admin + utilizadores convidados) já agora, com o briefing de suporte abaixo.

### Briefing de suporte mínimo (beta)
- "Está esperado abrir 2-3 separadores: Lead Sheet (resumo + créditos) + Receita (procurar email do lead) + Report Drawer (custos + emails do relatório específico)."
- "Para confirmar entitlement: SQL `select * from lead_entitlements where lead_id = '<id>'` — ainda não está em UI."
- "Para email falhado sem evento: abrir o ReportDrawer do relatório correspondente."
- "Jornada típica leva 3-5 minutos (não 2)."
