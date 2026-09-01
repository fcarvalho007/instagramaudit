# Card Review 01 — PostComparisonPreview + gate "Grátis com email"

## Estado actual (verificado no código)

- `PostComparisonPreview` (`report-post-comparison.tsx`, linhas 1069-1176) já mostra
  título, eyebrow de metodologia, thumbnail 80 px, etiqueta Melhor/Pior, formato e data,
  legenda truncada e uma faixa protegida com três barras `blur-[2px]`.
- O gate `FreeDeepenTeaser` (`report-overview-block.tsx`, linha 686) é uma caixa
  separada, renderizada bem depois no fluxo (linha 512), com copy mais longa do que a
  aprovada e sem ligação visual ao preview.
- O `PostComparisonBlock` completo entra em B/C no mesmo `div#publicacoes-chave`
  (linhas 353-375) — a troca é condicional, sem flash.

## Problemas a corrigir

1. Preview e gate estão fisicamente separados por vários blocos: não lêem como uma só
   narrativa.
2. A zona protegida parece placeholder de loading (barras cinzentas), não análise real
   escondida.
3. Falta o eyebrow/badge "Grátis com email" no preview.
4. A copy do gate é mais longa do que a aprovada.

## O que vai ser feito

### 1. Zona protegida com aparência de análise real
Substituir as barras cinzentas por uma mini-grelha com rótulos nítidos
(Envolvimento · Interacções · vs. média) e valores por cima veiculados:
texto real ilegível não é usado — os valores são glifos neutros ("••••") com
`blur-[2.5px]` e um véu translúcido da superfície por cima. Estrutura perceptível,
valor não legível. Nenhum dado sanitizado entra no DOM.

### 2. Badge no preview
Acrescentar chip "Grátis com email" no cabeçalho do preview, em azul de acento
(secundário face ao título). Sem dourado, sem PRO, sem preço, sem ícone de pagamento.

### 3. Preview + gate como bloco único
Mover o gate para dentro do mesmo contentor visual do preview, no Estado A: separador
horizontal subtil em vez de uma segunda caixa. O gate deixa de ser renderizado no fim
do overview quando o preview está presente.
Copy passa a ser exactamente a aprovada:

- Eyebrow: Grátis com email
- Headline: Queres ver o que encontrámos nestas publicações?
- Body: Guarda esta auditoria e desbloqueia a análise completa das publicações, dos
  formatos e das conversas.
- CTA: Aprofundar gratuitamente (full-width em mobile)

### 4. Altura e responsividade
Zona protegida limitada a uma faixa por publicação — nenhuma superfície desfocada
grande. Thumbnails empilham em 375/390 px mantendo Melhor/Pior visíveis; gate imediato
a seguir. Validação em 1280, 1440, 390 e 375.

## Fora de âmbito (não tocar)

`PostComparisonBlock` completo, FrequencyCard, FormatCard, Comment Intelligence, hero,
sidebar, diagnóstico, CTA Pro, métricas, dados, regras A/B/C e eventos de analytics
(`post_comparison_preview_viewed`, `deepen_cta_viewed`, `deepen_cta_clicked` mantêm-se
inalterados).

## Detalhes técnicos

- Ficheiros: `src/components/report-redesign/v2/report-post-comparison.tsx` (preview) e
  `src/components/report-redesign/v2/report-overview-block.tsx` (posicionamento do gate).
- O gate passa a ser um subcomponente renderizado dentro do preview via prop
  `renderGate`, para o `report-overview-block.tsx` continuar a decidir o comportamento
  de scroll para `#deepen-analysis`.
- Testes: manter verdes `access-gating` e `report-shell-composition`; acrescentar teste
  de que em `access !== "anon"` o preview e o gate não são compostos.

## Entrega

Screenshots antes/depois em desktop e mobile (Playwright headless contra
`/admin/report-lab` nos estados A, B e C), descrição das alterações visuais, confirmação
de que o card completo não foi modificado, lista CARD REVIEW LATER se surgirem
observações, e testes a passar.
