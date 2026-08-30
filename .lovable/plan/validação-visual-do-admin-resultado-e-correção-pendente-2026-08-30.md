# Validação visual do /admin — resultado e correção pendente

## O que foi validado (com sessão admin real, 1280px)

- `/admin/receita`: cartão ScrapeCreators presente com créditos (19), custo efectivo $0 (promocional), equivalente $0.04, chamadas e saldo; série "ScrapeCreators (equiv.)" no gráfico Evolução diária; linha ScrapeCreators na Reconciliação; fiabilidade mostra "Apify 9/9 · ScrapeCreators 3/6".
- Limite Apify já é `$4.75` (o antigo `$29` desapareceu) e o limite diário do gráfico passou a `$0.16/dia`.
- `/admin/visao-geral` e `/admin/sistema` também referem ScrapeCreators.
- Zero erros de consola nas três páginas.

Conclusão: a cobertura ScrapeCreators no Admin está resolvida.

## Único defeito encontrado

No cartão ScrapeCreators de `/admin/receita`, o badge "PRIMÁRIO" fica cortado (aparece só "P") porque a linha do cabeçalho não tem espaço: o nome do fornecedor é longo e o badge não encolhe nem quebra.

## Correção proposta (apenas CSS/layout)

Ficheiro: `src/components/admin/v2/visao-geral/expense-section.tsx`

- No cabeçalho do cartão, permitir que o nome do fornecedor trunque (`min-w-0` + `truncate`) e impedir o badge de encolher (`shrink-0`).
- Alternativa se continuar apertado: mover o badge para a linha seguinte no cartão ScrapeCreators, mantendo o mesmo estilo dos restantes cartões.
- Sem alterações de dados, queries, tokens ou lógica.

## Verificação

- Nova captura de `/admin/receita` a 1280px e a 375px, confirmando o badge legível e os quatro cartões alinhados.
