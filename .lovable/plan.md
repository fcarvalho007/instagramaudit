# Passagem técnica final antes da UI do Level 2

Sem alterações de UI. Cinco frentes de motor + suíte de testes.

## 1. Perfil Free do Comment Intelligence coerente com o threshold

Hoje o perfil Free (3 posts × 5 comentários) garante `lowConfidence = true` em todas
as análises, porque o limiar é `< 5 posts` ou `< 20 comentários`
(`src/lib/analysis/comment-intelligence.ts`, `MIN_CONFIDENT_POSTS = 5`,
`MIN_CONFIDENT_COMMENTS = 20`).

Novos defaults em `src/lib/analysis/comment-scraper.server.ts`:

- `COMMENT_SCRAPER_MAX_POSTS` → 5
- `COMMENT_SCRAPER_PER_POST_LIMIT` → 4
- `COMMENT_SCRAPER_MAX_TOTAL_RESULTS` → 20
- `COMMENT_SCRAPER_MAX_CHARGE_USD` → 0.05 (piso do clamp desce de 0.05 para 0.02
  para permitir configurações ainda mais conservadoras)

Custo estimado: 20 × $0.0023 = $0.046.

O limiar de `lowConfidence` mantém-se inalterado e continua a ser avaliado sobre o
que foi **efectivamente devolvido** (posts com comentários e total de comentários),
nunca sobre o alvo pedido. Nenhum comentário é sintetizado.

## 2. Limite global de concorrência Apify (Postgres)

O semáforo em memória de `apify-client.ts` não vincula em serverless. Passa a ser
apenas optimização local; o limite efectivo passa a ser global.

Nova migração: tabela `public.apify_run_leases`
(`id`, `lease_key`, `acquired_at`, `expires_at`, `context`), sem grants a
`anon`/`authenticated` (uso exclusivo por service role), RLS activo e sem policies.

Nova função `public.acquire_apify_run_lease(p_lease_key text, p_max int, p_ttl_seconds int)`
(`SECURITY DEFINER`, `EXECUTE` só a `service_role`/`postgres`) que, numa única
instrução atómica:

1. apaga leases expirados;
2. insere o novo lease apenas se `count(*) < p_max` (INSERT ... SELECT com WHERE
   sobre a contagem, dentro da mesma transacção);
3. devolve `true`/`false`.

Função `release_apify_run_lease(p_lease_key)` para libertar.

Novo módulo `src/lib/analysis/apify-run-lease.server.ts`:

- `withApifyRunLease(fn)` — tenta adquirir; se falhar, espera com backoff
  (≈1.5 s, até um deadline configurável ~45 s) e volta a tentar; liberta sempre em
  `finally`, tanto em sucesso como em erro;
- TTL do lease (default 180 s) cobre leases abandonados por crash de worker;
- fail-open controlado: se o Postgres não responder, cai para o semáforo local
  (nunca bloqueia todo o produto por falha de infra), com log de aviso.

`runActorWithMetadata` passa a envolver a execução em `withApifyRunLease`.
`APIFY_MAX_CONCURRENT_RUNS` (default 4) passa a alimentar os dois níveis.

## 3. Tecto mensal do Apify Free

Em `src/lib/security/apify-budget.server.ts`:

- `getApifyMonthlySpendUsd()` — soma `COALESCE(actual_cost_usd, estimated_cost_usd)`
  de `provider_call_logs` com `provider='apify'` desde o dia 1 do mês UTC (mesma
  regra da memória "cost source of truth"; a reconciliação existente via
  `cost_daily`/`sync-apify-costs` mantém-se intacta), com cache de 60 s;
- `APIFY_MONTHLY_SOFT_CAP_USD` (default 4.25) e `APIFY_MONTHLY_HARD_CAP_USD`
  (default 4.75);
- `isApifyMonthlySoftCapReached()` e `assertApifyMonthlyBudgetAvailable()`
  (lança `MonthlyBudgetExceededError`).

Aplicação:

- **Soft cap** — `shouldRunCommentScraper` passa a devolver falso e a marcar
  `enrichment_status.comments = "skipped_budget"`; `/api/public/unlock-comments`
  devolve `200 { status: "deferred", reason: "monthly_soft_cap" }`. Cache e
  snapshots existentes continuam a ser servidos normalmente.
- **Hard cap** — o gate corre no caminho fresh de `analyze-public-v1.ts` (antes da
  reserva de crédito e da chamada ao provider) e devolve o código já existente de
  orçamento (`PROVIDER_BUDGET_EXCEEDED`-equivalente), com mensagem pt/en dedicada.
  Nunca erro genérico. Cache e stale não são bloqueados.

## 4. Segurança de `/api/public/unlock-comments`

Alterações ao endpoint actual:

- o corpo aceita **apenas `cache_key`** (já é assim) — nunca `snapshot_id`; o
  snapshot é resolvido no servidor a partir do cache key;
- prova de associação: mantém `readLeadIdFromRequest` + `leadOwnsReport(leadId,
  cacheKey)`; adiciona fallback para leads resolvidos pelo perfil autenticado,
  reutilizando os helpers existentes em vez de criar tokens novos;
- idempotência reforçada: índice único parcial em `comment_enrichment_jobs
  (snapshot_id)` para estados `pending`/`processing`, para que uma corrida não
  crie dois jobs; o endpoint devolve `already_available` / `pending` / `queued`;
- reenvio do mesmo email ou de um email diferente sobre o mesmo snapshot: nenhum
  run novo (verificação de `comment_intelligence.available` e de job activo antes
  de enfileirar);
- rate limiting por IP: novo helper `assertWithinUnlockRateLimit` no módulo
  `public-rate-limit.server.ts`, contando desbloqueios por `ip_hash` nas últimas
  24 h (default 10/dia, `PUBLIC_MAX_UNLOCKS_PER_IP_DAY`);
- soft/hard cap mensal verificados antes de enfileirar.

Resultado: consumir crédito em massa exige cookie de lead válido **e** propriedade
do relatório **e** um snapshot ainda sem comment intelligence, dentro do limite por IP.

## 5. Matriz de activação (entregue no fim, em tabela)

Variáveis cobertas: `PUBLIC_BASELINE_NO_EMAIL`, `COMMENT_SCRAPER_ENABLED`,
`COMMENT_SCRAPER_DEFER_TO_LEVEL_2`, `COMMENT_SCRAPER_INCLUDE_REPLIES`,
`COMMENT_SCRAPER_MAX_POSTS`, `COMMENT_SCRAPER_PER_POST_LIMIT`,
`COMMENT_SCRAPER_MAX_CHARGE_USD`, `APIFY_MAX_CONCURRENT_RUNS`,
`APIFY_MONTHLY_SOFT_CAP_USD`, `APIFY_MONTHLY_HARD_CAP_USD` — com valores
recomendados para desenvolvimento, staging e produção Free.

## 6. Testes (vitest, com Supabase mockado)

- A — visitante novo → auditoria base → 1 run do `instagram-scraper`
- B — sem email → 0 runs do comment scraper
- C — email submetido → exactamente 1 job/run
- D — mesmo email de novo → 0 runs novos
- E — email diferente no mesmo snapshot → 0 runs novos
- F — mesma auditoria dentro do TTL → 0 runs baseline novos
- G — 8 pedidos concorrentes → nunca mais de 4 leases activos
- H — hard cap mensal → nenhum Actor novo é iniciado, resposta controlada
- I — perfil Free 5×4 devolvido na íntegra → `lowConfidence = false`

## Ficheiros previstos

- `src/lib/analysis/comment-scraper.server.ts`
- `src/lib/analysis/apify-client.ts`
- `src/lib/analysis/apify-run-lease.server.ts` (novo)
- `src/lib/security/apify-budget.server.ts`
- `src/lib/security/public-rate-limit.server.ts`
- `src/routes/api/public/unlock-comments.ts`
- `src/routes/api/analyze-public-v1.ts`
- `src/i18n/locales/{pt,en}/errors.json`
- migração: `apify_run_leases` + funções de lease + índice único em
  `comment_enrichment_jobs`
- testes em `src/lib/**/__tests__/`

## Riscos

- Lease global adiciona 1–2 round-trips ao Postgres por run (mitigado pelo
  semáforo local a filtrar a maioria das colisões na mesma instância).
- Fail-open do lease em falha de base de dados: preferido a bloquear o produto.
- Sem `includeNestedComments`, as métricas de resposta do dono continuam
  não-mensuráveis (já sinalizado por `repliesMeasurable`).
