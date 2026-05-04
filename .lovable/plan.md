
# Block 2 — Diagnóstico Editorial: Audit & Refactor Plan

---

## 1. Files that render Block 2

| File | Role | Lines | Hardcoded colors |
|------|------|-------|-----------------|
| `report-diagnostic-block.tsx` | Orchestrator — wires classifiers → cards → groups → priorities | 675 | 11 |
| `report-diagnostic-card.tsx` | Core card shell + DiagnosticDistributionBar, FunnelStack, Checklist, MiniStats, Ranking, AudienceHighlight, ObjectiveSynthesis | 752 | 95 |
| `report-diagnostic-verdict.tsx` | Blue gradient verdict box at top | 62 | 5 |
| `report-diagnostic-group.tsx` | Group divider (letter badge + label + count) | 41 | 4 |
| `report-diagnostic-priorities.tsx` | 3-column priority action cards | 76 | 13 |
| `report-diagnostic-cta.tsx` | Bottom CTA strip | 37 | 5 |
| `report-caption-intelligence.tsx` | P04 Caption Intelligence (full-width, complex) | 386 | 52 |
| `report-comment-intelligence.tsx` | P05 Comment Intelligence sub-section | 494 | 38 |
| `insight-callout.tsx` | Reusable callout box (editorial/suggestion/warning) | 88 | 13 |
| `source-badge.tsx` | Small source type chip (IA/auto/dados) | ~30 | ~3 |
| `report-source-label.tsx` | Source label variant | ~20 | 1 |

**Total: ~237 hardcoded color class instances across 11 files.**

---

## 2. Component → Section mapping

| Section | Component(s) | Rendered by |
|---------|-------------|-------------|
| Verdict | `ReportDiagnosticVerdict` | orchestrator top |
| Group headers | `ReportDiagnosticGroup` | orchestrator |
| P01 Content type | `ReportDiagnosticCard` + `DiagnosticDistributionBar` | `renderContentTypeCard()` |
| P02 Funnel | `ReportDiagnosticCard` + `DiagnosticFunnelStack` + `InsightCallout` | `renderFunnelCard()` |
| P03 Hashtags | `ReportDiagnosticCard` + inline bar list | `renderHashtagsCard()` |
| P04 Caption intel | `ReportCaptionIntelligence` (full-width, own shell) | orchestrator group B |
| P05 Audience | `ReportDiagnosticCard` + `DiagnosticAudienceHighlight` + `CommentIntelligenceSection` | `renderAudienceCard()` |
| P06 Integration | `ReportDiagnosticCard` + `DiagnosticChecklist` | `renderIntegrationCard()` |
| P07 Objective | `ReportDiagnosticCard` + `DiagnosticObjectiveSynthesis` | `renderObjectiveCard()` |
| Priorities | `ReportDiagnosticPriorities` | orchestrator bottom |
| CTA | `ReportDiagnosticCta` | orchestrator bottom |

---

## 3. Hardcoded colors currently used

**Text**: `text-slate-900/800/700/600/500/400/300`, `text-blue-800/700/600/500`, `text-emerald-800/700/600`, `text-amber-900/800/700/600`, `text-rose-800/700/500`, `text-white`

**Backgrounds**: `bg-white`, `bg-slate-50/100/300`, `bg-blue-50/100/500/600/700`, `bg-emerald-50/400/500/600`, `bg-amber-50/500`, `bg-rose-50`

**Borders**: `border-slate-200/100/300`, `border-blue-200/400/500`, `border-emerald-100/200`, `border-amber-200/500`, `border-rose-200/500`, `border-l-*` accent borders

**Rings**: `ring-slate-200/100`, `ring-blue-100/200`, `ring-emerald-200`, `ring-amber-200`, `ring-rose-200`

**Shadows**: Custom `shadow-[...]` rgba values on cards

---

## 4. Available semantic classes → replacement map

### Direct replacements (no new tokens needed)

| Hardcoded | Semantic token | Usage |
|-----------|---------------|-------|
| `text-slate-900/800` | `text-content-primary` | Headings, strong text |
| `text-slate-700/600` | `text-content-secondary` | Body text, descriptions |
| `text-slate-500/400` | `text-content-tertiary` | Labels, hints, metadata |
| `text-slate-300` | `text-content-tertiary` | Decorators, separators |
| `bg-white` | `bg-surface-secondary` | Card backgrounds |
| `bg-slate-50` / `bg-slate-100` | `bg-surface-muted` | Inset panels, tracks |
| `border-slate-200/100` | `border-border-default` / `border-border-subtle` | Card/divider borders |
| `ring-slate-200` | `ring-border-default` | Ring borders |
| Custom card shadows | `shadow-card` | Card elevation |
| `text-blue-700/600/500` | `text-accent-primary` | Blue accents |
| `bg-blue-50` | `bg-tint-primary` | Blue tint backgrounds |
| `ring-blue-100` | `ring-border-subtle` | Blue ring (close enough) |
| `text-emerald-700/600` | `text-signal-success` | Success state text |
| `bg-emerald-50` | `bg-tint-success` | Success tint backgrounds |
| `text-rose-700/500` | `text-signal-danger` | Warning/danger text |
| `bg-rose-50` | `bg-tint-danger` | Danger tint backgrounds |
| `text-amber-700/600` | `text-signal-warning` | Amber/warning text |

---

## 5. Values that must remain local (no semantic token)

These are **multi-tone color maps** used inside components to distinguish card tones, funnel stages, priority levels, and status states. They cannot be a single token because they encode semantic meaning per-variant:

| Pattern | Location | Why it stays local |
|---------|----------|-------------------|
| `TONE` map (blue/emerald/amber/rose/slate) | `report-diagnostic-card.tsx` | 5-variant answer box; needs per-tone bg+text+ring |
| `ACCENT_BORDER` map | `report-diagnostic-card.tsx` | Colored top border per tone |
| `STAGE_TONE` (topo/meio/fundo/pos) | `DiagnosticFunnelStack` | 4-stage funnel with active/idle states |
| `STATUS_ICON` map | `DiagnosticAudienceHighlight` | 5 status states with icon+bg+fg |
| `STYLE` map (alta/media/oportunidade) | `report-diagnostic-priorities.tsx` | 3-level priority system |
| `TONE_CONFIG` (editorial/suggestion/warning) | `insight-callout.tsx` | 3-tone callout system |
| `CONFIDENCE_STYLE` / `STRENGTH_STYLE` | `report-caption-intelligence.tsx` | Multi-level confidence chips |

**Strategy**: Soften these maps to use pastel/muted equivalents aligned with Iconosquare style. Use semantic tokens where a map value maps 1:1 (e.g. `text-emerald-700` in a "success" context → `text-signal-success`). Keep maps local but with cleaner values.

---

## 6. Spacing, radius, border, typography inconsistencies

| Issue | Where | Fix |
|-------|-------|-----|
| Card shadow varies: some use `shadow-[0_1px_2px...]`, some use `shadow-[0_1px_2px...,0_8px_24px...]` | `report-diagnostic-card`, `report-caption-intelligence`, `report-diagnostic-cta` | Unify to `shadow-card` |
| Card padding: `p-6 md:p-7` vs `p-6 md:p-9` | Diagnostic cards vs caption intelligence | Standardize to `p-5 md:p-6` or `p-6 md:p-7` |
| Card radius: all use `rounded-2xl` | Consistent | Keep |
| Card border: `border-slate-200/70` everywhere | Consistent but hardcoded | → `border-border-default` |
| MiniStat uses `ring-1 ring-slate-200/60` for inset | Inconsistent with other inset panels using `border` | Keep ring pattern (subtle) |
| Verdict box uses a custom gradient `bg-[linear-gradient(...)]` | `report-diagnostic-verdict.tsx` | Keep but soften; it's an intentional accent |
| Group divider border: `border-slate-200/60` | `report-diagnostic-group.tsx` | → `border-border-subtle` |
| Font usage: `font-display` for headings, `font-mono` for numbers — correct | All files | Consistent with design rules |
| `text-eyebrow-sm` used for labels | All files | Consistent with design rules |

---

## 7. Visual weight assessment

| Section | Issue |
|---------|-------|
| **Verdict box** | Good weight. Blue gradient is intentional. The `border-l-[4px]` left accent is a bit heavy — could soften to 3px. |
| **Card top accent borders** | `border-t-2 border-t-*-400/60` is subtle enough. Keep. |
| **P04 Caption Intelligence** | Visually heavier than other cards due to `p-6 md:p-9` padding and complex inner structure. Needs padding reduction. |
| **Audience status icon** | `size-20 sm:size-24` is large — could reduce to `size-16 sm:size-20` for less visual dominance. |
| **FunnelStack active bars** | Active stage uses `bg-blue-700 text-white` — quite saturated. Could soften. |
| **Priorities cards** | Well balanced. Left border accent works. |
| **CTA** | `bg-slate-900` dark button is intentional. Keep. |

---

## 8. Mobile safety (375px)

- Card grid: `grid-cols-1 md:grid-cols-2` — safe, stacks on mobile
- Caption intel: `md:col-span-2` with `md:flex-row` — stacks on mobile
- Priorities: `md:grid-cols-3` → stacks to single column — safe
- FunnelStack bars: uses `%` width with `minWidth: fit-content` — may overflow on very narrow text. Minor risk.
- AudienceHighlight: `sm:grid-cols-2` for metrics — safe
- Expression chips: `flex-wrap` — safe
- No dangerous `overflow-hidden` on text containers that could clip

**Mobile is structurally safe.** No layout-breaking issues at 375px.

---

## 9. Changes possible without touching data logic

Everything listed above is purely visual:
- All color class replacements
- Shadow, padding, spacing normalization
- Typography class swaps
- Tone map value updates (still same keys, just softer colors)
- No changes to classifiers, builders, adapters, or data flow

The orchestrator file (`report-diagnostic-block.tsx`) only needs color class fixes in inline render functions (e.g. `"bg-slate-500"` in distribution bar colors). The classifier calls stay untouched.

---

## 10. Recommended implementation sequence

### Step 1 — Foundation components (smallest blast radius)
**Files**: `insight-callout.tsx`, `report-diagnostic-group.tsx`, `report-diagnostic-cta.tsx`, `report-diagnostic-verdict.tsx`
**Scope**: Replace all hardcoded slate/blue classes with semantic tokens. Soften verdict gradient. ~28 color swaps.
**Risk**: Very low — these are small, self-contained files.

### Step 2 — Core card shell + sub-components
**Files**: `report-diagnostic-card.tsx`, `report-diagnostic-priorities.tsx`
**Scope**: Replace generic text/bg/border classes with tokens. Update TONE/STYLE maps to use softer Iconosquare-aligned values. Normalize shadows to `shadow-card`. ~108 color swaps.
**Risk**: Medium — the card component is large (752 lines) with many sub-components. Test each sub-component visually.

### Step 3 — Complex full-width sections
**Files**: `report-caption-intelligence.tsx`, `report-comment-intelligence.tsx`, `report-diagnostic-block.tsx` (inline render functions only)
**Scope**: Same token migration pattern. Normalize padding. Fix distribution bar colors in orchestrator. ~101 color swaps.
**Risk**: Medium — caption intelligence is the most complex visual component in Block 2.

---

## First implementation prompt recommendation

Start with Step 1 — the 4 smallest files. Copy this directive:

> Migrate `insight-callout.tsx`, `report-diagnostic-group.tsx`, `report-diagnostic-cta.tsx`, and `report-diagnostic-verdict.tsx` to semantic design tokens. Replace `text-slate-*` → `text-content-*`, `bg-white` → `bg-surface-secondary`, `bg-slate-50` → `bg-surface-muted`, `border-slate-*` → `border-border-*`, `text-blue-*` → `text-accent-primary`, shadows → `shadow-card`. Do not add new global tokens. Do not change data logic. Run tsc + vitest after.
