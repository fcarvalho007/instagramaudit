# Fix pending enrichment placeholders on the real Pro report

## Problem

In `src/components/report-redesign/v2/report-diagnostic-block.tsx`, the pending/error placeholders for paid enrichments are gated by:

```ts
const isFree = variant === "public_mvp";
if (!isFree && coverState === "pending" && coverAnalysis === null) { ... }
```

But on the real public flow (`/analyze/$username`), Pro users keep `variant="public_mvp"` and only flip `premiumUnlocked` to `true`. So `isFree` is `true` for Pro users on the real path and the placeholders never render.

`pro_preview` and `internal_lab` (admin) pass non-`public_mvp` variants, which is why placeholders only show there today.

## Fix

Thread `premiumUnlocked` into `ReportDiagnosticBlock` and replace the `!isFree` gate with a positive "paid access" gate.

### Files changed

1. `src/components/report-redesign/v2/report-diagnostic-block.tsx`
   - Add `premiumUnlocked?: boolean` to `Props` (default `false`).
   - Compute:
     ```ts
     const showPaidPlaceholders =
       premiumUnlocked || variant === "pro_preview" || variant === "internal_lab";
     ```
   - Replace the four `!isFree` checks in `renderCoverSlot` and `renderCaptionSlot` with `showPaidPlaceholders`.
   - Replace `if (isFree) return null;` in `renderInsightsPending` with `if (!showPaidPlaceholders) return null;`.
   - Leave the rest of the file (Free teaser logic, comment-intelligence suppression at line 397, classifiers, priorities) untouched.

2. `src/components/report-redesign/v2/report-shell-v2.tsx`
   - At the single call site (line 264), pass `premiumUnlocked`:
     ```tsx
     <ReportDiagnosticBlock result={result} payload={payload} premiumUnlocked={premiumUnlocked} />
     ```
   - No other change.

### Why this is safe

- `ReportDiagnosticBlock` is already only mounted when `premiumUnlocked === true` (shell line 262) on the real public path, so Free users never reach this code → Free teasers remain unchanged.
- `admin_.report-preview.$username.tsx` passes `premiumUnlocked={variant !== "public_mvp"}`, so `pro_preview` and `internal_lab` keep showing placeholders (covered by the explicit `variant === "pro_preview" || "internal_lab"` legs as a belt-and-braces for any future admin path that mounts the block with `premiumUnlocked=false`).

## Not changed

Provider calls, enrichment scheduling, pricing, EuPago, entitlements, credits, schema, free teasers, comment-intelligence gating, sticky bar, report calculations.

## Manual validation checklist

1. `/analyze/<free handle>` → no diagnostic block at all, teasers intact, no pending placeholders.
2. `/analyze/<pro handle>` with `visual_cover=pending` and no payload → "A preparar análise das capas…" placeholder.
3. Same with `caption_semantic=pending` → "A preparar leitura das legendas…" placeholder.
4. Same with `insights_v2=pending` → "A preparar síntese editorial…" placeholder.
5. Same with `error` state and no payload → calm error placeholder.
6. `/admin/report-preview/<h>?variant=internal_lab` → placeholders still render.
7. `/admin/report-preview/<h>?variant=pro_preview` → placeholders still render.
8. `/admin/report-preview/<h>?variant=public_mvp` → diagnostic block hidden by shell gate, no regression.
