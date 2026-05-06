
# P04 Caption Diagnostics — Refinamentos

## Auditoria (estado atual)

### Secções que JÁ usam dados semânticos quando disponíveis

| Secção | Semantic? | Fallback? |
|--------|-----------|-----------|
| Temas Dominantes (KPI) | ✅ `semantic.dominantThemes` | ✅ `data.themes` |
| Assuntos Recorrentes (lista) | ✅ `semanticThemes` | ✅ `themes` |
| Intenção Principal (KPI) | ✅ `semantic.contentIntent` | ✅ `data.contentTypeMix` |
| Expressões Recorrentes | ✅ `semantic.recurringExpressionsInterpretation` | ✅ `data.recurringExpressions` |
| Diagnóstico Editorial | ✅ `semantic.diagnostic` | ✅ `buildDiagnosticStatement()` |
| Comment Engagement | ✅ `semantic.commentEngagement` | ✅ `data.commentEngagement` |
| Hook / Voice / Formulaic | ✅ semantic-only pills | N/A (só semantic) |

**Conclusão:** A prioridade semantic > fallback está correta em todas as secções.

### Problema: temas genéricos no fallback determinístico

`text-extract.ts` filtra palavras com `< 5` chars e usa `STOP_WORDS_PT`. Mas faltam contrações preposicionais comuns com 5+ chars que passam o filtro:

- "neste", "nesta", "nestes", "nestas"
- "deste", "desta", "destes", "destas"
- "nesse", "nessa", "nesses", "nessas"
- "desse", "dessa", "desses", "dessas"
- "naquele", "naquela", "daquele", "daquela"
- "nisso", "disso", "disto"
- "ainda" (duplicado, já está)
- "sobre" (já está)
- Adverbiais/pronominais genéricos: "muito", "quando", "onde", "como" (curtos, já filtrados)

Também faltam palavras de 5+ chars com zero valor temático:
- "neste", "nesta", "deste", "desta" — contrações preposicionais
- "dessa", "nessa" — idem
- "então", "entao" — advérbios
- "agora" (já está), "sendo", "fazer" (já está)
- "apenas" (já está), "tambem" (já está)
- "aonde", "donde", "nesse" — locativos/conectores
- "tinha", "tinham" (já está parcialmente)
- "seria", "teria", "devem", "podem" (já está `poder/podem`)
- "vezes", "verem", "certo", "certa"
- "grande", "maior", "melhor", "pior" — adjetivos genéricos
- "parte", "mundo", "lugar", "ponto" — substantivos genéricos

### P05 cross-reference

Já funciona: `report-diagnostic-block.tsx` lê `captionSemantic?.commentEngagement?.asksForCommentsPct` e `strategyLabel` e passa para `DiagnosticAudienceHighlight`. Sem alterações necessárias.

---

## Plano de implementação

### 1. Expandir `STOP_WORDS_PT` em `text-extract.ts`

Adicionar contrações preposicionais e substantivos/adjetivos genéricos sem valor temático:

```
"neste", "nesta", "nestes", "nestas",
"deste", "desta", "destes", "destas",
"nesse", "nessa", "nesses", "nessas",
"desse", "dessa", "desses", "dessas",
"naquele", "naquela", "daquele", "daquela",
"nisso", "disso", "disto", "nisto",
"entao", "sendo", "seria", "teria",
"devem", "devemos", "deveria",
"vezes", "certo", "certa", "certos", "certas",
"grande", "grandes", "maior", "melhor", "pior",
"parte", "mundo", "lugar", "ponto",
"video", "videos", "post", "posts", "semana",
"preciso", "precisa", "importante", "consegue",
"quais", "onde", "aonde"
```

### 2. Adicionar guard de qualidade de tema em `caption-diagnostics-card.tsx`

Na renderização fallback de temas (quando `hasSemantic` é false), filtrar labels que sejam:
- Palavra única com menos de 6 chars (fraca especificidade)
- Pertencente a uma lista de genéricos conhecidos mesmo com 6+ chars

Se após filtragem restarem menos temas, mostrar "Tema pouco específico detetado" como fallback, ou simplesmente omitir o item.

### 3. Validação

- `bunx tsc --noEmit`
- `bunx vitest run`

---

## Ficheiros a editar

| Ficheiro | Alteração |
|----------|-----------|
| `src/lib/report/text-extract.ts` | Expandir `STOP_WORDS_PT` |
| `src/components/report-redesign/v2/caption-diagnostics-card.tsx` | Guard de qualidade no fallback de temas |

## Resultado esperado

- "Neste" deixa de aparecer como tema (filtrado na extração)
- Temas genéricos de uma só palavra são omitidos ou substituídos
- Dados semânticos continuam prioritários (sem alteração)
- P05 mantém-se intacto e funcional
