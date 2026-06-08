# Render-Path Audit — `/admin/report-preview/nunomarkl?variant=pro_preview&draft=false`

## TL;DR
**The Phase 2 compare components are the ones actually rendering "Mix de formatos" and "Ritmo por dia da semana".** No legacy path is mounted for these two blocks. This is **not** a routing/wiring problem. The "flat" feeling is at most a CSS/QA inspection issue (or a stale PDF/print render).

---

## 1. Exact render path

```text
src/routes/admin_.report-preview.$username.tsx
  └─ ReportThemeWrapper (data-theme="light")
      └─ ReportShellV2
          └─ ReportOverviewBlock   (src/components/report-redesign/v2/report-overview-block.tsx)
              ├─ #frequencia
              │   └─ firstCompetitor ?
              │         CompetitorCadenceCompare
              │         CompetitorWeekdayCompare ← "Ritmo por dia da semana"
              │       : FrequencyCard            ← legacy single-profile
              └─ #formatos
                  └─ firstCompetitor ?
                        CompetitorFormatCompare  ← "Mix de formatos"
                      : FormatCard               ← legacy single-profile
```

Evidence:
- Route → `ReportShellV2` (admin_.report-preview.$username.tsx:197).
- `report-overview-block.tsx:427` mounts `<CompetitorWeekdayCompare>` when `firstCompetitor` is truthy.
- `report-overview-block.tsx:451` mounts `<CompetitorFormatCompare>` when `firstCompetitor` is truthy.
- Both compare components wrap their content in `CompareCardShell` with `density="hero"` (competitor-format-compare.tsx, competitor-weekday-compare.tsx), which forces `prominence="strong"` on `CompareHandleRow` and the thicker bar/footer panel.

## 2. Which components actually render the two cards
| Block | Component file | Shell density |
|---|---|---|
| "Mix de formatos" (with competitor) | `competitor-format-compare.tsx` → `CompareCardShell density="hero"` + `CompareBarPair variant="bare"` | hero |
| "Ritmo por dia da semana" (with competitor) | `competitor-weekday-compare.tsx` → `CompareCardShell density="hero"` + `CompareBarPair variant="bare"` | hero |

`CompareHandleRow` (with avatars), `CompareBarPair variant="bare"`, and the "Leitura" footer panel are all rendered by `CompareCardShell` and the bar pair — they are present in the mounted tree.

## 3. Legacy components — are any of them rendering here?
- `FormatCard` / `FrequencyCard` → only render in the **no-competitor** branch (`else` of `firstCompetitor`). For `nunomarkl` (manzarra is present) they are **not** mounted.
- `ReportCompetitors` (`src/components/report/report-competitors.tsx`) → not imported by `report-overview-block.tsx`. Not in this path.
- `analysis-competitor-comparison.tsx` → belongs to `/analyze/$username` (product page), not used by `ReportShellV2`.
- No older compare block is mounted here.

## 4. Why "CompareCardShell" doesn't appear in DOM search
- React component names never appear in the DOM. The mounted markup is the JSX from `CompareCardShell`:
  - `<section aria-label="Mix de formatos: comparação com concorrente" class="rounded-2xl border border-border-default bg-surface-primary shadow-card p-6 sm:p-8 ...">`
  - inside: `<h3 class="font-serif ... text-2xl sm:text-3xl">Mix de formatos</h3>`
  - identity row from `CompareHandleRow` with `prominence="strong"`
  - bars from `CompareBarPair variant="bare"`
  - footer panel `<p class="text-eyebrow-sm">Leitura</p>`
- Reliable bundle/source markers to grep for in the live DOM/HTML:
  - text "Mix de formatos", "Ritmo por dia da semana", "Leitura"
  - text "Concorrente em janela baseline" (only when window isn't aligned)
  - classnames `rounded-2xl`, `shadow-card`, `font-serif`, `text-eyebrow-sm`
  - `aria-label="… comparação com concorrente"`
- If those markers are present, Phase 2 is mounted. (Production bundle audit in the previous turn already confirmed `density:"hero"`, `prominence`, `zeroLabel`, "Sem partilha", "Sem publicações", "Leitura" in the published JS.)

## 5. Verdict
- **Not a routing issue.** Route → `ReportShellV2` → `ReportOverviewBlock` is the single, correct entry point.
- **Not a wiring issue.** The compare components are mounted when `firstCompetitor` exists, which is the case for `nunomarkl` (manzarra).
- **Most likely a QA/inspection issue** (searching for `CompareCardShell` literal in DOM, which never appears) **or a stale CSS/PDF render** (PDF route + `pdf-print.css` overrides, or browser/CDN cache of the SPA route).

## 6. Recommended next step (no patch needed yet)
Run this 3-step verification in the live preview — no code edits:

1. Open `/admin/report-preview/nunomarkl?variant=pro_preview&draft=false` in an incognito window, hard-reload.
2. DevTools → search the rendered DOM for the literal strings: `"Leitura"`, `"Concorrente em janela baseline"`, `aria-label="Mix de formatos: comparação com concorrente"`. If any of these appear, Phase 2 is unambiguously mounted.
3. Inspect the `<section>` wrapping "Mix de formatos" — confirm `class` contains `rounded-2xl … shadow-card` and the `<h3>` has `font-serif text-2xl sm:text-3xl`. Confirm `CompareHandleRow` (avatars + handles) is visible above the bars.

If all three pass → Phase 2 is live; the perceived flatness is a visual-tuning ask, not a wiring bug, and I can prepare a small contrast/density patch prompt (stronger bar thickness, accent row separator, footer panel emphasis).

If any check fails → share the exact DOM snippet of the card and I'll trace which fork is actually mounting.

## Out of scope
No code edits. No provider calls. No schema/credits/payments changes.
