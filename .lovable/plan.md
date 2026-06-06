# QA Plan — Paid Add Competitor + Beta Credit Flow

**Target:** `https://auditprofiles.com` (production)
**Paid user:** project owner / `frederico.m.carvalho`
**Competitor handle to add:** `martimsilvai` (must be in `APIFY_ALLOWLIST`)
**Read-only intent + 1 real paid action** (1 beta credit + 1 Apify scrape).
**No code, schema, pricing, EuPago, entitlement, or report-generation changes.**

> ⚠️ Heads-up: last validation found production is on an older build than preview. If Add Competitor button/flow is missing on production, I will stop, report it, and not switch environments without your go-ahead.

---

## Step 0 — Pre-flight (read-only)

- `APIFY_ALLOWLIST` includes `martimsilvai` (confirm via env/config check).
- Lookup `frederico.m.carvalho`'s `lead_id` + active `lead_entitlements` (Pro/`report_full_9` or equivalent).
- Read current `beta_credits` balance and current competitor list on the active report snapshot.
- Record `T0 = now()` and snapshot id for the diff window.
- Confirm preconditions: paid entitlement present, ≥1 beta credit, competitor count = 0 or 1.

If preconditions fail → STOP and report.

---

## Step 1 — Paid sidebar state (visual + DOM)

Open report for `frederico.m.carvalho` in browser. Verify:
- Sidebar shows "Premium ativo" (or equivalent badge).
- Sidebar shows real beta-credit balance matching DB.
- Competitor counter shows `X de 2` matching DB.

PASS/FAIL per item + screenshot.

---

## Step 2 — Add competitor dialog (UI gating, no spend yet)

Click "Adicionar concorrente". Verify dialog opens. Probe input states (no submit):
- Invalid handle (`@@@`, empty, spaces) → CTA disabled / error.
- Primary handle (`frederico.m.carvalho`) → rejected with copy.
- Existing competitor (if any) → rejected with copy.
- Valid new handle (`martimsilvai`) → CTA enabled.

PASS/FAIL per state. No fetches expected at this point — verify via network panel.

---

## Step 3 — Submit the paid add (the only real spend)

Confirm with `martimsilvai`. Capture:
- Exactly one POST to `/api/analyze-public-v1`.
- Submitting state visible on CTA.
- DB: a `credit_ledger` row with reservation → confirmation (delta -1) tied to the snapshot.
- DB: `beta_credits` balance decremented by exactly 1.
- URL updates to include `?vs=martimsilvai` (or merges into existing `vs`).
- Report reloads with competitor context (new competitor visible in UI).
- Success toast.
- `provider_call_logs` shows 1 new `apify` row for `martimsilvai` after T0, no unexpected OpenAI/DataForSEO.

PASS/FAIL per item + before/after balance + URL diff.

---

## Step 4 — Limit enforcement at 2/2

After step 3, if counter is now `2 de 2`:
- "Adicionar concorrente" button is disabled.
- Clicking does not open dialog (verify via DOM event + network).
- No fetch to `/api/analyze-public-v1` starts.
- No new `credit_ledger` row.
- Limit hint copy visible.

If we ended step 3 at `1 de 2`, I will note that 2/2 was not reached in this run and report it as "not exercised" rather than fabricate a second paid add.

---

## Step 5 — Failure-path probe (no real spend)

Inspect the client code path for failure handling without triggering a real failure:
- Verify the reserve → confirm/release pattern exists in the add-competitor handler.
- Verify error toast + balance refetch on `/api/analyze-public-v1` non-2xx.

If we cannot validate without a real failure, mark as "code-path verified, runtime not exercised". I will NOT force a backend failure on production.

---

## Step 6 — Period chips (30d / 90d)

Click 30d and 90d chips. Verify:
- Each shows "em preparação" (or equivalent) state.
- No `credit_ledger` change.
- No new fetch to analyze endpoint.

PASS/FAIL per chip.

---

## Step 7 — Free-user path (no spend)

In a separate incognito session (no auth / no entitlement), open the same report and click Adicionar concorrente:
- Pricing/unlock modal opens.
- No fetch to `/api/analyze-public-v1`.
- No `credit_ledger` row.

PASS/FAIL.

---

## Output

I will return:
1. PASS/FAIL checklist for every numbered item in Steps 1–7.
2. Beta credit balance before vs after (with `credit_ledger` row ids).
3. New snapshot/competitor state and `?vs=` value after add.
4. Network events observed (method, URL, status) for the add.
5. Any regression vs the documented contract (e.g. duplicate POSTs, missing balance refresh, mismatched counter, copy issues).
6. Any "not exercised" items with the reason.

No files will be edited. No payments, entitlements, pricing, schema, or report calculations will be touched.
