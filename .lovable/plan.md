## Estado atual

`/admin/visao-geral` já monta um **`BetaConversionFunnel`** (linha 102 de `admin.visao-geral.tsx`) que consome `GET /api/admin/beta-funnel`. UI, design tokens, layout responsivo e empty state já estão prontos e encaixam no spec. **O que precisa de mudar são as 7 etapas** — o endpoint atual mede o fluxo beta operacional (Pedidos → Relatórios → Links → Vistos → Feedback → Interesse → Convertidos), enquanto o spec novo pede o **funil de conversão pública** (Report visto → Unlock → Guardado → Feedback → Intenção → Convertido).

## Mapeamento das novas etapas

| # | Label pt-PT | Fonte de dados | Unidade |
|---|---|---|---|
| 1 | Report público visto | `product_events.event_type = 'report_viewed'` | views únicos por `(handle, actor_hash)` |
| 2 | Unlock iniciado | `product_events.event_type IN ('unlock_clicked','unlock_email_submitted')` | `actor_hash` distintos |
| 3 | Unlock concluído | `product_events.event_type = 'unlock_completed'` | `lead_id` distintos |
| 4 | Report guardado | `product_events.event_type = 'report_saved_to_account'` | `lead_id` distintos |
| 5 | Feedback recebido | row em `beta_feedback` (ou `event_type = 'feedback_submitted'`) | `lead_id` distintos |
| 6 | Intenção média/alta | `interpretFeedback(latestFeedback).intent ∈ {alto, medio}` OU `commercial_status ∈ {interessado, potencial_cliente, convertido}` | `lead_id` distintos |
| 7 | Convertido | `leads.commercial_status = 'convertido'` | `lead_id` distintos |

**Conversões mostradas por etapa** (já existe na UI):
- `count` absoluta
- `pctOfTotal` (vs etapa 1, "report visto")
- `pctVsPrev` (vs etapa anterior)

## Nota técnica importante (transição anónimo → lead)

As etapas 1 e 2 medem actores **anónimos** (visitantes públicos identificados por `actor_hash`). Etapas 3-7 medem **leads identificados** (`lead_id`). Há sempre uma quebra estrutural na transição 2→3 (assinar email = nascer um lead). Consequência:
- Os rácios `pctVsPrev` continuam matematicamente calculáveis mas conceptualmente são "% de visitantes anónimos que se tornaram leads".
- Adicionar pequeno texto informativo (`info` no `AdminSectionHeader`) explicando que etapas 1-2 são públicas/anónimas e 3-7 são por lead.

## Ficheiros afetados

**Editar:**
- `src/routes/api/admin/beta-funnel.ts` — substituir as 7 etapas atuais pelas novas. Lógica nova:
  1. Carregar `product_events` filtrados pelos 5 event_types relevantes (numa query) com `lead_id`, `handle`, `actor_hash`, `event_type`.
  2. Agregar em conjuntos: `s1` por `(handle + actor_hash)`, `s2` por `actor_hash`, `s3..s4` por `lead_id`.
  3. Carregar `beta_feedback` (último por lead) → `s5` e calcular `s6` via `interpretFeedback`.
  4. Carregar `leads.commercial_status` para os IDs envolvidos → `s6` (alargar com status comercial) e `s7` (converted).
  5. Devolver mesma shape (`{ success, total, stages: [...] }`) — total = `s1.size`.
- `src/components/admin/v2/visao-geral/beta-conversion-funnel.tsx` — atualizar copy: título "Funil de conversão pública", subtítulo "do report público à conversão", `info` com nota anónimo→lead.

**Não criar nada novo.** Não alterar:
- Schema BD
- Componente está pronto, design system intacto
- `interpretFeedback` (puro, server-safe, já usado)
- Resto do `/admin/visao-geral` (FunnelSection operacional fica como está, em paralelo)

## Cuidados de robustez

- **Divisão por zero**: já tratada em `formatPct` (devolve "0%").
- **Total = 0**: já tratado (empty state mostra "Sem leads beta ainda" — atualizar copy para "Ainda sem visualizações públicas").
- **Counts decrescentes**: a UI assume que cada stage ⊆ stage anterior; com a transição anónima→lead, **isto pode falhar** (um lead pode submeter feedback sem nunca ter um `report_viewed` registado, p.ex. fluxo legado). Mitigação: garantir monotonicidade no servidor (`s_i = s_i ∩ unidade_consistente` ou simplesmente clamping `count_i = min(count_i, count_{i-1})` apenas para `pctVsPrev` quando aplicável). Decisão: **não fazer clamp**; mostrar números reais e deixar pequena nota se necessário. UI atual já tolera (usa `Math.max((count/max)*100, 4%)`).
- **Performance**: agregação em memória é OK enquanto `product_events` < ~50k. Se crescer, mover para SQL agregado posterior.

## Validação

- `bunx tsc --noEmit`
- `bunx vitest run`
- Manual:
  1. `/admin/visao-geral` carrega sem erro
  2. Card "Funil de conversão pública" mostra 7 barras com novos labels
  3. Conta de etapa 1 ≈ views públicos únicos; conta de etapa 7 ≈ Kanban "convertido"
  4. Sem dados → mensagem "Ainda sem visualizações públicas"
  5. Mobile (375px): labels truncam para 120px sem quebrar layout (já testado pela UI atual)

## Riscos

- **Quebra de utilizadores externos do endpoint**: `/api/admin/beta-funnel` só é consumido pelo componente `BetaConversionFunnel` (verificado por grep). Mudar as etapas é seguro.
- **Perda da vista operacional beta** (Pedidos → Links → Feedback): essa vista é útil para Tomás. Como `/admin/visao-geral` já tem `FunnelSection` ao lado, posso (sub-decisão) renomear o atual `BetaConversionFunnel` para "Funil operacional" e adicionar um segundo componente "Funil de conversão pública". **Recomendação**: substituir, conforme spec literal pede; se quiseres preservar ambos, indica antes de implementar.