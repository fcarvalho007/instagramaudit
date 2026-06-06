# Free/Public Enrichment Gate — Production Runtime Validation

## Goal
Confirm in production that an `analyze-public-v1` call produces a Free snapshot whose enrichment is fully skipped (no OpenAI, no DataForSEO, no paid enrichers), Apify primary scrape runs once, and the public report renders the expected Free structure (overview + initial reading + engagement + 5 locked teasers + sticky unlock bar).

This plan spends **one** real Apify primary scrape. Nothing else.

## Open questions before execution

1. **Handle to use.** Confirm which `APIFY_ALLOWLIST` handle to consume. Default candidate: `frederico.m.carvalho` (current test profile). Approve or replace.
2. **Pre-check on 24h freshness.** If the chosen handle already has a fresh snapshot (<24h), the gate will return cached and Apify will NOT run — the test does not validate the fresh path. Options:
   - (a) Pick a different allowlisted handle with no fresh snapshot.
   - (b) Skip the test until the existing snapshot ages out.
   We do NOT delete snapshots.
3. **Build freshness.** Confirm the latest preview was published to `auditprofiles.com` before we trigger. If not, run validation against the published version that IS live and note the version, or pause until publish.

I will not POST anything until these three are confirmed.

## Pre-checks (read-only, no cost)

1. `supabase--read_query` — confirm handle is in `APIFY_ALLOWLIST` secret (read from config or hardcoded allowlist source, whichever the codebase uses).
2. `supabase--read_query` — `SELECT id, created_at, expires_at FROM analysis_snapshots WHERE instagram_username = '<handle>' ORDER BY created_at DESC LIMIT 3;` to confirm no valid (<24h, not expired) snapshot exists.
3. Record `T0 = now()` (UTC) immediately before the POST.
4. Confirm production URL responds: `GET https://auditprofiles.com/` returns 200 and serves the latest build (check build hash / footer version if available).

## Action (one real call, one Apify scrape)

```
POST https://auditprofiles.com/api/analyze-public-v1
Content-Type: application/json

{
  "instagram_username": "<handle>",
  "competitor_usernames": []
}
```

Capture HTTP status, response body, and the returned snapshot id / cache key.

## Validation queries (all read-only)

### A. Snapshot enrichment_status
```sql
SELECT id, created_at,
       normalized_payload->'enrichment_status' AS enrichment_status
FROM analysis_snapshots
WHERE instagram_username = '<handle>'
  AND created_at >= '<T0>'
ORDER BY created_at DESC
LIMIT 1;
```
**Expect** all 5 keys = `skipped_free`:
- `dataforseo`
- `insights_v1`
- `insights_v2`
- `visual_cover`
- `caption_semantic`

### B. enrichment_jobs for this snapshot
```sql
SELECT enrichment_type, status, created_at
FROM enrichment_jobs
WHERE snapshot_id = '<snapshot_id>';
```
**Expect** 0 rows for `dataforseo`, `insights_v1`, `insights_v2`, `visual_cover`, `caption_semantic`. Any row of those types = FAIL.

### C. provider_call_logs after T0
```sql
SELECT provider, actor, status, created_at, estimated_cost_usd, source_context
FROM provider_call_logs
WHERE created_at >= '<T0>'
  AND handle = '<handle>'
ORDER BY created_at DESC;
```
**Expect**:
- Exactly one Apify primary scrape row (status success).
- Zero `openai` rows.
- Zero `dataforseo` rows.

### D. Non-regression on existing snapshots
```sql
SELECT id, updated_at FROM analysis_snapshots
WHERE instagram_username = '<handle>' AND id <> '<new_snapshot_id>'
ORDER BY updated_at DESC LIMIT 5;
```
**Expect** no `updated_at` after T0.

## UI render check
Open `https://auditprofiles.com/analyze/<handle>` (incognito, no login). Confirm:
- "Visão geral" block present.
- "Leitura inicial do perfil" present.
- Engagement block present.
- 5 locked premium teaser cards present (frequencia, formatos, publicacoes-chave, diagnostico-editorial, prioridades).
- Sticky unlock bar appears when scrolling into the teaser area, disappears at the lead magnet card.

Capture one screenshot of the teaser area + sticky bar.

## Output template (filled after run)

- **Handle used:** …
- **T0:** … (UTC)
- **Snapshot ID:** …
- **Enrichment status table:** key → value
- **Enrichment jobs table:** rows or `(none)`
- **Provider calls table:** rows
- **Apify estimated cost (USD):** …
- **UI observations:** bullet list + screenshot ref
- **Old snapshots changed:** yes/no
- **Verdict:** PASS / FAIL with reason

## Hard constraints (do not violate)

- Do NOT call `/api/checkout`, EuPago, or grant `lead_entitlements`.
- Do NOT trigger Pro/Lab regeneration.
- Do NOT enqueue or run OpenAI, DataForSEO, visual_cover, caption_semantic, insights_v1/v2 enrichers — even manually.
- Do NOT modify DB rows. All SQL above is `SELECT`.
- Do NOT delete or update existing snapshots, payments, entitlements, credits, or user_roles.
- Spend cap for this validation: **1 Apify primary scrape**. If the response indicates cache hit, do NOT retry with cache busting.

## What I need from you to proceed

1. Approved handle.
2. Confirmation that no fresh snapshot exists for it (or approval to pick another).
3. Confirmation the latest build is published to `auditprofiles.com`.

Once approved and we're in build mode, I will execute pre-checks → POST → validation queries → UI check → fill the output template.
