## Auditoria

### Formula (correto)

`src/lib/report/cadence.ts` está sólido:

1. Exclui `is_pinned`, datas inválidas e futuras.
2. Cascata: `window_30d` (÷4.345) → `window_90d` (÷12.857) → `sample_span` → `insufficient`.
3. Outlier guard (>180d acima da mediana do top‑10) + warnings (`pinned_excluded`, `low_sample`, `date_outlier_detected`, `stale_data`).
4. `reliability` (high/medium/low) já é exposto.

**Não há bug na fórmula. Não muda.**

### Resposta às perguntas

1. **10 posts em 13 dias** → `method=window_30d`, `weekly=10/4.345 = 2,3/sem`, `windowDays=30`. A copy actual diz “10 publicações em 30 dias”, mas todos os posts estão em 13 dias — tecnicamente correto (count no janelão de 30d) mas **enganador**.
2. Label “Ritmo de publicação” + “/semana” é razoável, mas não comunica que é projecção a partir de uma janela fixa.
3. **Sim** — devemos mostrar *count + janela real* e *cadência semanal estimada* como leituras separadas.
4. “Ritmo observado nos últimos 30/90 dias” > “Frequência de publicação” (já existe em PT/EN em `kpi.cadence.window_30d/90d/sample_span` mas **não está a ser usado** nos cards).
5. **Não totalmente.** `report-overview-cards.tsx:376` afirma “Frequência = publicações ÷ dias analisados × 7”, o que é **falso**: para `window_30d`/`window_90d` o divisor é fixo (30d ou 90d), não o span da amostra. Cria leitura absoluta indevida.
6. **Bug de copy:** `FrequencyCard` (`frequency-card.tsx`) recebe `postingFrequencyWeekly=0` quando `insufficient` e dispara `getFrequencyHeadlineKey(0) → "Menos de 1 post por semana"` — afirmação concreta sobre uma amostra que se declarou insuficiente. Idem `PostingRhythmCard` mostra `—` mas mantém a barra benchmark.
7. **Sim**, `cadence`, `temporalSeries`, `postingHeatmap` e `bestDays` excluem pinned (`snapshot-to-report-data.ts:1118–1130`). ✅
8. **Sim**, `topPosts`/`themes`/`hashtags` continuam a ver todos os posts. ✅

### Inconsistências adicionais

- `PostingRhythmCard` divide `postsAnalyzed` (raw, pode incluir pinned no `content_summary`) por `windowDays=30` para calcular `/dia`. Pode divergir de `cadence.sampleSize`.
- `report-kpi-grid-v2.tsx` mostra “2,3” sem contexto de janela e com help genérico “publicações por semana”.
- Não há sinalização de `reliability` no UI (todos os warnings vêm do `cadence` mas só são consumidos pelo `editorial-identity-card`).

---

## Mudanças propostas (apenas copy/apresentação, zero alteração de fórmula)

### A. `src/lib/report/snapshot-to-report-data.ts`

Expor mais campos derivados de `cadence` para o report data, evitando que os componentes recomputem `posts/days`:

```ts
keyMetrics.cadenceMethod       = cadence.method;
keyMetrics.cadenceSampleSize   = cadence.sampleSize;
keyMetrics.cadenceWindowDays   = cadence.windowDays;
keyMetrics.cadenceSufficient   = cadence.sufficient;
keyMetrics.cadenceReliability  = cadence.reliability;
```

(Já existe `enriched.cadence` — apenas garantir que chega aos dois cards via props.)

### B. `src/components/report-redesign/v2/report-overview-cards.tsx` (`PostingRhythmCard`)

- Aceitar `cadenceMethod`, `cadenceSampleSize`, `cadenceWindowDays`, `cadenceSufficient`, `cadenceReliability` por props.
- Quando **`insufficient`**:
  - Esconder barra de benchmark.
  - Mostrar apenas “Dados recentes insuficientes para estimar ritmo”.
- Quando **`window_30d` / `window_90d`**:
  - Headline: `t('kpi.cadence.window_30d'|'window_90d')` (“Ritmo observado nos últimos 30/90 dias”).
  - Número principal: `≈ {weekly}/sem` (prefixo `≈` para sinalizar estimativa).
  - Linha de contexto: `{sampleSize} publicações nos últimos {windowDays} dias`.
  - Remover linha “≈ X /dia” (induz precisão falsa).
- Quando **`sample_span`**:
  - Headline: `t('kpi.cadence.sample_span')` (“Ritmo observado na amostra recente”).
  - Sub: `{sampleSize} publicações em {windowDays} dias (amostra reduzida)`.
- Quando `reliability === 'low'` e `sufficient`: badge `Leitura provisória`.
- Substituir source note enganadora `Frequência = publicações ÷ dias analisados × 7` pela correcta:
  - 30d/90d: `Cadência estimada = publicações na janela ÷ semanas na janela`.
  - sample_span: `Cadência estimada = publicações na amostra ÷ semanas da amostra`.
  - insufficient: omite a nota.

### C. `src/components/report-redesign/v2/report-kpi-grid-v2.tsx`

- Substituir help estático `t('kpi.rhythm.help')` por help dinâmico:
  - `window_30d`: `≈ {{n}} pub./sem nos últimos 30 dias`
  - `window_90d`: `≈ {{n}} pub./sem nos últimos 90 dias`
  - `sample_span`: `≈ {{n}} pub./sem na amostra recente`
  - `insufficient`: `Dados insuficientes`
- Quando `insufficient`, value `—` (já é). Adicionar tooltip/aria-label com a razão.

### D. `src/components/report-redesign/v2/overview/frequency-card.tsx`

- Receber `cadenceSufficient`, `cadenceMethod`, `cadenceSampleSize`, `cadenceWindowDays` por props (já são acessíveis via `enriched.cadence` no `report-overview-block`).
- Se `!cadenceSufficient`:
  - Headline: `t('frequency.headline.insufficient')` (nova chave).
  - Esconder subtitle, esconder weekly summary, esconder verdict/benchmark; manter calendário cinzento.
- Caso contrário, usar `cadenceSampleSize` / `cadenceWindowDays` no template `frequency.subtitle` em vez de `postsAnalyzed` / `effectiveWindowDays` (alinha com a fórmula real e elimina divergência pinned).
- Substituir `getFrequencyHeadlineKey` hardcoded por uma versão que recebe `cadenceMethod` + `weekly` e devolve:
  - `insufficient` → `headline.insufficient`
  - resto inalterado.

### E. i18n (`src/i18n/locales/pt/report.json` + `en/report.json`)

Adicionar/ajustar:

```jsonc
"kpi.rhythm.help_window_30d":  "≈ {{n}} pub./sem nos últimos 30 dias",
"kpi.rhythm.help_window_90d":  "≈ {{n}} pub./sem nos últimos 90 dias",
"kpi.rhythm.help_sample_span": "≈ {{n}} pub./sem na amostra recente",
"kpi.rhythm.help_insufficient":"Dados recentes insuficientes",

"kpi.cadence.note.window_30d":  "Cadência estimada = publicações na janela ÷ 4,345 semanas",
"kpi.cadence.note.window_90d":  "Cadência estimada = publicações na janela ÷ 12,857 semanas",
"kpi.cadence.note.sample_span": "Cadência estimada = publicações na amostra ÷ semanas da amostra",

"kpi.cadence.window_summary_30d": "{{count}} publicações nos últimos 30 dias",
"kpi.cadence.window_summary_90d": "{{count}} publicações nos últimos 90 dias",
"kpi.cadence.sample_summary":     "{{count}} publicações em {{days}} dias (amostra reduzida)",
"kpi.cadence.insufficient_label": "Dados recentes insuficientes para estimar ritmo",
"kpi.cadence.provisional_badge":  "Leitura provisória",

"frequency.headline.insufficient": "Dados recentes insuficientes para medir o ritmo",
```

EN equivalente:
```jsonc
"kpi.rhythm.help_window_30d":  "≈ {{n}} posts/wk over the last 30 days",
"kpi.rhythm.help_window_90d":  "≈ {{n}} posts/wk over the last 90 days",
"kpi.rhythm.help_sample_span": "≈ {{n}} posts/wk in the recent sample",
"kpi.rhythm.help_insufficient":"Not enough recent data",
"kpi.cadence.window_summary_30d": "{{count}} posts in the last 30 days",
"kpi.cadence.window_summary_90d": "{{count}} posts in the last 90 days",
"kpi.cadence.sample_summary":     "{{count}} posts in {{days}} days (small sample)",
"kpi.cadence.insufficient_label": "Not enough recent data to estimate rhythm",
"kpi.cadence.provisional_badge":  "Provisional reading",
"frequency.headline.insufficient":"Not enough recent data to measure rhythm",
"kpi.cadence.note.window_30d":   "Estimated cadence = posts in window ÷ 4.345 weeks",
"kpi.cadence.note.window_90d":   "Estimated cadence = posts in window ÷ 12.857 weeks",
"kpi.cadence.note.sample_span":  "Estimated cadence = posts in sample ÷ sample weeks",
```

### F. Tests (acrescentar, sem mudar fórmula)

`src/lib/report/__tests__/cadence-copy.test.ts` (novo):
- 10 posts em 13 dias → `method=window_30d`, `sampleSize=10`, `weekly=2.3`.
- 4 posts em 70 dias → `window_90d`, copy contém “últimos 90 dias”.
- 2 posts em 40 dias → `sample_span`, marca `low_sample`.
- 0 posts válidos → `insufficient`, weekly=0.

`src/components/report-redesign/v2/overview/__tests__/frequency-card-insufficient.test.tsx` (novo):
- `cadenceSufficient=false` → renderiza `frequency.headline.insufficient`, **não** renderiza “Menos de 1 post por semana”, esconde benchmark.

`src/components/report-redesign/v2/__tests__/posting-rhythm-card-copy.test.tsx` (novo):
- `method=window_30d` → header copy `kpi.cadence.window_30d` + summary `{count} publicações nos últimos 30 dias`.
- `method=insufficient` → mostra `kpi.cadence.insufficient_label`, esconde benchmark bars, esconde `/dia`.

Actualizar `snapshot-pinned-window.test.ts` se a snapshot mudou (esperado: copy nova).

---

## Risco

Baixo. Apenas apresentação. Sem alterações a:
- fórmula `cadence.ts`
- snapshot pipeline (só novos campos passados como props)
- Apify / OpenAI / Supabase / report regeneration

Snapshots antigos continuam a funcionar (a função `computeCadence` é re‑executada a partir dos posts no `snapshotToReportData`).

---

## Ficheiros a alterar

1. `src/lib/report/snapshot-to-report-data.ts` — expor `cadenceMethod/SampleSize/WindowDays/Sufficient/Reliability` em `keyMetrics` (ou via props já existentes em `enriched.cadence`).
2. `src/components/report-redesign/v2/report-overview-cards.tsx` — `PostingRhythmCard` com copy condicional por método e estado insuficiente.
3. `src/components/report-redesign/v2/report-kpi-grid-v2.tsx` — help dinâmico por método.
4. `src/components/report-redesign/v2/overview/frequency-card.tsx` — gating de copy quando `insufficient`, usar `cadenceSampleSize`/`cadenceWindowDays`.
5. `src/components/report-redesign/v2/report-overview-block.tsx` — passar novas props aos dois cards.
6. `src/i18n/locales/pt/report.json` + `src/i18n/locales/en/report.json` — novas chaves.
7. Novos testes: `cadence-copy.test.ts`, `frequency-card-insufficient.test.tsx`, `posting-rhythm-card-copy.test.tsx`.

## Checkpoint

- ☐ Fórmula `cadence.ts` confirmada como correta — não alterada.
- ☐ `PostingRhythmCard` mostra copy condicional (`window_30d` / `90d` / `sample_span` / `insufficient`).
- ☐ `FrequencyCard` deixa de afirmar “Menos de 1 post por semana” em estado `insufficient`.
- ☐ KPI grid passa a indicar a janela (“nos últimos 30/90 dias”).
- ☐ Source note `Frequência = publicações ÷ dias analisados × 7` substituída pela fórmula real.
- ☐ Pinned continuam fora de cadência, séries temporais, heatmap e best days; continuam dentro de top posts/hashtags/temas.
- ☐ Novos testes a passar.
- ☐ Zero chamadas a Apify/OpenAI/Supabase; zero regeneração de relatórios.