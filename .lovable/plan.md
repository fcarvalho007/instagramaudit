## Objetivo

Adicionar um novo bloco visual `BetaConversionFunnel` à rota `/admin/visao-geral` com 6 etapas reais do ciclo beta (pedido → interesse comercial), usando dados Supabase reais. O `FunnelSection` existente (visitantes → leads → clientes, hoje a zero porque não há checkout) mantém-se e este novo bloco aparece **acima** dele como o funil operacional do beta.

## Inspeção (read-only)

- Source: `bacfa751-…/src/components/crm/ConversionFunnelBlock.tsx` — usa mocks (`@/pages/crm/mockData`), tokens do projeto webinar (`hsl(var(--blue-600))`, `--ink-*`), terminologia paga (Inscritos/Pagaram/Receita) e breakdown por plano. **Apenas a ideia visual** (barras horizontais com label, valor, %, drop-off) é aproveitada — nenhum import/copy.
- InstaBench: `/admin/visao-geral` já carrega `FunnelSection` (visitantes/leads/clientes — placeholder a zero), `RevenueSection`, `ExpenseSection`, `KanbanSection`, `IntentSection`. Pattern de dados: server functions em `src/server/admin/*.functions.ts` ou rotas `src/routes/api/admin/*.ts` com `requireAdminSession()` + `supabaseAdmin`.
- Lifecycle e fontes de dados já existentes:
  - `lead.commercial_status` (`lead-lifecycle.ts`) com ordem `novo_pedido → em_analise → relatorio_gerado → link_enviado → relatorio_visto → feedback_pedido → feedback_recebido → interessado → potencial_cliente → convertido`.
  - `report_requests.analysis_snapshot_id` / `request_status` para "relatórios gerados".
  - `product_events` com `report_link_sent`, `report_viewed`.
  - `beta_feedback` (1 linha por feedback).
  - `interpretFeedback()` (`feedback-intent.ts`) classifica intenção `alto|medio|baixo|sem`.

## Mapeamento das 6 etapas (lógica de dados)

Período fixo: todas as leads não arquivadas (sem filtro por `period` para já — manter simples; o `PeriodSelect` global continua a aplicar-se a outras secções).

1. **Pedidos beta** — `count(leads)` (todas).
2. **Relatórios gerados** — `count(distinct lead_id)` em `report_requests` onde `analysis_snapshot_id IS NOT NULL` **OU** `request_status IN ('ready','completed','generated')` **OU** `lead.commercial_status` ≥ `relatorio_gerado` na ordem do funil.
3. **Links enviados** — leads com `commercial_status` ≥ `link_enviado` **OU** que tenham pelo menos um `product_events.event_type = 'report_link_sent'`.
4. **Relatórios vistos** — leads com `commercial_status` ≥ `relatorio_visto` **OU** com `product_events.event_type = 'report_viewed'` (associado por `lead_id` ou pelo `handle` do report request).
5. **Feedback recebido** — leads com `commercial_status` ≥ `feedback_recebido` **OU** com pelo menos uma linha em `beta_feedback`.
6. **Interesse comercial** — leads com `commercial_status IN ('interessado','potencial_cliente','convertido')` **OU** cujo `beta_feedback` mais recente passe em `interpretFeedback()` com `intent IN ('alto','medio')`.

Cada etapa é um `Set<lead_id>` para garantir contagem distinta. % por etapa = `count / count(Pedidos beta)`. Drop-off = `count(prev) - count(curr)`.

## Ficheiros a criar / alterar

1. **Criar** `src/routes/api/admin/beta-funnel.ts` (rota server `GET /api/admin/beta-funnel`):
   - `requireAdminSession()`.
   - Lê: `leads` (id, commercial_status, archived_at), `report_requests` (lead_id, analysis_snapshot_id, request_status), `product_events` (lead_id, handle, event_type) onde `event_type IN ('report_link_sent','report_viewed')`, `beta_feedback` (lead_id, usefulness_score, purchase_intent, pricing_preference, contact_consent, created_at).
   - Constrói os 6 sets em memória e devolve `{ success, stages: [{ key, label, count, pctOfTotal, dropFromPrev }], total }`.
2. **Criar** `src/components/admin/v2/visao-geral/beta-conversion-funnel.tsx`:
   - Usa `useQuery(['admin','beta-funnel'])` com `fetch('/api/admin/beta-funnel')`.
   - Renderiza dentro de `AdminCard` + `AdminSectionHeader` (`accent="leads"`).
   - 6 linhas: label esquerda · barra (`bg-admin-surface`, fill `rgb(var(--admin-leads-500))`, largura proporcional a `count/maxCount`) · `count` + `(%)` à direita.
   - Por baixo de cada linha (excepto última): `↓ {pctVsPrev}% conversão · drop {dropFromPrev}` em texto pequeno `text-admin-text-tertiary`.
   - Mobile (`max-sm`): label encurta (`w-[120px]`), barra ocupa o resto, sem alterações de empilhamento (já é vertical).
   - Empty state (`total === 0`): mensagem "Sem leads beta ainda — assim que chegar o primeiro pedido, o funil aparece aqui."
   - Loading: skeleton de 6 linhas.
   - Erro: `SectionState`/texto neutro.
3. **Editar** `src/routes/admin.visao-geral.tsx`:
   - Importar `BetaConversionFunnel` e renderizar **antes** de `<FunnelSection />`.
   - Nenhuma outra alteração.

## Restrições respeitadas

- Sem alterações a schema, providers, public report ou geração de relatórios.
- Apenas leitura de Supabase via `supabaseAdmin` server-side.
- Sem mocks, sem hardcoded colors (usa `--admin-leads-*`, `admin-surface`, `admin-text-*`, `admin-border`).
- Sem terminologia webinar (Inscritos/Pagaram/Receita/Plano).
- Labels pt-PT e Acordo Ortográfico.

## Validação

- `bunx tsc --noEmit`
- `bunx vitest run`
- Manual em `/admin/visao-geral`:
  - Bloco "Funil beta" aparece acima do funil cinematográfico actual.
  - Contagens batem certo com a Kanban (`/admin/beta-leads`).
  - Empty state OK quando não há leads (testar mentalmente ou em ambiente vazio).
  - 375px sem overflow horizontal.

## Output final que entregarei após implementação

- Ficheiros inspecionados (já listados).
- Ficheiros criados/alterados (3).
- Lógica de dados por etapa (já especificada acima).
- Resultados de `tsc` e `vitest`.
