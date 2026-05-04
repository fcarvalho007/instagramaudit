
# QA Audit — Authenticated User Area & Reports History

## PASS/FAIL Table

### 1. Auth Flow

| Check | Status | Notes |
|-------|--------|-------|
| User readable in /app routes | **PASS** | `AppShell` calls `supabase.auth.getUser()`, sets user state |
| Unauthenticated redirect | **PASS** | Redirects to `/login` if no user |
| Signed-out redirect | **PASS** | `onAuthStateChange` catches `SIGNED_OUT` |
| Login route works | **PASS** | `autoLogin` server fn sets temp password, `signInWithPassword` works (confirmed in network logs) |
| Signup route exists | **PASS** | Full email+password form at `/signup` |
| Reset-password route exists | **PASS** | Route exists at `/reset-password` |
| Auth header forwarded to server fns | **PASS** | `withSupabaseHeaders` middleware added in previous turn |

### 2. Data Linking

| Check | Status | Notes |
|-------|--------|-------|
| Profile row exists for test user | **PASS** | Inserted in previous turn (id: `c70e200d...`, email: `fredericodigital@gmail.com`) |
| `profiles.lead_id` populated | **FAIL** | `lead_id` is NULL. No lead record exists for this email |
| `handle_new_user` trigger active | **FAIL** | Function exists but **trigger is NOT attached** to `auth.users`. New signups will NOT auto-create profiles |
| `link_user_to_existing_reports` works | **PASS** (code) | Function is correct but no-ops because there are no leads |
| `report_requests.user_id` populated | **N/A** | Zero report_requests in DB |
| Legacy lead_id fallback | **PASS** (code) | `getUserReports` correctly falls back to `lead_id.eq.${leadId}` |

### 3. Reports List (`/app/reports`)

| Check | Status | Notes |
|-------|--------|-------|
| Loads only current user's reports | **PASS** | Filters by `user_id` and optionally `lead_id` |
| Empty state shown correctly | **PASS** | Shows "Ainda nao ha relatorios" + CTA when `reports.length === 0` |
| Status badges map correctly | **PASS** | `deriveRequestStatus` covers completed, failed, processing, pending |
| PDF status displayed | **PASS** | `derivePdfBadge` covers generated, generating, failed, default |
| Delivery status displayed | **PASS** | `deriveDeliveryBadge` covers sent, failed, default |

### 4. Report Detail (`/app/reports/$id`)

| Check | Status | Notes |
|-------|--------|-------|
| Ownership enforced | **PASS** | `getOwnedReport` filters `.eq("user_id", userId)` via `supabaseAdmin` |
| Timeline uses correct fields | **PASS** | Uses `created_at`, `analysis_snapshot_id`, `pdf_generated_at`, `email_sent_at` |
| Signed PDF URL after ownership check | **PASS** | `getReportPdfUrl` verifies `user_id` match before signing |
| `pdf_storage_path` NOT exposed | **PASS** | Not in the return object of `getOwnedReport` |
| Email delivery card handles all states | **PASS** | Covers sent/sending/failed/not_sent |
| Error hint sanitized | **PASS** | Replaces raw error with generic message |

### 5. Test Data

| Check | Status | Notes |
|-------|--------|-------|
| report_requests table | **EMPTY** | 0 rows |
| leads table | **EMPTY** | 0 rows |
| analysis_snapshots | Not checked (outside scope) |

---

## Findings Summary

### Critical Issues (2)

1. **`handle_new_user` trigger missing** — The function `public.handle_new_user()` exists but no trigger binds it to `auth.users`. Any new signup will NOT auto-create a `profiles` row, causing 406 errors in the app.

2. **No test data** — Zero `report_requests` exist. The `/app/reports` page will always show empty state. Cannot validate the full card/detail flow end-to-end without at least one record.

### Minor Issues (1)

3. **`profiles.lead_id` is NULL** — No `leads` row exists for `fredericodigital@gmail.com`, so legacy fallback is untestable.

---

## Proposed Fix Plan (minimal, safe)

### Fix 1 — Attach `handle_new_user` trigger

Migration:

```sql
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
```

This is the standard Supabase pattern and only touches the public schema function.

### Fix 2 — Create one minimal test `report_request`

Insert via data tool (not migration):

- `instagram_username`: `frederico.m.carvalho`
- `user_id`: `c70e200d-441d-4625-b25e-4fe37021c79c`
- `lead_id`: create a corresponding lead first
- `request_status`: `completed`
- `pdf_status`: `generated`
- `delivery_status`: `sent`
- `pdf_storage_path`: a placeholder (will not resolve but tests the UI)
- `email_sent_at`: current timestamp
- `pdf_generated_at`: current timestamp

This gives one complete-state record to validate the full card and detail view.

### Fix 3 — Create matching lead record (optional)

Insert a lead for `fredericodigital@gmail.com` and link `profiles.lead_id` to it, so the legacy fallback path can also be tested.

---

### What NOT to touch

- Public analysis flow
- PDF generation pipeline
- Admin routes
- Report redesign components
- Locked files
- Global tokens
