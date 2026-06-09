# Pre-launch finalization — Pro 30d/90d + Free→Pro copy

## Status check (already done in earlier turns)

- **Task 1 (Pro window budget)**: `getProWindowProfileDailySpendUsd` in `src/lib/security/apify-budget.server.ts` already filters `.eq("reason", "confirm")` (line 240). Released reservations are no longer counted. ✅
- **Task 2 (app_config seed)**: Migration `20260609093942_*.sql` already seeds `pro_window_90d_enabled='true'`, `apify_pro_window_profile_daily_cap_usd='5.50'`, `apify_90d_daily_cap_usd='20'` with `ON CONFLICT DO NOTHING`. ✅

These two need verification only — no new work, just confirm tests pass.

## Remaining work

### 1. Cache TTL alignment (keep 24h, single source of truth)

Canonical constant: `CACHE_REUSE_MAX_HOURS = 24` in `src/lib/report/retention.ts`. Decision: **keep 24h**, align all copy.

- Audit every user-facing string mentioning "24 horas" / "12 horas" / "24h" / "12h" in cache context (`rg -n "cache.*hora|hora.*cache|cached for"` in `src/i18n/` and `src/components/report-redesign/v2/`).
- Replace any divergent values with the canonical `24` (already correct in `pt/report.json:677` and `en/report.json:677`).
- For the consume-credit modal, ensure the three lines requested by the brief exist with `{{age}}` and `{{cacheHours}}` placeholders:
  - "Existe uma análise recente gerada há {{age}}."
  - "Podes abrir esta versão sem gastar créditos ou gerar uma nova pesquisa para atualizar os dados."
  - "Depois de gerada, esta análise fica disponível em cache durante {{cacheHours}} horas."
- Wire `{{cacheHours}}` from `CACHE_REUSE_MAX_HOURS` (export a small `getCacheHoursLabel()` helper in `retention.ts` if not present) so it cannot drift.

### 2. Remove remaining beta/private-beta user-facing language

Confirmed still present (active surfaces):

| File | Key/line | Current | Replace with |
|---|---|---|---|
| `src/i18n/locales/pt/report.json` | `beta_credits_available` (623) | "{{count}} crédito beta disponível" | "{{count}} crédito Pro disponível" |
| `src/i18n/locales/pt/report.json` | `beta_credits_available_plural` (624) | "{{count}} créditos beta disponíveis" | "{{count}} créditos Pro disponíveis" |
| `src/i18n/locales/pt/report.json` | `consume_dialog.title` (627) | "Usar 1 crédito beta" | "Usar 1 crédito Pro" |
| `src/i18n/locales/en/report.json` | mirror equivalents | "beta credit(s)" | "Pro credit(s)" / "Use 1 Pro credit" |
| `src/components/report-redesign/v2/consume-credit-dialog.tsx` | comment line 73 | "consumir 1 crédito beta" | "consumir 1 crédito Pro" (comment, low-risk) |
| `src/components/report-redesign/report-shell.tsx` | comment 47 | "leitura editorial em preparação" | rephrase comment without "em preparação" |
| `src/components/report-redesign/report-pending-ai-notice.tsx` | text 16, aria 32 | "em preparação" | "ainda a ser gerada" |
| `src/components/admin/v2/automacoes/automation-node.tsx` | `preparing` label | "Em preparação" | **keep** — admin-only state label, not a product readiness claim |
| `src/i18n/locales/en/report.json` | `nav.tabs.coming_soon` (62) + roadmap_* (830-835) | "Coming soon" (other networks) | Rename to neutral "other_networks_soon" key + copy "Other networks soon" (already done in pt per memory — mirror in en) |
| `src/i18n/locales/en/pricing.json:48` | `pending_note` | "Payment coming soon" | "Payment available shortly" |

**Explicitly NOT touched** (per "do not modify legal pages" / inactive legacy):
- `src/routes/termos.tsx`, `src/routes/privacidade.tsx` — legal pages describing service maturity.
- `src/routes/beta.request.tsx`, `src/routes/beta.submitted.$requestId.tsx`, `src/components/beta/beta-request-form.tsx` — legacy `/beta/request` flow. **Decision required from user**: these are still reachable. Default: leave them (legacy path), but note as deferred cleanup.
- `src/styles/pdf-print.css` aria selector — cosmetic CSS targeting the legacy section.

Final acceptance gate:
```
rg -ni "beta privada|fase beta|crédito beta|em preparação|coming soon|janela personalizada" src \
  | grep -v "routes/termos\|routes/privacidade\|routes/beta\.\|beta-request-form\|pdf-print\.css\|automation-node"
```
must return no hits.

### 3. Fix the two failing credit-gate tests

Current state of `src/routes/api/__tests__/analyze-public-v1-credit-gate.test.ts`:
- 9/11 tests pass.
- Failing tests: **#4** ("cache hit NOVO para o lead → consome 1 crédito + cria associação") and **#5** ("fresh success → consome/confirma 1 crédito + cria associação").
- Failure mode: `state.leadReports` is empty (expected length 1).
- The original "`supabaseAdmin.from(...).update is not a function`" error described in the brief is no longer the active failure — the test now fails further along (the `update` chain mock was likely partially repaired since the brief was written). Need to extend the in-memory Supabase mock so the `lead_reports` insert path used by `linkLeadToReport` (or equivalent) actually populates `state.leadReports`.

Steps:
1. Open the test file and locate the `state` shape + the mock `from()` switch.
2. Identify the production code that inserts/upserts `lead_reports` after a successful credit confirm (likely in `analyze-public-v1.ts` post-confirm block).
3. Add the missing branch in the mock: `from("lead_reports")` should support `.upsert(...)` / `.insert(...)` chains that push into `state.leadReports`.
4. Confirm `backfillReserveEventId`'s `.update(...).eq(...).eq(...).is(...)` chain is supported in the same mock; add the no-op chain helper if needed.
5. Re-run the suite — target green 11/11 without touching production credit semantics.

### 4. Validation pass

Run, in order:
1. `bunx vitest run src/lib/security/__tests__/apify-budget-pro-window.test.ts`
2. `bunx vitest run src/routes/api/__tests__/analyze-public-v1-credit-gate.test.ts`
3. `bunx vitest run src/routes/api/__tests__/analyze-public-v1-force-refresh.test.ts`
4. `bunx vitest run src/lib/email/templates/__tests__ src/lib/email/__tests__`
5. Final grep gate (see above).

## Files expected to change

- `src/lib/report/retention.ts` — optional small `getCacheHoursLabel()` export.
- `src/i18n/locales/pt/report.json` — beta_credits_*, consume_dialog.title.
- `src/i18n/locales/en/report.json` — mirror PT keys + rename `coming_soon` roadmap keys.
- `src/i18n/locales/en/pricing.json` — `pending_note`.
- `src/components/report-redesign/v2/consume-credit-dialog.tsx` — JSDoc + ensure `{{cacheHours}}` interpolation.
- `src/components/report-redesign/report-shell.tsx` — comment rewording.
- `src/components/report-redesign/report-pending-ai-notice.tsx` — copy.
- `src/routes/api/__tests__/analyze-public-v1-credit-gate.test.ts` — mock fix only.

## Explicitly not touched (per brief)

Checkout, EuPago webhook, pricing amounts, competitor visual design, AI prompts, LinkedIn/TikTok research, public landing, `/report/example`, payment flow logic (copy excepted), legal pages, `/beta/request` legacy flow.

## Open question

Want me to also retire the legacy `/beta/request` route + form in this pass, or keep it as a deferred separate task? Default in this plan: keep it.
