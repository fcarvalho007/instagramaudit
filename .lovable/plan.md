
## Problem

The posting frequency shown in the card (`6,0/semana`) doesn't match the visible window (`12 publicações em 15 dias`). This is because `estimated_posts_per_week` in normalize.ts uses the raw timestamp span (max-min, ~14 days) while `windowDays` adds +1 for inclusivity (15 days). The user sees "15 dias" but the math uses ~14.

## Changes

### 1. Fix calculation in PostingRhythmCard (`report-overview-cards.tsx`)

Recalculate `weekly` and `daily` locally from `postsAnalyzed` and `windowDays` instead of using the pre-computed `postingFrequencyWeekly` (which uses a different day count):

```
weekly = windowDays > 0 ? postsAnalyzed / windowDays * 7 : 0
daily  = windowDays > 0 ? postsAnalyzed / windowDays : 0
```

Guard: if `windowDays <= 0`, hide benchmark comparison and show fallback.

This ensures the visible numbers (`12 publicações em 15 dias` → `5,6/semana`, `0,8/dia`) always match.

### 2. Replace tier label with follower range

Change `"Ref. Nano"` to `"Escalão 0–10K"` by extracting the range from the existing `tierLabel` format `"Nano (0–10K)"`:

```
tierLabel = "Nano (0–10K)" → extract "0–10K" → display "Escalão 0–10K"
```

### 3. Add Buffer general range band to the bar chart

Add a subtle shaded band for the Buffer general recommendation (3–5 posts/week) behind the existing bars. Label: `"Intervalo geral 3–5/sem"`.

### 4. Refine gap badge text

- `"+3,6 posts/sem vs escalão"` instead of `"vs referência"`
- Add second-line interpretation when both sources available: `"Dentro do intervalo geral"` / `"Acima do intervalo geral"`

### 5. Methodology note update

`"Frequência = publicações ÷ dias analisados × 7"` (already close, just align wording).

### Files changed
- `src/components/report-redesign/v2/report-overview-cards.tsx` (PostingRhythmCard + FrequencyBenchmarkBars)

No locked files. No data provider changes.
