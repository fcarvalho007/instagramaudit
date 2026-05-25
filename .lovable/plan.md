## Diagnóstico (read-only)

### Root cause (confirmado por DB + secrets + código)

**Issue 2 — "Este relatório ainda não tem dados públicos" / "Não foi possível concluir a análise":**

A modo de execução já está em `fresh` (confirmado em `app_config.analysis_execution_mode = 'fresh'`, atualizado 25/05 09:39). **Mas o smoke-test allowlist continua ativo** porque o segredo `APIFY_TESTING_MODE` nunca foi definido com o literal `"false"`.

Evidência directa em `analysis_events` (últimas 24h):

```
chatgptricks         → blocked_allowlist / PROFILE_NOT_ALLOWED   (×3)
chatgptrick          → blocked_cache_only / CACHE_ONLY_NO_DATA   (antes do switch)
natgeo               → blocked_allowlist / PROFILE_NOT_ALLOWED   (×2)
martimaisilva        → blocked_allowlist / PROFILE_NOT_ALLOWED
frederico.m.carvalho → cache / success                            (único na allowlist)
```

E em `provider_call_logs`: zero chamadas Apify desde 23/05. Nenhum perfil novo chegou ao provider.

Caminho exacto do bloqueio (`src/routes/api/analyze-public-v1.ts:526–544`):

```
testingMode = isTestingModeActive()           // src/lib/security/apify-allowlist.ts:28
  → process.env.APIFY_TESTING_MODE !== "false"
  → default TRUE quando o env var não está definido como literal "false"

if (testingMode && !isAllowed(primary))
  → logEvent(outcome: "blocked_allowlist", errorCode: "PROFILE_NOT_ALLOWED")
  → return failure("PROFILE_NOT_ALLOWED") → 403
```

A mensagem que devia aparecer é "A análise automática está em validação…" (`ERROR_MESSAGES.PROFILE_NOT_ALLOWED`). Se o utilizador vê "Não foi possível concluir a análise" / "Este relatório ainda não tem dados públicos", o frontend (`AnalysisErrorState` em `src/routes/analyze.$username.tsx`) está a colapsar `PROFILE_NOT_ALLOWED` numa mensagem genérica em vez de mostrar o copy específico. A confirmar no batch 2.

**Issue 1 — "/chatgptricks/" mostra "Username inválido":**

`extractUsername` em `src/components/landing/hero-action-bar.tsx:31–53` já normaliza `/chatgptricks/`, `@chatgptricks`, `https://www.instagram.com/chatgptricks/`, etc. (existe teste em `src/components/landing/__tests__/hero-action-bar-extract.test.ts`).

Confirma-se pela DB: `chatgptricks` chegou normalizado ao endpoint (sem barras, sem @). Logo, a normalização do landing **funciona**.

Hipóteses para o erro observado, por ordem de probabilidade:
1. Utilizador estava na **versão publicada** (`instagramaudit.lovable.app`) antes do último deploy — a fix de normalização é recente.
2. O input que recebeu `/chatgptricks/` não foi o `HeroActionBar`, foi outro campo (ex.: input de competitor, ou re-submissão a partir de página interna). `extractUsername` só está ligado ao `HeroActionBar` (1 caller no código fonte fora dos testes).
3. Houve cache do browser/SW a servir bundle antigo.

A confirmar reproduzindo no preview actual antes de tocar em código.

### Configuração runtime — diagnóstico

| Variável | Valor efectivo | Esperado para público | Status |
|---|---|---|---|
| `analysis_execution_mode` (app_config) | `fresh` | `fresh` | OK |
| `APIFY_ENABLED` (secret) | provavelmente `"true"` | `"true"` | A confirmar via diagnóstico admin |
| `APIFY_TESTING_MODE` (secret) | **não está `"false"`** | `"false"` | **BLOQUEIO** |
| `APIFY_ALLOWLIST` | contém apenas `frederico.m.carvalho` (+ talvez outros) | irrelevante quando testing mode off | — |
| `APIFY_HARD_CAP_USD` / `APIFY_DAILY_CAP_USD` | configurados | — | OK |

Não dá para `echo` ao segredo. A inferência baseia-se em: (a) eventos `blocked_allowlist` continuam a ocorrer hoje, o que **só acontece se `isTestingModeActive()` devolver true**; (b) `APIFY_TESTING_MODE` aparece em `fetch_secrets` mas o seu valor não é visível.

### UX error mapping — estado actual vs esperado

| Cenário | error_code da API | Mensagem actual no UI | Mensagem correcta |
|---|---|---|---|
| Username com formato inválido | `INVALID_USERNAME` | "Username inválido…" | "Verificar e tentar novamente" |
| Perfil não existe | `PROFILE_NOT_FOUND` | genérico? | "Não foi possível encontrar este perfil" |
| Perfil privado | `PROFILE_PRIVATE` | genérico? | "Perfil privado. A análise só funciona com perfis abertos" |
| **Allowlist activa, handle fora** | `PROFILE_NOT_ALLOWED` | "Não foi possível concluir a análise" (genérico) | "A análise automática está em validação. Limitado aos perfis definidos" |
| Apify off | `PROVIDER_DISABLED` | — | "A ligação ao fornecedor está desligada" |
| Cap diário atingido | `BUDGET_EXCEEDED` | — | "Limite diário atingido" |
| Rate-limit | `RATE_LIMITED` | — | "Muitos pedidos recentes" |
| Cache-only sem snapshot | `CACHE_ONLY_NO_DATA` | — | "Sem snapshot. Ative modo Fresh" |
| Falha upstream | `UPSTREAM_FAILED` / `UPSTREAM_UNAVAILABLE` | — | "Serviço temporariamente indisponível" |

### Referências de ficheiros/funções relevantes

- `src/components/landing/hero-action-bar.tsx` — `extractUsername`, `USERNAME_REGEX`
- `src/lib/analysis/client.ts` — `fetchPublicAnalysis`
- `src/routes/analyze.$username.tsx` — render do resultado, mapeamento de erros para `AnalysisErrorState`
- `src/components/product/analysis-error-state.tsx` — mapping `error_code → mensagem` (a inspeccionar no batch 2)
- `src/routes/api/analyze-public-v1.ts` — endpoint público, allowlist gate (526–544), kill-switch (560), budget (602), rate-limit (646)
- `src/lib/security/apify-allowlist.ts` — `isTestingModeActive`, `isAllowed`, `isApifyEnabled`
- `src/lib/admin/execution-mode.server.ts` — `getAnalysisExecutionMode`

---

## Plano de implementação (em batches, sem executar)

### Batch 1 — Desbloquear modo público (config-only, **sem código**)

Acção do operador, não code-change:
1. Em **Connectors → Secrets**, definir `APIFY_TESTING_MODE` com o valor literal `false` (string, lowercase, sem aspas).
2. Aguardar redeploy automático do Worker.
3. Re-testar `chatgptricks` no preview.

Não envolve mais nada. Não tocar em `APIFY_ALLOWLIST`.

### Batch 2 — Mapear `PROFILE_NOT_ALLOWED` e outros códigos no UI

Ficheiro: `src/components/product/analysis-error-state.tsx`.
- Garantir que cada `error_code` da `PublicAnalysisErrorCode` tem mensagem dedicada (a do backend já vem pronta — basta passar `response.message` em vez de fallback genérico).
- Acrescentar copy específico para `PROFILE_PRIVATE`, `PROVIDER_DISABLED`, `BUDGET_EXCEEDED`, `RATE_LIMITED`, `CACHE_ONLY_NO_DATA`.
- Adicionar teste de mapeamento.

### Batch 3 — Painel de diagnóstico admin

Em `/admin/sistema` (ou nova secção), expor um endpoint server-only que devolve:
- `analysis_execution_mode` actual
- `isApifyEnabled()`
- `isTestingModeActive()`
- `getAllowlist()`
- valor inteiro das variáveis numéricas (caps, limites)

Sem revelar segredos brutos. Apenas o estado efectivo.

### Batch 4 — Teste público controlado (após batch 1)

Após `APIFY_TESTING_MODE=false`:
- Pedir uma única análise fresca de `chatgptricks` no preview.
- Confirmar em DB:
  - `analysis_events` → outcome `success`, data_source `fresh`
  - `provider_call_logs` → status `success`, `posts_returned > 0`, `actual_cost_usd` registado
  - `analysis_snapshots` → linha nova
- Confirmar UI mostra dados reais.

### Batch 5 — GO / NO-GO

- GO se batch 4 corre limpo, custo Apify por análise dentro do esperado (~0.01 USD), erros mapeados.
- NO-GO se Apify dispara erro 5xx persistente ou custo sai do envelope.

---

## Recomendação final

**NO-GO para análise pública neste momento.**

Razão única e clara: o segredo `APIFY_TESTING_MODE` não está em `"false"`, por isso o allowlist continua a rejeitar todos os perfis que não sejam `frederico.m.carvalho`. Nenhum perfil novo chega sequer ao Apify (zero chamadas em `provider_call_logs` desde 23/05).

Próxima acção (mínima): definir `APIFY_TESTING_MODE=false` no secret store. Depois disso, executar batch 4. Tudo o resto (UX mapping, painel diag) é melhoria que pode seguir em paralelo mas não bloqueia o lançamento técnico.
