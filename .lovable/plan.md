## Audit Result

| # | Requirement | Status |
|---|------------|--------|
| 1 | Auth pages render light-first | PASS — AuthCard already uses `bg-[#F0F4FA]` + white card |
| 2 | No blank screen during session check | **FAIL** — login.tsx and signup.tsx return `null` while checking session |
| 3 | Session checks use useEffect | PASS — useEffect triggers async getUser() |
| 4 | Google OAuth uses approved method | PASS — `lovable.auth.signInWithOAuth("google")` |
| 5 | /app/* redirects unauthenticated | PASS — app.tsx redirects to /login |
| 6 | Authenticated users access /app/* | PASS |
| 7 | Logout works from layout + account | PASS — sidebar, topbar, and account page all call signOut |
| 8 | Route tree registration | PASS — all files use correct createFileRoute paths |

## Fix Required

**Files to change (2):**

### 1. `src/routes/login.tsx` (line 81)
Replace `if (checkingSession) return null;` with a light-themed centered spinner using the AuthCard background, so the user sees the pale blue page instead of a blank/dark flash.

### 2. `src/routes/signup.tsx` (line 87)
Same fix — replace `return null` with a light spinner.

Both fixes are identical: replace the early return with:
```tsx
if (checkingSession) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F0F4FA]">
      <Loader2 className="size-5 animate-spin text-slate-400" />
    </div>
  );
}
```

`Loader2` is already imported in both files.

## Not touched
- Public analysis flow, /analyze/$username
- Report generation pipeline, PDF/email endpoints
- Admin routes
- Report redesign components
- Locked files
- Supabase auto-generated files
- No database migrations needed
