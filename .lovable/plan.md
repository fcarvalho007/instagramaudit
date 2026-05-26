## Goal

Connect the seeded Socialinsider rows in `knowledge_benchmarks` to the public Instagram report so `FormatCard` and `FrequencyCard` show a real, honest external comparison instead of a static i18n footnote — without touching the editorial verdict, prompts, gates, pipeline or admin CRM.

## Scope

Only these files / surfaces change:

- new server helper that reads Socialinsider rows
- `src/lib/report/snapshot-to-report-data.ts` (extend `ReportBenchmarkInput` + `AdapterResult`, no business logic change)
- `src/lib/report/benchmark-input.server.ts` (compose the new field)
- the 5 server routes that already call `buildReportBenchmarkInput` (no logic change, just forward the new field)
- `src/components/report-redesign/v2/report-overview-block.tsx` (pass new prop)
- `src/components/report-redesign/v2/overview/format-card.tsx`
- `src/components/report-redesign/v2/overview/frequency-card.tsx`
- `src/i18n/locales/pt/report.json` + `src/i18n/locales/en/report.json` (replace static Socialinsider strings, add comparison/note keys)
- new tests under `src/lib/knowledge/__tests__/` and `src/components/report-redesign/v2/overview/__tests__/`

Explicitly NOT touched: editorial verdict (Block 1), OpenAI prompts, Apify, DataForSEO, pricing/gates, sidebar, admin CRM, generation pipeline, `report.example`, `benchmark-context.ts` static dataset.

## Distinction enforced in the UI

- "Benchmark do escalão" → already shown via `tier`/`engagementBenchmark` (unchanged).
- "Referência externa de mercado" → new comparison area, always labelled "Referência externa · Socialinsider" with date range. Never mixed with the tier comparison.

## Step 1 — Server reader

New file `src/lib/knowledge/socialinsider-context.server.ts`.

- Uses `supabaseAdmin`.
- One query joining `knowledge_benchmarks` + `knowledge_sources`:
  - `platform = 'instagram'`
  - `tier = 'overall'`
  - `knowledge_sources.name = 'Socialinsider'`
  - currently valid: `valid_to is null OR valid_to >= today`
  - picks the row with the latest `valid_from` per (`platform`, `format`)
- Returns:

```ts
export interface SocialinsiderFormatRef {
  postsPerMonth: number | null;
  engagementPct: number | null;
  sourceName: string;   // "Socialinsider"
  sourceUrl: string | null;
  dataRange: { from: string; to: string | null };
}
export interface SocialinsiderInstagramContext {
  reel: SocialinsiderFormatRef | null;
  carousel: SocialinsiderFormatRef | null;
  image: SocialinsiderFormatRef | null;
}
export async function loadSocialinsiderInstagramContext(): Promise<SocialinsiderInstagramContext>;
```

Returns nulls per format if missing (never throws). Lightweight in-memory cache (60 s) since the dataset is updated rarely.

## Step 2 — Adapter plumbing

`snapshot-to-report-data.ts`:

- Extend `ReportBenchmarkInput` with optional `externalReferences?: { instagramByFormat: SocialinsiderInstagramContext | null }`.
- Extend `AdapterResult` with `externalReferences: SocialinsiderInstagramContext | null`, populated from `input.benchmark?.externalReferences?.instagramByFormat ?? null`.
- No scoring or copy logic uses these values — pure passthrough.

`benchmark-input.server.ts`:

- After existing logic, `await loadSocialinsiderInstagramContext()` and attach it to the returned `ReportBenchmarkInput.externalReferences.instagramByFormat`.
- Wrap in try/catch → on failure log + return `null` (report still renders).

The 5 routes that call `buildReportBenchmarkInput` need zero changes — the field flows through automatically.

## Step 3 — `ReportOverviewBlock` wiring

Pass `result.externalReferences` into both `FrequencyCard` and `FormatCard` as a single prop `socialinsiderRef`.

## Step 4 — `FormatCard`

Add a compact 3-row block ABOVE the existing verdict callout (does not replace the donut/thumbnails/verdict):

```
Formato        Este perfil          Referência externa    Leitura
Carrosséis     12 · 60% (n=20)      5/mês · 0.52% ER      Acima da média da amostra
Reels          5 · 25%              10/mês · 0.50% ER     Abaixo na frequência
Imagens        ausente na amostra   8/mês · 0.35% ER      —
```

Rules implemented in render:

- If `f.count === 0` → "ausente na amostra" (pt) / "absent in sample" (en); no "bad", no recommendation.
- If `postsAnalyzed < 8` → prepend a single-line eyebrow "leitura provisória" (pt) / "preliminary reading" (en).
- "Leitura" column is purely factual ("acima/abaixo na frequência", "engagement próximo da referência", or "—"); never imperative, never "post more".
- If `socialinsiderRef` is null → comparison block is hidden, card behaves as today.
- Header for the block: "Referência externa · Socialinsider" + small date label from `dataRange`.

Replace the existing footnote at lines 330–340 with the dynamic source note (Step 6).

## Step 5 — `FrequencyCard`

Below the existing weekly summary (and before the verdict callout) add a short contextual paragraph (~2 lines), driven by the data:

- Line 1: profile cadence label (already computed: `headline`) + sample window (already computed: `effectiveSampleSize`/`effectiveWindowDays`).
- Line 2: "A referência externa Socialinsider é por formato (Reels ≈10/mês, Carrosséis ≈5/mês, Imagens ≈8/mês — Out 2025–Mar 2026). Não é uma regra fixa nem um total prescrito."
- If `score >= 70` (cadence already strong), append: "A oportunidade pode estar no mix de formatos, não no volume."

Hard rules in code:

- Never sums the three `postsPerMonth` values.
- Never renders any "publica X vezes por mês" target.
- Hidden if `socialinsiderRef` is null.

Replace the existing static source note at lines 595–605 with the dynamic one (Step 6).

## Step 6 — Dynamic source note

New shared mini-component `report-external-source-note.tsx` next to the cards:

```tsx
<ExternalSourceNote ref={socialinsiderRef.reel ?? socialinsiderRef.carousel ?? socialinsiderRef.image} />
```

Renders pt-PT: `Fonte externa: Socialinsider, dados Out 2025–Mar 2026.` (date computed from `dataRange.from`/`dataRange.to`, month names from existing pt/en arrays). Link wraps "Socialinsider" iff `sourceUrl` exists; uses existing `ReportSourceLabel` styling tokens (no new design tokens). EN string mirrors it.

Removes the old `format.source_socialinsider_ig` / `frequency.source_socialinsider_ig` keys.

## Step 7 — i18n keys

Add (pt + en mirror):

- `format.external_ref.title` — "Referência externa · Socialinsider"
- `format.external_ref.column_profile|reference|reading`
- `format.external_ref.absent` — "ausente na amostra"
- `format.external_ref.provisional` — "leitura provisória"
- `format.external_ref.reading_*` — small set of factual phrases
- `frequency.external_ref.intro` — paragraph template
- `frequency.external_ref.opportunity_mix` — appended line for strong cadence
- `external_source_note.template` — `"Fonte externa: {{source}}, dados {{range}}."`

Remove `format.source_socialinsider_ig`, `format.source_link_label`, `frequency.source_socialinsider_ig`, `frequency.source_link_label`.

## Step 8 — Tests

New files:

- `src/lib/knowledge/__tests__/socialinsider-context.test.ts` — mocks `supabaseAdmin`, asserts the 3 IG formats are returned with the seeded values and that `sourceUrl` is wired through.
- `src/components/report-redesign/v2/overview/__tests__/format-card.external-ref.test.tsx` — renders with: (a) missing reels in sample → "ausente na amostra"; (b) image-heavy profile with low `postsAnalyzed` → shows "leitura provisória"; (c) `socialinsiderRef = null` → comparison block not rendered; (d) source note text present and Socialinsider link points to `sourceUrl`.
- `src/components/report-redesign/v2/overview/__tests__/frequency-card.external-ref.test.tsx` — asserts: (a) DOM never contains a number equal to `reel.postsPerMonth + carousel.postsPerMonth + image.postsPerMonth`; (b) note contains "não é uma regra fixa"; (c) when `score >= 70`, opportunity line is appended.

## Validation

- `bunx tsc --noEmit`
- `bunx vitest run`

## Output report (after build)

I will report: files changed, exact DB query used, the new adapter field name, before/after of FormatCard and FrequencyCard, the literal source note rendered for the seeded data, the list of safeguards (absent label, provisional label, hidden when null, no summing, no imperative copy), and the test results.
