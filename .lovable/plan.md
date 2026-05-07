
# Fix: Specific Error Messages for "Atualizar agora"

## Root Cause

The mutation in `test-profiles-card.tsx` L91 calls `res.json()` which throws a raw JSON parse error when the server returns a non-JSON response (e.g. 503 HTML). Even when JSON parses correctly, the error message propagation works (`body.error` is used), but:

1. Non-JSON server errors (503, gateway timeouts) produce cryptic messages like "Unexpected token '<'"
2. The confirmation modal lacks pre-flight status — admin can't see preconditions before confirming
3. No "last attempt" status is shown per profile

## Changes

### 1. `src/components/admin/v2/sistema/test-profiles-card.tsx`

**Mutation error handling** — wrap `res.json()` in try/catch, map HTTP status codes and `preflight_blocked` values to pt-PT admin messages:

```
- 401/403 → "Sessao admin invalida ou expirada."
- 503 → "Servidor indisponivel. Tenta dentro de instantes."
- JSON parse failure → "Resposta inesperada do servidor."
- preflight_blocked: internal_token_missing → "INTERNAL_API_TOKEN nao esta configurado."
- preflight_blocked: apify_disabled → "APIFY_ENABLED nao esta ativo."
- preflight_blocked: allowlist → "Perfil nao autorizado na allowlist."
- preflight_blocked: concurrent_refresh → "Ja existe uma atualizacao em curso."
- 502 (provider failure) → "O fornecedor falhou. A cache anterior foi mantida."
- fallback → body.error or generic message
```

**Confirmation modal** — add a pre-flight status strip showing:
- Token interno: configurado / em falta (read from existing runtime-checks query)
- Apify: ativo / inativo
- Allowlist: autorizado / nao autorizado
- Cache: valida / expirada / sem dados

These are read from the existing `TestProfileStatus` data and the runtime-checks endpoint already called elsewhere in the admin. No new API calls needed.

**Last attempt status** — after each mutation (success or failure), store `{ timestamp, success, reason }` in component-level state (React state, not DB). Display a small line under each profile row showing the last attempt result.

### 2. No backend changes needed

The `/api/admin/refresh-profile` endpoint already returns structured errors with `preflight_blocked`, `error`, and `error_code` fields. The fix is frontend-only.

### Files Changed

- `src/components/admin/v2/sistema/test-profiles-card.tsx` — error mapping, modal pre-flight, last attempt display

### Not Changed

- No backend/API changes
- No Supabase schema changes
- No report UI changes
- No PDF pipeline changes
- No provider calls

## Validation

- `tsc --noEmit`
- `vitest run`
- Visual check: trigger each error path and confirm correct toast
