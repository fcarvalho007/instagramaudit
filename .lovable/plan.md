## Plan: "Preparing analysis" placeholders for pending paid AI enrichments

Show calm, editorial placeholders for the Pro report cards that depend on AI enrichments while the corresponding job is still `pending`/`running`. Read state from `normalized_payload.enrichment_status` already persisted by the backend — no provider, scheduling, billing, credit or schema changes.

### Status read

Add a tiny helper module:

- `src/components/report-redesign/v2/enrichment-pending.ts`
  - `getEnrichmentState(payload, type) → 'ready' | 'pending' | 'error' | 'skipped_free'`
  - Treats `pending` and `running` as `pending`.
  - Treats `skipped` / `disabled` as `ready` (degrade silently — current behaviour).

### New placeholder component

- `src/components/report-redesign/v2/enrichment-placeholder-card.tsx`
  - Editorial card: hairline border, `bg-surface-secondary`, small `Sparkles` icon in a soft circle, eyebrow, title, body. No spinner.
  - Variants:
    - `pending` → Sparkles + neutral eyebrow `"Análise em curso"`.
    - `error` → AlertTriangle + muted body with the calm fallback copy.
  - Accepts `eyebrow`, `title`, `body`, optional `className` for `md:col-span-2` parity with the real cards.

### Diagnostic block wiring

`src/components/report-redesign/v2/report-diagnostic-block.tsx`:

For the Pro / commercial branch (the `if (!isLab)` block) and the Lab branch:

- Compute `coverState = getEnrichmentState(payload, 'visual_cover')` and `captionState = getEnrichmentState(payload, 'caption_semantic')`.
- Replace `<VisualCoverAnalysisCard …/>` with:
  - `coverState === 'pending'` → placeholder (`title: "A preparar análise das capas…"`, body: `"Estamos a avaliar clareza visual, consistência e leitura em 1 segundo."`).
  - `coverState === 'error'` and `parseVisualCoverAnalysis(payload) === null` → error fallback placeholder.
  - else → existing card.
- Replace `<CaptionDiagnosticsCard …/>` with:
  - `captionState === 'pending'` and `parseCaptionSemanticAnalysis(payload) === null` → placeholder (`"A preparar leitura das legendas…"`, `"Estamos a analisar padrões de linguagem, temas e chamadas à acção."`).
  - `captionState === 'error'` and no semantic data → error fallback placeholder (still keep deterministic caption intel card visible? → No, replace whole card to avoid mixed signals).
  - else → existing card (which already falls back to deterministic data on its own).

`insights_v2`:
- Compute `insightsState = getEnrichmentState(payload, 'insights_v2')`.
- When `insightsState === 'pending'` AND `result.enriched.aiInsightsV2 == null`: render a single placeholder ABOVE `<ReportDiagnosticPriorities …/>` (`"A preparar síntese editorial…"`, `"As recomendações finais ficam disponíveis assim que a análise terminar."`).
- When `insightsState === 'error'` AND `aiInsightsV2 == null`: render the calm error placeholder instead.
- Deterministic priorities (`derivePriorities`) still render below — they were already the fallback and stay valuable.

### Variant scoping

All placeholders gated by `variant !== 'public_mvp'` (i.e. `pro_preview` and `internal_lab`). Free teasers stay 100% untouched. Implementation note: the Free render path never hits this code (the Free shell renders `PremiumTeaserCard`s, not `ReportDiagnosticBlock`), but we add an explicit `variant === 'public_mvp' ? null : ...` guard for safety.

### Auto-refresh on success

No new polling. When the user refreshes the page (or the existing snapshot refresh path runs), the loader re-reads `normalized_payload` — placeholders disappear automatically once `enrichment_status[type] === 'success'` and the corresponding payload key is present. No state changes needed in this PR.

### i18n

Add under `report.json` (PT + EN) namespace `pending`:

PT:
- `cover.title`: "A preparar análise das capas…"
- `cover.body`: "Estamos a avaliar clareza visual, consistência e leitura em 1 segundo."
- `caption.title`: "A preparar leitura das legendas…"
- `caption.body`: "Estamos a analisar padrões de linguagem, temas e chamadas à acção."
- `insights.title`: "A preparar síntese editorial…"
- `insights.body`: "As recomendações finais ficam disponíveis assim que a análise terminar."
- `error.body`: "Não foi possível concluir esta leitura automática. O restante relatório continua disponível."
- `eyebrow_pending`: "Análise em curso"
- `eyebrow_error`: "Leitura indisponível"

EN equivalents.

### Out of scope (explicitly NOT changed)

- Provider calls (Apify, OpenAI, DataForSEO)
- Enrichment scheduling / enqueue / runner
- Pricing, checkout, EuPago, entitlements, credit reserve/confirm/release
- Report calculations and snapshot schema

### Files changed (planned)

- ADD `src/components/report-redesign/v2/enrichment-pending.ts`
- ADD `src/components/report-redesign/v2/enrichment-placeholder-card.tsx`
- EDIT `src/components/report-redesign/v2/report-diagnostic-block.tsx`
- EDIT `src/i18n/locales/pt/report.json`
- EDIT `src/i18n/locales/en/report.json`

### Manual validation checklist

1. Pro snapshot with `enrichment_status.visual_cover = 'pending'` and no `visual_cover_analysis` → Capas card shows pending placeholder.
2. Pro snapshot with `caption_semantic = 'pending'` and no `caption_semantic_analysis` → Legendas card shows pending placeholder.
3. Pro snapshot with `insights_v2 = 'pending'` and no `ai_insights_v2` → pending placeholder appears before deterministic priorities.
4. Pro snapshot with all three `success` and payloads present → real cards render, no placeholders.
5. Pro snapshot with any of the three `error` and no payload → calm error placeholder shown.
6. Free report (`public_mvp` variant) → no placeholders, teasers unchanged.
7. Internal Lab snapshot with pending states → placeholders also shown (verifies parity).
8. After a refresh that completes enrichment → placeholders disappear automatically.