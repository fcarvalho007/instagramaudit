## Goal

Fechar a validação da Phase 2 do credit gate em `/api/analyze-public-v1` sem alterar UI nem código de produção. Adicionar testes de contrato ao endpoint para os 8 cenários e correr a suite completa.

## Estado atual (verificado)

- `src/lib/leads/lead-cookie.server.ts` + testes (8) ✅
- `src/lib/credits/credits.server.ts` + testes (7) ✅
- `src/lib/credits/lead-reports.server.ts` + testes (4) ✅
- `src/routes/api/onboarding/start.ts` ✅
- `src/routes/api/analyze/refresh.ts` — bypass `INTERNAL_API_TOKEN` ✅
- `src/routes/api/admin/refresh-profile.ts` — bypass `INTERNAL_API_TOKEN` ✅
- Migration `20260601161950…` → tabela `public.lead_reports` ✅
- Credit gate inlined em `src/routes/api/analyze-public-v1.ts` (L483–L586) ✅
- Testes existentes em `src/routes/api/__tests__/analyze-public-v1-credits.test.ts` só cobrem o contrato de códigos de erro — **não** testam o handler.

Lacuna: não existem testes que invoquem o `POST` handler e verifiquem os 8 fluxos de crédito ponta-a-ponta.

## Mudanças

### 1) Adicionar `src/routes/api/__tests__/analyze-public-v1-credit-gate.test.ts`

Um único ficheiro de teste que importa `Route` de `analyze-public-v1`, faz `vi.mock` das deps pesadas (sem tocar no código de produção) e invoca `Route.options.server.handlers.POST({ request })` com requests construídos à mão.

Mocks (todos com `vi.mock` no topo do ficheiro):
- `@/integrations/supabase/client.server` → fake `supabaseAdmin` com ledger em memória + `lead_reports` em memória + RPC `credit_balance`.
- `@/lib/analysis/cache` → `lookupSnapshot`, `isFresh`, `getFreshnessState`, `getSnapshotAgeHours`, `storeSnapshot`, `buildCacheKey`, `isWithinStaleWindow`, `setEnrichmentStatusAtomic` controlados por cenário.
- `@/lib/analysis/apify-client` → `runActorWithMetadata` retorna profile + posts, ou lança `ApifyUpstreamError`/`ApifyConfigError` conforme o caso.
- `@/lib/security/apify-allowlist` → `isApifyEnabled=true`, `isAllowed=true`, `isTestingModeActive=false`.
- `@/lib/security/apify-budget.server` → `assertApifyDailyBudgetAvailable` no-op.
- `@/lib/security/public-rate-limit.server` → `assertWithinPublicRateLimit` no-op.
- `@/lib/analysis/events` → stubs que devolvem ids fake.
- `@/lib/admin/alerts`, `@/lib/benchmark/reference-data.server`, `@/lib/market-signals/cache`, `@/lib/analysis/normalize`, `@/lib/analysis/cost`, `@/lib/analysis/comment-scraper.server`, `@/lib/admin/execution-mode.server`, `@/lib/analysis/thumbnail-cache.server` → stubs mínimos.
- Helpers reais usados: `@/lib/leads/lead-cookie.server` (encode válido), `@/lib/credits/credits.server` e `@/lib/credits/lead-reports.server` (apoiados pelo fake supabaseAdmin para verificar saldo).

`process.env.SESSION_SECRET` definido em `beforeAll` para o cookie assinar. `INTERNAL_API_TOKEN` definido para o cenário de bypass.

Cada teste reset do ledger + cache em memória.

Cenários (oito casos `it(...)`):

1. **`missing lead_session` → `ONBOARDING_REQUIRED`** — `body=200`, payload `{ok:false, error_code:"ONBOARDING_REQUIRED"}`, mocks Apify/OpenAI nunca chamados.
2. **lead com saldo 0 → `INSUFFICIENT_CREDITS`** — após `grantInitialCredits` + 2× `reserveCredit`+`confirmReservation`. Apify nunca chamado.
3. **cache hit já associado → 0 créditos** — `lookupSnapshot` devolve snapshot fresh, `upsertLeadReport` prévio cria associação. Saldo antes/depois iguais. Apify nunca chamado.
4. **cache hit novo para o lead → consome 1 crédito + cria associação** — saldo −1, `lead_reports` agora contém `(lead_id, cache_key)`.
5. **fresh success → consome/confirma 1 crédito + cria associação** — `lookupSnapshot=null`, Apify devolve profile+posts válidos, saldo −1, ledger contém `confirm`, `lead_reports` populado.
6. **provider error → liberta reserva** — Apify lança `ApifyUpstreamError(500)`, saldo igual ao inicial, ledger contém `auto_release`.
7. **`PROFILE_PERSONAL_NO_FEED` → liberta reserva** — Apify devolve profile pessoal sem `latestPosts`, saldo igual ao inicial, `error_code="PROFILE_PERSONAL_NO_FEED"`.
8. **`INTERNAL_API_TOKEN` bypass → sem cookie, não consome crédito** — request com `Authorization: Bearer <token>` e sem cookie, resposta `ok:true`, ledger inalterado (sem `lead_id`), Apify chamado uma vez.

### 2) Não alterar nenhum ficheiro fora de `src/routes/api/__tests__/`

Sem refactor do handler, sem mudanças em UI, sem alterar `analyze-public-v1.ts`, `credits.server.ts`, migrations ou tokens.

## Validação

```bash
bunx tsc --noEmit
bunx vitest run
```

Esperado: 0 erros TS, todos os testes existentes + os 8 novos passam.

## Output a reportar

- ficheiros alterados: apenas `src/routes/api/__tests__/analyze-public-v1-credit-gate.test.ts` (novo)
- testes adicionados: 8 (lista por nome)
- testes existentes corridos: lead-cookie (8), credits (7), lead-reports (4), analyze-public-v1-* (sanitize/normalize/personal-no-feed/negative-cache/credits)
- comportamento backend final da Phase 2 (matriz de consumo)
- `lead_reports` existe: sim, migration `20260601161950…`
- admin refresh: confirmado bypass por `INTERNAL_API_TOKEN` (não consome créditos)
- riscos antes da Phase 3 UI:
  1. homepage anónima ainda recebe 402 cru — UX má até modal ligado;
  2. cookie cross-domain `auditprofiles.com` ↔ `instagramaudit.lovable.app` validar quando UI ligar;
  3. snapshots pré-Phase 2 não estão em `lead_reports` → primeiro acesso de cada lead consome 1 crédito (esperado, não bug);
  4. race condition `(lead_id, cache_key)` aceite via `ON CONFLICT DO NOTHING`.

## Fora de scope

- Refactor do handler para extrair gate puro (não necessário — mocks chegam).
- Alterações em UI / modal de onboarding (Phase 3).
- Alterações em migrations, secrets, tokens, runtime de produção.
