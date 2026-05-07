
# Root Cause

**`TypeError: fetch failed`** — the `refresh-profile` endpoint calls `analyze-public-v1` via HTTP fetch to its own origin (`${origin}/api/analyze-public-v1?refresh=1`). In the sandbox/dev-server runtime, this self-referential loopback fetch fails silently. The `catch` block in `runAnalysis` sets `analyzeResult = null`, which produces the generic "Falha na análise" message, mapped by the client to "O fornecedor falhou ao obter dados."

The Apify provider code itself is never reached. The provider is not failing — the internal HTTP call never arrives.

**Secondary issue**: The preflight endpoint does not check `APIFY_TOKEN`, so pre-flight passes even when the actual provider call would fail for config reasons.

**Tertiary issue**: Error details from `analyze-public-v1` are lost because `runAnalysis` catches network errors and returns a generic 502 with no structured error code.

---

# Plan

## 1. Fix the self-fetch architecture in `refresh-profile.ts`

Instead of making an HTTP fetch to `analyze-public-v1`, extract the core analysis logic into a shared server function and call it directly. This eliminates the loopback fetch entirely.

**Approach**: Create a new file `src/lib/analysis/run-fresh-analysis.server.ts` that contains the provider-calling logic currently embedded in the `POST` handler of `analyze-public-v1`. Both the public endpoint and `refresh-profile` will import and call this function directly.

This is the largest change but is the only reliable fix — self-fetch in Workers/edge/sandbox environments is fundamentally unreliable.

**Alternative (smaller, pragmatic)**: Keep the HTTP call but fix it to work by:
- Trying the published URL instead of `origin` in sandbox
- Adding better error handling around the fetch

However, this is fragile. The direct-call approach is recommended.

**Pragmatic middle ground (recommended for now)**: Keep the current architecture but make the fetch error transparent and actionable. The self-fetch works in production (published Worker) but not in sandbox. Add:
- Explicit error reporting when fetch fails (show "Falha de rede interna — o servidor não conseguiu contactar a si próprio" instead of generic provider failure)
- A fallback that detects sandbox mode and warns the admin
- Proper propagation of `analyze-public-v1` error details when the fetch does succeed

## 2. Add `APIFY_TOKEN` check to preflight (`refresh-profile-preflight.ts`)

Add a check for `process.env.APIFY_TOKEN` presence (not validation — that would require a paid call). Display "Token presente, não validado" when set, "Em falta" when not.

## 3. Improve error propagation in `refresh-profile.ts`

Currently, when `analyzeResult` is null (fetch failed entirely), the error is generic. Fix:
- Distinguish fetch network error from provider error
- When `analyze-public-v1` returns a structured error, propagate `error_code`, `message`, and any provider details back to the admin UI
- Add new error codes: `internal_fetch_failed`, `apify_token_missing`

## 4. Improve error mapping in the admin UI (`test-profiles-card.tsx`)

Add mappings for new error codes:
- `internal_fetch_failed` → "Falha de rede interna. O servidor não conseguiu contactar o endpoint de análise."
- `apify_token_missing` → "APIFY_TOKEN não está configurado."
- `apify_actor_failed` → "O actor Apify falhou durante a execução."
- `apify_dataset_empty` → "O actor Apify devolveu um dataset vazio."
- `apify_timeout` → "O actor Apify excedeu o tempo limite."

## 5. Return structured provider error from `analyze-public-v1`

Enhance the `failure()` response to include `provider`, `provider_status`, and `details` fields when applicable, so `refresh-profile` can forward them.

---

# Files Changed

| File | Action |
|------|--------|
| `src/routes/api/admin/refresh-profile.ts` | Edit — better error handling for fetch failures, propagate structured errors |
| `src/routes/api/admin/refresh-profile-preflight.ts` | Edit — add APIFY_TOKEN check |
| `src/components/admin/v2/sistema/test-profiles-card.tsx` | Edit — add error mappings for new codes |
| `src/routes/api/analyze-public-v1.ts` | Edit — add provider/details fields to error responses |

---

# Error Mapping Table (Final)

| Error Code | Admin Message (pt-PT) |
|---|---|
| `internal_fetch_failed` | Falha de rede interna. O servidor não conseguiu contactar o endpoint de análise. Tenta na versão publicada. |
| `internal_token_missing` | INTERNAL_API_TOKEN não está configurado. |
| `apify_disabled` | APIFY_ENABLED não está ativo. |
| `apify_token_missing` | APIFY_TOKEN não está configurado. Configura o segredo antes de atualizar. |
| `allowlist` | Este perfil não está autorizado para atualização. |
| `concurrent_refresh` | Já existe uma atualização em curso para este perfil. |
| `provider_failure` | O fornecedor falhou ao obter dados. A cache anterior foi mantida. |
| `UPSTREAM_FAILED` | O fornecedor falhou. Detalhes: {message} |
| `UPSTREAM_UNAVAILABLE` | Serviço de análise temporariamente indisponível. |
| `PROFILE_NOT_FOUND` | Não foi possível encontrar este perfil. |
| `CACHE_ONLY_NO_DATA` | Sem snapshot disponível em modo cache-only. |
| `snapshot_save_failed` | Os dados foram obtidos, mas não foi possível guardar o snapshot. |

---

# Not Changed

- No public routes
- No report UI or PDF pipeline
- No Supabase schema changes
- No provider calls during investigation or preflight
- Cache safety preserved (stale-while-error fallback already exists)
