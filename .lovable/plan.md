## Current state

The hero handle fix is already in place at `src/components/report-redesign/v2/report-hero-v2.tsx:43-83`:

- `handleWrappable = handle.replace(/\./g, ".\u200B")` — inserts zero-width spaces after every `.` so long dotted handles wrap at dot boundaries.
- `<h1>` classes: `font-display text-[1.25rem] sm:text-[1.75rem] lg:text-[2.25rem] font-bold tracking-[-0.03em] text-content-primary leading-[1.1] [overflow-wrap:anywhere] min-w-0`.
- Parent `<div>` already has `min-w-0 flex-1`; outer identity row also has `flex-1 min-w-0`.

This satisfies requirements 1 (overflow-wrap: anywhere, min-w-0 chain) and 2 (mobile size already 20px, smaller than the requested `text-2xl` = 24px — so already conservative). The earlier QA already confirmed `@frederico.m.carvalho` wraps cleanly at the dot on 360px (`@frederico.m.` / `carvalho`).

## Plan: visual re-verification only, no code changes by default

1. Open `/analyze/frederico.m.carvalho` and screenshot at 360×800, 390×844, 414×896, and desktop (1366+). Crop the hero handle area at each width.
2. Open `/analyze/nike` (short handle) at 360 and desktop — confirm no visual regression (handle on one line, no awkward small text).
3. For the synthetic ultra-long case `@nome.muito.muito.longo.de.utilizador`, since there's no real profile by that handle, validate the same wrapping rule by inspecting the rendered DOM with the existing `frederico.m.carvalho` and reasoning by analogy (the zero-width space rule applies to all dots; `overflow-wrap: anywhere` handles dotless segments). If approval is given to run `bunx tsc --noEmit`, do so.
4. At each viewport, confirm:
   - no horizontal scrollbar on the report container,
   - handle stays inside its rounded card,
   - no overlap with the "Novo relatório" CTA stack (which is `lg:`-only on the right; on mobile it stacks below).

### Outcome paths

- **If all viewports look clean** → report PASS, file unchanged, no edits, beta-ready on this front.
- **If any viewport still shows mid-word breaks or overflow** → propose a minimal patch: e.g. drop mobile size one notch to `text-[1.125rem]` (18px) on `<360px`, or add `hyphens-none` to disable any inherited hyphenation. Keep desktop (`lg:text-[2.25rem]`) untouched.

No code changes proposed in this turn — the existing fix matches the spec, so the audit may simply confirm GO. Awaiting approval to switch to build mode for the screenshot pass and the optional patch if a regression is found.