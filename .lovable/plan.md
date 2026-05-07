
# "Atualizar dados agora" — One-Shot Fresh Analysis

## Problem

The current flow requires the admin to manually toggle global execution mode to `fresh`, trigger the analysis, then remember to switch back to `cache_only`. Forgetting the second step leaves the system open to uncontrolled provider spending.

## Proposed Solution

A new admin-only server route that atomically:
1. Validates pre-flight conditions (provider kill switches, allowlist, INTERNAL_API_TOKEN)
2. Temporarily sets execution mode to `fresh`
3. Calls `analyze-public-v1?refresh=1` with the internal token
4. Restores execution mode to `cache_only` (even on failure)
5. Returns the result

The global execution mode toggle remains for edge cases but this action becomes the recommended path.

---

## UX Design

### Where it lives

On `/admin/sistema`, inside or next to the **Test Profiles Card** — each profile row gets an "Atualizar dados agora" button (small, secondary style).

Alternatively, a standalone card "Atualização pontual" with:
- A handle input (pre-populated from test profiles)
- An "Atualizar dados agora" button

### Flow

```text
1. Admin clicks "Atualizar dados agora" for @frederico.m.carvalho
2. Confirmation dialog appears:
   ┌─────────────────────────────────────────┐
   │  Atualizar dados agora?                 │
   │                                         │
   │  Vai buscar dados novos ao fornecedor   │
   │  para @frederico.m.carvalho.            │
   │                                         │
   │  Custo estimado: ~$0.02–0.05 USD        │
   │  O sistema volta a cache_only           │
   │  automaticamente após a operação.       │
   │                                         │
   │  [Cancelar]          [Atualizar agora]  │
   └─────────────────────────────────────────┘
3. On confirm → button shows spinner + "A atualizar…"
4. On success → toast "Dados atualizados para @handle"
5. On failure → toast with error message
6. In all cases, mode restored to cache_only
```

---

## State Lifecycle

```text
┌───────────┐
│ cache_only│ (initial — normal state)
└─────┬─────┘
      │ Admin clicks "Atualizar dados agora" + confirms
      ▼
┌───────────┐
│   fresh   │ (transient — set by server)
└─────┬─────┘
      │ analyze-public-v1?refresh=1 called
      ▼
┌───────────────────┐
│ analyze completes │ (success or failure)
└─────┬─────────────┘
      │ ALWAYS restore mode
      ▼
┌───────────┐
│ cache_only│ (restored)
└───────────┘
```

Key: the restore happens in a `finally` block so it executes even if the analysis throws.

---

## Failure Handling

| Failure                          | Behaviour                                      |
|----------------------------------|-------------------------------------------------|
| `INTERNAL_API_TOKEN` missing     | 409, no mode change, no provider call            |
| `APIFY_ENABLED=false`           | 409, no mode change, no provider call            |
| Handle not on allowlist          | 409, no mode change, no provider call            |
| Mode toggle to `fresh` fails    | 500, no provider call                            |
| `analyze-public-v1` returns error| Restore `cache_only`, return error to client     |
| `analyze-public-v1` network fail | Restore `cache_only`, return error to client     |
| Restore to `cache_only` fails   | Log critical error, return success but warn      |

All pre-flight checks happen **before** the mode is changed. The mode is only toggled to `fresh` immediately before the provider call.

---

## Server Changes

### New route: `src/routes/api/admin/refresh-profile.ts`

- `POST /api/admin/refresh-profile`
- Admin-only (`requireAdminSession`)
- Input: `{ handle: string }`
- Steps:
  1. Validate handle (non-empty, sanitized)
  2. Pre-flight: `INTERNAL_API_TOKEN` exists
  3. Pre-flight: `isApifyEnabled()` is true
  4. Pre-flight: allowlist check (if testing mode active)
  5. Set execution mode to `fresh` via `supabaseAdmin.from("app_config").upsert(...)`
  6. Invalidate execution mode cache
  7. Call `analyze-public-v1?refresh=1` with internal token (server-to-server)
  8. `finally`: restore execution mode to `cache_only` + invalidate cache
  9. Return result

This reuses the existing `analyze-public-v1` pipeline — no provider logic changes.

### No changes to existing files

- `analyze-public-v1.ts` — unchanged (already supports `refresh=1` + internal token)
- `execution-mode.server.ts` — unchanged (already has `invalidateExecutionModeCache`)
- Provider logic — unchanged
- PDF pipeline — unchanged
- Public routes — unchanged
- Supabase schema — unchanged

---

## Client Changes

### Option A: Button per test profile (recommended)

**File: `src/components/admin/v2/sistema/test-profiles-card.tsx`**
- Add "Atualizar" button per profile row
- Confirmation dialog with cost warning
- Calls `POST /api/admin/refresh-profile`
- Shows toast on success/failure
- Refreshes test profile statuses after completion

### Option B: Standalone card

**New file: `src/components/admin/v2/sistema/refresh-profile-card.tsx`**
- Input for handle + "Atualizar dados agora" button
- Same dialog/toast pattern

Option A is simpler and more practical since the admin is already looking at specific profiles.

---

## Files to Touch

| File | Action |
|------|--------|
| `src/routes/api/admin/refresh-profile.ts` | **New** — server route |
| `src/components/admin/v2/sistema/test-profiles-card.tsx` | **Edit** — add refresh button per profile |

---

## Risks and Mitigations

| Risk | Mitigation |
|------|-----------|
| Restore to `cache_only` fails silently | Log critical error; UI shows warning; admin can verify in execution mode card |
| Concurrent admin actions during brief `fresh` window | The `fresh` window is ~5-20s; unlikely but harmless — only authenticated internal calls can trigger provider |
| Public user hits API during `fresh` window | `analyze-public-v1` only does fresh calls if cache is expired AND mode is fresh — public users would need an expired cache at that exact moment; risk is minimal and bounded |
| Cost overrun | Pre-flight checks (allowlist, provider kill switches) remain enforced; single-profile scope limits blast radius |

---

## Implementation Prompt

Ready to use as a follow-up prompt after approval:

> Create `POST /api/admin/refresh-profile` route that: (1) validates admin session, (2) runs pre-flight checks (INTERNAL_API_TOKEN, APIFY_ENABLED, allowlist), (3) temporarily sets execution mode to `fresh`, (4) calls `analyze-public-v1?refresh=1` server-to-server, (5) restores `cache_only` in a `finally` block, (6) returns the analysis result. Then add an "Atualizar" button per profile row in `test-profiles-card.tsx` with confirmation dialog showing cost warning. Toast on success/failure. Refresh profile statuses after completion.
