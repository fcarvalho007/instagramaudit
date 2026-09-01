# Card 1 (Índice do perfil / Veredicto) — texto mais curto e prova de leitura

## O que está a acontecer

O parágrafo do veredicto é hoje obrigado a ser longo: o prompt pede "90–140 palavras, máximo 4 frases" e o validador rejeita textos com menos de 90 palavras. Além disso, o fallback determinístico acrescenta ainda frases extra (cadência e hashtags) ao fim do parágrafo. Resultado: três blocos de texto corrido antes de o utilizador chegar à evidência.

Ao mesmo tempo, os dados concretos que provam que o perfil foi mesmo lido (nº de publicações analisadas, janela temporal, cadência real, formato dominante, hashtags recorrentes, médias de gostos e comentários) só aparecem diluídos na prosa ou em baixo, na faixa "Evidência".

## Alterações propostas

### 1. Veredicto mais curto e pragmático

- Prompt do veredicto: passa de "90–140 palavras, máx. 4 frases" para **35–65 palavras, máximo 3 frases**: uma frase de diagnóstico com o número que a sustenta, uma frase com a tensão observada, e nada mais. Sem repetições, sem hedging.
- Validador alinhado ao novo intervalo (mínimo e máximo de palavras, limite de frases), mantendo todas as outras regras já existentes: sem percentagens soltas, hashtags só com evidência, exigência de rótulos de cadência em `evidence_used`.
- Fallback determinístico: o parágrafo base fica só com o diagnóstico. As frases de cadência e hashtags deixam de ser coladas ao texto e passam a alimentar a linha de prova de leitura (ponto 2).
- Compatibilidade com relatórios já gerados: os veredictos longos em cache passam a ser apresentados apenas nas 3 primeiras frases, com o restante acessível num "Ver leitura completa" discreto. Nenhum dado é perdido nem reescrito.

### 2. Linha de prova de leitura ("o que foi lido")

Logo abaixo do veredicto, uma linha compacta de indicadores factuais, construída a partir dos dados que o cartão já recebe:

```text
12 publicações · janela 90 dias · ~1 post a cada 2–3 dias · 78% Reels · #ia, #inteligenciaartificial · 41 gostos / 2 comentários por post
```

Regras: só entram itens com dados reais; nada de placeholders; quando a amostra é insuficiente o item de cadência é omitido em vez de estimado. Esta linha substitui as frases de qualifier que hoje engordam o parágrafo e responde directamente ao "o cliente precisa de perceber que o perfil foi de facto lido".

### 3. Espaçamentos

- Zona macro: `gap-5` → `gap-4`; separador do veredicto `pt-5` → `pt-4`; ritmo interno `space-y-3` → escala única (eyebrow 8px, título 12px, parágrafo 12px, prova de leitura 16px).
- Faixa "Evidência": aproximar do bloco anterior (`pb-6` mantém-se, topo reduzido) e remover as linhas em branco duplicadas entre secções.
- Padding do cartão uniformizado em `px-6 py-6 / sm:px-7 sm:py-7` em todas as zonas, para que a régua do índice, o veredicto e as colunas de forças/limites arranquem na mesma vertical.
- Largura de leitura do parágrafo mantida em 62ch.

## Fora de âmbito

Fórmulas, pesos, score 36/100, bandas, classificação do veredicto, colunas de forças/limitações e a régua do índice não são alterados. Só muda a extensão do texto, a nova linha factual e o espaçamento.

## Ficheiros afectados

- `src/lib/insights/prompt-v2.ts` — regras de extensão do veredicto.
- `src/lib/insights/validate-v2.ts` — limites de palavras/frases.
- `src/lib/report/editorial-verdict-fallback.ts` — parágrafo sem qualifiers colados.
- `src/components/report-redesign/v2/overview/editorial-identity-card.tsx` — linha de prova de leitura, clamp de apresentação, espaçamentos.
- `src/i18n/locales/pt/report.json` e `en/report.json` — chaves da nova linha e do "Ver leitura completa".

## Validação

- Testes existentes do validador de insights e dos cartões, mais casos novos para o novo intervalo de palavras e para o clamp de veredictos longos.
- Verificação visual em 390, 1280 e 1440 px nos estados A, B e C, com um veredicto antigo (longo) e um novo (curto).
