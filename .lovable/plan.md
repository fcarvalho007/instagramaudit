## Goal

Make the commercial report (Free + Pro) show only finished sections, push experimental blocks into the internal lab preview, and update the sidebar to reflect the 7-section commercial structure. No changes to data, calculations, scraping, entitlement, credits, checkout or pricing.

## Target visibility map

| # | Section (sidebar label) | Tier | Source component (unchanged) | Anchor |
|---|---|---|---|---|
| 01 | Visão geral | free | `EditorialIdentityCard` (in `report-overview-block`) | `#overview` |
| 02 | Engagement | free | `EngagementCardRefined` | `#engagement` |
| 03 | Frequência editorial | pro | `FrequencyCard` | `#frequencia` |
| 04 | Mix de formatos | pro | `FormatCard` | `#formatos` |
| 05 | Publicações-chave | pro | `PostComparisonBlock` | `#publicacoes-chave` |
| 06 | Contexto estratégico | pro | `ReportDiagnosticGroup` "contexto" (existing diagnostic block) | `#contexto-estrategico` |
| 07 | Prioridades de acção | pro | `ReportDiagnosticPriorities` | `#prioridades` |

Lab-only (kept, but hidden in Free + Pro): `blockPerformance` ("Quando e como reage o público?", evolução, heatmap, best days), `blockContent` (top links/hashtags/mentions extended), `blockSearch` (procura DataForSEO), `blockBenchmark` (gauge + comparação avançada), plus `commentIntelligence`, `marketSignals`, `benchmarkGauge`.

## Technical changes

### 1. `src/lib/report/report-variant.ts`
- Tighten `pro_preview` so the four lab blocks are `"hidden"`: `blockPerformance`, `blockContent`, `blockSearch`, `blockBenchmark` (also `commentIntelligence`, `marketSignals`, `benchmarkGauge`). Keep `blockOverview` + `blockDiagnosis` = `"full"`.
- Tighten `public_mvp` the same way (even when the user is `premiumUnlocked`, the public route must not render lab blocks). Free-state gating remains driven by `lockBoundary`/`unlocked`/`premiumUnlocked` in the shell.
- `internal_lab` stays unchanged → full visibility.

### 2. `src/components/report-redesign/v2/block-config.ts`
- Add `tier: "free" | "pro" | "lab"` to `BlockConfig`.
- Tag existing blocks: `overview=free`, `diagnostico=pro`, `performance=lab`, `conteudo=lab`, `procura=lab`, `benchmark=lab`.
- Export a new constant `COMMERCIAL_SECTIONS` (7 entries, in spec order) with `{ id, number, label, tier, anchorId }`. This is the sidebar TOC for Free + Pro. It does not replace `BLOCKS` (still used by lab and the diagnostic feature lookups).

### 3. Anchors on existing cards (id-only, no behavioural change)
Add `id="…"` wrappers around the cards inside `report-overview-block.tsx` (engagement, frequency, format, key-posts) and `report-diagnostic-block.tsx` (context group, priorities). Reuse existing `scrollToBlock` helper — it already accepts an id.

### 4. `src/components/report-redesign/v2/report-block-nav.tsx`
- When `variant === "internal_lab"` → render today's 6-block lab sidebar (rename header to "LAB INTERNO").
- Otherwise → render the new commercial sidebar using `COMMERCIAL_SECTIONS`, grouped as:
  - "LEITURA GRATUITA" → items with `tier === "free"` (always accessible).
  - "RELATÓRIO COMPLETO" → items with `tier === "pro"`. Locked when `!premiumUnlocked`, accessible when unlocked. Each item shows a "Premium" pill.
- `ReportBlockTopTabs` mirrors the same list.
- Lab-only sections never appear in either commercial list.

### 5. `src/components/report-redesign/v2/report-shell-v2.tsx`
- No data/CTA logic changes. The four lab blocks are already conditionally rendered behind `features.blockX !== "hidden"`; once step 1 hides them in `public_mvp` + `pro_preview`, they vanish from Free and Pro automatically and remain visible in `internal_lab`.
- Confirm the 7 commercial cards continue to render in Pro: overview block (Identity, Engagement, Frequency, Format, Key Posts) + diagnostic block (Context group + Priorities). No code move.

### 6. Internal lab full-preview route
- The existing route `/admin/report-preview/$username?variant=internal_lab` already renders every section with admin gate. Add:
  - A top banner "LAB INTERNO · FULL PREVIEW" + small note "Este modo mostra blocos experimentais e não representa a versão comercial." Replace the current discrete pill or render alongside it.
- Add a thin alias route `src/routes/admin-report-lab.full-preview.$handle.tsx` that simply redirects to `/admin/report-preview/$handle?variant=internal_lab` (preserves the URL shape requested in the brief without duplicating the page).

### 7. Copy / i18n
- All new strings in pt-PT. Sidebar group headers: "LEITURA GRATUITA", "RELATÓRIO COMPLETO". Badges: "Grátis", "Premium". Lab banner copy as above.

## Files to edit

- `src/lib/report/report-variant.ts` — tighten `public_mvp` + `pro_preview`.
- `src/components/report-redesign/v2/block-config.ts` — add `tier`, add `COMMERCIAL_SECTIONS`.
- `src/components/report-redesign/v2/report-block-nav.tsx` — commercial vs lab sidebars.
- `src/components/report-redesign/v2/report-overview-block.tsx` — add anchor ids (no logic change).
- `src/components/report-redesign/v2/report-diagnostic-block.tsx` — add anchor ids for Context group + Priorities.
- `src/routes/admin_.report-preview.$username.tsx` — add lab banner when `variant === "internal_lab"`.
- `src/routes/admin-report-lab.full-preview.$handle.tsx` — new redirect alias (small file).
- i18n string additions only (no key renames).

## Out of scope (unchanged)

Snapshot generation, Apify, OpenAI, DataForSEO, `snapshotToReportData`, payment, EuPago webhook, credits, entitlement, unlock logic, pricing, DB schema. No deletion of any lab-only component.

## Risks & safeguards

- **Anchor mismatch**: sidebar click scrolls to wrong place → use existing `scrollToBlock(id)` and verify each anchor id is rendered exactly once.
- **Pro view accidentally hides a finished card**: confirm `pro_preview` keeps `blockOverview` and `blockDiagnosis` = `full`; only the four lab blocks flip to `hidden`.
- **Lab route regression**: keep `internal_lab` variant untouched in `VARIANT_FEATURES`; the lab sidebar continues to use the 6-block `BLOCKS` list.
- **Public route still gated**: Free flow remains driven by `lockBoundary="engagement"` + `premiumUnlocked`; no change to the lead-capture / lock-gate paths.

## Manual validation checklist (after build)

1. `/analyze/<handle>` anonymous → only Identity + LockGate visible; sidebar shows the 7-section commercial list with 01/02 free and 03–07 premium-locked. No "Desempenho/Procura/Comparação" anywhere.
2. `/analyze/<handle>` lead captured, no Pro → adds Engagement + PRO teaser; sidebar unchanged.
3. `/analyze/<handle>` Pro unlocked → renders 01–07 in order; sidebar shows all 7 accessible.
4. `/admin/report-preview/<handle>?variant=pro_preview` → matches Pro view above; banner "PRO".
5. `/admin/report-preview/<handle>?variant=internal_lab` → all blocks render including Desempenho/Conteúdo/Procura/Comparação; "LAB INTERNO · FULL PREVIEW" banner + note visible; lab sidebar with 6 blocks.
6. `/admin-report-lab/full-preview/<handle>` → redirects to the URL in step 5.
7. Confirm no diff in: pricing, EuPago webhook, checkout URLs, entitlement queries, snapshot adapter, metric calculations, DB migrations.

Please approve to proceed with implementation.
