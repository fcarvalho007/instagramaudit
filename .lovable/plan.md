Refinar o card de Metodologia ("Como este relatório foi feito") em `src/components/report-redesign/report-methodology.tsx`, conforme o mockup anexo.

## Alterações em `report-methodology.tsx`

### 1. Grelha das 4 fontes (topo)
- Substituir o label **"Sinais de pesquisa"** por **"Sinais de procura"** (pt-PT mais natural).
- Atualizar o corpo correspondente para "Indicadores públicos de procura associados aos temas do perfil."
- Refinar o ícone de cada card: caixa branca (8×8) com border subtil sobre o fundo cinza do card, em vez do ícone inline com o eyebrow azul. Eyebrow em uppercase fica isolado por baixo.
- Atualizar o subtítulo da secção para "Quatro fontes complementam a leitura — recolha pública, referência de mercado, leitura editorial e sinais de procura." (era "Três fontes…").

### 2. Lista "Fontes de referência" (rodapé)
- Manter grid `sm:grid-cols-2` com 4 cards (Socialinsider, Buffer, Hootsuite + Databox).
- Socialinsider / Buffer / Hootsuite continuam clicáveis (link externo, `ExternalLink`).
- **Databox passa a aparecer como 4º card bloqueado**: opacity reduzida, ícone de cadeado (Lock) em vez do livro, badge "em breve" inline (a substituir o ano), sem link clicável, sem chip de qualidade. Para isso, mudar `getActiveBenchmarkSources()` por uma chamada que inclua também a fonte `future` (Databox), e tratar o estado bloqueado dentro do `.map()` via flag derivada de `visibility === "future"`.
- **Remover** o parágrafo itálico final ("Databox fica reservado para futura ligação autenticada…"), já redundante com o card bloqueado.
- Data do dataset alinhada à direita, em estilo mono interno (`font-mono` é OK aqui por ser metadado de versionamento técnico — alternativa: manter `tabular-nums` se preferes ficar 100% Inter). **Decisão:** manter Inter `tabular-nums` para respeitar a regra "JetBrains Mono FORBIDDEN in public-facing UI" (este é UI público). Formato: `dataset 2026-05-08`.

## Notas de implementação
- Sem alteração ao módulo `benchmark-context.ts` — basta filtrar `active` + adicionar manualmente a entrada `Databox` (já existe via `INSTAGRAM_BENCHMARK_CONTEXT.referenceSources.find(s => s.name === "Databox")`), ou simplesmente listar todas e marcar visualmente as `future`.
- Tokens: cinza dos quadrados dos ícones = `bg-white border border-border-default`. Estado bloqueado: `opacity-60`, ícone `Lock` em `text-content-tertiary`, badge `bg-surface-muted text-content-tertiary`.
- Nenhuma mudança a outras secções do report.