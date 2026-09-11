# Rever o relatório face ao modelo HTML: tipografia e hierarquia

## O que a revisão encontrou

Comparei o HTML de referência com o relatório actual (Editorial V2, já por omissão). A estrutura está completa: abertura com perfil, veredicto, sinal principal, sinais secundários, índice, 01 Engagement, 02 Frequência, 03 Formatos, 04 Publicações-chave, 05 Conversas, gate Pro, 06 Diagnóstico, 07 Prioridades, metodologia, fontes e rodapé. Não falta nenhuma secção.

O problema real é outro, e é o mais visível de todos:

**As duas tipografias do projecto nunca são carregadas.** O sistema declara Fraunces para títulos e Inter para texto, mas não existe nenhuma ligação a essas fontes em lado nenhum do site. Na prática, os títulos aparecem em Georgia e o texto em fonte de sistema. É por isso que a hierarquia parece mais pesada e menos editorial do que o modelo.

Três diferenças menores de hierarquia, todas de apresentação:

1. No modelo, os grandes números e o veredicto usam Fraunces em peso leve (300); o relatório usa sempre peso normal, o que os torna mais densos.
2. A abertura do modelo tem um fundo suave com três halos de cor muito difusos; a abertura actual é lisa.
3. O índice do perfil no modelo é um bloco aberto sobre a página, com número enorme; o actual está dentro de um cartão com caixa, o que reduz o impacto.

## O que proponho aplicar

1. **Carregar Fraunces e Inter** através de ligação no cabeçalho do site (`src/routes/__root.tsx`), com pré-ligação e `display=swap`. Pesos: Fraunces 300/400/500, Inter 400/450/500/600. Isto beneficia todo o site, não só o relatório.
2. **Afinar os pesos de exibição** no relatório: veredicto, número do índice, valor do sinal principal e números grandes passam a peso leve, com o espaçamento entre letras do modelo. Só CSS com escopo `.editorial-v2`.
3. **Acrescentar o fundo suave da abertura** (três halos desfocados, decorativos, sem interacção), respeitando `prefers-reduced-motion`.
4. **Abrir o bloco do índice do perfil**: sem caixa, número maior, barra fina e legendas por baixo, como no modelo. O texto explicativo e o cálculo mantêm-se exactamente iguais.

## O que não muda

Nenhum número, cálculo, referência de mercado, acesso gratuito/pago, créditos, pagamentos, PDF, Admin ou Report Lab. Nenhuma alteração de dados ou de texto de conteúdo. A comparação nova continua desligada.

## Detalhe técnico

- `src/routes/__root.tsx`: acrescentar entradas em `links` (preconnect Google Fonts + folha de estilos Fraunces/Inter). Sem `@import` remoto em `styles.css`, por causa do Tailwind v4.
- `src/styles/editorial-v2.css`: novos pesos/tracking para títulos e números, classe do fundo da abertura.
- `src/components/report-editorial-v2/overview/editorial-verdict.tsx`, `profile-index.tsx`, `editorial-overview.tsx`: ajustes de classes apenas.

## Verificação

Typecheck, testes do Editorial V2 e QA visual em 1440px e 375px, confirmando ausência de transbordo e de erros de consola, e que as fontes carregam efectivamente.
