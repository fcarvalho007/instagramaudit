## Resumo

Fase 2.1 ligada a dados reais para Apify, DataForSEO e OpenAI; o resto fica claramente sinalizado como mock via banner amarelo. Reuso das tabelas existentes (`provider_call_logs`, `usage_alerts`, `analysis_events`) em vez de duplicar com `provider_calls`/`system_alerts`. Sync diário implementado como rotas TanStack `/api/public/hooks/*` chamadas por `pg_cron` (alinhado com o padrão do projecto), não como Edge Functions Supabase.

## Decisões arquiteturais (divergências do prompt original, com justificação)

1. **Reusar `provider_call_logs`** em vez de criar `provider_calls`. Já tem todas as colunas (provider, actor, handle, status, http_status, duration_ms, actual_cost_usd, model, tokens, apify_run_id) e já é populada por Apify, OpenAI e DataForSEO. Criar uma tabela paralela duplicaria escritas e abriria divergência entre custo "real" e custo "logado". Cache hits derivam-se de `analysis_events.data_source='cache'`.
2. **Reusar `usage_alerts`** em vez de criar `system_alerts`. Schema é idêntico (severity, kind, handle, acknowledged_at, metric_value/threshold_value). Já é alimentada por `evaluateAlertsForEvent`.
3. **TanStack routes em vez de Edge Functions Supabase**. O knowledge do projecto diz explicitamente "Do NOT use Supabase Edge Functions". Todas as rotas server existem em `src/routes/api/`. Os jobs de sync ficam em `src/routes/api/public/hooks/sync-{apify,dataforseo,openai}-costs.ts` chamadas pelo `pg_cron` via `pg_net.http_post`. Mais barato, sem boundary cross, mesmo runtime que o resto.
4. **OpenAI `/v1/usage` é deprecated**. Para o sync OpenAI uso a Costs API nova (`/v1/organization/costs`) com `OPENAI_ADMIN_KEY` se o utilizador a fornecer; caso contrário, fallback determinístico = somar `actual_cost_usd` de `provider_call_logs WHERE provider='openai'` agrupado por dia. Esse fallback já é "real" porque o nosso código grava o custo estimado por chamada.

## Migrations (schema apenas)

```sql
-- 1. Custos diários agregados.
create table public.cost_daily (
  id uuid primary key default gen_random_uuid(),
  provider text not null check (provider in ('apify','openai','dataforseo')),
  day date not null,
  amount_usd numeric(10,4) not null default 0,
  call_count integer not null default 0,
  details jsonb,
  collected_at timestamptz not null default now(),
  unique (provider, day)
);
create index idx_cost_daily_day on public.cost_daily (day desc);
create index idx_cost_daily_provider_day on public.cost_daily (provider, day desc);
alter table public.cost_daily enable row level security;
-- Sem políticas → só service role acede (admin lê via routes server).

-- 2. Configuração admin (caps + flags futuras).
create table public.app_config (
  key text primary key,
  value text not null,
  updated_at timestamptz not null default now(),
  updated_by text
);
alter table public.app_config enable row level security;
insert into public.app_config (key, value) values
  ('cost_cap_apify_usd','29'),
  ('cost_cap_openai_usd','25'),
  ('cost_cap_dataforseo_usd','50');
```

NOTA: `provider_calls` e `system_alerts` NÃO são criadas — ver Decisão 1/2.

## Banner mock (Parte A)

Ficheiro novo `src/components/admin/v2/mock-data-banner.tsx` exactamente como no prompt (já usa estilos inline em hex; deixo assim por consistência com o resto da v2 que também usa inline styles).

Aplicação:
- `visao-geral/funnel-section.tsx` — banner com reason "Conversão visitante → cliente requer tracking de eventos e checkout integrados (próximas fases)."
- `visao-geral/revenue-section.tsx` — reason "MRR, receita avulsa e total dependem de subscrições e checkout (EuPago/Stripe). Será ligado quando integrado."
- `visao-geral/kanban-section.tsx` — reason "Pipeline de clientes requer tabela de subscrições e ciclo de vida (próxima fase)."
- `admin.receita.tsx` — banner global no topo, abaixo de `AdminPageHeader`.
- `admin.clientes.tsx` — idem.
- `intent-section.tsx`, tabs Sistema/Relatórios/Perfis — sem banner.

## Sync jobs (Parte B)

Três rotas TanStack em `src/routes/api/public/hooks/`:

- `sync-apify-costs.ts` — chama `https://api.apify.com/v2/users/me/usage/monthly?token=...`, faz `upsert` em `cost_daily` por `(provider='apify', day)` para cada item de `dailyUsages`.
- `sync-dataforseo-costs.ts` — chama `/v3/appendix/user_data`, calcula `delta = max(0, total_spent_now - total_spent_last_snapshot)` e regista hoje. Guarda `total_spent_at_snapshot` e `balance_at_snapshot` em `details`.
- `sync-openai-costs.ts` — tenta Costs API (`/v1/organization/costs?start_time=...`) com `OPENAI_ADMIN_KEY` se presente. Fallback: agrega de `provider_call_logs WHERE provider='openai'` para os últimos 30 dias (já é dado real, não mock).

Segurança das rotas:
- Header `x-internal-token: ${INTERNAL_API_TOKEN}` (já existe no projecto). Sem ele → 401.
- Validação de input mínima (não recebem body).

Cron (via `supabase--read_query`/insert tool, NÃO via migration):
```sql
select cron.schedule('sync-apify-costs','0 1 * * *', $$ select net.http_post(
  url:='https://project--b554ee82-2f67-4f5a-895d-cd69f2867df7.lovable.app/api/public/hooks/sync-apify-costs',
  headers:='{"Content-Type":"application/json","x-internal-token":"<token>"}'::jsonb,
  body:='{}'::jsonb) $$);
-- repetir para dataforseo e openai
```

Botão "Sincronizar agora" no header da tab Sistema invoca as 3 rotas em paralelo via `Promise.allSettled` (com `x-internal-token` lido de um endpoint server-side seguro — ver Parte C abaixo).

## Tab Sistema com dados reais (Parte C)

Helpers novos em `src/lib/admin/system-queries.server.ts` (server-only) + endpoints em `src/routes/api/admin/sistema.*.ts` (gated por `requireAdminSession` já existente):

- `GET /api/admin/sistema/health` →
  - Apify: último `provider_call_logs WHERE provider='apify'` nas últimas 24h, status agregado.
  - DataForSEO: idem para `provider='dataforseo'` + verificação `DATAFORSEO_LOGIN` em secrets.
  - OpenAI: idem para `provider='openai'` + verificação `OPENAI_API_KEY`.
  - Supabase: `select 1` health.
- `GET /api/admin/sistema/runtime-checks` →
  - APIFY_TOKEN presente, APIFY_ENABLED, APIFY_TESTING_MODE, APIFY_ALLOWLIST não vazia.
  - Mesma matriz para DataForSEO e OpenAI.
  - Lê valores de `process.env` (server-side); devolve apenas booleanos e strings curtas, NUNCA o token.
- `GET /api/admin/sistema/secrets` →
  - Lista canónica de secrets esperados (ADMIN_ALLOWED_EMAILS, APIFY_*, DATAFORSEO_*, OPENAI_*, RESEND_API_KEY, INTERNAL_API_TOKEN).
  - Para cada um: `{ name, present: !!process.env[name] }`.
  - Nunca devolve valores.
- `GET /api/admin/sistema/cost-metrics-24h` →
  - Apify 24h: soma `actual_cost_usd` em `provider_call_logs WHERE provider='apify' AND created_at >= now()-24h`. Fallback: somar `cost_daily` para hoje.
  - OpenAI 24h: idem.
  - DataForSEO 24h: idem.
  - Cache hits: `count(*)` em `analysis_events WHERE data_source='cache' AND created_at >= now()-24h`.
  - Poupança: `cache_hits * média_apify_cost_per_fresh_call` (média = soma fresh / contagem fresh nas últimas 24h; 0 se sem fresh).
- `GET /api/admin/sistema/provider-calls?limit=20` → últimas 20 linhas de `provider_call_logs` ordenadas por `created_at desc`. Map para o shape da tabela existente: hoje → `HH:MM`, outro dia → `DD/MM HH:MM`.
- `GET /api/admin/sistema/alerts` → `usage_alerts WHERE acknowledged_at IS NULL ORDER BY created_at DESC`.
- `POST /api/admin/sistema/alerts/:id/ack` → `update usage_alerts set acknowledged_at = now() where id=$1`.

`SecretsConfigSection`, `HealthSection`, `CostsDetailSection`: trocar imports de `MOCK_*` para `useQuery` apontando às rotas acima, com `refetchInterval: 60_000`.

`MOCK_APIFY_CONFIG` em `secrets-config-section.tsx`: substituir por leitura de runtime-checks. Allowlist passa a ser `process.env.APIFY_ALLOWLIST.split(',')`.

## Visão Geral · Despesa (Parte D)

`expense-section.tsx`:
- Endpoint novo `GET /api/admin/sistema/expense-30d` devolve `{ apify_total, openai_total, dataforseo_total, daily: [{day, apify, openai, dataforseo}] }` agregado de `cost_daily` para os últimos 30 dias.
- KPI strip antes do gráfico: 4 colunas (Total, Apify, OpenAI, DataForSEO).
- Gráfico empilhado: 3 séries com cores `#BA7517` (apify), `#185FA5` (openai), `#534AB7` (dataforseo).
- Sub do KPI DataForSEO: `${calls} chamadas · saldo $${balance}` (balance vem de `cost_daily.details->balance_at_snapshot` mais recente).

## Caps configuráveis (Parte E)

- Endpoint `GET /api/admin/sistema/caps` → lê `app_config WHERE key LIKE 'cost_cap_%'` e devolve `{ apify, openai, dataforseo }`.
- Endpoint `PATCH /api/admin/sistema/caps` → recebe `{ apify?, openai?, dataforseo? }` validados com Zod (numeric > 0, < 1000), faz `upsert` em `app_config`.
- Botão "Editar caps" em `secrets-config-section.tsx` (renomear secção para "Configuração de custos") abre modal shadcn `Dialog` com 3 inputs.
- Caps usados nos cálculos de "Custo · 24h vs cap": ler do endpoint, não hardcoded.

## Estados loading/erro/vazio (Parte F)

Helper genérico `src/components/admin/v2/section-state.tsx` com 3 sub-componentes: `<SectionSkeleton />` (matches grid layout), `<SectionError onRetry/>`, `<SectionEmpty message/>`. Cada secção que migra para `useQuery`:
```tsx
if (isLoading) return <SectionSkeleton rows={n} />;
if (error) return <SectionError error={error} onRetry={refetch} />;
if (!data || data.length === 0) return <SectionEmpty message="..." />;
```
TanStack Query já está no projecto. `defaultOptions` já tem `refetchOnWindowFocus`.

## Ficheiros tocados (resumo)

Criados:
- `src/components/admin/v2/mock-data-banner.tsx`
- `src/components/admin/v2/section-state.tsx`
- `src/lib/admin/system-queries.server.ts`
- `src/lib/admin/cost-sync.server.ts` (helpers partilhados pelos 3 sync jobs)
- `src/routes/api/public/hooks/sync-apify-costs.ts`
- `src/routes/api/public/hooks/sync-dataforseo-costs.ts`
- `src/routes/api/public/hooks/sync-openai-costs.ts`
- `src/routes/api/admin/sistema.health.ts`
- `src/routes/api/admin/sistema.runtime-checks.ts`
- `src/routes/api/admin/sistema.secrets.ts`
- `src/routes/api/admin/sistema.cost-metrics-24h.ts`
- `src/routes/api/admin/sistema.provider-calls.ts`
- `src/routes/api/admin/sistema.alerts.ts`
- `src/routes/api/admin/sistema.alerts.$id.ack.ts`
- `src/routes/api/admin/sistema.expense-30d.ts`
- `src/routes/api/admin/sistema.caps.ts`
- `src/routes/api/admin/sistema.sync-now.ts` (chama as 3 rotas hooks)

Editados:
- 3 secções da Visão Geral (banner) + `expense-section.tsx` (dados reais + 3ª coluna).
- `admin.receita.tsx` e `admin.clientes.tsx` (banner global).
- `admin.sistema.tsx` (botão Sync now real).
- 3 secções da tab Sistema (queries reais + estados).
- `src/lib/admin/mock-data.ts` — manter MOCK_* ainda usados pelas tabs Receita/Clientes; remover apenas os que ficam sem consumidores.

Não tocados: `/report/example`, ficheiros locked, secções Visão Geral · Sinais de intenção, tabs Relatórios e Perfis (próximo prompt 2.2), cockpit legado, `provider_call_logs` schema.

## Validação

- `bunx tsc --noEmit`
- `bun run build`
- Smoke manual: visitar `/admin/sistema`, ver 4 secções carregar com skeleton e popular; clicar "Sincronizar agora"; clicar "Marcar como visto" num alerta. Confirmar banners amarelos visíveis em Visão Geral, Receita, Clientes.

## Checkpoint

- ☐ Migrations: `cost_daily` + `app_config` (sem duplicar provider_calls/system_alerts)
- ☐ MockDataBanner criado e aplicado nos 5 sítios certos
- ☐ 3 rotas de sync com auth por `INTERNAL_API_TOKEN`
- ☐ Cron `pg_cron` agendado para 01:00 UTC nas 3 rotas (insert tool, não migration)
- ☐ Tab Sistema · 4 secções com queries reais a `provider_call_logs`/`usage_alerts`/`cost_daily`/`process.env`
- ☐ Visão Geral · Despesa com 3 colunas (Apify, OpenAI, DataForSEO) + gráfico empilhado
- ☐ Caps configuráveis em `app_config` + modal de edição
- ☐ Loading/erro/vazio em cada `useQuery` nova
- ☐ `bunx tsc --noEmit` verde
- ☐ `bun run build` verde
- ☐ `/report/example` e locked files intactos
