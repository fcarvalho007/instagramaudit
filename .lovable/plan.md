
# Design Pivot — Dark Tech Noir to Iconosquare-Inspired Light Analytics

## 1. Current Design Drift Diagnosis

The product has three visual layers, all misaligned with the target:

| Area | Current theme | Problem |
|------|--------------|---------|
| **Landing page** (/, /beta/*) | Dark navy (#0A0E1A) + cyan aurora blobs + violet glows | Heavy cinematic look, opposite of clean SaaS |
| **Public report** (/analyze/*) | Light via `data-theme="light"` | Already closest to target — Iconosquare-pure palette exists |
| **Admin/CRM** (/admin/*) | Separate `.admin-v2` light tokens (cream #F1EFE8) | Light but warm/editorial, not Iconosquare-clean |
| **Auth** (/login, /signup) | Dark (inherits `:root`) | Dark backgrounds for auth forms |

### What needs to change

**`:root` tokens** — currently define a dark navy world. This is the default for every page that doesn't explicitly opt into light mode. The fix: make `:root` light-first (matching the Iconosquare palette).

**`tokens-light.css`** — currently activated via `data-theme="light"` for reports. After the pivot, this file becomes redundant because `:root` will already be light. It can be kept as a no-op override or merged.

**`admin-tokens.css`** — the `.admin-v2` wrapper overrides colors to a warm cream. After the pivot, admin should inherit from the new light `:root` directly, simplifying the system.

**Landing components** — aurora blobs, noise overlay, glow shadows, dark gradients. All must be replaced with clean, light equivalents.

**Gold accent** — used in product upsell components and badge variants. Replace with a softer amber/indigo approach or remove entirely.

---

## 2. Corrected Color Palette (Iconosquare-inspired)

```text
Token                   Current (dark)              New (light-first)
──────────────────────  ──────────────────────────  ──────────────────────────
--surface-base          10 14 26   (#0A0E1A)       250 251 253  (#FAFBFD)
--surface-secondary     20 28 46   (#141C2E)       255 255 255  (#FFFFFF)
--surface-elevated      36 48 68   (#243044)       255 255 255  (#FFFFFF)
--surface-overlay       42 56 80   (#2A3850)       255 255 255  (#FFFFFF)
--surface-muted         (none)                      241 244 249  (#F1F4F9)

--accent-primary         6 182 212 (#06B6D4 cyan)   55 114 229  (#3772E5 blue)
--accent-luminous      103 232 249 (#67E8F9 neon)   79 140 255  (#4F8CFF lighter)
--accent-violet        139  92 246 (#8B5CF6)       118 100 228  (#7664E4 soft indigo)
--accent-violet-lum    167 139 250                  140 126 244
--accent-violet-deep   109  40 217                   85  62 186
--accent-gold          252 211  77 (#FCD34D)       186 117  23  (#BA7517 subtle amber)

--text-primary         248 250 252 (#F8FAFC white) 15  27  61   (#0F1B3D charcoal)
--text-secondary       148 163 184                  90 107 140   (#5A6B8C)
--text-tertiary        100 116 139                 138 152 178   (#8A98B2)
--text-inverse          10  14  26                 250 251 252

--border-subtle        255 255 255 @0.10           15  27  61 @0.08
--border-default       255 255 255 @0.12           15  27  61 @0.10
--border-strong        255 255 255 @0.20           15  27  61 @0.16

--signal-success        16 185 129                  29 158 117
--signal-warning       245 158  11                 186 117  23
--signal-danger        239  68  68                 163  45  45

--shadow-sm             dark 0.2 opacity           light 0.04 opacity
--shadow-glow-*         cyan/gold/violet glows      none (removed)
--shadow-stage          heavy violet/navy           soft 0.08 opacity
```

### Chart series
```text
--chart-likes:     55 114 229    (primary blue)
--chart-comments:  79 140 255    (lighter blue)
--chart-views:     85  62 186    (deep indigo)
```

---

## 3. Corrected Font Rules (unchanged from current memory)

| Font | Use for | Classes |
|------|---------|---------|
| **Inter** | All UI: body, labels, nav, buttons, forms, admin, CRM, report body copy | `font-sans` (default) |
| **JetBrains Mono** | Scores, percentages, costs, dates, metric values, IDs | `font-mono`, `.admin-code` |
| **Fraunces** | Selected report H1/H2, editorial hero titles, premium detail headers | `font-display` |

No changes to font loading or font-family definitions.

---

## 4. Structural Changes Required

### A. `src/styles/tokens.css` (LOCKED — needs unlock)
- Rewrite `:root` from dark to light palette
- Remove noise overlay (`body::before`)
- Remove glow shadows (`--shadow-glow-*`)
- Update shadows to soft light-mode values
- Keep typography, spacing, radius, z-index, transitions unchanged

### B. `src/styles/tokens-light.css`
- Simplify or keep as identity override (`:root` will now match)
- Ensure `[data-theme="light"]` still works but is essentially a no-op
- Alternatively, repurpose for any future dark-mode opt-in

### C. `src/styles.css` (LOCKED — needs unlock)
- Update `@theme inline` shadcn compatibility block to match new light `:root`
- Remove `@custom-variant dark` if dark mode is fully removed
- Eyebrow utilities stay unchanged

### D. `src/styles/admin-tokens.css`
- Simplify: admin can now inherit from `:root` for most tokens
- Keep admin-specific semantic colors (revenue green, leads purple, etc.)
- Remove `.admin-v2` base color overrides that duplicate the new `:root`

### E. Landing components (ALL LOCKED — need unlock)
- `hero-aurora-background.tsx` — replace cyan/navy aurora with soft gradient (light lilac-to-white or soft blue-to-white)
- `hero-section.tsx` — update for light background
- `hero-action-bar.tsx` — remove `shadow-glow-violet`
- `how-it-works-section.tsx` — remove glow shadows
- `how-it-works-step.tsx` — remove glow shadows
- `mockup-dashboard.tsx` — update surface tokens
- `product-preview-section.tsx` — update surface tokens
- All other landing components that reference dark tokens

### F. Product/upsell components
- `report-gate-modal.tsx` — replace gold accents with soft indigo/blue
- `post-analysis-conversion-layer.tsx` — same
- `premium-locked-section.tsx` — remove violet glows
- `ui/badge.tsx` (LOCKED) — update `premium` variant from gold to softer accent

### G. Auth pages
- `/login`, `/signup`, `/reset-password` — will automatically become light via `:root` change

### H. Layout shell (LOCKED — needs unlock)
- `header.tsx`, `footer.tsx`, `app-shell.tsx` — update surface/text tokens for light mode

---

## 5. Files NOT to Touch

| Category | Files |
|----------|-------|
| Provider/pipeline | `src/lib/orchestration/*`, `src/lib/analysis/*`, `src/lib/pdf/*` |
| Server routes | `src/routes/api/*` |
| Supabase | `src/integrations/supabase/*` |
| Report generation | All server-side report logic |
| DB schema | No migrations needed |
| Report-redesign components | Content/logic stays; only token consumption changes (passively via `:root`) |

---

## 6. Safe Implementation Order

### Pass 0 — Unlock files + update memory
Update `LOCKED_FILES.md` to reflect the design pivot. Update project memory to remove dark-first rules.

### Pass 1 — Foundation tokens (biggest bang, lowest risk)
1. Rewrite `src/styles/tokens.css` `:root` to the new light palette
2. Remove noise overlay from `body::before`
3. Simplify `src/styles/tokens-light.css` (near-identity now)
4. Update `src/styles.css` `@theme inline` shadcn block
5. **QA checkpoint**: every page that uses semantic tokens auto-updates

### Pass 2 — Admin token simplification
1. Remove `.admin-v2` base color overrides that now match `:root`
2. Keep admin-specific semantic colors (revenue, leads, expense, etc.)
3. **QA checkpoint**: admin pages render correctly

### Pass 3 — Landing page redesign
1. Replace `hero-aurora-background.tsx` with a soft light gradient
2. Update all landing components that use glow/dark effects
3. Update layout shell (header/footer) for light mode
4. **QA checkpoint**: landing page looks clean and premium

### Pass 4 — Product/upsell components
1. Replace gold accents with softer alternatives
2. Remove violet/cyan glows from modals and conversion layers
3. Update badge `premium` variant
4. **QA checkpoint**: report gate and upsell modals render correctly

### Pass 5 — Report QA (should auto-update)
1. Verify `/analyze/$username` still renders correctly
2. Verify admin report previews render correctly
3. The `data-theme="light"` override should be a near-no-op now

---

## 7. Risk Assessment

| Risk | Mitigation |
|------|-----------|
| Semantic token change affects ALL pages at once | Pass 1 is the most impactful — do it first, QA everything |
| Components with hardcoded dark colors break | Search for hardcoded `rgb(10 14 26`, `#0A0E1A`, etc. and fix in same pass |
| Report light theme becomes redundant | Keep `tokens-light.css` as identity — safe, no harm |
| Admin `.admin-v2` conflicts with new `:root` | Simplify in Pass 2 — remove redundant overrides |
| Gold accent removal breaks upsell hierarchy | Replace with soft indigo highlight, not just remove |

---

## 8. Implementation Prompt (for Pass 1)

> **Prerequisite**: Unlock `src/styles/tokens.css`, `src/styles.css`, and `LOCKED_FILES.md` for this design pivot.
>
> Rewrite the `:root` block in `src/styles/tokens.css` to a light-first Iconosquare-inspired palette:
> - Surfaces: #FAFBFD base, #FFFFFF cards, #F1F4F9 muted
> - Accents: #3772E5 primary blue, #4F8CFF luminous, #7664E4 soft violet, #BA7517 subtle amber
> - Text: #0F1B3D primary, #5A6B8C secondary, #8A98B2 tertiary
> - Borders: navy base at low alpha (0.08/0.10/0.16)
> - Shadows: soft light shadows (0.04 opacity), remove all glow shadows
> - Remove the `body::before` noise overlay
> - Keep all typography, spacing, radius, z-index, and transition tokens unchanged
> - Update `src/styles.css` `@theme inline` shadcn compatibility section
> - Do NOT touch any component files in this pass
> - Validate: `bunx tsc --noEmit` and `bunx vitest run`
