## Problema

Em `/analyze/webhspt`, na secção **Frequência de publicação**, o ratio do calendário aparece como **"12/629 dias"** (publicações / dias). 629 dias é absurdo para uma amostra de 12 posts e nada tem a ver com a janela editorial real.

## Causa-raiz

Ficheiro: `src/components/report-redesign/v2/overview/frequency-card.tsx` (linhas 383–402).

1. `cadence.windowDays` vem **0** quando o cálculo de cadência cai em `insufficient` (acontece quando a amostra recente é demasiado fina para 30d/90d e o span ultrapassa 180 dias — exactamente o caso da @webhspt).
2. Nesse cenário, o fallback do card é:
   ```ts
   effectiveWindowDays =
     cadenceWindowDays > 0
       ? cadenceWindowDays
       : calendarDays.length > 0
         ? calendarDays.length      // ← 629 (span total entre o post mais antigo e o mais recente)
         : windowDays;
   ```
3. `calendarDays` é construído em `buildPostingTimeline` (`snapshot-to-report-data.ts`, linha 463) como **um dia por cada dia entre `minMs` e `maxMs`** dos posts já limpos. Mesmo com pruning de outliers, 12 posts reais podem cobrir 629 dias.
4. Resultado: o calendário desenha 629 células, o `WeeklySummary` é escondido (`!isInsufficient`), mas a legenda usa `t("frequency.calendar.ratio", { published, total: windowedDays.length })` → **"12/629 dias"**.

Adicionalmente, mostrar um heatmap de 629 dias num cartão pequeno é visualmente inútil e contradiz o subtítulo "Dados recentes insuficientes para medir o ritmo".

## Correcção (mínima, só frontend)

Editar `src/components/report-redesign/v2/overview/frequency-card.tsx`:

1. **Clampar a janela do calendário** quando `isInsufficient`:
   - Definir `INSUFFICIENT_CALENDAR_MAX_DAYS = 90`.
   - `effectiveWindowDays` passa a ser `min(calendarDays.length, 90)` em vez de `calendarDays.length` no ramo insuficiente.
   - `windowedDays = calendarDays.slice(-effectiveWindowDays)` mantém-se, mas agora mostra no máximo os últimos 90 dias.
2. **Esconder o ratio "X/Y dias"** quando `isInsufficient`, porque o denominador é uma janela artificial (90 dias sem posts reais leria "0/90 dias" ou "1/90 dias" — sinal enganador). Substituir, nesse estado, por um texto neutro já existente: a frase do `headline` insuficiente continua a aparecer no topo do cartão.
3. Quando a cadência **é** suficiente, manter o comportamento actual (já está bem clampado pelo `cadence.windowDays` ≤ 180).

Nada muda em:
- `buildPostingTimeline` (continua a expor a timeline crua para outros consumidores)
- `computeCadence` / lógica de cadência
- Outros cards do overview
- i18n strings (apenas deixamos de renderizar o `frequency.calendar.ratio` no estado insuficiente)
- Backend, snapshots, providers, schema, premium gates

## Validação

- Abrir `/analyze/webhspt` (estado actual: insufficient). Confirmar:
  - Subtítulo: "Dados recentes insuficientes para medir o ritmo" (já existia)
  - Calendário com no máximo ~13 semanas (90 dias) em vez de 629 dias
  - Sem ratio "12/629 dias"
- Abrir um perfil com cadência saudável (ex.: `/analyze/frederico.m.carvalho`):
  - Subtítulo "X publicações em Y dias" mantém-se
  - Ratio "X/Y dias" continua a aparecer normalmente
- Mobile 390×844: heatmap clampado cabe sem scroll horizontal
- `bunx tsc --noEmit`

## Output esperado da implementação

- Ficheiros alterados: `src/components/report-redesign/v2/overview/frequency-card.tsx`
- Causa-raiz documentada: `effectiveWindowDays` caía para `calendarDays.length` (span total) quando a cadência era insuficiente
- Confirmação visual em `/analyze/webhspt` de que o ratio anómalo desaparece e o heatmap fica limitado a 90 dias
- Resultado de `tsc`
