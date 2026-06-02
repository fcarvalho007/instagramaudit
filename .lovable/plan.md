## Critical bug found during QA

The hero H1 and subtitle render with `opacity-0` and never animate in. The DOM contains the text but `BlurRevealText`'s `mounted` state never visually flips (no hydration error, no console log — likely an SSR/hydration timing edge case where the SSR `opacity-0` markup persists). Result on both 390×844 and 1440×900: ~400px of empty dark space between the eyebrow and the input. Headline is the page's most important element — must be fixed before any other polish.

## Scope

Visual/UI only. No onboarding, report, credits, pricing, tracking, or backend touched. Targeted fix + small follow-up polish.

## Fixes

### Fix 1 — Make `BlurRevealText` SSR-visible (critical)
`src/components/landing/blur-reveal-text.tsx`
- Initialize `mounted` as `true` (was `false`) so SSR + first client paint render text immediately at `opacity-100`.
- Replace the mount-flip animation with a CSS-only entrance: spans use `animate-[heroReveal_700ms_ease-out_both]` with per-word `animationDelay: ${baseDelay + i * stagger}ms`. The keyframe goes from `opacity:0 / blur(8px) / translateY(8px)` → `opacity:1 / blur(0) / translateY(0)`. If the keyframe is somehow not applied (CSS not yet parsed), the end state is the visible default, so text is never hidden.
- Keep `highlightTailWords` / `highlightClassName` props unchanged.
- Add `@keyframes heroReveal` to `src/styles.css` (or scope inline via the `style` attribute on the span — simpler, no global CSS needed). Choice: inline `animation` with a single shared keyframe added once to `src/styles.css`.

### Fix 2 — Header right-side empty skeleton (high)
`src/components/layout/header.tsx`
- The `loading` branch renders a permanent grey rectangle when `useAuthSession()` stays in `loading` on the public homepage. Render `null` instead of the skeleton when `loading` AND the user is on a public marketing route, OR simply collapse the skeleton to `display: none` after 1s if still loading. Simpler: render the unauthenticated CTA (`Entrar`) immediately and let it swap to "A minha conta" if a session resolves. Avoids a stuck skeleton between the language switcher and the primary CTA.

### Fix 3 — Mobile spacing tightening (medium)
`src/components/landing/hero-section.tsx`
- Reduce mobile top padding: `py-10 md:py-24 lg:py-28` (was `py-12`). Once H1 is visible, the column reads naturally without extra cushion above.
- Reduce grid gap on mobile: `gap-8 lg:gap-12` (was `gap-10`).

### Fix 4 — Preview card mobile balance (low)
`src/components/landing/hero-report-preview.tsx`
- Tighten internal padding on mobile: `px-4 sm:px-5` on the score / KPI / locked-row blocks (was `px-5`). Reduces visual heaviness on 360px.
- Slightly shrink the score number on mobile: `text-2xl sm:text-3xl` (was `text-3xl`) so the card doesn't dominate the fold once H1 returns.

## Out of scope

- `HeroActionBar` internals, onboarding modal, `useAuthSession` hook itself (only its consumption in Header), trust bullets copy, other landing sections.

## Validation

- `bunx tsc --noEmit`
- Re-screenshot at 360×800, 390×844, 1440×900 and confirm:
  - H1 visible immediately, "em segundos." cyan
  - Subtitle visible and AA-legible
  - No stuck skeleton in header
  - Preview card sits below CTA with comfortable spacing
  - 3 frosted locked rows, empty browser bar, no footer sentence

## Deliverables

- Issues found (bullet list, severity)
- Fixes applied (file map)
- Final visual assessment per viewport (mobile 360 / 390, desktop 1440)
- Non-blocking follow-ups (e.g. consider replacing per-word stagger with a single reveal once we confirm motion preferences)
