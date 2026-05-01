
# Refinamento UX/UI — Q05 "O público responde ou só consome?"

## Problemas identificados

1. **Badge de fonte duplicado**: "CÁLCULO" aparece no header E no footer do cartão — o `ReportDiagnosticCard` renderiza `sourceType` em dois sítios (linha 117 e linha 211).
2. **Dados repetidos**: "Coment. médios / post" aparece na grelha de totais E na barra de médias abaixo. O mesmo para gostos (total na grelha + média na barra).
3. **Grelha de 4 mini-stats sobrecarrega**: Gostos totais / Comentários totais / Coment. médios / Posts com comentários — demasiada informação bruta que compete com a resposta dominante e a barra de médias.

## Plano

### 1. Remover badge duplicado no `ReportDiagnosticCard`

**Ficheiro**: `src/components/report-redesign/v2/report-diagnostic-card.tsx`

Eliminar o bloco do footer (linhas 211-219) que re-renderiza `ReportSourceLabel`. Manter apenas o do header.

### 2. Simplificar `DiagnosticAudienceHighlight`

**Ficheiro**: `src/components/report-redesign/v2/report-diagnostic-card.tsx`

- Remover a grelha de 4 mini-stats (totalLikes, totalComments, coment. médios, posts com comentários) — esta informação duplica o que a barra de médias já mostra.
- Manter apenas a barra de médias (gostos médios + coment. médios) como a peça visual principal.
- Adicionar uma linha discreta abaixo com "com base em N publicações · X com comentários" como contexto de amostra em texto corrido (sem caixas).

### 3. Resultado esperado

O cartão fica mais limpo: pergunta → resposta dominante → barra de médias com contexto de amostra → body interpretativo. Sem repetições.

## Ficheiros a editar

- `src/components/report-redesign/v2/report-diagnostic-card.tsx`

Nenhum ficheiro bloqueado, schema, provider ou PDF será tocado.
