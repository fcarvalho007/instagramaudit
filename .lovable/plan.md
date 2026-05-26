## Diagnóstico

No card de Frequência, o "Resumo da semana" mostra **"Domingo · 159 dias s/ post"** mas o subtítulo afirma **"10 publicações em 30 dias"**. Os dois números pertencem a janelas diferentes.

### Causa raiz

`buildPostingTimeline` (`src/lib/report/snapshot-to-report-data.ts:427`) preenche o array dia a dia entre o **post mais antigo** da amostra e o **mais recente**. Para `robs.cortez`, a amostra normalizada (12 posts) inclui posts antigos, pelo que `postingTimeline` cobre ~160 dias.

`FrequencyCard` recebe esse `calendarDays` integral e usa-o:

- `WeeklySummary` → agrega "Mais ativo / Mais parado" sobre 160 dias → "Domingo · 159 dias s/ post".
- Grelha `Quando publicou` → desenha 10+ semanas, a maioria vazia.
- Legenda `X em Y dias` → conta sobre os 160 dias.

Tudo isto contradiz o subtítulo, que usa `effectiveWindowDays = 30` (vindo de `cadence.windowDays`).

## Correção

Uma única fonte de verdade para a janela do card: cortar `calendarDays` aos últimos `effectiveWindowDays` no topo de `FrequencyCard`, antes de qualquer cálculo derivado.

### Ficheiro

`src/components/report-redesign/v2/overview/frequency-card.tsx`

### Alterações

1. Depois de calcular `effectiveWindowDays`, derivar:
   ```ts
   const windowedDays = effectiveWindowDays > 0
     ? calendarDays.slice(-effectiveWindowDays)
     : calendarDays;
   ```
2. Substituir todos os usos a jusante de `calendarDays` por `windowedDays`:
   - `WeeklySummary days={windowedDays}`
   - `publishedCount`, `pausedCount`, `maxPosts`
   - `buildWeekGrid(windowedDays)`
   - `t("frequency.calendar.ratio", { total: windowedDays.length })`
3. Não alterar `buildPostingTimeline` (pode ser útil noutros consumidores futuros).

### Efeito visual esperado em `robs.cortez`

- "Mais ativo: Quinta · 4 posts" mantém-se (era já o weekday correto na janela curta).
- "Mais parado" deixa de referir 159 dias; passa a refletir só os ~30 dias (provavelmente "Domingo · 4 dias s/ post" ou desaparece se nenhum dia elegível ficar acima do limiar).
- Grelha "Quando publicou" passa a ter ~4–5 semanas (alinhado com "10 publicações em 30 dias").
- Legenda "X em Y dias" coerente com o subtítulo.

### Fora do âmbito

- Headers dos dias da semana (`S T Q Q S S D`) já estão corretos.
- `format-card`, `engagement-card` não são afetados.
- Não mexer no `buildPostingTimeline` nem em business logic upstream.

### Validação

- `bunx tsc --noEmit`
- `bunx vitest run` (sanity geral)
- Preview `/analyze/robs.cortez`: verificar que "Mais parado" deixa de mostrar números fora da janela e que a grelha encolhe para ~30 dias.