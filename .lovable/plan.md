## Goal

Replace the hard-coded `premiumUnlocked={false}` in `src/routes/analyze.$username.tsx` with a real check against `lead_entitlements` for product `report_full_9`, using the existing `lead_session` cookie. No schema, payment, checkout, pricing, EuPago or report-generation changes.

## Audit findings

- **Hard-coded flag**: `src/routes/analyze.$username.tsx:429` passes `premiumUnlocked={false}` with a TODO. The other variants are correct:
  - `admin.report-lab.tsx:462` and `admin_.report-preview.$username.tsx:205`: `premiumUnlocked={variant !== "public_mvp"}` (lab/pro_preview force-on).
  - `admin_.report-preview.snapshot.$snapshotId.tsx:191`: `premiumUnlocked` (admin preview forces on).
- **Entitlement source of truth**: `src/lib/payments/entitlements.server.ts` already exposes `hasEntitlement(leadId, productCode)` reading `public.lead_entitlements`. This is the single source the EuPago webhook writes to via `grantEntitlement`.
- **Lead session**: `src/lib/leads/lead-cookie.server.ts#getLeadFromCookie` (HMAC-signed `lead_session` cookie), already used by `getMyCreditBalance` and `getLeadSessionStatus`.
- **Credit balance**: `getMyCreditBalance` already returns `{ hasLead, balance }` and is consumed by `report-block-nav.tsx` — it only fetches when `premiumUnlocked === true`. Once the flag is real, the sidebar will start showing the beta balance automatically. No change needed here.
- **No existing entitlement server fn**: nothing today exposes `hasEntitlement` to the client; this is the missing piece.

## Changes

### 1) New server fn — `src/lib/payments/entitlements.functions.ts`

Client-safe wrapper that reads the lead cookie and asks `hasEntitlement(leadId, "report_full_9")`. Fail-closed on any error:

```ts
import { createServerFn } from "@tanstack/react-start";

export const getMyReportEntitlement = createServerFn({ method: "GET" }).handler(
  async () => {
    try {
      const { getLeadFromCookie } = await import("@/lib/leads/lead-cookie.server");
      const leadId = getLeadFromCookie();
      if (!leadId) return { hasLead: false as const, premiumUnlocked: false };

      const { hasEntitlement } = await import("./entitlements.server");
      const premium = await hasEntitlement(leadId, "report_full_9");
      return { hasLead: true as const, premiumUnlocked: premium };
    } catch {
      // Fail-closed: never crash the report, never grant premium on error.
      return { hasLead: false as const, premiumUnlocked: false };
    }
  },
);
```

This mirrors `getMyCreditBalance` exactly — same cookie source, same swallow-and-fallback shape, same `await import` pattern to keep `client.server` out of client bundles.

### 2) Wire it in `src/routes/analyze.$username.tsx`

In `AnalyzeContent` (already a client component): add a `useState<boolean>(false)` for `premiumUnlocked` plus a `useEffect` that calls `useServerFn(getMyReportEntitlement)` once on mount, and updates state. Pass to `<ReportShellV2 premiumUnlocked={premiumUnlocked} />` and delete the TODO comment.

Remains `false` on initial render (correct fail-closed default) and flips to `true` only after the server confirms the entitlement.

### Untouched (explicitly)

- `lead_entitlements` schema, RLS, grants.
- `grantEntitlement`, EuPago webhook, `lead_payments`, checkout routes, prices in `products.server.ts` / `products.ts`.
- `getMyCreditBalance`, `credits.server.ts`, beta credit ledger.
- `UnlockModal`, `PremiumCtaProvider`, `PremiumInterestDialog`, sticky bar, teaser cards.
- `report-shell-v2.tsx`, `report-block-nav.tsx` (already consume `premiumUnlocked` correctly).
- Admin variants `pro_preview` / `internal_lab` (their `variant !== "public_mvp"` override is preserved — they never call the new server fn).
- Report generation / snapshot adapter / calculations.

## Behaviour matrix

| Situation | premiumUnlocked |
|---|---|
| No `lead_session` cookie | `false` (free) |
| Cookie valid, no entitlement row | `false` (free) |
| Cookie valid, entitlement row exists for `report_full_9` | `true` (pro) |
| Entitlement lookup throws / SESSION_SECRET missing | `false` (fail-closed) |
| `variant = "pro_preview"` (admin route) | `true` (unchanged — variant override) |
| `variant = "internal_lab"` (admin route) | `true` (unchanged — variant override) |

## Manual validation

1. **Free**: open `/analyze/<handle>` without paying → sidebar shows "2 de 7 secções acessíveis", teasers 03–07 locked, sticky unlock bar appears, no credit balance.
2. **Paid**: simulate by inserting a `lead_entitlements` row for the current `lead_id` + `report_full_9` (admin SQL), reload → sidebar shows premium active, all 7 sections accessible, balance pill rendered when `getMyCreditBalance` returns `hasLead: true`, no purchase CTA, period/competitor actions open `ConsumeCreditDialog`.
3. **No cookie**: clear cookies, reload `/analyze/...` → onboarding modal flow as today (server already forces `ONBOARDING_REQUIRED`); after onboarding, premium stays `false`.
4. **Admin `pro_preview`**: `/admin_/report-preview/<username>?variant=pro_preview` still shows premium (variant override path untouched).
5. **Admin `internal_lab`**: `/admin/report-lab` still shows lab-only sections, still admin-gated.
6. **Fail-closed**: temporarily break `SESSION_SECRET` → report still renders in free mode, no crash.

## Output (after build)

- Files changed: `src/lib/payments/entitlements.functions.ts` (new), `src/routes/analyze.$username.tsx`.
- `premiumUnlocked` is now derived from `getMyReportEntitlement()` → `hasEntitlement(leadId, "report_full_9")` in `public.lead_entitlements`.
- Missing/failed lookup → `false` (fail-closed); never crashes.
- No payment, pricing, schema, EuPago, checkout or report-generation logic changed.
