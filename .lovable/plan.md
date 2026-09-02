# Editorial V2 — gate Pro (só apresentação)

Renderizar o gate Free → Pro já existente com o sistema visual Editorial V2. Nenhuma lógica de compra, preço, créditos, entitlements ou checkout é alterada.

## Estado actual confirmado

- O gate de produção é `ReportEndOfFreeBlock` (`src/components/report-redesign/v2/end-of-free-block.tsx`), renderizado em `report-shell-v2.tsx` apenas quando `leadCaptured && !premiumUnlocked`, dentro de `<section id="lead-magnet-card">`.
- A compra usa `usePremiumCta().goToProCheckout("lock_gate")` do `PremiumCtaProvider`, que já trata de tracking e destino de checkout.
- O preço vem de `PUBLIC_PRODUCTS.report_full_9.priceLabel` — será lido daí, nunca escrito à mão.
- As secções Pro públicas confirmadas em `block-config.ts` (`COMMERCIAL_SECTIONS`) são exactamente duas: `diagnostico-editorial` e `prioridades`. "O que testar, corrigir ou repetir" não existe como secção funcional separada.
- Nota de divergência: os rótulos numéricos em produção são **07** e **08** (não 06/07), porque as secções free/free_email ocupam 01–06. Como os números são apenas rótulos, a proposta é manter 07/08 para coerência com a sidebar de produção. Se preferires 06/07, é uma linha a mudar.
- `EditorialV2Shell` ainda não está dentro do `PremiumCtaProvider` (esse provider vive dentro do `ReportShellV2`).

## O que vai ser feito

1. **Novo componente** `src/components/report-editorial-v2/gate/editorial-pro-gate.tsx`
   - Banda full-bleed Editorial V2 com wash radial subtil, eyebrow "Análise Pro", headline Fraunces "Já sabes o quê. Falta o porquê."
   - Parágrafo explicativo com a distinção Free (estado observável) vs Pro (propõe as causas mais prováveis, identifica sinais que podem explicar, transforma os dados num plano de prioridades). Sem qualquer afirmação de causalidade provada.
   - Lista de secções bloqueadas separadas por fios de 1px: Diagnóstico editorial e Prioridades de acção, com o número de apresentação e uma linha de descrição.
   - Cartão de compra focado: `priceLabel` de `PUBLIC_PRODUCTS.report_full_9`, condições e reassurance vindas das chaves i18n `report:end_of_free.*` já existentes, CTA que chama `goToProCheckout("lock_gate")`.
   - Mantém `id="lead-magnet-card"` para não partir deep-links/scroll existentes.
2. **`editorial-v2-shell.tsx`**
   - Envolver a árvore com `PremiumCtaProvider` (mesmas props que o shell de produção: `snapshotId`, `handle`, `variant`, `premiumUnlocked`).
   - Renderizar o gate apenas quando `leadCaptured && !premiumUnlocked`, exactamente a mesma condição de produção.
   - Quando `premiumUnlocked` é verdadeiro: não mostra gate e **não** monta o relatório em cards por baixo — fica só a visão geral Editorial V2 mais uma nota curta de que as secções Pro serão migradas nesta mesma camada.
3. **Metadados**: acrescentar as duas entradas Pro a `section-metadata.ts` (só rótulos de apresentação).

Editorial V2 continua atrás de `?report_design=editorial_v2`; o relatório por defeito não muda.

## Mobile (375px)

Fluxo único: headline e explicação primeiro, depois benefícios agrupados, depois cartão de compra a toda a largura com CTA de altura mínima 48px. Sem overflow horizontal.

## Validação

- Typecheck e a suite Vitest relevante.
- Teste unitário: gate visível com `leadCaptured && !premiumUnlocked`; ausente quando `premiumUnlocked`; preço lido de `PUBLIC_PRODUCTS`.
- Playwright: capturas a 1440px e 375px da rota Editorial V2 e verificação de ausência de scroll horizontal.
- Confirmação de que o gate de produção (`ReportEndOfFreeBlock`) não é tocado.

## Fora de âmbito

Migrar conteúdo Pro, `report_full_9`, packs, créditos, EuPago, webhook, entitlements, 30d/90d, concorrentes, cache, refresh, enriquecimentos e analytics.
