## Refinamentos ao "Frequência de publicação"

Mapeei o mockup contra o componente actual (`frequency-card.tsx`). Quatro alterações cirúrgicas, nenhuma toca em dados ou backend.

### 1 · Fundir as duas visualizações semanais numa só (`WeeklyRhythm`)

Hoje há duas zonas redundantes: o painel "Resumo da semana" (com a frase do dia mais parado + mini-barras) e o KPI "Pico semanal". Eliminar a redundância:

- Renomear o painel para **"RITMO POR DIA DA SEMANA"** (substitui a chave `frequency.weekly_summary.title`).
- Manter as 7 barras S T Q Q S S D mas tornar a anotação visual o herói:
  - Por cima da barra do **pico**: chip pequeno "pico" em verde escuro.
  - Por cima da barra do **dia mais parado** (eligível por `pickQuietest`): chip "falha" em âmbar suave (`signal-warning`).
  - Pico = barra sólida `rgba(29,158,117,0.95)` (mais escura que hoje), restantes dias com posts em verde médio `rgba(29,158,117,0.45)`, dia "falha" em âmbar muito ténue `rgba(186,117,23,0.30)`.
  - Altura mínima do dia "falha" reduzida para 4px (quase plana), reforçando o vazio.
- **Remover** a caixa de texto isolada "Onde o ritmo falha · Quarta · 4 dias sem post" — substituir por uma única frase interpretativa por baixo das barras:
  > "Concentras-te à **sexta**. **Quarta** é o vazio — esteve 4 dias sem publicação."
  
  Construída a partir de `pickMostActive` + `pickQuietest`. Quando não houver `quiet`, usar fallback "Cadência uniforme — nenhum dia da semana se destaca pela negativa."

### 2 · Tirar o azul do KPI "Pico semanal"

Em `FrequencyKpiStrip`, o valor "Sexta" usa `text-accent-primary` (azul). Trocar por `text-content-primary` para alinhar com os outros dois números — a regra: cor de destaque só para estados, não para decorar. Manter eyebrow + número + caption nas três tiles, com divisórias finas (já existem).

### 3 · Calendário — limpar o cabeçalho colapsável

O toggle já existe (`calendarOpen`). Refinamentos:
- Eyebrow: **"CALENDÁRIO · 30 DIAS"** (usar `effectiveWindowDays`).
- Sub-linha: **"8 dias com publicação"** (singular/plural via i18n).
- CTA à direita: **"Esconder ▴"** / **"Mostrar ▾"** (copy do mockup; já existem chaves `toggle_show`/`toggle_hide`).
- Reduzir para 3 estados na legenda: `sem post` · `1 post` · `2 posts` — esconder o estado "3+" mesmo quando exista (caso de Frederico não tem >2, e o mockup só mostra 3 swatches). Internamente o `cellStyle(3+)` continua, apenas a legenda fica capada.
- "2" sempre branco sobre verde forte (já é o caso).
- Cell aspect ratio: passar de `aspect-[7/4]` para `aspect-square` — o mockup mostra células quadradas, mais legíveis em 7×5.

### 4 · "Ponto forte" — manter, só verificar alinhamento

O `<InsightCallout tone={verdictTone}>` já renderiza ícone circular + eyebrow + caixa colorida no mesmo estilo do "Diagnóstico comparativo" do card anterior (mesmo componente `InsightCallout`). Nada a mudar — só confirmar que o `verdictLabel` actual ("PONTO FORTE" via `frequency.verdict_label.strong`) é o que aparece para `score >= 70`.

### Ficheiros a tocar

- `src/components/report-redesign/v2/overview/frequency-card.tsx`
  - Refactor `WeeklySummary` → novo `WeeklyRhythm` (mesmo input, layout reordenado: barras com pílulas "pico/falha" → frase única).
  - Ajustar `FrequencyKpiStrip` (cor neutra no peak label).
  - Ajustar render do calendário (header colapsável + legenda capada a 3 estados + cells quadradas).
- `src/i18n/locales/pt/report.json` + `src/i18n/locales/en/report.json`
  - Renomear/adicionar: `frequency.weekly_rhythm.title` ("RITMO POR DIA DA SEMANA"), `weekly_rhythm.peak_chip` ("pico"), `weekly_rhythm.gap_chip` ("falha"), `weekly_rhythm.interpretation_with_quiet`, `weekly_rhythm.interpretation_uniform`.
  - `frequency.calendar.eyebrow` ("CALENDÁRIO · {{days}} DIAS"), `calendar.published_summary` ("{{count}} dias com publicação" com singular).
  - Manter chaves antigas se ainda usadas; senão remover.

### Fora do âmbito (não tocar)

- `score-utils.ts`, lógica de cadence/insufficient samples, backfill de janela.
- `report-overview-block.tsx` (props mantêm-se idênticas).
- `/report.example`.
- Estados "insuficiente" (cadenceSufficient === false) mantêm o caminho actual sem `WeeklyRhythm`.
- Outras tiles, restantes cards, AI insights.

### Validação

- `bunx tsc --noEmit` verde.
- Preview `/analyze/frederico.m.carvalho` a 1460×905 e 411×742 (mobile) — verificar:
  - Barras com chips "pico" (sexta) e "falha" (quarta).
  - Frase interpretativa única por baixo.
  - KPI "Pico semanal" = "Sexta" em cor neutra.
  - Calendário fechado por defeito; abre limpo, legenda 3 swatches.
  - Callout "PONTO FORTE" inalterado.

### Checkpoint

- ☐ Refactor `WeeklySummary` → `WeeklyRhythm` com chips pico/falha + frase única
- ☐ Neutralizar cor do peak label no `FrequencyKpiStrip`
- ☐ Refinar header colapsável do calendário + legenda 3 estados + cells quadradas
- ☐ Adicionar/renomear chaves i18n em pt + en
- ☐ `bunx tsc --noEmit` verde
- ☐ Preview a 1460×905 e 411×742
