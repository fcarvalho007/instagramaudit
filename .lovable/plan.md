## State source of truth

`unlocked` boolean lives in `src/routes/analyze.$username.tsx:AnalyzeReady` and is derived from `window.sessionStorage.getItem('ib_unlock:${snapshotId}')` (set by `UnlockModal.onUnlock` after lead capture). It is passed into `ReportShellV2` as `unlocked` and currently drives only the `ReportLockGate` blur overlay around blocks 2–6. **No prop reaches the sidebar today.**

We will reuse this same `unlocked` flag as the single signal for "lead magnet completed" — no new state, no backend, no schema changes.

## Scope of edits (UI + copy only)

### A) `src/components/report-redesign/v2/report-shell-v2.tsx`
- Pass `unlocked` down to `<ReportBlockSidebar unlocked={unlocked} onUnlockClick={handleUnlockClick} />` and `<ReportBlockTopTabs unlocked={unlocked} onUnlockClick={handleUnlockClick} />`.
- Add a new component `<ReportLeadMagnetCard onUnlockClick={handleUnlockClick} />` rendered **only when `gated && !unlocked && variant === 'public_mvp'`**, placed immediately after the Block 1 feedback row (between line 224 and the gated branch starting at line 229). This collapses the perceived gap between Block 1 and the gated content (currently the `ReportLockGate` overlay's `mt-24 md:mt-32` creates the "large empty blurred space" the brief calls out).

### B) `src/components/report-redesign/v2/report-block-nav.tsx`
- Extend `SidebarProps` with `unlocked?: boolean` and `onUnlockClick?: () => void`.
- In `SidebarList`, when `isPublic && !unlocked` render a softer `<ContinueReadingCard />` instead of `<PremiumBlockCard />`. The card:
  - Title row keeps the lock icon + "Premium · {n} por desbloquear" eyebrow.
  - Lists premium block titles as today (visual continuity).
  - Replaces CTA + trust copy with the new "Continuar leitura gratuita" / "Desbloquea o diagnóstico…" pair.
  - Button click calls `onUnlockClick?.()` — same handler as today, which opens the existing `UnlockModal`. No pricing modal is opened, and we do NOT show any price wording, "pack de 5", "1 relatório" or "Sem subscrição".
- When `isPublic && unlocked` keep the existing `<PremiumBlockCard />` unchanged.
- Apply the same swap inside the mobile `ReportBlockTopTabs` drawer (it shares `SidebarList` already, so this is automatic once props flow through).

### C) New file `src/components/report-redesign/v2/report-lead-magnet-card.tsx`
Editorial, low-emphasis card placed in the main column:
- Small eyebrow: "Continuação gratuita" (PT) / "Continue free" (EN) using `text-eyebrow-sm text-content-tertiary`.
- One-line transition message above title: the PT/EN copy from requirement 3.
- Title: "Continua a leitura gratuita do relatório" / "Continue the free report reading".
- Body: 3-quick-questions framing.
- Single primary button: "Ver relatório gratuito" / "View free report" → `onUnlockClick()`.
- Surfaces: `bg-surface-secondary border border-border-default rounded-2xl px-6 py-7 sm:px-8 sm:py-8`, max width `max-w-3xl`, `mx-auto`, no shadow halo. No icons beyond a small `Gift` glyph for continuity with the Diagnóstico badge. No price.
- Anchored `id="lead-magnet-card"` for the sidebar "Continuar leitura gratuita" button to `scrollIntoView({ block: 'start' })`.

### D) `src/i18n/locales/{pt,en}/report.json`
Add a new `nav.access_locked` block alongside the existing `nav.access`:
- PT: `{ "cta": "Continuar leitura gratuita", "cta_aria": "Continuar leitura gratuita", "trust": "Desbloqueia o diagnóstico gratuito antes das secções premium." }`
- EN: `{ "cta": "Continue free reading", "cta_aria": "Continue free reading", "trust": "Unlock the free diagnosis before the premium sections." }`

Add a new `leadMagnet` block:
- PT: `eyebrow`, `transition`, `title`, `body`, `cta`, `cta_aria` matching the brief.
- EN: same keys.

Existing `nav.access.*` keys (cta = "Ver opções de acesso", trust = "1 relatório ou pack de 5. Sem subscrição.") stay untouched and are reused only in the post-unlock state.

### E) Vertical-rhythm tweak in `report-shell-v2.tsx`
- Replace the gated branch's outer wrapper margin from `mt-6 md:mt-8` to `mt-2 md:mt-4` for the lead magnet card, and let the `ReportLockGate` overlay's intrinsic `mt-24 md:mt-32` stay (it's responsible for visual breathing inside the gate, not for the pre-lead gap). The new card naturally appears closer to Block 1, satisfying the desktop + mobile "lead magnet should appear higher" requirement without changing the gate.

## Out of scope (untouched)
- `UnlockModal` internals, unlock API, lead/payment backend, pricing values, premium gating logic, Apify/OpenAI/DataForSEO, emails, Block 1 editorial logic, premium gate component itself, database schema.
- Existing `PremiumInterestDialog` (still used post-unlock and from `ReportEndOfFreeBlock`).
- The `ReportLockGate` blur overlay continues to render exactly as today; we only insert a softer card above it.

## Validation
1. `bunx tsc --noEmit`
2. `bunx vitest run` if any report-nav / shell test exists (`rg "report-block-nav|report-shell-v2|sidebar.*pricing"`)
3. Browser screenshots:
   - Desktop 1366px before lead capture (sessionStorage cleared)
   - Desktop 1366px after lead capture (force `sessionStorage.setItem('ib_unlock:<id>', '1')` in console then reload)
   - Mobile 390px before lead capture (sidebar drawer open + closed)
4. Confirm in pre-lead state: no "Ver opções de acesso", no "1 relatório", no "pack de 5", no "Sem subscrição" anywhere on the page or in the sidebar drawer.
5. Confirm in post-lead state: sidebar shows the existing pricing CTA again, lead-magnet card is gone, premium content rendered.
6. Confirm no horizontal scroll, no overlap with bottom mobile tab bar, no broken hydration (the hidden runtime hydration mismatch reported earlier is unrelated and already addressed by the prior copy fix).

## Output report (after build mode)
- Files changed (list)
- How pre-lead vs post-lead is determined (one line: `unlocked` prop chain from `analyze.$username.tsx` → `ReportShellV2` → `ReportBlockSidebar` + new card)
- Exact PT/EN copy added (the 6 keys above, verbatim)
- 3 screenshots + brief visual notes
- Confirmation: no pricing values changed, no backend changed, no schema changed
- Typecheck + vitest results