
# Admin Execution Mode: Cache-Only / Fresh

## Audit Summary

| File | Provider | Current gate | Blockable? |
|------|----------|-------------|------------|
| `analyze-public-v1.ts` | Apify | `isApifyEnabled()` + allowlist | Yes |
| `analyze-public-v1.ts` | OpenAI (insights v1/v2) | `isOpenAiAllowed()` | Yes |
| `analyze-public-v1.ts` | OpenAI (visual cover) | `isOpenAiAllowed()` | Yes |
| `analyze-public-v1.ts` | OpenAI (caption semantic) | `isOpenAiAllowed()` | Yes |
| `analyze-public-v1.ts` | DataForSEO (market signals) | `isDataForSeoEnabled()` + allowlist | Yes |
| `analyze-public-v1.ts` | Apify (comment scraper) | `COMMENT_SCRAPER_ENABLED` | Yes |
| `enrich-comments` endpoint | Apify | `COMMENT_SCRAPER_ENABLED` | Yes |

Existing config pattern: `app_config` table with `key/value/updated_by/updated_at`, used for cost caps. Same pattern will be reused.

---

## Changes

### 1. Server-side guard (`src/lib/admin/execution-mode.server.ts` — new)

- `getAnalysisExecutionMode()`: reads `app_config` key `analysis_execution_mode`, returns `"cache_only"` (default) or `"fresh"`.
- `assertFreshModeAllowed(provider, context)`: throws a typed `CacheOnlyBlockedError` if mode is `cache_only`.
- Short in-memory TTL (~30s) so the setting is responsive without hammering the DB on every request.

### 2. Update `analyze-public-v1.ts`

Insert a single early check after cache lookup (line ~600):
- If mode is `cache_only`:
  - If fresh snapshot exists, return it (cache hit path unchanged).
  - If stale snapshot exists, serve stale.
  - If no snapshot at all, return `{ success: false, error_code: "CACHE_ONLY_NO_DATA", message: "Sem snapshot disponível em modo cache-only..." }`.
  - Skip ALL provider calls (Apify, OpenAI, DataForSEO, comment scraper).
  - Log event with `outcome: "blocked_cache_only"`, `estimated_cost_usd: 0`.
- If mode is `fresh`: continue with existing flow unchanged.

Add `"CACHE_ONLY_NO_DATA"` to the error code union and HTTP status map (503).

### 3. Server function for reading/writing mode (`src/server/admin/execution-mode.functions.ts` — new)

- `getExecutionMode`: createServerFn, reads current mode from `app_config`.
- `setExecutionMode`: createServerFn, upserts `app_config` key, requires admin auth.

### 4. Admin UI — Execution Mode Card (`src/components/admin/v2/visao-geral/execution-mode-card.tsx` — new)

Compact card in Visão Geral, placed before expense section:
- Title: "Modo de análise"
- Segmented control: "Cache-only" / "Fresh"
- Status badge: green "Cache-only · sem custos" or amber "Fresh · pode gerar custos"
- Descriptive copy per state
- Confirmation dialog when switching to Fresh: "Ativar modo Fresh pode gerar custos de API. Confirmar?"

### 5. Test Profile Status Panel (`src/components/admin/v2/visao-geral/test-profiles-card.tsx` — new)

For `frederico.m.carvalho` and `martimsilvai`:
- Latest snapshot date
- Cached report exists (yes/no)
- Caption semantic analysis exists
- Comment intelligence exists
- Visual cover analysis exists
- Last estimated cost
- "Abrir report em cache" link
- "Reanalisar fresh" button (disabled in cache_only mode with tooltip)

Server function to fetch this data from `analysis_snapshots`.

### 6. Cache Maintenance (`src/components/admin/v2/visao-geral/cache-maintenance-card.tsx` — new)

- "Limpar cache deste perfil" — deletes specific snapshot by handle (with confirmation)
- "Forçar próxima análise fresh" — expires the snapshot for a selected handle
- No global delete button

### 7. Logging

When `cache_only` blocks a provider call, record via `recordProviderCall` with:
- `actor`: provider name + context
- `status`: `"blocked_cache_only"`
- `estimated_cost_usd`: 0

### 8. Integration in Visão Geral page

Update `src/components/admin/v2/visao-geral/` parent to include the three new cards in order:
1. Execution Mode Card
2. Test Profiles Card
3. Cache Maintenance Card
(before existing expense section)

---

## Files changed

- **New**: `src/lib/admin/execution-mode.server.ts`
- **New**: `src/server/admin/execution-mode.functions.ts`
- **New**: `src/components/admin/v2/visao-geral/execution-mode-card.tsx`
- **New**: `src/components/admin/v2/visao-geral/test-profiles-card.tsx`
- **New**: `src/components/admin/v2/visao-geral/cache-maintenance-card.tsx`
- **Edited**: `src/routes/api/analyze-public-v1.ts` (early cache_only guard + new error code)
- **Edited**: `src/lib/analysis/types.ts` (add CACHE_ONLY_NO_DATA error code)
- **Edited**: Visão Geral parent component (import new cards)

## Not touched

- Public report card design (P04, P05, P07)
- PDF pipeline
- Auth/admin access rules
- Global design tokens
- Locked files
