# Ronda 6B.2.1 — QA visual A/B/C + preservação de concorrentes

## Diagnóstico já confirmado (leitura de código)

`report-shell-v2.tsx` usa `mode="free_with_engagement"` em todas as variantes públicas
e reserva `mode="all"` ao `internal_lab`. Em `report-overview-block.tsx`, **todos** os
componentes comparativos (`ComparisonHero`, `CompetitorBioCompare`,
`CompetitorEngagementCompare`, `CompetitorCadenceCompare`, `CompetitorWeekdayCompare`,
`CompetitorFormatCompare`, `CompetitorTopPostCompare`, `CompetitorEditorialDiagnostic`)
estão dentro de `mode === "all"` (ou `"locked"`) e de `firstCompetitor`.

Conclusão do ponto 3 do pedido: **NÃO** — um utilizador Pro com concorrente deixou de
receber a comparação no percurso público. Classificado como **BLOCKER**.

## Correcção proposta (ponto 4)

Manter a base cumulativa intacta e acrescentar uma camada comparativa apenas quando
existir concorrente e `access === "pro"`:

```text
BASE PRO (inalterada)
Índice → Engagement → Frequência → Publicações → Formatos → Conversas
→ Diagnóstico → Prioridades

+ CAMADA COMPARATIVA (só com concorrente)
Comparação com concorrente:
  ComparisonHero
  CompetitorBioCompare
  CompetitorEngagementCompare
  CompetitorCadenceCompare + CompetitorWeekdayCompare
  CompetitorFormatCompare
  CompetitorTopPostCompare
  CompetitorEditorialDiagnostic
```

- A camada é composta no ramo `free_with_engagement` do `report-overview-block.tsx`,
  em bloco próprio no fim do overview, com os mesmos componentes já existentes
  (sem redesenho, sem alterar props).
- Nenhum card base é substituído pela versão comparativa no percurso público — a
  comparação acrescenta, não troca.
- O ramo `mode="all"` continua intocado para `internal_lab` e modo comparação.
- Entrada de sidebar para a camada comparativa só quando existir concorrente.

## QA visual (pontos 1, 2, 5, 6, 7)

Validação com Playwright headless contra `/admin/report-lab` e
`/admin/report-preview/$username`, com sessão autenticada, mesmo snapshot para os três
estados, desktop (1280) e mobile (390):

- A: Índice → Engagement → Frequência → Melhores/Piores PREVIEW → gate gratuito → fim;
  sem Formatos completo, Conversas, Diagnóstico, Prioridades ou CTA 9 €.
- B: acrescenta Melhores/Piores completo, Formatos, Conversas e proposta Pro no fim.
- C: igual a B, mais Diagnóstico Editorial e Prioridades.
- C + concorrente: igual a C, mais a camada comparativa.
- Preview condensado vs ecrã completo: mesma ordem, gates e estado comercial.
- Comment Intelligence: ausente em A, presente em B, C e C+concorrente.
- `PostComparisonPreview` em A: título legível, thumbnails perceptíveis, MELHOR/PIOR
  legível, conteúdo protegido não legível, gate "Grátis com email", zero referências a 9 €.
- Mobile 390 px: ordem, ausência de overlaps, gate, Conversas e Pro.

## Testes (ponto 8)

- Manter verdes: `access-gating`, `report-shell-composition`, sanitização
  `free/lead/pro`, typecheck.
- Novo teste de composição: **Pro com concorrente preserva a camada de comparação**
  (base cumulativa presente + componentes `Competitor*` compostos no ramo comercial).

## Entrega

Tabela `Estado | Ordem esperada | Ordem real | PASS/FAIL` para A, B, C e C+concorrente,
screenshots desktop/mobile por estado (e desktop para C+concorrente), lista de bugs
encontrados e correcções feitas, e a marca final
`READY FOR CARD-BY-CARD UX REVIEW` apenas se tudo estiver coerente.

## Fora de âmbito

Redesign de cards, hero, sidebar, tipografia, CTAs, refinamento mobile, preço,
pagamentos e providers.
