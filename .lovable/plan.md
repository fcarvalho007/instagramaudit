# Smoke Test: First Real Apify Call (frederico.m.carvalho)

## Pre-checks (already verified read-only)

| Check | State | Source |
|---|---|---|
| APIFY_ENABLED present | yes (just set to `true` via secure popup) | secrets list |
| APIFY_TOKEN present | yes | secrets list |
| APIFY_ALLOWLIST present | yes (must include `frederico.m.carvalho`) | secrets list |
| INTERNAL_API_TOKEN present | yes | secrets list |
| APIFY_TESTING_MODE | not set → defaults to active (allowlist enforced) | `src/lib/security/apify-allowlist.ts` line 29 |
| DB baseline | 0 snapshots, 0 provider_call_logs, last outcome `provider_disabled` | live query |

The runtime kill-switch only returns `true` when `process.env.APIFY_ENABLED === "true"` (literal string). The published Worker may need a fresh deploy to pick up the new secret — if the first call returns `provider_disabled`, that's the cause.

## Steps

1. **Confirm /admin → Diagnóstico** reflects the new secret on the target environment (preview or published). Required state:
   - `APIFY_ENABLED: Ligado · chamadas reais`
   - `Modo de teste: Allowlist ativa`
   - `APIFY_TOKEN: Configurado`
   - Allowlist contains `frederico.m.carvalho`
   
   If diagnostics still show `Desligado` on the published URL, request a Publish/Update and stop.

2. **Fresh call** — invoke once via `invoke-server-function`:
   ```
   POST /api/analyze-public-v1
   Content-Type: application/json
   { "instagram_username": "frederico.m.carvalho", "competitor_usernames": [] }
   ```
   Expect: `success=true`, `status.data_source="fresh"`, posts > 0, cost > 0.

3. **Cache call** — repeat the exact same request once. Expect `data_source="cache"`, no new `provider_call_logs` row, cost zero.

4. **Verify in DB** (read-only queries):
   - `SELECT COUNT(*) FROM analysis_snapshots WHERE instagram_username='frederico.m.carvalho'` → 1
   - `SELECT COUNT(*) FROM provider_call_logs WHERE handle='frederico.m.carvalho'` → 1
   - `SELECT COUNT(*) FROM analysis_events WHERE handle='frederico.m.carvalho' AND created_at > now() - interval '5 minutes'` → 2 (one fresh, one cache)
   - Inspect `social_profiles` row: `analyses_fresh=1`, `analyses_cache=1`, `estimated_cost_usd_total > 0`.

5. **Inspect snapshot payload** to assess report data layer coverage:
   - Read `normalized_payload` from the new snapshot
   - Check presence of: `profile.username`, `profile.full_name`, `profile.biography`, `profile.profile_pic_url`, `profile.followers_count`, `profile.following_count`, `profile.posts_count`, `profile.is_verified`
   - Check `posts[]`: count, `caption`, `taken_at`, `likes`, `comments`, `media_type`, `media_url`, `video_view_count`
   - Note any null/missing fields

6. **Report results** with:
   - Fresh request HTTP status + body excerpt
   - Cache request HTTP status + body excerpt
   - Snapshot id
   - `provider_call_logs` count (must be 1)
   - Posts returned
   - Estimated cost USD
   - Field coverage map (which mockup fields in `/report/example` can be filled from real data, which can't)
   - Verdict on whether the report data layer can now be wired to the real snapshot

## Stop conditions

- If pre-check #1 fails (admin still shows Desligado), do not call Apify. Tell the user a Publish is required.
- If the fresh call returns 503 `PROVIDER_DISABLED`, do not retry — report it and recommend Publish.
- If the fresh call returns 403 `BLOCKED_ALLOWLIST`, do not retry — recommend updating `APIFY_ALLOWLIST`.
- Never run a third fresh call regardless of outcome.

## Files touched

None. Read-only DB queries + 2 HTTP invocations only. No edits to UI, code, migrations, `/report/example`, PDF, or email flows.

## Locked files (untouched)

Per `mem://constraints/locked-files` and project rules: `/report/example`, PDF generation, email flows, `src/integrations/supabase/client.ts`, `src/integrations/supabase/types.ts`, `supabase/config.toml`, `src/routeTree.gen.ts`.
