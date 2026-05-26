## Auditoria — mocks estáticos em `/admin`

Percorri todas as secções v2 do admin e categorizei cada uma por fonte de dados disponível na BD.

| Página | Secção | Fonte | Acção |
|---|---|---|---|
| `/admin/visao-geral` | FunnelSection | `analysis_events`, `leads`, `report_requests` | **LIGAR** |
| `/admin/visao-geral` | IntentSection | `analysis_events`, `report_requests` | **LIGAR** |
| `/admin/visao-geral` | RevenueSection | sem checkout ainda | Empty state honesto |
| `/admin/visao-geral` | KanbanSection | sem subs | Empty state honesto |
| `/admin/relatorios` | PipelineSection | `report_requests` | **LIGAR** |
| `/admin/relatorios` | MetricsSection | `report_requests` | **LIGAR** |
| `/admin/relatorios` | ChartsSection | `report_requests` por dia | **LIGAR** |
| `/admin/relatorios` | ReportsTableSection | `report_requests` (+ endpoint já existe) | **LIGAR** |
| `/admin/perfis` | MetricsSection | `social_profiles`, `analysis_events` | **LIGAR** |
| `/admin/perfis` | TopProfilesSection | `social_profiles` | **LIGAR** |
| `/admin/perfis` | IntentOpportunitiesSection | `analysis_events`, `report_requests` | **LIGAR** |
| `/admin/perfis` | ProfilesTableSection | `social_profiles` + count `report_requests` | **LIGAR** |
| `/admin/receita` | MetricsSection (MRR) | sem subs | Empty state honesto |
| `/admin/receita` | WaterfallSection | sem subs | Empty state honesto |
| `/admin/receita` | PlansSection | sem subs | Empty state honesto |
| `/admin/receita` | CohortSection | sem subs | Empty state honesto |
| `/admin/receita` | InvoicesSection | sem pagamentos | Empty state honesto |
| Partilhado | ReportDrawer (`getMockReportDetail`) | `report_requests` + `analysis_snapshots` | **LIGAR** |

Hoje na BD: 3 `report_requests`, 7 `analysis_snapshots`, 22 `social_profiles`, 1887 `analysis_events`, 0 subs/pagamentos.

## Estratégia em duas linhas

1. **LIGAR**: substituir mocks por `useQuery` a endpoints admin novos/existentes. Remover `<DemoOnlySection>` e a alternância `demoMode ? MOCK : ZERO`. Empty state real quando a query devolve 0 linhas (sem "modo demo").
2. **Empty state honesto** (`/admin/receita` + 2 secções `/admin/visao-geral`): trocar `<DemoOnlySection>` por um `<EmptyStateCard>` declarativo a explicar "Disponível quando o checkout estiver ligado". Sem qualquer dependência de mock.

Em ambos os casos o ficheiro `src/lib/admin/mock-data.ts` deixa de ser importado por componentes de produção (continua a poder existir para `__tests__` se houver). A flag `useDemoMode` deixa de afectar a renderização do admin.

## Fora de scope (deliberado)

- Pagamentos / subs / checkout — não existem na BD; secções correspondentes ficam com empty state honesto, não mock.
- Visitantes anónimos no funil — sem tracker; mostrado como "—" com tooltip "ainda sem tracker".
- Categorização editorial de perfis (marca/retalho/influencer…) — não existe coluna; donut do TopProfiles fica agregado em "todos" até existir taxonomia.
- Deltas mês-anterior nos KPIs — exige janela comparativa; v1 mostra só o valor da janela actual com sub-texto descritivo (sem "+18% vs mês anterior" fictício).
- `/admin/sistema`, `/admin/conhecimento`, `/admin/clientes`, `/admin/beta-*`, `/admin/automacoes`, `/admin/estudo-mercado`, `/admin/email-lab`, `/admin/report-lab` — auditei e já consomem endpoints reais (não estão no inventário de mocks).

## Endpoints admin

Auth em todos: `requireAdminSession()`. Service role server-side. Sem chamadas a Apify/OpenAI/DataForSEO/Brevo/Resend.

**Já existem (reusar):**
- `GET /api/admin/report-requests` — lista paginada/filtrada.
- `GET /api/admin/reports` — snapshots activos.
- `GET /api/admin/sistema/expense-30d`, `/caps`, `/billing-reconciliation`.

**Novos:**
- `GET /api/admin/funnel` — totais 30d: análises (`analysis_events` `data_source != 'cache'`), leads (`leads`), clientes únicos (`distinct lead_id` em `report_requests`).
- `GET /api/admin/recent-reports?limit=4` — últimos `report_requests` com `lead` joined.
- `GET /api/admin/repeated-searches?days=30&limit=6` — top handles com `count(*) >= 2` em `analysis_events` agrupado por `handle, request_ip_hash`, juntando email de `leads` quando existir.
- `GET /api/admin/report-requests/metrics` — 30d: total, delivered, failed, in_progress, delivery rate %, avg minutes `email_sent_at - created_at`.
- `GET /api/admin/report-requests/pipeline` — 4 fases (pending, analysing, pdf, email) com contagem actual + saúde (`ok|warn|critical`) baseada em backlog/falhas.
- `GET /api/admin/report-requests/daily?days=30` — volume diário (delivered/failed/queued) + tempo médio diário.
- `GET /api/admin/profiles?q&filter&page&pageSize&network` — `social_profiles` ordenado por `last_analyzed_at desc`, contagem agregada de `report_requests` por `instagram_username`.
- `GET /api/admin/profiles/metrics?days=30` — unique profiles, repeated (≥2), conversão pesquisa→report, média requests/perfil.
- `GET /api/admin/profiles/top?limit=10` — top por `analyses_total` + counts de `report_requests`.
- `GET /api/admin/profiles/funnel?limit=5` — top 5 por análises com `analyses_total` e contagem `report_requests`.
- `GET /api/admin/report-detail/$id` — detalhe agregado de um `report_request` (lead, snapshot resumido, custos do `provider_call_logs` se houver) para `ReportDrawer`.

## Alterações nos componentes

### Visão Geral
- `funnel-section.tsx` — remover `useDemoMode`/`MOCK_FUNNEL`/`ZERO_FUNNEL`; `useQuery` a `/api/admin/funnel`; visitantes mostrados como `—` com info tooltip.
- `intent-section.tsx` — remover `DemoOnlySection`/`MOCK_INTENT_REPEATED`/`MOCK_REPORTS_LIST`; 2 `useQuery` (`/api/admin/repeated-searches` + `/api/admin/recent-reports`); abrir `ReportDrawer` com id real.
- `revenue-section.tsx` — remover toggle `demo`; sempre `ZERO_REVENUE_KPIS` (renomeado em texto para "Sem pagamentos ligados ainda") + chamada explícita "Disponível quando o checkout estiver ligado" como sub-texto.
- `kanban-section.tsx` — substituir `DemoOnlySection`+mock por `<EmptyStateCard reason="Kanban liga-se quando o ciclo de subscrições estiver activo (lead → trial → cliente → churn)." />`.

### Relatórios
- `pipeline-section.tsx` — remover `DemoOnlySection`+mocks; `useQuery` a `/api/admin/report-requests/pipeline`.
- `metrics-section.tsx` — remover `DemoOnlySection`+`MOCK_REPORT_METRICS`; `useQuery` a `/api/admin/report-requests/metrics`. Custo médio fica `—` com tooltip "ligar a `provider_call_logs` em iteração seguinte".
- `charts-section.tsx` — remover `DemoOnlySection`+mocks; `useQuery` a `/api/admin/report-requests/daily`.
- `reports-table-section.tsx` — remover `DemoOnlySection`+mocks; `useQuery` a `/api/admin/report-requests` (já existe) com filtros pill, paginação, loading/empty/error reais. Mapper de status (combinação `request_status`/`pdf_status`/`delivery_status`) → `delivered|processing|queued|failed`.

### Perfis
- `metrics-section.tsx` — remover demo; `useQuery` a `/api/admin/profiles/metrics`.
- `top-profiles-section.tsx` — remover demo; `useQuery` a `/api/admin/profiles/top`. Donut por categoria agregado em "todos" (1 slice) com nota "categorização editorial pendente" até existir taxonomia.
- `intent-opportunities-section.tsx` — remover demo; `useQuery` a `/api/admin/repeated-searches` (esquerda) + `/api/admin/profiles/funnel` (direita).
- `profiles-table-section.tsx` — remover demo; `useQuery` a `/api/admin/profiles` com filtros/paginação/empty reais.

### Receita
- `metrics-section.tsx`, `waterfall-section.tsx`, `plans-section.tsx`, `cohort-section.tsx`, `invoices-section.tsx` — substituir `<DemoOnlySection>` por `<EmptyStateCard>` (mesmo componente novo do Kanban), cada uma com a sua razão actual (já presente em `pendingReason`). Remover imports `MOCK_*`.

### Partilhado
- `report-drawer.tsx` — substituir `getMockReportDetail` por `useQuery` a `/api/admin/report-detail/$id`. Loading skeleton + empty/error já existentes.
- Novo `src/components/admin/v2/empty-state-card.tsx` — wrapper minimalista (header + razão + opcional CTA) para secções genuinamente sem fonte de dados. Usa os tokens admin existentes.

### Limpeza
- `src/lib/admin/mock-data.ts` — manter o ficheiro para os `__tests__` que já o usem, mas remover todos os imports de produção. Pode ficar com um header a indicar "uso restrito a testes / fixtures editoriais".
- `src/lib/admin/demo-mode.ts` — manter o hook (poderá vir a servir para testes visuais), mas nenhum componente de produção passa a consumi-lo.

## Verificação

- Cada endpoint novo verificado com `psql` (ou tool equivalente) a devolver dados não-vazios para a janela 30d, e a devolver shape válido com 0 linhas onde apropriado.
- Visual: abrir `/admin/visao-geral`, `/admin/relatorios`, `/admin/perfis`, `/admin/receita` sem o toggle "modo demonstração" e confirmar:
  - Funnel mostra os 3 leads + 22 perfis + 3 clientes reais (sem visitantes).
  - Relatórios: tabela com `lg_portugal`, `robs.cortez`, `frederico.m.carvalho`; pipeline com 3 em "pending/unlocked".
  - Perfis: tabela com 22 perfis, top por `analyses_total`.
  - Receita: 5 cartões empty com razão "Disponível quando o checkout estiver ligado".
- Loading: skeletons em cada secção.
- Erro: empty state com botão "Tentar novamente" (chama `query.refetch()`).
- `bunx vitest run` verde.

## Fases de execução (1 PR por fase)

1. **Fase 1 — Infra**: criar `EmptyStateCard`, criar `/api/admin/funnel`, `/api/admin/recent-reports`, `/api/admin/repeated-searches`, `/api/admin/report-detail/$id`. Ligar `ReportDrawer`, `IntentSection`, `FunnelSection`.
2. **Fase 2 — Relatórios**: criar `/api/admin/report-requests/{metrics,pipeline,daily}`. Ligar `PipelineSection`, `MetricsSection`, `ChartsSection`, `ReportsTableSection`.
3. **Fase 3 — Perfis**: criar `/api/admin/profiles/{*,metrics,top,funnel}`. Ligar as 4 secções da tab Perfis.
4. **Fase 4 — Receita e limpeza**: trocar 5 secções da Receita + `RevenueSection` + `KanbanSection` por `EmptyStateCard`. Remover imports MOCK de produção; varredura final com `rg "MOCK_|DemoOnlySection" src/components/admin` a devolver vazio.

Cada fase é entregue, validada visualmente e só então avança a seguinte — assim mantemos a regra do workspace "uma feature por prompt" mas com a auditoria toda já feita à partida.

## Ficheiros tocados (totais)

Novos: 11 endpoints + 1 componente (`empty-state-card.tsx`).
Editados: 17 secções (4 visao-geral, 4 relatórios, 4 perfis, 5 receita) + `report-drawer.tsx`.
Não tocados: rotas (`admin.*.tsx`), `mock-data.ts` (apenas perde imports de produção), tokens, design system, qualquer fluxo público.

## Checkpoint

- ☐ Fase 1: `EmptyStateCard`, 4 endpoints (`funnel`, `recent-reports`, `repeated-searches`, `report-detail`), ligar `FunnelSection`/`IntentSection`/`ReportDrawer`.
- ☐ Fase 2: 3 endpoints relatórios + ligar 4 secções `/admin/relatorios`.
- ☐ Fase 3: 4 endpoints perfis + ligar 4 secções `/admin/perfis`.
- ☐ Fase 4: receita + kanban + revenue em `EmptyStateCard`; remover imports MOCK de produção.
- ☐ `rg "MOCK_|DemoOnlySection" src/components/admin` devolve vazio.
- ☐ `bunx vitest run` verde.
- ☐ Walk-through visual das 4 páginas com dados reais.
