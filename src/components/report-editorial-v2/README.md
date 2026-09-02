# Editorial V2 — fundação de apresentação

Camada de apresentação isolada do relatório público. Só renderiza com
`?report_design=editorial_v2`; o default continua a ser o relatório de
produção (`ReportShellV2`).

## Regras

- Nenhum dado é obtido aqui. A shell recebe exactamente as mesmas props de
  produção (`ReportPresentationProps` deriva de `ReportShellV2`).
- Nenhuma métrica, selector, entitlement, evento de analytics ou cálculo
  novo. Zero valores hardcoded vindos das referências HTML.
- Tokens com escopo em `src/styles/editorial-v2.css` (`.editorial-v2`).
- Números de exibição ("01") são rótulos, nunca chaves funcionais.

## Observação vs Leitura

- `ObservationBlock` (`statements: string[]`) — apenas afirmações
  directamente suportadas por dados medidos.
- `ReadingBlock` (`hypothesis: string`, `confidence?`) — interpretação ou
  hipótese, rotulada LEITURA, com linguagem causal cautelosa
  ("os dados sugerem…", "a hipótese mais provável…", "pode indicar…").

As APIs são estruturalmente distintas para não poderem ser trocadas.

## Remoção

Apagar esta pasta e `src/styles/editorial-v2.css`, e reverter em
`src/routes/analyze.$username.tsx` o campo `report_design` e o uso de
`ReportPresentation` para `ReportShellV2`. Nenhuma lógica de negócio do
relatório depende desta pasta.
