## Objetivo

Construir um laboratório controlado para validar empiricamente o suporte de janelas temporais (30/60/90/365 dias) do actor `apify/instagram-scraper`, sem alterar o relatório free, preços, UI ou `PUBLIC_INSTAGRAM_POSTS_LIMIT`. O lab corre testes isolados e regista resultados estruturados.

## Arquitetura

**3 ficheiros novos, 0 ficheiros de produção alterados.**

### 1. Migração: `apify_lab_runs`

Tabela isolada do pipeline de produção (não toca em `report_snapshots`, `provider_call_logs`, `leads`, etc.):

```text
apify_lab_runs (
  id uuid pk
  created_at timestamptz
  admin_email text                -- quem executou
  profile_handle text             -- @username testado
  profile_segment text            -- 'medium' | 'high' | 'low'
  window_kind text                -- 'baseline' | '30d' | '60d' | '90d' | '365d'
  input_params jsonb              -- input completo enviado ao actor
  guardrails jsonb                -- maxItems, maxTotalChargeUsd, timeoutMs
  status text                     -- 'success' | 'timeout' | 'failed' | 'budget_block'
  semantic_code text              -- ApifySemanticCode quando aplicável
  apify_run_id text               -- run id retornado
  posts_returned int
  newest_post_at timestamptz
  oldest_post_at timestamptz
  observed_days int               -- (newest - oldest) em dias
  duration_ms int
  estimated_cost_usd numeric(12,5)
  actual_cost_usd numeric(12,5)   -- usageTotalUsd do Apify
  normalize_ok boolean            -- enrichPosts() não rebenta
  notes text
  error_excerpt text
)
```

RLS: admin-only (service_role full; nenhuma policy anon/authenticated). GRANT apenas service_role.

### 2. Server route: `src/routes/api/admin/apify-lab.ts`

Protegida por `requireAdminSession()` (allowlist por email).

**POST `/api/admin/apify-lab/run`** — corre 1 teste e devolve o registo:
```text
body: { profile_handle, profile_segment, window_kind }
```

Lógica:
1. `requireAdminSession()` + `isApifyEnabled()` + `isAllowed(handle)` + `assertApifyDailyBudgetAvailable()`.
2. Constrói input por janela:
   - `baseline`: `{ resultsType: "details", resultsLimit: 12, addParentData: false }` (replica produção exatamente)
   - `30d/60d/90d/365d`: `{ resultsType: "details", onlyPostsNewerThan: "<N> days", resultsLimit: <safety_cap>, addParentData: false }`
     - safety_cap: 30→100, 60→200, 90→300, 365→1000
3. Guardrails passados a `runActorWithMetadata`:
   - `maxItems: 1` (1 perfil por run)
   - `maxTotalChargeUsd` por janela: baseline→$0.10, 30d→$0.10, 60d→$0.20, 90d→$0.30, 365d→$1.00
   - `apifyTimeoutSecs`: baseline/30d/60d→55, 90d→120, 365d→240
   - `timeoutMs`: baseline/30d/60d→60_000, 90d→130_000, 365d→260_000
   - `memoryMbytes`: 2048 para 90d/365d, 1024 caso contrário
4. Cronometra com `Date.now()`.
5. Apanha `ApifyUpstreamError` / `BudgetExceededError` / `ApifyConfigError` — preenche `status`, `semantic_code`, `actual_cost_usd` (quando o erro o carrega), `error_excerpt` via `sanitizeErrorExcerpt`.
6. Em sucesso: extrai `latestPosts[]`, calcula `newest_post_at`/`oldest_post_at`/`observed_days`, computa `estimated_cost_usd` via `estimateApifyCost`, e corre `enrichPosts(rawPosts)` num try/catch para `normalize_ok`.
7. **Não cria**: snapshot, comment-scraper run, lead, request, email, OpenAI call, DFS call.
8. Insere uma linha em `apify_lab_runs` via `supabaseAdmin`.
9. Devolve a linha gravada.

**GET `/api/admin/apify-lab/runs`** — lista as últimas 200 linhas para a UI (filtros opt: handle, window_kind).

### 3. Página admin: `src/routes/admin.apify-lab.tsx`

UI simples (sem mexer em design system existente):
- **Topo**: aviso destacado a explicar que isto consome créditos Apify reais e está protegido pelo allowlist diário.
- **Form**: 3 inputs `<input>` para os 3 handles (medium / high / low), com sugestão de defaults editáveis e botão `Correr matriz completa` que dispara 15 chamadas sequenciais (3 perfis × 5 janelas) com pausa de 2s entre cada, mostrando progresso. Botão individual `Correr um teste` para casos pontuais.
- **Tabela de resultados**: lê de `GET /runs`, colunas exatamente como pedido:
  `Perfil | Segmento | Janela | Posts | Observed days | Newest | Oldest | Cost (est/real) | Duration | Status | Normalize | Notas`
- **Botão Export CSV** da tabela visível.

## Guardrails reaproveitados (não alterados)

- `isApifyEnabled()` (`APIFY_ENABLED=true`)
- `isAllowed(handle)` (`APIFY_ALLOWLIST`)
- `assertApifyDailyBudgetAvailable()` (`APIFY_HARD_CAP_USD`)
- `requireAdminSession()` (`ADMIN_ALLOWED_EMAILS`)
- `sanitizeErrorExcerpt()`

## Fora do âmbito (não tocar)

- `src/routes/api/analyze-public-v1.ts`
- `src/lib/analysis/constants.ts` (`PUBLIC_INSTAGRAM_POSTS_LIMIT` fica em 12)
- `src/lib/analysis/cost.ts` (rates inalteradas)
- Pipeline OpenAI, DataForSEO, Resend
- Schema `report_snapshots`, `provider_call_logs`, `leads`
- UI do relatório free, pricing, planos

## Validação

- `bunx tsc --noEmit`
- Sanity check com a tabela vazia, RLS bloqueia leitura anon
- Após user correr a matriz no admin, recolhem-se os resultados reais

## Output esperado após execução

A página devolve a tabela. Depois sintetizo em chat:

```text
Perfil | Janela | Posts | Observed | Cost real | Duration | Status | Notas
```

Conclusões inferidas dos dados reais:
- viabilidade técnica por janela (sucesso vs timeout vs custo)
- recomendação de janelas premium a expor
- recomendação de `resultsLimit` cap por janela
- recomendação de `maxTotalChargeUsd` por janela como guardrail final

## Checkpoint

- ☐ Migração `apify_lab_runs` criada com RLS service-role-only
- ☐ Route `POST /api/admin/apify-lab/run` corre 1 teste com guardrails completos
- ☐ Route `GET /api/admin/apify-lab/runs` lista histórico
- ☐ Página `/admin/apify-lab` dispara matriz 3×5 e mostra tabela
- ☐ Nenhum ficheiro de produção (analyze-public-v1, constants, normalize) tocado
- ☐ `bunx tsc --noEmit` passa
- ☐ User executa matriz, partilha resultados, eu sintetizo conclusões
