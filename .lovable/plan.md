## Add Competitor — why the QA never reached the backend

### TL;DR

The code path is **correct**. No fix needed. The QA failed because the manual setup only inserted an **entitlement** but no **credit_ledger** row — and `ConsumeCreditDialog` short-circuits the entire flow (`onConfirm` never fires, `fetchPublicAnalysis` never runs, nothing hits the server) whenever `balance < 1`. A page reload was also required after the manual entitlement insert because `premiumUnlocked` is read once at mount.

---

### Files inspected

- `src/components/report-redesign/v2/report-block-nav.tsx` (1530 lines)
- `src/components/report-redesign/v2/consume-credit-dialog.tsx` (full)
- `src/components/report-redesign/v2/overview/competitor-modal.tsx` (full — Free teaser only, not in the paid path)
- `src/routes/analyze.$username.tsx` (L395–455)
- `src/lib/analysis/client.ts` (already in context)

### Code-path confirmation (paid flow)

| # | Check | Location | Result |
|---|---|---|---|
| 1 | `nav.tsx` has the `competitor` branch in `onConfirmConsume` | L613–748 | PASS |
| 2 | Branch calls `fetchPublicAnalysis(primaryHandle, [...existing, newHandle])` | L664 | PASS |
| 3 | Passes primaryHandle + full competitor list (existing + new) | L661, L664 | PASS |
| 4 | No silent return before the fetch (only early returns are: missing handle, `submitting` re-entry guard, at-limit guard — all log/setError) | L635–660 | PASS |
| 5 | `submitting` starts `false` per mount, only set true AFTER guards (L641); does NOT block first submit | L565, L639–641 | PASS |
| 6 | Dialog confirm button enabled iff `!submitting && competitorReady` (handle valid + not duplicate) — and rendered only when `hasCredit && isCompetitor && !atCompetitorLimit` | dialog L257, L137 | PASS w/ caveat → see below |
| 7 | `premiumUnlocked` is passed to nav from `analyze.$username.tsx` via `ReportShellV2`, derived from `getMyReportEntitlement()` (`report_full_9`) | route L402, L449 | PASS |
| 8 | `premiumUnlocked` fetched **once** in `useEffect([])` on mount → manual entitlement insert AFTER mount requires **page reload** | route L403–415 | PASS (by design) |
| 9 | `lead_session` cookie is the only identity carried into both `getMyReportEntitlement` and `getMyCreditBalance` — if it doesn't match the manually-elevated lead, both return false/0 silently | nav L571–585, route L405 | PASS (silent fail-closed) |

### Ranked root-cause hypotheses

1. **HIGHEST — No `credit_ledger` row for the QA lead.** The manual insert created `lead_entitlements(report_full_9)` only. `ConsumeCreditDialog` checks `hasCredit = balance >= 1` (L82). If `balance === 0`:
   - Confirm button branch (L253–272) is **not rendered**.
   - Footer shows the **empty-state CTA** (L273–282) wired to `onEmptyFeedback` — opens the feedback sheet, never calls `onConfirm`.
   - Result: no `fetchPublicAnalysis`, no `/api/analyze-public-v1` request, no `credit_ledger`, no `provider_call_logs`, no `product_events`, no snapshot mutation. **Exactly the observed symptoms.**
2. **HIGH — Page was not reloaded after the manual entitlement insert.** `premiumUnlocked` is `false` on mount and only flips on a successful response from `getMyReportEntitlement()` fired in `useEffect([])` (L403–415). Without reload, `premiumUnlocked` stays `false` → the entire Pro chip+button path (L821, L933) is replaced by the locked-state CTA that goes through `handlePremiumAccessClick("sidebar_add_competitor")` (L762) → opens the upgrade flow, never the consume dialog.
3. **MEDIUM — `lead_session` cookie mismatch.** Both `getMyReportEntitlement` and `getMyCreditBalance` read the lead from the cookie. If the QA elevated lead A but the browser cookie identifies lead B, both fail-closed silently (entitlement returns `premiumUnlocked:false`; balance returns `hasLead:false` → balance stays `0`). Visually indistinguishable from "Free user". Same downstream symptoms.
4. **LOW — Handle invalid / duplicate.** `competitorReady` requires `/^[a-z0-9._]{1,30}$/` AND not equal to primary or any existing competitor (dialog L100–106). If the QA typed `@frederico.m.carvalho` (own profile) or a malformed handle, confirm stays disabled. But this would still leave the dialog open — observable visually.
5. **VERY LOW — Production build mismatch.** The `onConfirmConsume` branch and the empty-state short-circuit have both been deployed (confirmed earlier this session; fingerprint of `analyze.$username` includes the entitlement effect). No reason to suspect a stale bundle for this surface.
6. **DISMISSED — `submitting` blocking first click.** Initial state is `false`; only flipped after guards pass (L641). The L639 `if (submitting) return` guard is a re-entry guard, not a first-click block.
7. **DISMISSED — Modal branch issue.** `CompetitorModal` (the Free teaser, `competitor-modal.tsx`) is a different component with no submit logic. The paid flow uses `ConsumeCreditDialog` mounted only inside the `premiumUnlocked` branch (nav L821, L827).

### Browser pre-flight checklist before repeating QA

Run all 7 in order in the SAME tab BEFORE clicking Add Competitor:

1. **Confirm the lead identity.** DevTools → Application → Cookies → `lead_session` exists and is non-empty. Copy its value.
2. **Confirm it matches the elevated lead.** Hit `GET /api/debug/lead-session-status` in the same tab — the returned `lead_id` must equal the lead row that has the manual `lead_entitlements.report_full_9` AND the manual `credit_ledger` row with positive balance.
3. **Confirm `credit_ledger` balance > 0** for that lead (`SELECT coalesce(sum(delta),0) FROM credit_ledger WHERE lead_id='<id>'`). For QA, top up with a `manual_topup` row, not only an entitlement.
4. **Hard reload `/analyze/<handle>`** (Cmd-Shift-R) AFTER both rows are in the DB — `premiumUnlocked` and `balance` are fetched once on mount, no live revalidation.
5. **In the sidebar, confirm the "Adicionar concorrente" button is the Pro variant** (not the locked one with the lock icon). Visual cue: shows credit counter `0/2`, not `Premium` badge.
6. **Click Add Competitor → modal title must read "Adicionar concorrente"** (`title_competitor`), NOT "Já não tens créditos" (`empty_title`). If the empty title appears, balance is 0 client-side — stop and recheck steps 2–4.
7. **Type a valid Instagram handle that is NOT the primary and NOT already a competitor.** The "Usar 1 crédito" button must enable. Click it.

After the click: Network panel must show a `POST /api/analyze-public-v1` request with body containing both competitor handles. If it doesn't, capture the modal screenshot and the `lead_session` cookie value for further debug.

### Recommendation — no code fix needed

The behaviour matches the design: dialog deliberately swaps to a feedback CTA when balance hits 0, so users never see "use 1 credit" without having one. The QA failure mode (empty `credit_ledger` + page not reloaded) is operator setup, not a regression.

#### Repeat-QA prompt (paste in next turn)

> Run the Add Competitor backend QA again with this exact setup:
>
> 1. Pick a controlled lead (e.g. `7b946d45-…fredericodigital@gmail.com`); record its `id`.
> 2. Issue two SQL inserts in this order:
>    ```sql
>    INSERT INTO lead_entitlements (lead_id, product_code, metadata)
>    VALUES ('<id>', 'report_full_9', '{"source":"manual_qa"}');
>    INSERT INTO credit_ledger (lead_id, delta, reason, metadata)
>    VALUES ('<id>', 2, 'manual_topup', '{"source":"manual_qa"}');
>    ```
> 3. In the browser, sign in/onboard so `lead_session` cookie = `<id>` (verify via `/api/debug/lead-session-status`).
> 4. Hard-reload `/analyze/frederico.m.carvalho`.
> 5. Open the sidebar, click "Adicionar concorrente", type `mariiana.ai`, click "Usar 1 crédito".
> 6. Capture the Network entry for `POST /api/analyze-public-v1` and these SQL deltas since T0:
>    - `credit_ledger` (expect -1 reserve + 0 confirm for `cache_key v1:frederico.m.carvalho|mariiana.ai`)
>    - `provider_call_logs` (expect 1 row for mariiana.ai, baseline window)
>    - `analysis_snapshots.competitor_usernames` (expect `["mariiana.ai"]`)
>    - `product_events` (expect `beta_credit_intent_competitor` + `beta_credit_used_competitor`)
> 7. Roll back the manual rows when done.
