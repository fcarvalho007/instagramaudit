## Refine Free "Leitura inicial do perfil" — copy & thresholds

Single-component change. No AI, no provider, no payments, no schema, no Pro card.

### Files changed

1. `src/components/report-redesign/v2/overview/free-initial-reading-card.tsx` — props, thresholds, copy, microcopy.
2. `src/components/report-redesign/v2/report-overview-block.tsx` — pass two new props (`postsAnalyzed`, `windowDays`) at the call site (L267–277). Both already available locally (`k.postsAnalyzed`, `enriched.cadence.windowDays`).

No other files touched.

### Props added (call site already has them)

```ts
postsAnalyzed: number;
windowDays?: number | null;
```

### Rules — before → after

| # | Before | After |
|---|---|---|
| Engagement band | binary (`engagementOk = rate >= benchmark`) | tri-state via `engagementDelta = (rate - benchmark) / benchmark`: `above` if `≥ +10%`, `below` if `≤ −10%`, `inline` otherwise |
| Verdict — neutral | n/a | `inline + cadenceOk` → "Perfil consistente, envolvimento alinhado" |
| Verdict — cadence ok, eng low | "Cadência forte, sinal fraco" | unchanged, but only fires when `below` (≤ −10%) |
| Verdict — cadence weak, eng high | "Boa resposta, ritmo irregular" | "Envolvimento acima do benchmark, ritmo irregular" (only when `above`) |
| Verdict — both weak | "Perfil pouco activo, envolvimento baixo" | "Cadência e envolvimento abaixo do esperado nesta amostra" |
| Verdict — inline + weak cadence | falls through to "pouco activo" | "Envolvimento em linha, ritmo irregular" |
| Verdict — small sample (`postsAnalyzed < 4`) | n/a | force "Leitura preliminar do perfil"; suppress positive/negative bullets EXCEPT when signal is unambiguous (cadenceOk with ≥5 posts/wk OR formatOverdependent) |
| Format diversity bullet | shown if `share>0 && share<60` | shown only if `postsAnalyzed ≥ 8 && share>0 && share<60` |
| Paragraph direction word | `acima` / `abaixo` | `acima` / `abaixo` / `em linha com` (based on band) |

`cadenceOk` rule unchanged (`postingFrequencyWeekly >= 3`).

### Copy — before → after

| Element | Before | After |
|---|---|---|
| Positive: hashtags | "Uso recorrente de hashtags próprias" | "Uso recorrente de hashtags na amostra" |
| Positive: engagement above | "Envolvimento acima do benchmark" | unchanged (only fires when ≥ +10%) |
| Limit: hashtags absent | "Sem hashtags recorrentes identificáveis" | "Sem assinatura de hashtags clara nesta amostra" |
| Limit: cadence | "Ritmo irregular ou pouco frequente" | "Frequência abaixo de 3 posts por semana nesta amostra" |
| Limit: engagement below | "Envolvimento abaixo do benchmark" | unchanged (only fires when ≤ −10%) |
| Verdict (see table above) | … | … |
| Microcopy (new, footer line) | — | "Com base em {N} publicações da amostra recente." OR "Com base em {N} publicações dos últimos {D} dias." when `windowDays` is a positive number |

### Implementation detail

Microcopy rendered as a `<p className="mt-4 text-xs text-content-tertiary">` just below the signal grid, inside the same `<section>`. No layout change to the existing grid or signal lists.

Small-sample guard: when `postsAnalyzed < 4`:
- `verdict = "Leitura preliminar do perfil"` (overrides the matrix).
- `positives` only keeps `cadenceOk && postingFrequencyWeekly >= 5` ("Ritmo de publicação consistente") and `hasRecurringHashtags`.
- `limits` only keeps `formatOverdependent` ("Dependência excessiva de um formato").

Engagement-defined gate still requires `engagementRate > 0 && benchmark > 0`. When benchmark = 0, the card avoids any direction claim (paragraph + bullets skip the comparison).

### Validation / non-regression

- No new imports of AI, enrichment v2, captions, comments, visual_cover.
- Component still pure deterministic; props remain primitives.
- Payload sanitisation: unaffected — both new props come from `k.postsAnalyzed` and `enriched.cadence.windowDays`, already used elsewhere in the same Free render path.
- Provider calls / payments / EuPago / entitlements / credits / DB: untouched.
- Pro `ReportDiagnosticBlock` path (L268, L391) is not modified.

### Manual checklist (after build)

1. `/analyze/frederico.m.carvalho` (Free, sample ≈ 12 posts): verdict reads new neutral/inline copy; microcopy line shows `N` and (if available) `D`.
2. Profile with ER within ±10% of benchmark: paragraph says "em linha com o benchmark"; no above/below bullet.
3. Profile with ER ≥ +10%: bullet "Envolvimento acima do benchmark" appears.
4. Profile with ER ≤ −10%: bullet "Envolvimento abaixo do benchmark" appears.
5. Profile with `postsAnalyzed < 4`: verdict is "Leitura preliminar do perfil"; signal lists mostly empty.
6. Profile with `postsAnalyzed >= 8` and dominant share < 60: "Mistura equilibrada de formatos" appears.
7. Mobile viewport 375px: card layout unchanged, no overflow.
