# Abertura pública: desativar allowlist do Apify em segurança

Auditoria read-only ao gate de produção do `Apify`, ao endpoint público e às proteções de custo/rate-limit. Conclusão: **o código já tem todos os guard-rails**. Para abrir ao público basta alterar variáveis de ambiente — não é preciso mexer em código de gating. As alterações de código propostas abaixo são pequenos polimentos de UX no admin e nada mais.

## 1. Comportamento atual de gating

Sequência exata em `src/routes/api/analyze-public-v1.ts` (POST):

```text
1. Parse + validação do username (zod)
2. Cache lookup: snapshot fresh (<15d) → devolve sem tocar em provider
3. Execution mode: cache_only → serve stale ou CACHE_ONLY_NO_DATA
4. Allowlist gate (se APIFY_TESTING_MODE != "false"):
   - primário fora da allowlist → PROFILE_NOT_ALLOWED (403)
   - competidores fora da allowlist são silenciosamente removidos
5. Kill-switch APIFY_ENABLED != "true" → PROVIDER_DISABLED (503)
   (com fallback para snapshot stale se existir)
6. Budget diário (APIFY_HARD_CAP_USD) → BUDGET_EXCEEDED (503)
   (com fallback para snapshot stale se existir)
7. Rate-limit por IP / por handle (24h) → RATE_LIMITED (429)
8. Chamada Apify (1 actor unificado por handle, em paralelo):
   - timeout 60s, maxItems=1, maxTotalChargeUsd=0.10 por call
   - cada call gera linha em provider_call_logs (success/timeout/http_error/...)
9. Erros traduzidos para PublicAnalysisErrorCode em ERROR_MESSAGES (PT)
10. sanitizeExtra() bloqueia tudo o que não esteja em PUBLIC_ERROR_EXTRA_KEYS
    → mensagens cruas do Apify nunca chegam ao público
```

Estado dos kill-switches no código:

| Mecanismo | Ficheiro | Comportamento |
|---|---|---|
| `APIFY_ENABLED` | `src/lib/security/apify-allowlist.ts` | "true" → ON; **qualquer outro valor → OFF** (fail-closed) |
| `APIFY_TESTING_MODE` | idem | **default ON** (≠"false" → testing mode); só `"false"` desliga |
| `APIFY_ALLOWLIST` | idem | CSV minúsculas; vazio = bloqueio total quando testing ON |
| `APIFY_HARD_CAP_USD` | `apify-budget.server.ts` | gasto trailing 24h; `BUDGET_EXCEEDED` se ≥ cap |
| `PUBLIC_MAX_FRESH_PER_IP_DAY` / `_HANDLE_DAY` | `public-rate-limit.server.ts` | janela 24h sobre `analysis_events` fresh+success |
| `OPENAI_ENABLED` / `OPENAI_DAILY_CAP_USD` | enrichment | snapshot base entrega-se mesmo sem AI; só os jobs de insights ficam vazios |
| `DATAFORSEO_ENABLED` | market-signals | sem DFS, o bloco "Market Signals" degrada para vazio |

Estados friendly já mapeados (PT) em `ERROR_MESSAGES`: `INVALID_USERNAME`, `PROFILE_NOT_FOUND`, `PROFILE_NOT_ALLOWED`, `PROFILE_PRIVATE`, `PROVIDER_DISABLED`, `BUDGET_EXCEEDED`, `RATE_LIMITED`, `UPSTREAM_UNAVAILABLE`, `UPSTREAM_FAILED`, `NETWORK_ERROR`, `CACHE_ONLY_NO_DATA`. Sem leak de payloads upstream.

## 2. Visibilidade no admin (já existe)

`src/routes/api/admin/diagnostics.ts` + `src/components/admin/cockpit/panels/diagnostics-panel.tsx` já expõem:

- `testing_mode.active` + `allowlist[]`
- estado do `APIFY_ENABLED`
- preflight `APIFY_TOKEN`
- últimos `provider_call_logs` (status, custo, runId)
- ledger de custo diário + saldo do cap

**Lacuna pequena:** a heurística de readiness em `diagnostics-panel.tsx` ainda considera "testing OFF + APIFY ON" como **warning** ("Sem allowlist, qualquer handle dispara o provedor"). Após abertura pública isso passa a ser o estado **desejado** e não warning. Pequeno ajuste de copy + tom proposto abaixo.

## 3. Alterações de ambiente necessárias (Lovable Cloud → Secrets)

**Não tocar no código de gating.** Definir/confirmar exatamente estas variáveis:

| Secret | Valor produção pública | Notas |
|---|---|---|
| `APIFY_ENABLED` | `true` | imprescindível para destrancar provider |
| `APIFY_TESTING_MODE` | `false` | desliga allowlist, abre a perfis públicos |
| `APIFY_ALLOWLIST` | manter CSV atual | **não apagar** — fica disponível para reentrada em modo teste |
| `APIFY_HARD_CAP_USD` | recomendado: `5` (ajustar conforme orçamento) | hard-cap 24h |
| `PUBLIC_MAX_FRESH_PER_IP_DAY` | recomendado: `5` | já configurado anteriormente |
| `PUBLIC_MAX_FRESH_PER_HANDLE_DAY` | recomendado: `3` | já configurado anteriormente |
| `OPENAI_ENABLED` | `true` (recomendado para MVP completo) | se deixar `false`, o relatório entrega-se mas sem secção de insights AI |
| `OPENAI_DAILY_CAP_USD` | manter cap atual (ex.: `2`) | proteção análoga ao Apify |
| `DATAFORSEO_ENABLED` | `false` para a abertura pública | ainda não é parte do core do MVP — degrada graciosamente |
| `INTERNAL_API_TOKEN` | manter | usado para `?refresh=1` admin |

Sem chamadas a Apify, sem mutações DB, sem segredos a ser tocados nesta auditoria.

## 4. Alterações de código (mínimas, opcionais mas recomendadas)

Apenas UX no admin, **sem tocar no gating**:

1. `src/components/admin/cockpit/panels/diagnostics-panel.tsx`
   - Quando `APIFY_ENABLED=true` + `testing_mode.active=false`: mudar tom de `warning` para `success` com label "Modo público activo (kill-switch + budget + rate-limit a proteger)" e hint a apontar para o budget/rate-limit.
   - Adicionar badge "PUBLIC OPEN" / "TESTING" no topo do painel para ler de relance.
2. `src/routes/api/admin/diagnostics.ts`
   - Devolver também `apify.public_mode = !testing_mode.active && apify_enabled` para o painel não inferir.

Sem mudanças noutros ficheiros.

## 5. Procedimento de rollback (instantâneo, sem deploy)

Se algo correr mal após a abertura, basta reverter os secrets:

| Cenário | Acção |
|---|---|
| Abuso / custo a disparar | `APIFY_ENABLED=false` → bloqueia provider, cache continua a servir |
| Voltar a allowlist | `APIFY_TESTING_MODE=true` (apagar valor `false`) → volta ao smoke-test |
| Conter custo sem fechar | Baixar `APIFY_HARD_CAP_USD` para `1` |
| Apertar throughput | Baixar `PUBLIC_MAX_FRESH_PER_IP_DAY` para `1` |
| Esconder AI | `OPENAI_ENABLED=false` → relatório entrega base, secção AI fica vazia |

Em todos os casos, **sem redeploy** — a próxima request relê env.

## 6. Checklist de validação

Após mudar os secrets:

```
☐ bunx tsc --noEmit
☐ bunx vitest run
☐ /admin/sistema mostra: APIFY_ENABLED ✓, TESTING_MODE OFF, badge "PÚBLICO ABERTO"
☐ POST /api/analyze-public-v1 com perfil NOVO (fora da allowlist) → 200
☐ POST com username inválido → 400 + mensagem PT
☐ POST com perfil privado → 404 + mensagem PT (sem leak)
☐ POST com perfil inexistente → 404 + mensagem PT
☐ Repetir 6x mesmo IP em 24h → 429 RATE_LIMITED
☐ Forçar APIFY_ENABLED=false → 503 PROVIDER_DISABLED + mensagem PT
☐ Cache-hit no segundo pedido (<15d) → sem provider_call_logs novo
☐ /admin/sistema lista o último run com custo real, sem leak
```

## 7. Output a devolver no fim

- gating actual: ✓ documentado em §1
- env values exactos: ✓ §3
- rollback: ✓ §5
- validação: a correr depois das alterações de env

## 8. Confirmações antes da implementação

1. Confirmar `APIFY_HARD_CAP_USD` desejado (proposto: `5 USD/dia`).
2. Confirmar se quer `OPENAI_ENABLED=true` na abertura (recomendado) ou MVP sem AI.
3. Confirmar se `DATAFORSEO_ENABLED` fica `false` (proposto) ou se já queremos market-signals públicos.
4. Aprovar polimento de UX no `diagnostics-panel` (§4) — caso contrário não toco no código.
