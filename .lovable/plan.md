# Plan — Consolidate sharing actions on `/analyze/$username`

## Context

The auditing in the previous turn confirmed that the share actions feature is already fully implemented and integrated:

- `src/components/report-share/share-copy.ts` ✔ exists with the exact pt-PT copy specified.
- `src/components/report-share/report-share-actions.tsx` ✔ exists with Copy / LinkedIn / disabled PDF + sonner toasts.
- `src/routes/analyze.$username.tsx` ✔ already mounts `<Toaster />` and renders `ReportShareActions` in `compact` (after BetaStrip) and `default` (before BetaFeedbackBlock) variants.

The only outstanding requirement from this prompt is **point 8 — avoid duplicated LinkedIn CTAs**. The audit identified that `BetaFeedbackBlock` still renders its own "Partilhar no LinkedIn" button, which appears immediately below the new `ReportShareActions variant="default"` block, creating two visible LinkedIn buttons within ~1 viewport.

## Change

**Single file edit:** `src/components/report-beta/beta-feedback-block.tsx`

Remove the LinkedIn `<a>` action from the actions row, leaving only:

- "Dar feedback"
- "Quero acesso Pro"

Also remove the now-unused `resolvedUrl` / `linkedInHref` runtime resolution and the `useEffect` + `useState` imports, since they only existed to power that LinkedIn button. The `reportUrl` prop becomes unused — remove it from the component signature and from the route call site (no current caller passes it, so this is purely cleanup).

The `BETA_COPY.feedback.actions.share` entry in `src/components/report-beta/beta-copy.ts` becomes orphaned. Leave it in place to keep the copy file as a single source of truth (zero runtime cost), or remove it — implementer's choice. Default: leave it, since other beta copy lives there.

## Why this approach

- Keeps `ReportShareActions` as the single canonical share surface (top + bottom of the report).
- `BetaFeedbackBlock` reverts to its true purpose: feedback + Pro interest signal.
- No new components, no token changes, no provider calls, no schema changes.
- `/report/example` and all locked files untouched.

## Files

- **Edit:** `src/components/report-beta/beta-feedback-block.tsx` — remove LinkedIn button, simplify component (drop `useState`/`useEffect`/`reportUrl` prop).

## Validation

- `bunx tsc --noEmit`
- `bun run build`
- Visual: load `/analyze/<any>` → exactly one "Partilhar no LinkedIn" button visible (inside `ReportShareActions default`), and `BetaFeedbackBlock` shows only Feedback + Pro actions.
- No provider calls (Apify/DataForSEO/OpenAI/PDF/email) introduced or removed by this change.
