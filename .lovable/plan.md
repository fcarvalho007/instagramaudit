
## Assessment

The signup trigger (`handle_new_user` → `link_user_to_existing_reports`) correctly links existing reports at signup time. However, there's **no login-time fallback**. Reports created after signup are never linked.

## What to add

### 1. Server function: `ensureReportAssociation`

**File:** `src/server/account.functions.ts` (add to existing)

- New `createServerFn` with `requireSupabaseAuth` middleware
- Calls `link_user_to_existing_reports(userId, userEmail)` via `supabaseAdmin.rpc()`
- Returns `{ linked: boolean }` — whether any new associations were made
- Safe to call multiple times (function is already idempotent)

### 2. Call it on app load

**File:** `src/routes/app.tsx`

- After confirming the user is authenticated, fire-and-forget call to `ensureReportAssociation`
- Runs silently in the background — no UI change, no blocking
- Ensures any reports created between sessions get linked

### Files changed
- `src/server/account.functions.ts` — add `ensureReportAssociation`
- `src/routes/app.tsx` — call it on auth-confirmed load

### Security
- Uses `supabaseAdmin.rpc()` server-side only — leads table never exposed to client
- Server function validates user identity via `requireSupabaseAuth`
- The DB function itself ensures `user_id IS NULL` guard (no overwrites)
