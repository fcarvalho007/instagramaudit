
# Admin Pre-Flight Check for "Atualizar agora"

## Overview

Create a dedicated pre-flight endpoint and wire it into the confirmation modal so the admin sees exactly why a refresh is blocked, and the button is disabled when preconditions fail.

## Changes

### 1. New file: `src/routes/api/admin/refresh-profile-preflight.ts`

Server route `GET /api/admin/refresh-profile-preflight?handle=:handle`.

Checks (no provider calls):
- Admin session valid
- `INTERNAL_API_TOKEN` configured
- `APIFY_ENABLED === "true"`
- Handle in allowlist (if testing mode active)
- No concurrent refresh for this handle (reads the in-memory `refreshingHandles` set)
- `COMMENT_SCRAPER_ENABLED` status
- Cache status from `TestProfileStatus` data (snapshot exists, expiry)

Returns:
```json
{
  "can_refresh": true|false,
  "blocking_reason": "..." | null,
  "estimated_cost_usd": "~$0.02–0.05",
  "checks": [
    { "key": "internal_token", "label": "Token interno", "status": "ok"|"fail", "message": "Configurado" },
    { "key": "apify_enabled", "label": "Apify", "status": "ok"|"fail", "message": "Ativo" },
    { "key": "allowlist", "label": "Allowlist", "status": "ok"|"warn", "message": "Autorizado" },
    { "key": "concurrent", "label": "Concorrência", "status": "ok"|"fail", "message": "Livre" },
    { "key": "comment_scraper", "label": "Comentários", "status": "ok"|"warn", "message": "Desativado" }
  ],
  "cache_status": { "has_snapshot": true, "expired": false, "expires_at": "..." }
}
```

The in-memory `refreshingHandles` set needs to be shared. We'll extract it to a tiny shared module (`src/lib/admin/refresh-lock.server.ts`) imported by both the existing `refresh-profile.ts` and the new preflight route.

### 2. New file: `src/lib/admin/refresh-lock.server.ts`

Exports the `refreshingHandles` Set so both routes share the same lock.

### 3. Update: `src/routes/api/admin/refresh-profile.ts`

Import `refreshingHandles` from the shared module instead of declaring it locally.

### 4. Update: `src/components/admin/v2/sistema/test-profiles-card.tsx`

Replace the current `PreflightStrip` (which reads from the generic runtime-checks endpoint and guesses) with a new version that:
- Calls `GET /api/admin/refresh-profile-preflight?handle=X` when the modal opens
- Shows each check with status icon
- Disables the "Atualizar agora" button when `can_refresh === false`
- Shows the `blocking_reason` prominently
- Displays cost estimate from the endpoint

In the profile row, add a small inline status label:
- If preflight loaded and `can_refresh`: "Pronto para atualizar"
- If blocked: "Bloqueado: {reason}" (e.g. "Bloqueado: Apify inativo")
- If refresh is running: "Atualização em curso"

The preflight query is triggered when the modal opens (`enabled: refreshConfirmOpen`), not on every render.

Remove the `import type { RuntimeCheck }` from `system-queries.server` (no longer needed — that was a `.server.ts` import in a client component, which is risky).

### Not changed
- No public routes
- No report UI
- No PDF pipeline
- No Supabase schema
- No provider calls

### Files
| File | Action |
|------|--------|
| `src/lib/admin/refresh-lock.server.ts` | New — shared in-memory lock |
| `src/routes/api/admin/refresh-profile-preflight.ts` | New — pre-flight endpoint |
| `src/routes/api/admin/refresh-profile.ts` | Edit — use shared lock |
| `src/components/admin/v2/sistema/test-profiles-card.tsx` | Edit — wire preflight into modal + row status |
