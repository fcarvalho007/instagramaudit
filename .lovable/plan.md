# Admin Report Lab — variant semantics, admin credits, modal fix

## Phase 1 — Diagnosis

| Issue | Root cause | Files | Risk |
|---|---|---|---|
| Two buttons labelled "Cancelar" in no-credit modal (period intent) | When `isPeriod && !hasCredit`, the footer renders the outline cancel button (line 342) AND a primary button (lines 351-354) both using `consume_dialog.cta_cancel`. | `src/components/report-redesign/v2/consume-credit-dialog.tsx` | low |
| Fullscreen admin preview shows 0 credits → "Sem créditos disponíveis" blocks 30d/90d testing | `report-block-nav.tsx` calls `getMyCreditBalance()` which requires a Supabase user session linked to a lead. Admin operator is signed in as admin (Google + allowlist), not as a paying lead, so `hasLead=false` → `balance` stays 0. There is no admin-test override. | `report-block-nav.tsx`, `admin_.report-preview.$username.tsx` | medium |
| `internal_lab` looks identical to a Pro report inside the page body | Both `internal_lab` and `pro_preview` resolve `premiumUnlocked={variant !== "public_mvp"}` and unlock the same blocks. Only the floating pill ("INTERNAL · LAB" vs "PRO") distinguishes them. The lab banner only shows for `internal_lab` (already present) but Pro-only blocks (Performance/Content/Search/Benchmark) render under both. | `admin_.report-preview.$username.tsx`, `report-shell-v2.tsx`, `report-variant.ts` | low (intentional today, but mislabelled) |
| Report Lab matrix shows "OCULTO" for Pro blocks (Performance/Content/Search/Benchmark) | `getVariantFeatures("pro_preview")` marks `blockPerformance/blockContent/blockSearch/blockBenchmark` as `"hidden"` (lines 109-112 of `report-variant.ts`). Only `internal_lab` sets them to `"full"`. So `pro_preview` is currently more restrictive than `internal_lab` — by design today, but doesn't match the product rule "Pro report = full report including these blocks". | `src/lib/report/report-variant.ts` | medium |
| No production parity indicator | There is no build/commit badge anywhere. `auditprofiles.com` (published) and the current preview build use different deployments; without a visible build ID an admin cannot tell which they're looking at. | n/a | low |

Conclusions:
- The "PRO badge" the user saw is the floating preview pill — `pro_preview` correctly shows "PRO", `internal_lab` correctly shows "INTERNAL · LAB". The confusion is that internal_lab visually behaves like Pro inside the page body.
- The core blocker is credit balance = 0 in admin preview + duplicated cancel button.
- `pro_preview` variant currently understates the real Pro report (hides Pro-only blocks), making the matrix misleading.

## Phase 2 — Fix variant semantics

Update `src/lib/report/report-variant.ts`:
- `pro_preview` → align with the real Pro report: `blockPerformance`, `blockContent`, `blockSearch`, `blockBenchmark` → `"full"`, `commentIntelligence` → `"full"`, `marketSignals` → `"full"`, `benchmarkGauge` → `"full"`, `captionsDiagnostics` → `"full"`.
- `internal_lab` keeps everything `"full"` + `debugLabels: "full"` (already so). This is the only variant that exposes debug labels and the internal "FULL PREVIEW" banner.
- `public_mvp` unchanged.

Update `MODULE_READINESS` notes for blocks promoted out of `internal_only` to `ready` / `pro_candidate` where appropriate.

## Phase 3 — Admin/operator test credits

Add an explicit admin-preview flag plumbed through the report shell.

1. `admin_.report-preview.$username.tsx`: pass `isAdminPreview: true` into `ReportShellV2`.
2. `ReportShellV2`: accept `isAdminPreview?: boolean`, forward to `ReportBlockNav` and the consume-credit dialog wiring.
3. `ReportBlockNav`:
   - When `isAdminPreview` AND variant is `pro_preview` or `internal_lab`, set `balance = 999_999` and skip the `getMyCreditBalance` server call.
   - Render a small chip next to the credits indicator: `"Modo teste admin · créditos simulados"` (use a distinct amber/violet token, not the user-facing green).
4. Confirm path:
   - Period 30d/90d in admin preview: do NOT consume real credits, do NOT call `credit-ledger`. Two sub-modes:
     - **Preview mode (default)**: only opens cached snapshot; the dialog primary CTA becomes "Abrir análise existente" and disables the force-refresh button. No provider call.
     - **Real test mode**: explicit toggle in the admin lab toolbar ("Permitir chamadas reais aos providers"). When ON, force-refresh works and the provider call log writes `source_context = 'admin_test'` so cost shows up labelled internal.

5. Public `/analyze/:handle` and the lead-snapshot flow are not touched. `isAdminPreview` is only set in `admin_.report-preview.*` routes.

## Phase 4 — Fix the no-credit modal

In `consume-credit-dialog.tsx`, fix Case C (`isPeriod && !hasCredit`):
- Keep the outline footer button as "Fechar" (i18n key `consume_dialog.cta_close`).
- Replace the primary "Cancelar" duplicate with a meaningful primary CTA: `"Pedir mais créditos"` (key `consume_dialog.cta_request_credits`) that navigates to `/pricing` or opens a request dialog. If we don't have a credits-request endpoint, fall back to opening the existing `premium-interest-dialog` flow.
- Audit other branches: no other state currently double-renders the cancel label after this change.

Add i18n keys (PT + EN):
- `nav.explore.consume_dialog.cta_close` → "Fechar" / "Close"
- `nav.explore.consume_dialog.cta_request_credits` → "Pedir mais créditos" / "Request more credits"

In admin-preview context the modal is skipped entirely (balance = 999_999 → always `hasCredit=true`); add a small inline note in the dialog header when `isAdminPreview` is true: "Modo teste admin · não consome créditos reais".

## Phase 5 — Report Lab matrix consistency

After Phase 2, the matrix already reflects the correct state:
- Public column: Performance/Content/Search/Benchmark → "Premium" badge.
- Pro column: same blocks → "Desbloqueado".
- Internal column: → "Desbloqueado" with same data + debug labels.

Update column labels in `ConsolidatedModuleTable` / `BlockAccessMatrix` to clarify intent: "Público (Free)", "Pro (cliente pago)", "Interno (lab / debug)".

## Phase 6 — Production parity indicator

Add an admin-only build-ID chip rendered inside the report-lab banner and the admin preview pill:
- Source: `import.meta.env.VITE_BUILD_SHA` (already exposed by the build, or fall back to `__BUILD_ID__` Vite define; if neither exists, add `define: { __BUILD_ID__: JSON.stringify(commitSha) }` to `vite.config.ts`).
- Format: `build a1b2c3d · 2026-06-09T10:34Z`.
- Rendered only when `readAdminEmail()` is set (never in public report).
- Does not modify any deployment settings.

## Files to change

1. `src/lib/report/report-variant.ts` — promote pro_preview block visibilities; update readiness notes.
2. `src/components/report-redesign/v2/consume-credit-dialog.tsx` — fix duplicate cancel; add admin-test note slot; new CTA props.
3. `src/components/report-redesign/v2/report-block-nav.tsx` — accept `isAdminPreview`; short-circuit balance fetch; show simulated-credit chip; pass admin-test mode to dialog.
4. `src/components/report-redesign/v2/report-shell-v2.tsx` — accept and forward `isAdminPreview`.
5. `src/routes/admin_.report-preview.$username.tsx` — pass `isAdminPreview={true}`; add "Real test mode" toggle in pill row; reflect mode in URL (`&realtest=1`).
6. `src/routes/admin.report-lab.tsx` — clearer column labels in matrix; surface real-test toggle in the toolbar.
7. `src/i18n/locales/{pt,en}/report.json` — `cta_close`, `cta_request_credits`, `admin_test_note`, `admin_test_credits_chip`.
8. `src/components/admin/build-id-chip.tsx` (new) — small build/commit indicator.
9. (Optional) `vite.config.ts` — define `__BUILD_ID__` if not exposed yet.

## Validation

- `/admin/report-lab` shows three clearly labelled modes; matrix labels updated.
- Public Preview: unchanged behaviour (free, locked Pro blocks, upsell).
- Pro Preview: all Pro blocks visible, "PRO" pill, simulated credits chip when opened from admin lab, 30d/90d/competitor work without consuming credits.
- Internal Lab: same Pro blocks PLUS internal banner + debug labels + "INTERNAL · LAB" pill.
- Public `/analyze/@handle` for a non-admin: `isAdminPreview=false`, real `getMyCreditBalance`, normal no-credit modal with "Pedir mais créditos" / "Fechar" (no duplicates).
- Provider calls only fire from admin preview when "Real test mode" is toggled ON; `provider_call_logs.source_context = 'admin_test'`.
- Build-ID chip visible to admin in lab + preview pill.
- Typecheck + existing tests pass.

## Out of scope

Checkout, EuPago, pricing, payment emails, Free report business logic, Pro entitlement gate, competitor Pro gate, 30d/90d backend gates, provider cap logic, landing, legal.
