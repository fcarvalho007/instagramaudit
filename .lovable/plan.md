## Cadência v3 — fórmula em janelas (30d → 90d → amostra)

### Old vs new formula

| | Atual | Nova |
|---|---|---|
| Janela | `(max - min) / 7 dias` da amostra inteira | **30 dias rolling** (`posts_30d / 4.345`) → fallback **90 dias** (`posts_90d / 12.857`) → fallback **sample span** (`posts / span_weeks`) |
| Pinned | Filtrados antes do cálculo | Igual |
| Sample inválida | Mostra número distorcido | Mostra copy neutra "amostra recente insuficiente…" e `postingFrequencyWeekly = 0` |
| Sort | Não explícito | Sempre desc por ts antes de tudo |
| Timestamps | Só `taken_at_iso` | `taken_at_iso` OR `taken_at` (auto-detect s vs ms) |

### Plano cirúrgico

**1. Novo módulo puro `src/lib/report/cadence.ts`**
Função exportada `computeCadence(posts, { now? })` que devolve:
```ts
{
  method: "window_30d" | "window_90d" | "sample_span" | "insufficient",
  weekly: number,           // 0 se insufficient
  sampleSize: number,       // posts considerados na janela final
  windowDays: number,       // 30, 90, ou span real
  sufficient: boolean,
  notePt: string | null,    // copy neutra se !sufficient
  noteEn: string | null,
}
```
Lógica:
- normaliza ts: prefere `taken_at_iso`, fallback `taken_at` (heurística s/ms: valor < 1e12 → segundos × 1000)
- filtra `is_pinned === true`
- filtra ts inválido/NaN/futuro
- ordena desc
- count em <30d / <90d a partir de `now`
- se `count_30 >= 3` → `weekly = count_30 / 4.345`, method window_30d
- senão se `count_90 >= 3` → `weekly = count_90 / 12.857`, method window_90d
- senão se `posts.length >= 2` e span entre max e min ≤ 180 dias → sample_span
- senão → insufficient (weekly=0, notePt/EN preenchidos)

**2. Substituir bloco em `src/lib/report/snapshot-to-report-data.ts:968-1044`**
- continuar a filtrar pinned para `temporalSeries`/`heatmap`/`bestDays` (igual ao atual — não mexer)
- chamar `computeCadence(posts)` para `keyMetrics.postingFrequencyWeekly` e `windowDays`
- remover o "defense-in-depth gap filter" introduzido na volta anterior (a nova função substitui)
- labels: `kpiSubtitle` / `windowLabel` / `temporalLabel` / `sampleCaption` passam a usar o `method` retornado:
  - `window_30d` → "últimos 30 dias · N publicações"
  - `window_90d` → "últimos 90 dias · N publicações"
  - `sample_span` → "amostra de N publicações · X dias"
  - `insufficient` → "amostra recente insuficiente para medir cadência"
- expor `cadence` no `ReportEnriched` para componentes que queiram method/note

**3. Componentes consumidores — só copy, sem mudança estrutural**
- `report-overview-block.tsx` → `frequenciaSubtitle` passa a aceitar `cadence` e mostrar a copy neutra quando `!sufficient`
- `editorial-identity-card.tsx` → `rhythmBand` só corre se `cadence.sufficient`; senão a linha "Frequência" passa a "—" + nota
- `frequency-card.tsx` → `computeFrequencia` recebe `cadence.weekly` (já está), mas se `!sufficient` mostra estado vazio
- `report-kpi-grid.tsx` / `report-kpi-grid-v2.tsx` → quando `!sufficient`, render "—" em vez de `0,0`
- `share-message.ts` → omite frase de cadência quando `!sufficient`
- `report-overview-attention-row.tsx` → linha "alta cadência" só dispara se `sufficient`

**4. Scoring**
`computeFrequencia` em `frequency-card.tsx` é uma função pura sobre `weekly`. Não muda — recebe um `weekly` mais fiável. Confirmar via grep que nenhum scoring usa `windowDays` directo.

**5. Tests novos — `src/lib/report/__tests__/cadence.test.ts`**
- recent active (10 posts nos últimos 13 dias) → window_30d, weekly ≈ 5.4
- pinned antigo + recentes (caso robs.cortez) → window_30d, weekly ≈ 5.4, ignora pinned
- timestamps em segundos (`taken_at = 1716623400`) → normalizado, weekly calculado
- timestamps em milissegundos (`taken_at = 1716623400000`) → normalizado, weekly calculado
- timestamps em falta → ignorados, restantes contam
- stale (último post há 200 dias) → insufficient + notePt
- empty posts → insufficient + notePt
- exactly 2 posts em 30 dias → cai para window_90d se 3+; senão sample_span
- post futuro (ts > now) → descartado

**6. Backfill — não necessário desta vez**
O snapshot do robs.cortez já tem `is_pinned` correto (backfill anterior). A nova fórmula vai recalcular na próxima leitura sem tocar na DB.

**7. Validação final**
- `bunx tsc --noEmit`
- `bunx vitest run` (444 → 444 + ~10 novos)
- query SQL para confirmar que o report do robs.cortez, ao ser lido, devolveria `method=window_30d, weekly≈5.4` (verificado via test fixture com os ts reais)

### Ficheiros a tocar

| Tipo | Caminho |
|---|---|
| novo | `src/lib/report/cadence.ts` |
| novo | `src/lib/report/__tests__/cadence.test.ts` |
| edit | `src/lib/report/snapshot-to-report-data.ts` (substituir bloco cadence ~970-1050, adicionar `cadence` ao enriched) |
| edit | `src/components/report-redesign/v2/report-overview-block.tsx` (subtitle neutra) |
| edit | `src/components/report-redesign/v2/overview/editorial-identity-card.tsx` (rhythmBand opt-out) |
| edit | `src/components/report-redesign/v2/overview/frequency-card.tsx` (empty state) |
| edit | `src/components/report-redesign/v2/report-overview-cards.tsx` (render "—") |
| edit | `src/components/report-redesign/report-kpi-grid.tsx` (render "—") |
| edit | `src/components/report-redesign/v2/report-kpi-grid-v2.tsx` (render "—") |
| edit | `src/components/report-share/share-message.ts` (omitir frase) |
| edit | `src/components/report-redesign/v2/report-overview-attention-row.tsx` (guarda sufficient) |

### Fora de scope

- Re-fetch Apify · prompt v2 · UI layout · novos benchmarks · backfill de snapshots históricos.

### Checkpoint

- ☐ Novo `cadence.ts` puro e testado
- ☐ `snapshot-to-report-data.ts` usa-o e remove o gap-filter de defesa
- ☐ Todos os consumidores tratam `!sufficient` com copy neutra (sem `0,0` enganador)
- ☐ Copy PT/EN da fallback aplicada
- ☐ `tsc --noEmit` verde
- ☐ `vitest run` verde com tests novos
- ☐ Snapshot do robs.cortez deixa de produzir "12 / 1111 dias"; passa a "últimos 30 dias · 10 publicações · 5,4/sem"
