
# Fase 4 — Substituir mocks de receita por `EmptyStateCard`

Última fase do desmantelamento dos mocks em `/admin`. Tudo o que depende de subscrições, MRR, faturas ou kanban de clientes — dados que só existem quando o checkout estiver ligado — passa a mostrar `EmptyStateCard` em vez de números fictícios.

## Substituições (6 secções)

Cada ficheiro é reduzido a um wrapper fino sobre `EmptyStateCard` (mesmo padrão já usado em `kanban-section.tsx`). Imports a `MOCK_*` e `DemoOnlySection` são removidos.

### `/admin/visao-geral`
- `src/components/admin/v2/visao-geral/revenue-section.tsx`  
  → "Receita" · accent `revenue` · reason: receita a zero porque o checkout (EuPago/Stripe) ainda não está ligado.

### `/admin/receita` (5 secções)
- `metrics-section.tsx` → "Métricas principais" · accent `revenue` · MRR/ARR/ARPU/Churn dependem de subscrições.
- `waterfall-section.tsx` → "Anatomia do MRR" · accent `revenue` · waterfall só faz sentido com movimentos reais de MRR.
- `plans-section.tsx` → "MRR por plano" · accent `revenue` · distribuição por plano exige subscrições activas.
- `cohort-section.tsx` → "Cohort de retenção" · accent `leads` · cohort retention exige histórico de subscrições.
- `invoices-section.tsx` → "Últimas faturas" · accent `revenue` · faturas vêm do gateway de pagamento.

## Mantém-se intacto
- `ExpenseSection` (já liga a dados reais via `adminFetch` / `provider_call_logs`).
- `BillingImportForm` e `ReconciliationSection` em `/admin/receita` (operacionais para Apify/OpenAI/DFS).
- `admin.receita.tsx` página — só carrega as mesmas 6 secções; nada a alterar lá.

## Limpeza opcional (não-bloqueante)
- Os MOCK_* (MOCK_MRR_METRICS, MOCK_MRR_WATERFALL, MOCK_INVOICES, etc.) deixam de ser referenciados. **Não vou removê-los** de `src/lib/admin/mock-data.ts` neste passo — outros ficheiros (ex.: tests) podem importá-los. Avalio depois numa passagem de limpeza separada se confirmar zero referências.

## Checkpoint
- ☐ 6 ficheiros agora renderizam `EmptyStateCard` em vez de mocks
- ☐ `/admin/visao-geral` e `/admin/receita` sem números fictícios visíveis
- ☐ `ExpenseSection` continua a mostrar custos reais
- ☐ Build sem erros de import
