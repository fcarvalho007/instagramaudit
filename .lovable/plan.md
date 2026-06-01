## Resumo
Reorganizar `/admin/visao-geral` para responder às 4 perguntas da manhã no topo (Novos inscritos · Receita · Custo total · Margem/lead), seguidas de um alerta de margem, e condensar funil+custos numa fila de 2 colunas. Operacional (follow-ups, últimos relatórios) desce. Detalhe pesado de custos sai da página (já existe em `/admin/sistema`). Sem alterações ao backend de análise/providers/relatórios.

## O que vai mudar e o que NÃO muda

**Muda** (só `src/routes/admin.visao-geral.tsx` e componentes em `src/components/admin/v2/visao-geral/`):
- Topo com 4 KPI cards (linha) — novo
- Banner de alerta de margem — novo (condicional: visível enquanto margem < 0)
- Bloco 2 colunas: Funil condensado (esq) + Custo por fornecedor + custo médio + fiabilidade (dir)
- Rodapé: Follow-ups + Últimos relatórios (já existem, ficam no fim)

**Não muda**:
- Endpoints existentes (`/api/admin/funnel`, `/api/admin/sistema/expense-30d`, `/api/admin/follow-ups`, `/api/admin/beta-funnel`)
- `/admin/sistema` (continua a ter o detalhe Apify por actor, OpenAI por operação, reconciliação, evolução diária)
- Backend de análise, providers, relatórios

## Fórmulas (a confirmar antes do build)

A "Margem/lead" é a peça nova e o utilizador pediu explicitamente para confirmar a fórmula antes de fixar. Proposta:

```
custo_total_30d   = expense30d.total                 (provider_call_logs, 30d)
receita_total_30d = 0                                (sem checkout ligado → fixo 0; placeholder)
novos_leads_30d   = COUNT(leads WHERE created_at >= now()-30d)
custo_por_lead    = custo_total_30d / novos_leads_30d   (se leads > 0)
receita_por_lead  = receita_total_30d / novos_leads_30d (= 0 enquanto checkout off)
margem_por_lead   = receita_por_lead - custo_por_lead
```

⚠ **Pergunta para o user antes de implementar**:
1. Confirmas `custo / leads` (e não `custo / análises`)? Sabendo que cada lead pode gerar várias análises depois (2 grátis), os dois denominadores divergem rapidamente. O mockup diz "9 leads" — sugere `leads` como denominador, mas a tua nota final levanta a dúvida.
2. Confirmas que receita fica fixa a 0 até EuPago/Stripe ligarem (sem ler `lead_payments`)? `lead_payments` existe na DB mas está vazia.
3. O texto "checkout por ligar" no card de Receita é literal ou queres mostrar `lead_payments.status='paid'` quando aparecerem?

Sem resposta a estas, assumo as 3 propostas acima e marco no código como `// TODO confirm formula`.

## Endpoint novo

`GET /api/admin/overview-kpis` — agrega os 4 KPIs da fila topo num único call (evita N requests do dashboard). Read-only, `requireAdminSession`.

```sql
-- leads 30d
SELECT COUNT(*) FROM leads WHERE created_at >= now() - interval '30 days';
-- leads esta semana (delta)
SELECT COUNT(*) FROM leads WHERE created_at >= now() - interval '7 days';
-- custo 30d → reutiliza fetchExpense30d() (já existe)
-- receita 30d → 0 (placeholder até checkout)
```

Devolve `{ leads_30d, leads_7d, cost_total, revenue_total, cost_per_lead, revenue_per_lead, margin_per_lead, checkout_enabled: false }`.

## Componentes (novos / alterados)

**Novos** em `src/components/admin/v2/visao-geral/`:
1. `overview-kpi-row.tsx` — 4 cards (Novos inscritos · Receita · Custo total · Margem/lead). Margem ganha estado `warning` (amarelo) quando < 0 e `success` quando > 0. Usa `AdminCard` existente + `tabular-nums`.
2. `margin-alert.tsx` — banner âmbar com mensagem "A gerar custo sem receita. Cada análise custa ~$X e o checkout ainda não está ligado — prioridade para fechar a margem." Condicional `margin_per_lead < 0`.
3. `funnel-cost-row.tsx` — wrapper grid 2-col que junta funil condensado (esq) + custos resumidos (dir).
4. `cost-summary-card.tsx` — versão condensada de `expense-section.tsx`: só fornecedores (Apify/OpenAI/DataForSEO) com barras + total + fiabilidade média. Detalhe pesado fica em `/admin/sistema`.

**Alterados**:
5. `funnel-section.tsx` — condensar para barras horizontais empilhadas (estilo do mockup), 5 etapas: Report público visto (placeholder "sem tracker") · Email submetido · Conta criada · Feedback recebido · Convertido (pago). Eliminar artefacto "300%". Nota explicativa no fim sobre etapas a 0%. Aceita prop `compact`.
6. `revenue-section.tsx` — eliminar (a receita passa a viver no KPI row).
7. `expense-section.tsx` — eliminar do uso em `/visao-geral` (continua disponível para `/admin/sistema` se for usada lá; se não, apaga; vou verificar).
8. `admin.visao-geral.tsx` — nova ordem:
   ```
   <ExecutionModeStrip />
   <OverviewKpiRow />
   <MarginAlert />  ← condicional
   <FunnelCostRow>
     <FunnelSection compact />
     <CostSummaryCard />
   </FunnelCostRow>
   <PriorityFollowups />     ← já existe, fica em baixo
   <IntentSection />         ← já existe (últimos relatórios + repetidas), fica em baixo
   ```

Remover do uso: `BetaConversionFunnel` (substituído pelo novo funil unificado), `RevenueSection` (absorvido pelo KPI), `KanbanSection` (era stub 19 linhas), `ExpenseSection` (detalhe pesado fica só em /sistema). Os ficheiros mantêm-se até confirmares — só descontecto do route.

## Design (tokens existentes, sem hardcode)

- KPI cards: `AdminCard` accent variant — `leads` (azul) / `revenue` (verde) / `expense` (cinza) / `warning` âmbar (margem negativa)
- Eyebrows: `text-eyebrow` (Inter uppercase, já existente)
- Números: `tabular-nums font-semibold` — admin pode usar `admin-code` em IDs/timestamps mas KPIs ficam Inter
- Banner âmbar: `admin-callout` accent="warning" (já existe)
- Funil: barras horizontais com gradient da paleta `--admin-leads-*`
- Grid: `grid-cols-1 lg:grid-cols-2 gap-6` para o bloco funil+custos

## Métricas futuras (notas, não implementar agora)

O user listou 3 que faltam mas dependem do tracking do modal (onboarding events que já estão a ser inseridos em `product_events` — endpoint `/api/admin/onboarding-funnel` já existe, criado na conversa anterior):
- Créditos consumidos vs atribuídos (precisa ler `credit_ledger` por `lead_id`)
- Taxa de conclusão do modal (já temos via `onboarding-funnel`)
- Leads por origem (precisa de UTM/source no schema de leads — `leads.source` já existe; podemos agrupar)

Proponho deixar como follow-up depois desta refactor: card opcional "Sinal do onboarding" no rodapé que cruza `/api/admin/onboarding-funnel` + `credit_ledger`. Fora de scope desta tarefa.

## Validação

- `bunx tsc --noEmit`
- Visual em `/admin/visao-geral` desktop (1440) e mobile (375)
- Comparar números com mockup: 9 leads, $1,74 custo, $0,19/análise, fiabilidade 84,9%

## Output após implementação

- Ficheiros criados/alterados/removidos
- SQL do endpoint novo
- Fórmula final adotada para margem (com a tua confirmação)
- Resultado `tsc`
- Notas sobre métricas do modal pendentes