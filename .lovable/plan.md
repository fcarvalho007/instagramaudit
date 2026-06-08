
# Premium Editorial Pass — Profile vs Competitor Cards

Scope: only the compare UI under `src/components/report-redesign/v2/compare/*` and the 6 competitor cards that consume it. No data/provider/schema/credits/checkout changes. Free/Public report untouched.

## Goal
Make every comparison card feel like one cinematic editorial system: same chrome, same typography rhythm, same identity treatment, same insight footer — so the Pro report reads as one premium artefact, not 6 stitched panels.

---

## 1. Shared primitives (compare/*)

### `compare-card-shell.tsx`
- Lock card chrome: `rounded-2xl border-border-default bg-surface-primary shadow-card`, padding `p-6 sm:p-8` (anchor variant keeps `p-7 sm:p-9` + 3px left accent rule). No other density tiers.
- Title: Fraunces `text-2xl sm:text-3xl`, `tracking-tight`, `leading-tight`. Always present.
- Subtitle: Inter `text-sm sm:text-base text-content-secondary`, `mt-2`. Standard format → `{description} · últimas {n} publicações` (n = min sample of both sides; helper added inside shell or computed in caller).
- Baseline chip: rename in place to "Concorrente em janela de referência" (already done) — keep `text-xs`, `rounded-full`, `surface-muted`.
- Spacing rhythm: header → handle row (`mt-5`) → body (`mt-7 sm:mt-9`) → footer (`mt-7 sm:mt-9`). No card may deviate.
- Footer (`Leitura`): `rounded-xl border-border-subtle bg-surface-muted`, eyebrow `text-eyebrow-sm`, body `text-sm sm:text-base leading-relaxed`. Always one short editorial sentence — never raw metric.

### `compare-handle-row.tsx`
- Single source of truth for identity: avatar (CompareAvatar) + handle + display name + meta line. All 6 cards use it (hero today uses a custom identity block — keep custom layout only for the hero verdict but ensure avatar / fallback / colors come from the same `CompareAvatar` primitive).
- Avatar fallback: when `avatarUrl` missing OR `<img>` errors → premium initials circle (2 chars max, Inter SemiBold, tabular not needed), tinted with side accent at low alpha. Never render a broken `<img>`. Add `onError` → state flip to initials.
- Primary side = `--accent-primary` (#3772E5). Competitor side = `--compare-competitor` (indigo/purple). Dot + colored ring around avatar so color is reinforced by shape, not the only signal.
- Handles always rendered as text (`@handle`), Inter SemiBold `text-sm`, with display name `text-xs text-content-secondary` underneath.

### `compare-stat-block.tsx`
- Side panel: numeric value `text-3xl sm:text-4xl font-semibold tabular-nums`, eyebrow handle `text-eyebrow-sm` in side accent, subText `text-sm leading-snug`. No `text-[11px]`, no `text-xs` for primary signal.
- `vs` separator: Fraunces `text-xl sm:text-2xl text-content-tertiary` — already correct, lock it.
- Zero-data side: render `Sem dados` chip (`surface-muted` pill, `text-sm`) instead of the numeric value when `value === null/0` and competitor has no sample. Prevents misleading 100 vs 0 bars.

### `compare-bar-pair.tsx`
- Legend `text-sm` (already done), bars min 8px height, rounded full. Color = side accent. Zero values render as muted track + `Sem dados` micro-label on that side (no full/empty visual asymmetry).

### `compare-table.tsx`
- All cell text `text-sm sm:text-base`. Row labels `text-content-secondary`, values `font-semibold tabular-nums text-content-primary`. Mobile stacked variant uses same scale.

---

## 2. Per-card application

For each of the 6 cards, wire to the shell with the standard subtitle and a 1-sentence Leitura:

1. **Hero (combined verdict)** — replace inline identity blocks with `CompareHandleRow` (or extract a `CompareHeroIdentityRow` that uses `CompareAvatar` under the hood) so avatar/fallback behaviour matches everywhere. Verdict copy stays Fraunces `text-lg sm:text-xl`.
2. **Bio e pontos de saída** — rename title to "Caminho de conversão fora do Instagram". Use `CompareTable` bare. Add neutral Leitura when both sides have identical links.
3. **Taxa de engagement** — `CompareStatBlock` bare. Subtitle: `Envolvimento médio · últimas {n} publicações`. Side subText leads with scale reading ("Saudável para escala Micro"); delta secondary.
4. **Cadência semanal** — `CompareStatBlock` bare with `pub./semana` unit. Subtitle includes sample window. Thumbnails caption uses `CompareThumbPlaceholder` (already wired) when no analyzedPosts.
5. **Ritmo semanal por dia** — `CompareBarPair` bare across weekday axis. Zero days = muted track + `Sem dados` chip.
6. **Mix de formatos** — replace inline `CompareBarPair`-only view with two side-by-side donuts (reuse `FormatCard` donut SVG + shared legend); `CompareBarPair` becomes optional detail row below. Zero shares render muted segment + `Sem dados`.

---

## 3. Typography & color guardrails (audit pass)

Across all compare files:
- Remove every `text-[11px]`, `text-[10px]`, residual `text-xs` on primary signals (labels, values, subText). Allowed `text-xs` only on: meta chips (baseline), micro hints inside chips, table caption.
- No `font-mono` / JetBrains Mono in public UI (constraint already in memory).
- No `text-white`/`bg-black`/raw hex. Only semantic tokens + `--accent-primary` / `--compare-competitor`.
- All numeric values: `tabular-nums font-semibold`. Never wrap; truncate with `title=` tooltip.

---

## 4. Validation

- Visit `/admin/report-preview/nunomarkl?variant=pro_preview&draft=false`:
  - Same card chrome, padding, header rhythm across all 6 cards.
  - Subtitle present everywhere in standard format.
  - All handles rendered as text; avatars render or initials-fallback (force one broken URL via DevTools to verify).
  - Primary = blue, competitor = indigo/purple, with ring + dot reinforcement.
  - No `100 vs 0` bars; zero-data renders as `Sem dados` chip.
  - All Leitura footers present, one editorial sentence.
- 375px viewport: zero horizontal scroll; values never overflow.
- Network panel: no provider calls triggered by these renders (pure presentation).

---

## Implementation phases (small safe patches)

1. **Phase A — Shell + Handle primitives**: lock chrome, subtitle helper, avatar fallback with `onError`, ring/dot reinforcement. Single edit batch in `compare-card-shell.tsx` + `compare-handle-row.tsx`.
2. **Phase B — Stat/Bar/Table guardrails**: zero-data `Sem dados` rendering, font-size sweep, tabular-nums lock. Edits in `compare-stat-block.tsx`, `compare-bar-pair.tsx`, `compare-table.tsx`.
3. **Phase C — Per-card wiring**: standardize subtitle + Leitura on each of the 6 competitor cards; hero identity migrates to shared avatar primitive.
4. **Phase D — Format mix donuts**: side-by-side donuts reusing `FormatCard` SVG.
5. **Phase E — QA pass**: visual audit at desktop + 375px, broken-avatar test, confirm no provider calls.

Each phase is independently publishable; no schema, provider, credits, checkout, EuPago, entitlement, or Free/Public report changes.
