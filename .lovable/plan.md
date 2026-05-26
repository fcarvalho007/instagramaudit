## Objectivo

Aplicar 5 refinamentos à Visão Geral / Relatórios do admin + migração ao `app_config` para subir o limite mensal grátis para 3.

## Contexto verificado

- `app_config.free_monthly_report_limit` = "2" hoje (default + linha em DB). Usado em `src/lib/quota.ts` (`FREE_MONTHLY_LIMIT = 2`), `src/lib/config/app-config.functions.ts` (`PUBLIC_APP_CONFIG_DEFAULTS.freeMonthlyReportLimit = 2`) e em `src/routes/api/request-full-report.ts` via `readAppConfig`.
- Funil público (`/api/admin/funnel`) conta `analysis_events` com `neq("data_source", "cache")` → "análises feitas · 30d".
- Pipeline (`/api/admin/report-requests/pipeline`) devolve `total_window` (Fase 1) sem garantia de monotonia entre fases.
- "Pesquisas repetidas" (`/api/admin/repeated-searches`) conta TODOS os `analysis_events` (inclui cache hits) → infla contagem; `profiles.metrics.ts` já passou a contar `analysis_snapshots` para coerência.
- Strip "Cache-only / Fresh" em `admin.visao-geral.tsx` não tem chip de cache hit-rate nem botão de refresh do mode.
- `IntentSection` já tem header "leads quentes" mas o card "Pesquisas repetidas" só tem o eyebrow textual; falta chip/badge visual consistente com o resto do admin.

## Mudanças

### 1. Alinhar contagem do funil público com pipeline
- `src/routes/api/admin/funnel.ts`: parametrizar `period` (consistente com `resolvePeriod`) e devolver dois campos:
  - `analyses_fresh` (atual `analyses`, sem cache)
  - `analyses_total` (todos os eventos, incluindo cache hits)
- `src/components/admin/v2/visao-geral/funnel-section.tsx`: mostrar `analyses_total` como número principal (alinha com `total_window` do pipeline em `/admin/relatorios`) e `analyses_fresh` como sub-texto ("X com chamada paga").
- Aceitar `period` da `PeriodSelect` (passar prop em vez de fixar 30d).

### 2. Invariante cumulativa no pipeline
- `src/routes/api/admin/report-requests/pipeline.ts` (handler já existente): garantir `phases.snapshot ≥ phases.email_submitted ≥ phases.pdf ≥ phases.email` aplicando `Math.min` em cascata antes de devolver.
- Adicionar teste unitário em `src/routes/api/admin/__tests__/pipeline-invariant.test.ts` que verifica a monotonia.
- `pipeline-section.tsx`: usar `phases.snapshot` (não `totalWindow`) em "Fase 1" para que a invariante seja visualmente honrada (Fase 1 = snapshot phase, ≥ todas as outras).

### 3. Contagem honesta de "pesquisas repetidas"
- `src/routes/api/admin/repeated-searches.ts`: ler de `analysis_snapshots` em vez de `analysis_events` (mesma fonte que `profiles.metrics.ts`), agrupando por `instagram_username` lowercased. Mantém shape de resposta (`{handle, count, last_at, lead}`).
- Actualizar `IntentSection` copy de subtitle: "Mesmo perfil com 2+ análises geradas (sem contar cache)".

### 4. Chips: "leads quentes" + cache hit-rate + refresh
- **Chip "leads quentes"**: em `intent-section.tsx`, substituir o eyebrow textual "leads quentes" por `<AdminBadge variant="signal">leads quentes</AdminBadge>` ao lado do título do card "Pesquisas repetidas".
- **Chip cache hit-rate + refresh**: em `admin.visao-geral.tsx`, dentro do `ExecutionModeStrip`:
  - Adicionar segundo chip à direita com taxa de cache hits da janela actual (`cache_hits / analyses_total`), lido de um novo endpoint `/api/admin/cache-stats?period=...` que devolve `{cache_hits, analyses_total, hit_rate_pct}` agregando `analysis_events` por `data_source`.
  - Substituir o link "Abrir Sistema" por um par: botão refresh `↻` (invalida queries `["admin", "execution-mode"]` e `["admin", "cache-stats"]`) + link "Sistema".

### 5. Migração + defaults: limite grátis = 3
- Nova migração `update app_config set value = '3' where key = 'free_monthly_report_limit'` (via insert tool, não migration tool, por ser data update).
- `src/lib/quota.ts`: `FREE_MONTHLY_LIMIT = 3`.
- `src/lib/config/app-config.functions.ts`: `PUBLIC_APP_CONFIG_DEFAULTS.freeMonthlyReportLimit = 3`.
- Pesquisar e ajustar copy hardcoded "2 relatórios" / "2 grátis" se existir.

## Detalhes técnicos

- Novo endpoint `src/routes/api/admin/cache-stats.ts`:
  - GET, `requireAdminSession`, recebe `?period=`, usa `resolvePeriod`.
  - `select data_source, count(*) from analysis_events where created_at >= since group by data_source` (via 2 queries `head: true, count: exact` filtradas).
  - Devolve `{success, window_days, analyses_total, cache_hits, hit_rate_pct}`.

- `FunnelSection` passa a aceitar `period: AdminPeriod` e propaga ao endpoint. `VisaoGeralPage` passa `period` já existente em estado.

- A regra de paridade dos templates de email (parity test) não é afectada.

## Ficheiros tocados

Novos:
- `src/routes/api/admin/cache-stats.ts`
- `src/routes/api/admin/__tests__/pipeline-invariant.test.ts`

Editados:
- `src/routes/api/admin/funnel.ts`
- `src/routes/api/admin/repeated-searches.ts`
- `src/routes/api/admin/report-requests/pipeline.ts` (aplicar `Math.min` cascata)
- `src/components/admin/v2/visao-geral/funnel-section.tsx`
- `src/components/admin/v2/visao-geral/intent-section.tsx`
- `src/components/admin/v2/relatorios/pipeline-section.tsx`
- `src/routes/admin.visao-geral.tsx` (strip com chip + refresh, passa period)
- `src/lib/quota.ts`
- `src/lib/config/app-config.functions.ts`

Data update (via insert tool):
- `UPDATE app_config SET value='3', updated_at=now() WHERE key='free_monthly_report_limit';`

## Validação

- `bunx tsc --noEmit`
- `bunx vitest run` (inclui novo teste de invariante)
- Verificação manual em `/admin/visao-geral`: strip mostra chip de cache, refresh actualiza; funil mostra total alinhado com pipeline em `/admin/relatorios`; "Pesquisas repetidas" sem cache hits.

## Fora de âmbito

- Não tocar em `personal_area_saved` (auditoria parqueada como Opção A pendente).
- Não tocar em `report.example`, `unlock.server.ts`, edge functions de email, ou copy dos templates.
- Não alterar `welcome_beta` / `report_summary`.
