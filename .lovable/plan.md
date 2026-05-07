
# Hardening the "Atualizar dados agora" Flow

## Current Risk Assessment

### Can public users trigger Fresh analysis today?

**Yes — during the ~5-20s window** when `refresh-profile` sets global mode to `fresh`.

The flow today:
1. Admin clicks "Atualizar agora"
2. `refresh-profile` sets global `app_config.analysis_execution_mode = "fresh"`
3. `refresh-profile` calls `analyze-public-v1?refresh=1` with internal token
4. **During steps 2-3**, any public user hitting `/analyze/:username` with an expired/missing cache will fall through to provider calls
5. `refresh-profile` restores `cache_only` in `finally`

The window is small but real. A public user with an expired cache hitting the endpoint at the wrong moment triggers paid Apify calls.

### Why it works this way

`analyze-public-v1` has two independent gates:
- **`forceRefresh`** (L386-398): bypasses cache lookup, requires `INTERNAL_API_TOKEN` — secure
- **Execution mode guard** (L433-434): blocks all provider calls when `cache_only` — applies to everyone equally

The problem: `forceRefresh=true` bypasses the cache, but `cache_only` mode still blocks provider calls. So the admin route *must* toggle global mode to make the analysis work. This exposes the window.

## Recommended Safe Architecture

### Core change: decouple `forceRefresh` from global execution mode

When `forceRefresh=true` (authenticated with `INTERNAL_API_TOKEN`), **skip the execution mode guard** and proceed directly to provider calls. This means:

- The global mode stays `cache_only` permanently during admin refreshes
- `refresh-profile` no longer toggles the global mode
- Public users always see `cache_only` behaviour — zero window of exposure
- The `forceRefresh` path is already gated by `INTERNAL_API_TOKEN` verification

```text
analyze-public-v1 flow:

  Cache hit? → return cached
       ↓ no
  forceRefresh=true (valid token)?
       ↓ yes              ↓ no
  Skip mode guard     Check execution mode
  → provider call     → cache_only? block
                      → fresh? provider call
```

### Concurrency protection

Add an in-memory lock per handle in `refresh-profile` to prevent duplicate concurrent refreshes for the same profile. If a refresh is already running, return 409 with `"Atualização já em curso para @handle"`.

### Failure handling

`analyze-public-v1` already preserves existing snapshots on failure — it only upserts a snapshot on success. No change needed. The admin endpoint returns the error and the previous cache remains valid.

## Changes Required

### File 1: `src/routes/api/analyze-public-v1.ts`

**Single change at L429-434**: when `forceRefresh` is true, skip the execution mode guard.

```
Before:
  const executionMode = await getAnalysisExecutionMode();
  if (executionMode === "cache_only") { ... }

After:
  if (!forceRefresh) {
    const executionMode = await getAnalysisExecutionMode();
    if (executionMode === "cache_only") { ... }
  }
```

This is a 2-line wrapping change. No other logic changes.

### File 2: `src/routes/api/admin/refresh-profile.ts`

- **Remove** the `setMode("fresh")` call before analysis
- **Remove** the `setMode("cache_only")` restore in `finally`
- **Remove** the `setMode` helper function (no longer needed)
- **Add** in-memory concurrency lock per handle
- Result: much simpler, no global state mutation

### File 3: `src/components/admin/v2/sistema/test-profiles-card.tsx`

- Show "Atualização em curso" state when mutation is pending (already done via `refreshMutation.isPending`)
- Toast messages already implemented
- No structural changes needed, only confirm messaging matches spec

### Files NOT touched

| Area | Status |
|------|--------|
| Public report components | No change |
| PDF pipeline | No change |
| Scoring logic | No change |
| Provider logic | No change |
| Supabase schema | No change |
| Execution mode card (toggle UI) | No change — remains for manual override |

## Public UX Behaviour (already implemented)

| Scenario | Behaviour |
|----------|-----------|
| Valid cache | Show report |
| No cache (`CACHE_ONLY_NO_DATA`) | Error state: "Este relatório ainda não tem dados públicos disponíveis." + "Voltar ao início" CTA |
| Expired cache within stale window | Serve stale data (200) |
| Expired cache beyond stale window | Same as no cache |
| Blank page | Eliminated — error states render immediately (no 3s min-display on errors) |

## Implementation Prompt

> In `analyze-public-v1.ts`, wrap the execution mode guard (L429-476) inside `if (!forceRefresh) { ... }` so authenticated internal-token refresh requests bypass the mode check. Then simplify `refresh-profile.ts`: remove all `setMode` calls and the `setMode` helper — the route no longer needs to toggle global execution mode. Add an in-memory `Set<string>` lock that prevents concurrent refreshes for the same handle (return 409 if locked). Keep all pre-flight checks, admin auth, and toast feedback unchanged.
