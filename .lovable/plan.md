# Auditoria · Card "Frequência de publicação"

Encontrei **4 inconsistências reais de dados** entre o que o card mostra e o que os números significam, mais 1 limpeza menor. Nenhuma é cosmética — todas afectam a leitura do utilizador.

## Problemas detectados

### 1. `windowDays` do subtítulo ≠ nº de quadrados do calendário
- `snapshot-to-report-data.ts` calcula `windowDays = ceil((maxTs − minTs)/86_400_000) + 1` a partir de **timestamps**.
- `buildPostingTimeline` itera por **datas UTC** (`isoDateOnly`) → produz `(maxDate − minDate)/dia + 1` células.
- Quando os posts mais recente/antigo não estão à mesma hora do dia, o `ceil` adiciona +1 → o subtítulo diz "X publicações em 16 dias" mas o calendário tem 15 quadrados.

### 2. Thresholds do veredicto desalinhados com o "status" no título
- Chip do título: `Alta ≥70`, `Média ≥40`, `Baixa <40`.
- `getFrequencyVerdict` e `verdictLabel`: `≥90`, `≥50`, `<50`.
- Resultado prático: score 75 mostra título "**Alta**" + veredicto "Cadência aceitável · A MELHORAR" (contraditório).

### 3. "Mais parado" dispara com amostra demasiado pequena
- `pickQuietest` marca o fim-de-semana como parado se houver ≥1 dia silencioso, mesmo que a janela contenha só 1 sábado ou 1 domingo.
- Pode marcar uma segunda-feira "1 dia s/ post" só porque a janela contém uma única segunda-feira.
- Cria falsos alertas em janelas curtas (≤10 dias).

### 4. Mini-bars semanais usam denominador inválido em janelas curtas
- `aggregateByWeekday` soma `daysSilent` por dia da semana sem normalizar por `daysTotal` desse dia.
- Numa janela de 14 dias com 2 segundas e 2 domingos, "Mais parado" pode escolher um dia da semana com 1/1 silencioso vs outro com 2/2 silencioso por mero acaso de amostra.

### 5. (limpeza) Variável morta `statsLine`
- Calculada em `FrequencyCard` mas nunca renderizada.

## Alterações propostas (apenas frontend + transformador)

### A. `src/lib/report/snapshot-to-report-data.ts`
- Substituir o cálculo de `windowDays` por uma versão **date-based** alinhada ao calendário:
  - Usar `isoDateOnly(min)` e `isoDateOnly(max)` em ms, `windowDays = (maxDay − minDay)/86_400_000 + 1`.
  - Garante que `windowDays === postingTimeline.length` sempre que há posts.
- Manter o `round1((postsAnalyzed / windowDays) * 7)` (já existe e continua correcto com o novo `windowDays`).

### B. `src/components/report-redesign/v2/overview/frequency-card.tsx`

**Veredicto alinhado ao status (thresholds 70/40):**
```ts
// score ≥70 → "Cadência forte e consistente." · PONTO FORTE · positive
// score ≥40 → "Cadência aceitável." · A MELHORAR · warning
// score <40 → "Cadência irregular." · ALERTA · danger
```
Substitui as três funções que ainda usam 90/50.

**`pickQuietest` com guarda de amostra:**
- Fim-de-semana só dispara se `sat.daysTotal ≥ 1 && sun.daysTotal ≥ 1` (ambos presentes na janela) **e** `weekendPosts === 0`.
- Dia da semana isolado: só é elegível se `daysTotal ≥ 2` (i.e. essa segunda apareceu pelo menos 2 vezes na janela). Se nenhum qualificar, omitir o item "Mais parado" em vez de mostrar ruído.

**`WeeklySummary` mais robusto:**
- Se não houver candidato "Mais parado" qualificado, renderizar só "Mais ativo" em coluna única (mantém o grid mas remove a coluna direita).
- Manter mini-bars (já são informativas só com `posts`).

**Subtítulo coerente:**
- Usar `calendarDays.length` como fonte para "Y dias" no subtítulo (em vez de `windowDays` prop) — defesa adicional caso o transformador mude no futuro.
- Se `calendarDays.length === 0` ou `postsAnalyzed === 0`, esconder linha do subtítulo em vez de mostrar "0 publicações em 0 dias".

**Limpeza:**
- Remover variável `statsLine` (morta).

### C. Testes
- Adicionar/actualizar teste em `src/lib/report/__tests__/` (se existir suite para snapshot-to-report-data) confirmando `windowDays === postingTimeline.length`.
- Caso não exista suite, criar `frequency-card-data.test.ts` mínimo cobrindo:
  - alinhamento `windowDays` ↔ `postingTimeline.length`
  - veredicto vs status (3 bandas)
  - `pickQuietest` retorna `null`/omitido em janelas curtas

## Fora de scope (não tocar)
- Cálculo de `postingFrequencyWeekly` (já está correcto).
- Estilo visual / tokens.
- AI insights, calendário em si (cells, legend), `InsightCallout`.

## Checkpoint

- ☐ `windowDays` recalculado por datas em `snapshot-to-report-data.ts`
- ☐ Veredicto/label/tone migrados para thresholds 70/40 em `frequency-card.tsx`
- ☐ `pickQuietest` com guardas de amostra mínima
- ☐ `WeeklySummary` esconde "Mais parado" quando não qualifica
- ☐ Subtítulo usa `calendarDays.length` e esconde-se sem dados
- ☐ `statsLine` removido
- ☐ Testes passam (`bunx vitest run`)
