## Root cause

`@lovable.dev/vite-tanstack-config` passes this rule to TanStack's import-protection plugin (verified in `node_modules/@lovable.dev/vite-tanstack-config/dist/index.js:317-323`):

```js
importProtection: {
  client: {
    files: ["**/server/**"],
    specifiers: ["server-only"],
  },
}
```

Any file whose path matches `**/server/**` is denied in the **client** bundle. Renaming `src/server/` → `src/lib/server/` did NOT escape the glob — both still match `**/server/**`. That is why the production build still fails with:

```
(import "src/lib/server/reports.functions")
```

The route files `src/routes/app.reports.tsx` and `src/routes/app.reports.$id.tsx` statically import from `@/lib/server/reports.functions`, which puts that module path into the client graph → violation.

`createServerFn(...).handler(...)` modules are EXPLICITLY designed to be imported from client/route code (the Vite plugin replaces the handler body with an RPC stub on the client). The official rule (knowledge: `tanstack-server-functions`, `server-side-modern`) is: **do NOT place client-imported `.functions.ts` files under `src/server/`** — keep them in a client-safe path (`src/lib/...`, but not under a `server/` segment).

## Import chain

```
src/routes/app.reports.tsx          ──┐
src/routes/app.reports.$id.tsx      ──┤
src/routes/app.tsx                  ──┤
src/routes/app.account.tsx          ──┼─→  @/lib/server/*.functions.ts   ← blocked by **/server/**
src/routes/login.tsx                ──┤
src/routes/unsubscribe.tsx          ──┘
```

Secondary issue inside those modules (latent — will surface once they leave `server/`):
- `account.functions.ts` top-level imports `@/integrations/supabase/client.server` and `@/lib/tracking.server` (both `*.server.*`, blocked from client).
- `auto-login.functions.ts` top-level imports `@/integrations/supabase/client.server`.
- `unsubscribe.functions.ts` top-level imports `client.server`, `tracking.server`, `email/unsubscribe-token.server`.
- `reports.functions.ts` already uses dynamic `await import("...client.server")` inside handlers — no change needed there.

Today `server/` shielded these top-level imports from the protection plugin (the entire directory was treated as server-side). Once we move them out, those `.server.*` specifiers become naked violations and must move inside the `.handler()` body via `await import(...)`.

## Fix (minimal, no behavior change)

1. **Rename directory** `src/lib/server/` → `src/lib/rpc/`. Keeps co-location, escapes the `**/server/**` glob. (Already the convention used by `src/lib/services/services-inquiry.functions.ts` and `src/lib/beta.functions.ts` — `.functions.ts` files outside any `server/` segment.)

2. **Update the 6 importers** (search-replace `@/lib/server/` → `@/lib/rpc/`):
   - `src/routes/app.tsx`
   - `src/routes/app.account.tsx`
   - `src/routes/app.reports.tsx`
   - `src/routes/app.reports.$id.tsx`
   - `src/routes/login.tsx`
   - `src/routes/unsubscribe.tsx`

3. **Move server-only top-level imports inside handlers** (dynamic `await import(...)` inside `.handler()` body, same pattern `reports.functions.ts` already uses):
   - `src/lib/rpc/account.functions.ts`: `supabaseAdmin`, `recordProductEvent`
   - `src/lib/rpc/auto-login.functions.ts`: `supabaseAdmin`
   - `src/lib/rpc/unsubscribe.functions.ts`: `supabaseAdmin`, `recordProductEvent`, `verifyUnsubscribeToken`

4. **Verify**: `bunx tsc --noEmit`, then ask the user to publish (production build runs on Lovable infra). Report exact result.

## Why this respects the boundary

- `*.functions.ts` files contain only `createServerFn` declarations + client-safe imports. The TanStack server-fn Vite plugin splits each `.handler()` body into a server-only chunk; the client receives an RPC stub. Safe to import from routes.
- All real server-only modules keep the `*.server.ts` extension (`client.server`, `tracking.server`, `auth-middleware`, `unsubscribe-token.server`, etc.) — those remain blocked from the client by the default `**/*.server.*` rule.
- No `*.server.*` module is reached from the client import graph after the move, because the only references are now inside `.handler()` bodies via `await import(...)`, which the splitter strips from the client chunk.
- No directory under `**/server/**` is reachable from the client.

## Out of scope (will not touch)

UI, pricing, EuPago, onboarding, analysis/report logic, Supabase schema, homepage. Pure import-graph refactor.

## Files changed

- Rename: `src/lib/server/{account,auto-login,reports,unsubscribe}.functions.ts` → `src/lib/rpc/...`
- Edit (dynamic imports inside handlers): `account.functions.ts`, `auto-login.functions.ts`, `unsubscribe.functions.ts`
- Edit (import path update): 6 route files listed above
