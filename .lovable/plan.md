## Estado atual (auditoria)

A maior parte dos FIXES já foi implementada nas passagens anteriores. Confirmado por leitura direta dos ficheiros:

| FIX | Estado | Evidência |
|-----|--------|-----------|
| 1 — Substituir stat `COM PERGUNTAS` inventada | **Parcial** | `classifyQuestionShare` já existe em `block02-diagnostic.ts` (linhas 428-447) e calcula `?` real após remover hashtags com `/#\S+/g`. Card 05 já usa `r.questionShareAvailable` para esconder a stat quando `< 4 posts`. Falta apenas alinhar a **assinatura de retorno** ao contrato pedido neste prompt. |
| 2 — Linguagem cautelosa na pergunta 08 | **Parcial** | Já usa "Hipótese principal" e "Com base na amostra analisada". Falta reforçar com "Sinais de" e "inferência provável". |
| 3 — Card único span 2 colunas | ✅ Feito | `report-diagnostic-group.tsx` linhas 42-50 envolve filho único em `md:col-span-2`. |
| 4 — CTA `#leitura-completa` | ✅ Feito | `report-diagnostic-cta.tsx` linha 25. |
| 5 — Não passar `analyzedAtIso` ao `ReportDiagnosticBlock` | ✅ Feito | `report-shell-v2.tsx` linha 111: `<ReportDiagnosticBlock result={result} payload={payload} />` — sem `analyzedAtIso`. |

Locked files: nenhum dos ficheiros a tocar está em `LOCKED_FILES.md`.

## Alterações a implementar (cirúrgicas)

### 1. `src/lib/report/block02-diagnostic.ts`

Alinhar `classifyQuestionShare` ao contrato exato do prompt: devolver `{ available, questionSharePct, questionCount, postsCount }`.

- Renomear `sharePct` → `questionSharePct`.
- Renomear `sampleSize` → `postsCount`.
- Adicionar `questionCount: number`.
- Atualizar o tipo de retorno inline.
- Atualizar o único call-site interno em `classifyCaptionPattern` (linhas 388-390): usar os novos nomes (`questionSharePct`, `available`).
- Manter a lógica de cálculo intacta (já está correta: `replace(/#\S+/g, " ")` + `includes("?")`, `< 4` → `available:false`, arredondamento `Math.round((count/total)*100)`).

`CaptionPatternResult` mantém os campos `questionSharePct` e `questionShareAvailable` que já existem (consumidos pelo card 05 sem mudança).

### 2. `src/components/report-redesign/v2/report-diagnostic-block.tsx`

Pergunta 08 (linhas 575-593) — reforçar wording cauteloso no `body`:

Substituir o body atual:

> "Hipótese principal derivada de sinais de conteúdo, funil, bio e ligação entre canais. Com base na amostra analisada — confirme com o contexto real do perfil."

Por:

> "Com base na amostra analisada, esta é uma **hipótese provável** derivada de sinais de conteúdo, funil, bio e ligação entre canais — uma inferência provável, não uma afirmação. Deve ser confirmada pelo objetivo real da marca ou do criador."

Verificar que não aparecem formulações definitivas ("O objetivo é", "Serve para", "Está focado em") no card. A `question` ("Que objetivo provável serve?") já é cautelosa — manter.

Nenhuma mudança ao `answer` (vem de `r.primary` via classifier) nem ao `DiagnosticRanking`.

### 3. Não tocar

- `report-diagnostic-group.tsx` — já correto.
- `report-diagnostic-cta.tsx` — já correto.
- `report-shell-v2.tsx` — já correto.
- Restantes blocos (01, 03–06), PDF, admin, `/report/example`, providers, schema, AI prompts, validators, payments — intocados.

## Validação

1. `bunx tsc --noEmit`
2. `bunx vitest run`

Sem QA browser, sem chamadas externas, sem migrations.

## Entregáveis a reportar

1. Ficheiros tocados (2: `block02-diagnostic.ts` + `report-diagnostic-block.tsx`).
2. Confirmação de que a stat "COM PERGUNTAS" usa cálculo determinístico real (já estava — agora com o contrato exato pedido).
3. Lógica de question share: strip `/#\S+/g` → `includes("?")` → `count/total*100` arredondado, `available:false` quando `posts.length < 4`.
4. `#leitura-completa` mantido.
5. `analyzedAtIso` não passado a `ReportDiagnosticBlock`.
6. Grupos com 1 cartão ocupam 2 colunas em desktop.
7. Resultado do TypeScript.
8. Resultado do Vitest.
9. Confirmação de zero toques em providers / schema / PDF / admin / `/report/example` / validators / AI prompts / locked files.
