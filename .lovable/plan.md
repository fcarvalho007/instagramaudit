## Goal

On mobile, the pre-unlock report page currently shows two competing CTAs: the lead-magnet card ("Ver relatório gratuito") and a fixed bottom bar "3 secções premium · DESBLOQUEAR". Before lead capture the only primary CTA must be the lead-magnet card. After lead capture, the existing premium sticky may appear (no change to pricing logic).

## Root cause

`src/components/report-redesign/v2/report-shell-v2.tsx` renders `<StickyUnlockBar>` whenever `gated === true`, and `gated = lockBoundary === "engagement" && !unlocked`. That is exactly the pre-lead state, so the bar competes with the lead-magnet card. The bar's copy ("Desbloquear", "secções premium") also pre-frames paid access before the user has even submitted the free lead form.

## Edits (UI only, no backend, no pricing changes)

### 1) `src/components/report-redesign/v2/report-shell-v2.tsx`
- Replace the current conditional render of the sticky bar:
  - From: `{gated && <StickyUnlockBar onClick={handleUnlockClick} />}`
  - To: `{unlocked && lockBoundary === "engagement" && <StickyUnlockBar onClick={handleUnlockClick} />}`
  
  Effect: pre-lead state never shows the premium sticky bar. Post-lead state keeps the existing component available for when a real paid tier is wired (current MVP simply won't render it because `unlocked` already removes the gate; that matches the brief — "premium CTA *may* appear" only after lead capture, and only when premium gating exists, which is out of scope for this prompt).
- Increase the mobile bottom spacer that sits above the fixed mobile bottom nav, from `h-20 lg:hidden` to `h-28 lg:hidden`, so the lead-magnet card's trust chips inside the unlock modal and the page footer never feel crammed against the bottom nav.

### 2) `src/components/report-redesign/v2/report-lead-magnet-card.tsx`
- Add mobile-only extra bottom breathing room below the CTA card by changing the section wrapper from `mt-2 md:mt-4` to `mt-2 md:mt-4 pb-6 md:pb-0`. Keeps desktop visually identical, gives mobile ~24px of guaranteed gap before the next blurred gated section starts.
- No copy changes (PT/EN already match the requirement: title "Continua a leitura gratuita do relatório", body "Indica o nome e email e responde a 3 perguntas rápidas…", CTA "Ver relatório gratuito").

### 3) Sticky-bar copy/contract — not modified
`src/components/report-redesign/v2/sticky-unlock-bar.tsx` keeps its current "Desbloquear" copy because in MVP it now never renders pre-lead. We do NOT add a second "Continuar leitura gratuita" sticky bar: the lead-magnet card is the single primary CTA on mobile (matches requirement 1, and requirement 2 is "only if absolutely necessary" — it is not).

## Pre-lead vs post-lead determination

Single source of truth stays as today: `unlocked` boolean in `analyze.$username.tsx` (from `sessionStorage.getItem('ib_unlock:${snapshotId}')`) → `ReportShellV2` prop → drives both the lock gate and now the sticky bar gate. No new state.

## Out of scope
`UnlockModal` internals, unlock API, lead/payment backend, pricing values, premium gating logic, Apify/OpenAI/DataForSEO, emails, `ReportLockGate`, sidebar copy, sticky bar copy.

## Validation
1. `bunx tsc --noEmit`
2. Browser at 390×844:
   - Pre-lead: no sticky bottom bar, no "Desbloquear" word visible at bottom, lead-magnet card is the only primary CTA, no overlap with bottom nav, ≥24px gap above bottom nav.
   - Post-lead (force `sessionStorage.setItem('ib_unlock:<id>', '1')` + reload): lead-magnet card gone, blurred region replaced by full content, no horizontal scroll.
3. Desktop 1366px: no visual regression (sticky bar is `lg:hidden` so desktop was never affected; lead-magnet padding only adds `pb-6` on mobile).

## Output report (after build mode)
- Files changed (2: `report-shell-v2.tsx`, `report-lead-magnet-card.tsx`)
- How pre/post-lead is determined (one line)
- Confirmation the sticky bar was conditionally hidden (not deleted)
- Mobile screenshots before/after lead capture
- Confirmation: pricing values, unlock backend, and `UnlockModal` untouched
- Typecheck result
