
## What changes

### 1. `/app/account` — Full account page

**File:** `src/routes/app.account.tsx` (rewrite)

- Fetch profile from `profiles` table via Supabase client (RLS ensures own data only)
- Show: email, display_name (editable), plan badge, created_at, associated lead email (from `profiles.lead_id` → `leads.email`)
- Editable display_name with inline save (uses `supabase.from('profiles').update()`)
- Logout button using `supabase.auth.signOut()` + redirect to `/login`
- No email change, no plan change, no account deletion
- White card style consistent with Iconosquare light theme

### 2. `/app/plan` — Detailed plan comparison

**File:** `src/routes/app.plan.tsx` (rewrite)

- Fetch current plan from `profiles` table
- Three cards with updated copy per spec:
  - **Free** (current): análise pontual, snapshot guardado, sem histórico completo
  - **Pro** ("Em breve"): tracking diário 1 perfil, evolução semanal/mensal, alertas crescimento, comparação temporal
  - **Agency** ("Em breve"): tracking diário vários perfis, concorrentes, exportação, alertas, comparação lado a lado
- Current plan highlighted with blue ring; others show lock icon + "Preparado para uma fase futura"
- Pastel badges, subtle borders, no fake availability, no payment buttons

### 3. Optional: server function for lead email lookup

**File:** `src/server/account.functions.ts` (new)

- `getAccountDetails` server function using `requireSupabaseAuth` middleware
- Fetches profile + joined lead email in one query (profiles with lead_id → leads)
- Avoids exposing lead table directly to client

### Files changed
- `src/routes/app.account.tsx` — rewritten
- `src/routes/app.plan.tsx` — rewritten
- `src/server/account.functions.ts` — new server function

### What remains placeholder
- Pro/Agency plans are visual teasers only — no payments, no tracking jobs, no subscriptions table
- Plan upgrade buttons are disabled/absent
