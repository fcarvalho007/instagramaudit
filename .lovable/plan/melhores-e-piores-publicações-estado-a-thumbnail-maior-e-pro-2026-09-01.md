# Melhores e piores publicações (Estado A) — thumbnail maior e promessa de mais conteúdo

## Objectivo

No preview gratuito, a imagem da publicação passa a ser o elemento visual dominante
e o cartão passa a sugerir, de forma honesta, que existe mais análise por trás do
gate "Grátis com email".

## O que muda

### 1. Thumbnail maior
- Passa de 80 px quadrado ao lado do texto para um bloco de media grande no topo
  de cada cartão: proporção 4:5, largura total do cartão em mobile e em desktop.
- A etiqueta Melhor/Pior passa a chip sobreposto no canto superior da imagem.
- Formato, data e legenda ficam por baixo da imagem, em bloco, com a legenda em
  duas linhas (line-clamp) em vez de uma linha truncada.
- Fallback mantém-se: ícone de formato centrado quando não há imagem ou falha o load.

### 2. Sinal de "há mais para ver"
- Faixa protegida cresce de 2 para 3 rótulos legíveis (Envolvimento · Interacções ·
  vs. média), mantendo valores como glifos "••••" desfocados — nenhum dado real
  entra no DOM.
- Debaixo dos dois cartões, uma tira de "mais publicações": miniaturas pequenas
  das restantes publicações da amostra, desfocadas e sem métricas, terminando num
  contador "+N publicações analisadas". Puramente visual, sem números sensíveis.
- Uma linha curta acima do gate: "Análise completa de N publicações, formatos e
  conversas." (cópia em pt-PT, sem promessas exageradas).

### 3. Espaçamentos
- Grelha de 2 colunas mantém-se em >= sm; em mobile empilha com gap consistente.
- Validação visual em 375, 390, 1280 e 1440 px.

## Fora de âmbito

`PostComparisonBlock` completo (Estados B/C), cópia do gate, regras de acesso,
eventos de analytics e qualquer lógica de dados.

## Detalhes técnicos

- Ficheiro único: `src/components/report-redesign/v2/report-post-comparison.tsx`
  (`PostComparisonPreview` + `PreviewThumb`).
- `PostComparisonPreview` passa a receber também a lista completa de posts já
  disponível no chamador para a tira de miniaturas; se não houver posts extra,
  a tira não é renderizada.
- Sem novos tokens: usa `surface-base`, `border-default`, `content-*` existentes.
- Testes existentes (`access-gating`, `report-shell-composition`) mantêm-se verdes.
