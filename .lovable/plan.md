## Goal
Add a qualitative competitor comparison for Bio/Links signals to the Pro report using the existing `CompareTable` primitive and `competitorBreakdown` data.

## Files to change

### 1. Type + mock data
- `src/components/report/report-mock-data.ts` — extend `ReportCompetitorBreakdownEntry` with:
  - `bio: string | null`
  - `externalUrls: string[]`
  - `isVerified: boolean`
- Update mock `competitorBreakdown[0]` with the new fields.

### 2. Adapter
- `src/lib/report/snapshot-to-report-data.ts` — in the `competitorBreakdown` builder, extract from competitor `profile`:
  - `bio` → `bio`
  - `external_urls` → `externalUrls`
  - `is_verified` → `isVerified`

### 3. New comparison component
- `src/components/report-redesign/v2/competitor-bio-compare.tsx`
  - Uses `CompareTable` (Pattern 3).
  - Props: `primaryHandle`, `primaryBio`, `primaryExternalUrls`, `primaryVerified`, `competitor`.
  - Rows (hide only when both values effectively missing):
    - **Link na bio** — "Sim" / "Não" (externalUrls.length > 0)
    - **Nº de links** — count as string (e.g. "2")
    - **Conta verificada** — "Sim" / "Não"
    - **Bio preenchida** — "Sim" / "Não" (bio?.trim().length > 0)
    - *Categoria row omitted — not available in snapshot.*
  - Deterministic insight caption:
    - competitor externalUrls.length > primary externalUrls.length → "O concorrente apresenta mais pontos de saída na bio."
    - primary externalUrls.length > competitor externalUrls.length → "Este perfil tem uma presença de bio mais completa."
    - otherwise → "Os dois perfis têm sinais de bio semelhantes."
  - Returns `null` when no competitor.

### 4. Wiring
- `src/components/report-redesign/v2/report-overview-block.tsx`
  - Import `CompetitorBioCompare`.
  - Render it inside the `mode === "all"` branch, immediately after `CompetitorOverviewCompare` (same conditional: `firstCompetitor` present and `mode === "all"`).
  - Free/locked/public reports remain untouched.

## Design decisions
- Placed after `CompetitorOverviewCompare` because both are identity/profile-level comparisons.
- No edits to `EditorialIdentityCard`, `ReportDiagnosticBlock`, or existing integration card.
- Uses the same `surface-secondary` card wrapper as other comparison blocks (inherited from `CompareTable`).

## Validation
1. Pro without competitor: `CompetitorBioCompare` returns null → unchanged.
2. Pro with one competitor: qualitative table renders after overview comparison.
3. Mobile 375px: `CompareTable` already collapses to stacked cards — no overflow.
4. Free report: component only rendered in `mode === "all"` → unchanged.
5. Typecheck passes after extending `ReportCompetitorBreakdownEntry`.