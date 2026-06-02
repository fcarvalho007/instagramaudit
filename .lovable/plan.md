# Onboarding → Analyze: Root-Cause Audit

## Verdict

**READY WITH FIXES** for production. **BLOCKED for preview-iframe QA.**

Production (`auditprofiles.com`) works end-to-end (proven below).
Preview (`id-preview--…lovable.app` inside the Lovable editor iframe) reproducibly loses the `lead_session` cookie between `/api/onboarding/start` and the next `/api/analyze-public-v1`, which makes the modal reopen at step 0.

The "Dados inválidos" run the user saw is a **different, second-order failure** (server now rejects a payload missing `gdpr_consent`) — covered separately.

---

## 1. Reproduction evidence

### 1a. Live preview session (captured in this turn's network log)

Sequence observed at 08:00:30–08:00:35 UTC on
`/analyze/frederico.m.carvalho` inside the preview iframe:

| # | Request | Status | Notable |
|---|---|---|---|
| 1 | `POST /api/public/onboarding-event` step_complete 3 | 204 | – |
| 2 | `POST /api/onboarding/start` | **200** | body returns `{ok:true, lead_id:"ef6976bb-…", credits:2}` |
| 3 | `POST /api/public/onboarding-event` `onboarding_success` | 204 | – |
| 4 | `POST /api/analyze-public-v1` | **402** | body: `{error_code:"ONBOARDING_REQUIRED"}` |
| 5 | `POST /api/public/onboarding-event` step_view **step:0** | 204 | modal reopened at intro |

Step 5 = modal returning to "Cria a tua conta e abre o relatório".

### 1b. Production verification (curl, two-request flow, same cookie jar)

```
POST https://auditprofiles.com/api/onboarding/start
→ 200, body {ok:true, lead_id:"38e59fa3-…", credits:2}
   Set-Cookie: lead_session=38e59fa3-…; Max-Age=31536000;
               Path=/; HttpOnly; Secure; SameSite=Lax

POST https://auditprofiles.com/api/analyze-public-v1   (same jar)
Cookie: lead_session=38e59fa3-…
→ 200, 22031 B snapshot body
```

**Production flow is healthy.** Cookie is emitted correctly with the
right attributes and is accepted on the very next request.

### 1c. Preview curl (sanity check)

Curl against `id-preview--…lovable.app/api/onboarding/start` returns
`302 → lovable.dev/auth-bridge` — preview is gated by Lovable's iframe
auth bridge, so curl can't reach it. The browser inside the editor
crosses that bridge, then hits the same server code we proved works
via the published domain.

---

## 2. Why the cookie disappears in the preview iframe

All of these are true and consistent with the observed failure:

- The cookie is set with `SameSite=Lax; Secure; HttpOnly; Path=/`
  (verified in `src/lib/leads/lead-cookie.server.ts` and on the wire).
- The preview app is rendered **inside an iframe whose top-level
  document is on `lovable.dev`** (different site than
  `id-preview--…lovable.app`).
- For an iframe whose origin differs from the top-level site, modern
  browsers (Chrome with cookie partitioning / CHIPS, Safari ITP,
  Firefox ETP) treat cookies set by that iframe's server as
  **third-party / partitioned**. Same-site `SameSite=Lax` cookies set
  inside a third-party iframe are commonly **not sent back on
  subsequent `fetch()` calls** initiated from that iframe — even though
  the fetch is same-origin to the iframe.
- `fetchPublicAnalysis` (`src/lib/analysis/client.ts`) calls `fetch()`
  without `credentials:"include"`. Default `same-origin` is enough for
  a top-level page, but partitioned/3p iframes still need
  `SameSite=None; Secure` (and ideally `Partitioned`) for the cookie
  to be replayed.
- Server reads via `readLeadIdFromRequest()` only see what the browser
  actually sends. No cookie header → `ONBOARDING_REQUIRED`.

Server-side proof that the cookie itself is well-formed: the same
encoding round-trips fine on production. No HMAC, base64url, length,
or clock issue.

---

## 3. Why the modal reopens at the intro

`src/routes/analyze.$username.tsx` (lines 213–248, 330–338):

```
onSuccess() {
  setOnboardingOpen(false);
  void load();             // re-runs fetchPublicAnalysis()
}

load() {
  …
  if (analysis.error_code === "ONBOARDING_REQUIRED") {
    setOnboardingOpen(true);   // modal reopens
    return;
  }
}
```

And `OnboardingModal` resets to step 0 on every `open` transition
(lines 136–149 of `src/components/onboarding/onboarding-modal.tsx`):

```
useEffect(() => {
  if (!open) return;
  succeededRef.current = false;
  formStartedAtRef.current = Date.now();
  setStep(0);                  // ← intro, not the previous step
  …
}, [open]);
```

So: cookie lost → analyze 402 → `setOnboardingOpen(true)` → modal
resets to intro. Exactly what the user reports.

---

## 4. "Dados inválidos" event (separate cause)

When the modal does submit but a field is missing, the server now
returns:
`400 {error_code:"INVALID_PAYLOAD", message, issues:[{field, code}]}`.
The modal maps `issues` into per-field errors. In the captured run
the body included `gdpr_consent:true` and got 200, so the "Dados
inválidos" message the user saw earlier was from a previous build
where the bundle wasn't sending `gdpr_consent` and the server already
required `z.literal(true)`. Current bundle behaves correctly (see
request body in #1a).

---

## 5. Credit ledger / double-reserve

Not re-tested in this audit (no code changes allowed and we never got
past the cookie gate in the preview). Last smoke run still recorded
two `reserve` rows, balance ending at 0. Plausible drivers:

- `useEffect(() => { void load(); }, [load])` in `analyze.$username.tsx`
  runs twice under React StrictMode in dev.
- `onSuccess` ALSO calls `void load()`. If a successful onboarding
  ever resolves while the initial `load()` is still in flight, the
  endpoint is hit twice.
- `/api/analyze-public-v1` has no idempotency key per `(lead, cache_key)`
  on the reserve path.

This is a contributing risk but **not the root cause of "report does
not open"**.

---

## 6. Flow map

| Expected step | Actual (preview) | Evidence | Status |
|---|---|---|---|
| Submit modal | Submitted | network req #2 | ✅ |
| /api/onboarding/start 200 | 200 | body `credits:2` | ✅ |
| `Set-Cookie: lead_session` emitted | Emitted by server (proven prod) | curl on prod | ✅ server, ❓ browser |
| Cookie stored in iframe | Likely partitioned / dropped | req #4 sees no lead | ❌ |
| /api/analyze-public-v1 called once | Once | req #4 | ✅ |
| /api/analyze-public-v1 success | 402 ONBOARDING_REQUIRED | req #4 body | ❌ |
| Modal stays closed | Reopened at step 0 | req #5 step_view 0 | ❌ |
| Report renders | Never | – | ❌ |

| Expected step | Actual (production via curl) | Evidence | Status |
|---|---|---|---|
| /api/onboarding/start 200 + Set-Cookie | 200 + lead_session cookie | curl `-v` | ✅ |
| /api/analyze-public-v1 with cookie | 200 + 22 KB snapshot | curl `-v` | ✅ |

---

## 7. Root cause

**Proven**: in the preview iframe, the `lead_session` cookie set by
`/api/onboarding/start` is not replayed on the next
`/api/analyze-public-v1` request. `readLeadIdFromRequest()` returns
`null` → server returns `ONBOARDING_REQUIRED` → UI reopens the modal
at the intro step.

**Most likely mechanism** (high confidence, not yet directly
instrumented): third-party / partitioned-cookie behaviour for a
`SameSite=Lax` cookie set inside an iframe whose top-level origin
(`lovable.dev`) differs from the iframe origin (`id-preview--…
lovable.app`). Same code path works in a normal top-level browser tab
(verified via curl against `auditprofiles.com`).

---

## 8. Files implicated

- `src/lib/leads/lead-cookie.server.ts` — cookie attributes
  (`SameSite=Lax`, `Secure`, `httpOnly`, no `Domain`, no `Partitioned`).
- `src/lib/analysis/client.ts` — `fetch` call without
  `credentials:"include"`.
- `src/routes/api/onboarding/start.ts` — calls `setLeadCookie` after
  building a `new Response()`; works on prod, so framework integration
  is fine.
- `src/routes/analyze.$username.tsx` — reopens modal on 402.
- `src/components/onboarding/onboarding-modal.tsx` — resets to step 0
  on every `open`.

---

## 9. Minimal fix plan (for a follow-up Build Mode task — not in this audit)

1. Cookie attributes in `lead-cookie.server.ts`:
   - In environments where the app may be embedded (preview),
     emit `SameSite=None; Secure; Partitioned` so the iframe-issued
     cookie is sent back on subsequent same-origin fetches.
   - Keep production behaviour identical (or also opt into
     `Partitioned` — Chrome CHIPS-friendly and harmless for top-level).
2. `fetchPublicAnalysis` and any other browser fetch that depends on
   the lead cookie: set `credentials:"include"` explicitly.
3. UX guard in `analyze.$username.tsx`: when the *post-onboarding*
   `load()` returns `ONBOARDING_REQUIRED`, show a one-line inline
   error ("Não conseguimos guardar a sessão neste browser") with a
   "Tentar novamente" button instead of silently reopening the modal
   at step 0. This makes any future cookie regression observable.
4. Idempotency for `/api/analyze-public-v1` reserve on
   `(lead_id, cache_key)` to neutralise StrictMode / double-mount
   double-reserve (and stop the balance landing at 0).
5. Optional: emit a `product_events` row when
   `readLeadIdFromRequest()` returns null right after a successful
   onboarding from the same actor_hash, so we can detect this in
   back-office.

## 10. Tests needed

- Unit: `lead-cookie.server.ts` snapshot of the `Set-Cookie` string
  in preview vs production.
- Server route test: `/api/analyze-public-v1` with a synthetic valid
  `lead_session` cookie returns 200 (already exists — re-assert).
- Server route test: double POST to `/api/analyze-public-v1` for the
  same `(lead_id, cache_key)` consumes at most one credit.
- E2E (browser tool) inside preview iframe: full onboarding → expect
  report to render without modal reopening.

## 11. Publish blocking?

- **No** for end users on the published domain (`auditprofiles.com`,
  `instagramaudit.lovable.app`): production curl proves the happy path.
- **Yes** for preview QA inside the Lovable editor: nobody can
  actually validate the full flow there until the cookie attributes
  are widened or the iframe limitation is acknowledged.
- Recommend shipping fix #1 + #2 + #4 before the public Publish so
  that (a) the same fix protects any future embed scenario, and (b)
  the double-credit drain doesn't undermine the "2 créditos grátis"
  promise.

No code was changed in this audit.
