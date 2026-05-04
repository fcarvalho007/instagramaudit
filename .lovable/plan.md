
# QA Report — First Fold / Report Header

## 1. Desktop Result

**PASS.** The first fold is clean, premium, and Iconosquare-inspired:

- **Identity card**: Clear 2-zone hierarchy. Zone 1 (avatar + handle + verified + INSTAGRAM pill + bio + icon actions) reads well. Zone 2 (stats + analysis meta) is compact and scannable.
- **Stats row**: Mono-font numbers are readable; labels are uppercase eyebrow style.
- **Competitor card**: Visually primary — solid border, icon, dark CTA with PRO badge.
- **Multi-network card**: Secondary — dashed border, "EM BREVE" purple badge, informational tone.
- **PDF/share buttons**: Discreet icon-only (34px), secondary styling. Not dominant.
- **No clutter, no excessive glow, no dark panels** except the intentional dark CTA pill.

## 2. Mobile Result (375px)

**PASS.**

- No horizontal overflow.
- Avatar, handle, verified badge, and INSTAGRAM pill fit and wrap correctly.
- Action buttons (download + share) are accessible below the bio line.
- Stats render as 2x2 grid with analysis meta in the 4th cell.
- Competitor and multi-network cards stack vertically.
- Mobile CTA is a compact 36px icon button (no overflow).
- Social circles on multi-network card remain readable.

## 3. Accessibility Result

**PASS with one minor note.**

- Icon-only PDF button: `aria-label="Exportar relatório em PDF"` + `title="Exportar PDF"` — OK.
- ShareReportPopover: inherits its own aria handling from the component.
- Platform pill: `aria-label="Plataforma analisada: Instagram"` + `title="Instagram"` — OK.
- Multi-network icon stack: `role="img"` + `aria-label="Redes futuras: Facebook, TikTok e YouTube"` — OK.
- Competitor card: `aria-label="Comparar com concorrentes diretos"` — OK.
- Roadmap card: `aria-label` + `title` — OK.
- Roadmap dialog: `role="dialog"` + `aria-modal="true"` + `aria-label` — OK.
- All interactive elements are `<button>` — keyboard reachable by default.
- **Minor note**: The roadmap dialog has no focus trap; pressing Tab can escape the dialog. Not critical for an informational-only modal, but worth noting for a future polish pass.

## 4. Remaining Hardcoded Decorative Classes

| Class | File | Purpose | Verdict |
|---|---|---|---|
| `from-slate-300 via-slate-200 to-slate-300` | report-hero-v2.tsx:240 | Avatar gradient ring | Local decorative — no semantic token for avatar rings. Intentional. |
| `bg-white` | report-hero-v2.tsx:241,253 | Avatar inner ring / fallback bg | Light-theme only component, white is correct. |
| `shadow-[0_1px_2px_rgba(15,23,42,0.15)]` | report-hero-v2.tsx:286 | Verified badge micro-shadow | Local decorative. Intentional. |
| `bg-slate-900`, `hover:bg-slate-800` | comparison-header.tsx:47,57,155 | Dark CTA pill + dialog button | Intentional dark primary CTA — no semantic `bg-cta-primary` token exists. |
| `shadow-[0_1px_3px_rgba(15,23,42,0.12)]` | comparison-header.tsx:47 | CTA pill shadow | Local decorative. |
| `bg-blue-600` | comparison-header.tsx:80 | Facebook brand circle | Brand-approximate colour. Intentional. |
| `bg-red-600` | comparison-header.tsx:82 | YouTube brand circle | Brand-approximate colour. Intentional. |
| `bg-amber-400/20`, `text-amber-500` | comparison-header.tsx:51 | PRO badge gold accent | Follows project gold-accent rule. Intentional. |
| `bg-purple-100`, `text-purple-600` | comparison-header.tsx:92 | "EM BREVE" badge | No semantic purple token. Intentional local decorative. |
| `ring-white` | comparison-header.tsx:121 | Social circle ring separator | Light-theme white. Intentional. |

All hardcoded values are local decorative or brand-specific. None are candidates for semantic tokens at this stage.

## 5. Scope Confirmation

- No backend files changed.
- No adapter files changed.
- No global tokens (`tokens.css`, `tokens-light.css`) changed.
- No admin files changed.
- Block 1 scorecards: unchanged.
- Block 2: unchanged.
- Only `report-hero-v2.tsx`, `comparison-header.tsx`, and `report-shell-v2.tsx` were modified across Steps 1-3.

## 6. Final Recommendation

**PASS.**

No critical or visual bugs found. The only future-polish item is adding a focus trap to the roadmap info dialog, which is non-blocking for this milestone.
