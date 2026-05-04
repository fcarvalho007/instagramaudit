
# Audit and Architecture Plan — User Account Area

## 1. Current State Audit

### 1.1 Authentication

- **Supabase Auth**: The auth-middleware (`requireSupabaseAuth`) is auto-generated and functional, but **not used anywhere**. Zero protected routes exist.
- **Admin auth**: Uses a naive email-in-localStorage system (`/api/admin/simple-login`), not Supabase Auth. Admin checks `ADMIN_ALLOWED_EMAILS` server-side but relies on `X-Admin-Email` header from localStorage on subsequent calls.
- **Login/signup pages**: None exist. No `_authenticated` layout route.
- **Auth providers**: No Google, no email/password — nothing configured yet.

### 1.2 Report and Request Data

| Table | Key Fields | User Identifier |
|---|---|---|
| `leads` | `id`, `email`, `email_normalized`, `name`, `company` | `email_normalized` |
| `report_requests` | `id`, `lead_id`, `instagram_username`, `analysis_snapshot_id`, `pdf_status`, `pdf_storage_path`, `delivery_status`, `request_status` | `lead_id` (FK to leads) |
| `analysis_snapshots` | `id`, `cache_key`, `instagram_username`, `normalized_payload`, `provider` | None (public, keyed by username) |

- **No `user_id` column exists** in any table. Identity is tracked via `leads.email_normalized`.
- The `report_requests` table has full lifecycle fields: `request_status` (pending/processing/completed/failed_pdf/failed_email), `pdf_status`, `pdf_storage_path`, `delivery_status`, `email_sent_at`.

### 1.3 Report Lifecycle

1. **Request**: `POST /api/request-full-report` — validates payload, upserts lead, enforces monthly quota, inserts `report_requests` row.
2. **Generate**: `POST /api/generate-report-pdf` — called by orchestrator, generates PDF via PDFShift, stores in `report-pdfs` bucket (private), updates `pdf_storage_path`.
3. **Email**: `POST /api/send-report-email` — called by orchestrator, sends email via Resend with signed URL.
4. **Orchestration**: `run-report-pipeline.ts` — background fire-and-forget, manages `request_status` transitions.

### 1.4 RLS Status

**All tables have RLS enabled but zero policies defined.** This means:
- Anonymous/authenticated users cannot read or write any table via the client SDK.
- All writes use `supabaseAdmin` (service role) in server routes — this is correct.

### 1.5 Storage

- `report-pdfs` bucket: **private** (not public). Access requires signed URLs. This is correct.

---

## 2. Recommended Architecture

### 2.1 Database Schema Changes

**New table: `profiles`**
```
profiles (
  id uuid PK → auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  display_name text,
  avatar_url text,
  plan text NOT NULL DEFAULT 'free',  -- 'free' | 'pro' | 'agency'
  lead_id uuid REFERENCES leads(id),  -- link to existing lead
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
)
```

**New column: `report_requests.user_id`**
```
ALTER TABLE report_requests ADD COLUMN user_id uuid REFERENCES auth.users(id);
```

This is nullable — existing rows (pre-auth) keep `user_id = NULL` but remain linked via `lead_id`.

**Auto-association trigger**: On profile creation, match `profiles.email` against `leads.email_normalized` to set `profiles.lead_id`. Then backfill `report_requests.user_id` for all rows matching that `lead_id`.

### 2.2 Association Strategy (Existing Reports → New User)

When a user signs up/logs in:
1. Trigger or server function matches `auth.users.email` → `leads.email_normalized`.
2. Sets `profiles.lead_id` to the matching lead.
3. Updates `report_requests SET user_id = auth_user_id WHERE lead_id = matched_lead_id AND user_id IS NULL`.

This is safe, one-directional, and preserves the existing public flow untouched.

### 2.3 RLS Policies

| Table | Policy | Rule |
|---|---|---|
| `profiles` | SELECT own | `auth.uid() = id` |
| `profiles` | UPDATE own | `auth.uid() = id` |
| `report_requests` | SELECT own | `user_id = auth.uid()` |
| `analysis_snapshots` | SELECT for owned reports | Via join or security definer function |
| `leads` | No client access | Keep service-role only |

All write operations on `report_requests`, `leads`, `analysis_snapshots` remain server-side via `supabaseAdmin`.

### 2.4 Auth Configuration

- Enable **email/password** auth (with email confirmation).
- Enable **Google OAuth**.
- Do NOT enable auto-confirm.

### 2.5 Recommended Routes

| Route | Purpose |
|---|---|
| `/login` | Login page (email + Google) |
| `/signup` | Signup page |
| `/reset-password` | Password reset |
| `/_app` | Authenticated layout (pathless, uses `beforeLoad` guard) |
| `/_app/reports` | List of user's reports |
| `/_app/reports/$id` | Single report detail (status, PDF download, re-request) |
| `/_app/account` | Profile settings, plan info |
| `/_app/plan` | Plan overview placeholder (no payments yet) |

### 2.6 Visual Direction

- **Light-first** Iconosquare-inspired SaaS dashboard
- Pale blue background (`#F0F4FA` range), white cards, subtle borders
- Sidebar navigation for `/app/*` routes
- Clean report cards with status badges, date, profile avatar
- Separate theme wrapper for `/app/*` (like the report light theme)
- Reuse `tokens-light.css` as a base, extended with dashboard-specific tokens

---

## 3. Implementation Sequence

1. **Auth setup**: Configure email/password + Google OAuth, create login/signup/reset-password routes
2. **Database**: Create `profiles` table + trigger, add `user_id` to `report_requests`, create association trigger, add RLS policies
3. **Protected layout**: Create `_app` layout route with `beforeLoad` guard
4. **Reports list**: `/app/reports` — query `report_requests` for current user
5. **Report detail**: `/app/reports/$id` — show status, PDF download (signed URL via server function)
6. **Account page**: `/app/account` — basic profile info
7. **Plan placeholder**: `/app/plan` — static page showing current plan
8. **Associate existing reports**: Server function that runs on login to link `lead_id` → `user_id`

### Risk Level: **Low-Medium**

- No changes to public analysis flow
- No changes to report generation or PDF pipeline
- No changes to admin area
- Association is additive (new nullable column)

---

## 4. Files Involved (New)

- `src/routes/login.tsx`
- `src/routes/signup.tsx`
- `src/routes/reset-password.tsx`
- `src/routes/_app.tsx` (authenticated layout)
- `src/routes/_app/reports.tsx`
- `src/routes/_app/reports.$id.tsx`
- `src/routes/_app/account.tsx`
- `src/routes/_app/plan.tsx`
- `src/server/auth.functions.ts` (profile creation, report association)
- `src/server/reports.functions.ts` (user's reports, signed PDF URLs)
- `src/components/app/` (dashboard layout, sidebar, report cards)
- `src/styles/tokens-app.css` (dashboard-specific light tokens)
- Migration SQL files (profiles table, user_id column, RLS, triggers)

## 5. Files That Must NOT Be Touched

Everything in `LOCKED_FILES.md`, plus:
- `src/routes/analyze.$username.tsx` (public analysis)
- `src/routes/api/request-full-report.ts` (report request flow)
- `src/routes/api/generate-report-pdf.ts`
- `src/routes/api/send-report-email.ts`
- `src/lib/orchestration/run-report-pipeline.ts`
- `src/routes/report.print.$snapshotId.tsx`
- `src/routes/report.example.tsx`
- `src/routes/admin*.tsx` (all admin routes)
- `src/integrations/supabase/client.ts` (auto-generated)
- `src/integrations/supabase/types.ts` (auto-generated)
- `.env`
- Report redesign components (`src/components/report-redesign/`)

## 6. What Remains Untouched

- Public analysis flow (`/analyze/$username`)
- Report generation pipeline (PDF + email)
- Admin area
- Landing page
- Design tokens (existing)
- All locked files
- Edge functions
- Existing database tables (no destructive changes)
