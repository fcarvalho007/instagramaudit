## Root cause

A `marketing_consent = true` gate was added (defesa em profundidade) to two server modules **after** the existing tests were written:

- `src/lib/brevo/sync.server.ts` — checks `lead.marketing_consent !== true` → returns `NO_MARKETING_CONSENT`.
- `src/lib/email/lead-magnet-sequence.server.ts` — looks up `leads.marketing_consent` and short-circuits if not `true` (fail-closed if lookup throws/returns undefined).

The two failing test files predate this gate:

- `src/lib/brevo/__tests__/sync.test.ts` — lead fixtures don't include `marketing_consent`, so success/failure paths now hit the consent-skip branch.
- `src/lib/email/__tests__/lead-magnet-sequence.test.ts` — the supabase mock only models the `product_events` dedup chain. The new `from("leads").select(...).eq(...).maybeSingle()` call returns `undefined`, so every test hits the fail-closed branch.

These are **obsolete test fixtures**, not regressions in product code. The consent gate is intended behavior.

Additionally, `LEAD_MAGNET_EMAIL_SEQUENCE_ENABLED` has no explicit test coverage today.

## Classification

| Test file | # failing | Cause | Action |
|---|---|---|---|
| `sync.test.ts` | 2 | Obsolete: consent gate added | Update fixtures + add 1 new test |
| `lead-magnet-sequence.test.ts` | 7 | Obsolete: leads lookup not mocked | Extend mock + add 3 new tests |

No production code changes. Tests are not weakened — new assertions for the consent gate and kill switch are added.

## Plan

### 1. `src/lib/brevo/__tests__/sync.test.ts`

- Add `marketing_consent: true` to the lead fixtures in:
  - "builds full attribute payload and records success event"
  - "propagates upsert failure reason and records failure event"
- Add new test: **"skips with NO_MARKETING_CONSENT when marketing_consent is not true"** — fixture without the flag, assert `out.reason === "NO_MARKETING_CONSENT"`, `mockUpsert` not called, and a `brevo_contact_sync_failed` event recorded with that reason.

### 2. `src/lib/email/__tests__/lead-magnet-sequence.test.ts`

Replace the simplified supabase mock with a table-aware `from()` mock:
- `from("leads").select("marketing_consent").eq("id", _).maybeSingle()` → returns `{ data: { marketing_consent: leadConsent } }` (configurable via `beforeEach`, default `true`).
- `from("product_events").select(...).eq(...).eq(...).contains(...).limit(...).maybeSingle()` → keeps the existing `dedupMaybeSingle` behavior.

Update all 7 existing tests to use the new mock with `marketing_consent: true` (preserves intent).

Add 3 new tests for kill-switch + consent:
- **"skips entire sequence when LEAD_MAGNET_EMAIL_SEQUENCE_ENABLED is 'false'"** — sets env, asserts both outcomes are `skipped_disabled`/`skipped_no_data`, no senders called, `lead_magnet_sequence_skipped` event recorded.
- **"sends sequence when LEAD_MAGNET_EMAIL_SEQUENCE_ENABLED is unset (default ON)"** — deletes env var, runs brand-new lead path, asserts both emails attempted.
- **"skips entire sequence when lead has no marketing_consent"** — `marketing_consent: false`, asserts both outcomes skipped, neither sender called, `lead_magnet_sequence_skipped` event with `reason: "NO_MARKETING_CONSENT"`.

Wrap env mutations in `beforeEach`/`afterEach` to restore `process.env`.

### 3. No changes

- No production code changes.
- No changes to `templates.test.ts` or `transactional-email.test.ts` (already green).
- No changes to email copy, UI, or DB.

## Validation

```bash
bunx vitest run src/lib/email/__tests__/lead-magnet-sequence.test.ts
bunx vitest run src/lib/brevo/__tests__/sync.test.ts
bunx vitest run src/lib/email/__tests__/templates.test.ts
bunx vitest run src/lib/email/__tests__/transactional-email.test.ts
bunx vitest run
bunx tsc --noEmit
```

Target: 289 + 4 new = **293/293 green**.

## Risks

- The new table-aware `from()` mock must preserve the exact chain shape used by `eventAlreadyEmitted` (`select → eq → eq → contains → limit → maybeSingle`). Mismatch reintroduces fail-open dedup (`false`) which is acceptable but would mask the duplicate-skip test — verified against current source.
- Env restoration: must snapshot `process.env.LEAD_MAGNET_EMAIL_SEQUENCE_ENABLED` before each test and restore after, to avoid cross-test bleed.
