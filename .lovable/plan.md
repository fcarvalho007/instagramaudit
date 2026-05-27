## Read-only validation — handle `brunoremribeiro`

### 1. Latest `analysis_events` (last 24h, 6 events)

| created_at (UTC) | data_source | outcome | error_code | posts |
|---|---|---|---|---|
| 2026-05-27 10:34:01 | fresh | not_found | **PROFILE_PRIVATE** | — |
| 2026-05-27 10:33:55 | fresh | not_found | **PROFILE_PRIVATE** | — |
| 2026-05-27 10:33:40 | fresh | not_found | **PROFILE_PRIVATE** | — |
| 2026-05-27 10:28:47 | fresh | not_found | **PROFILE_PRIVATE** | — |
| 2026-05-27 10:28:33 | fresh | not_found | **PROFILE_PRIVATE** | — |
| 2026-05-27 07:17:19 | fresh | not_found | **PROFILE_PRIVATE** | — |

All 6 events are `data_source=fresh`. None are `cache`.

### 2. `PROFILE_PERSONAL_NO_FEED` recorded?

**No.** Zero events with that code for this handle. The classifier at `src/routes/api/analyze-public-v1.ts:818-827` requires:
`!isPrivateFlag && !isProfessional && profilePostsCount > 0`

For `brunoremribeiro`, at least one of those conditions fails in the Apify response (most likely `profilePostsCount === 0` in the scraper's profile shell, or `is_private` flag is true), so it falls through to `PROFILE_PRIVATE`. The new personal-no-feed code path is implemented but never hits for this profile.

### 3. Negative-cache behaviour

**Cache exists in code** (`analyze-public-v1.ts:569-615`) and matches both `PROFILE_PERSONAL_NO_FEED` and `PROFILE_PRIVATE` within 24h. However, the recent record shows 6 consecutive `fresh` events with `PROFILE_PRIVATE` already present. Two possible explanations:
- The 5 events in the 10:28–10:34 window were authenticated `?refresh=1` admin runs (forceRefresh bypasses the negative cache). The 07:17 → 10:28 gap (>3h) being still `fresh` suggests the negative-cache code was deployed after 07:17 OR all later runs were admin-triggered refreshes.
- Cannot confirm from data alone whether public users would be served from cache. Code path is correct on read; no observed public-traffic regression event to disprove it.

### 4. `provider_call_logs` cost

All 6 calls: `actor=apify/instagram-scraper`, `status=success`, `posts_returned=0`, `estimated_cost_usd=0.005`, `actual_cost_usd=0.000`. Cumulative estimated ~$0.03; actual reconciled $0. Cost on repeats was **not** avoided in the observed window (each fresh call was billed estimated), but actual reconciliation is zero. If those were admin refreshes, this is expected.

### 5. Public-facing copy

`PROFILE_PERSONAL_NO_FEED` copy in `src/i18n/locales/{pt,en}/errors.json` is the new clear version. **But** since this handle is classified as `PROFILE_PRIVATE`, users currently see the **private-account** message, not the personal-no-feed message.

---

## Verdict

- **Classified correctly?** No. `brunoremribeiro` is public personal, but is being labelled `PROFILE_PRIVATE`. The new heuristic doesn't fire because the profile shell from `apify/instagram-scraper` doesn't satisfy `postsCount > 0 && !isProfessional && !isPrivateFlag`.
- **Cost avoided on repeat?** Inconclusive. Code is in place; observed events are all `fresh`, consistent with admin-triggered refreshes during testing. No confirmed public-traffic cache hit yet.
- **What the user sees:** the `PROFILE_PRIVATE` message (older copy), not the new "Funciona melhor com perfis públicos Creator/Empresa…" message.

### Recommendation: **NO-GO** for closing this error-handling track.

Two gaps must be addressed before marking done:

1. **Classification gap.** Inspect the raw Apify profile shell for `brunoremribeiro` (one controlled run, already executed earlier in this session, payload likely in `provider_call_logs` or last snapshot). Adjust `looksPersonalNoFeed` heuristic so this handle (the canonical motivating case) is correctly labelled — likely loosen the `profilePostsCount > 0` guard or accept `isProfessional === false` alone when scraper returns `latestPosts: []` on a non-private account.
2. **Negative-cache verification.** Confirm with one public (non-admin) request whether the second hit is served as `data_source=cache`. If not, debug the lookup — likely network/handle case mismatch or `forceRefresh` always true in current path.

No code changes proposed in this turn — read-only audit only. Awaiting approval before any follow-up fix.