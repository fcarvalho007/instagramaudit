# Hierarquia de conversão — separar "grátis com email" de "Pro 9€"

## O que encontrei (verificado no código)

Existem hoje quatro superfícies de conversão e elas partilham vocabulário e promessa:

| Superfície | Estado | Copy actual |
|---|---|---|
| Gate no preview de publicações (`FreeDeepenTeaser`) | A | "Já sabes o que está a acontecer. Falta perceber porquê." · CTA "Aprofundar gratuitamente" |
| Barra sticky gratuita (`StickyFreeCtaBar`) | A | "Guarda o relatório e desbloqueia gratuitamente a análise das conversas." · CTA "Desbloquear a análise das conversas" |
| Bloco final Pro (`ReportEndOfFreeBlock`) | B | "Agora descobre porquê — e o que deves fazer a seguir." · CTA "Desbloquear Análise Pro" · 9€ |
| Barra sticky Pro (`StickyUnlockBar`) | B | "Agora falta perceber porquê." · CTA "Desbloquear Pro · 9€" |

Três problemas concretos:

1. **A mesma promessa vendida duas vezes.** O passo gratuito promete "perceber porquê"
   e o passo pago promete exactamente o mesmo ("Agora falta perceber porquê"). Quem dá
   o email espera o diagnóstico — e recebe publicações, formatos e conversas. É este o
   risco de defraudar quando depois paga.
2. **O verbo "desbloquear" serve os dois níveis.** É usado no grátis ("Desbloquear
   gratuitamente", "Desbloquear a análise das conversas") e no pago ("Desbloquear Pro ·
   9€"). O leitor não distingue o degrau pelo botão.
3. **Duas mensagens diferentes para o mesmo passo em A.** O gate promete publicações +
   formatos + conversas; a sticky promete apenas conversas. O ponto de entrada de
   analytics é `comment_intelligence` em ambos, mesmo quando a promessa é mais ampla.

Adicionalmente, em B o `DeepenAnalysisCta` (bloco de estado do desbloqueio) mantém o
título "Aprofundar a análise" enquanto processa, a competir com o bloco Pro logo abaixo.

## Hierarquia proposta (três degraus, três vocabulários)

```text
Nível 1 · Auditoria instantânea   grátis, sem email   → "o que está a acontecer"
Nível 2 · Auditoria completa      grátis com email    → "o que publicaste e o que gerou"
Nível 3 · Análise Pro (9€)        pagamento único     → "porquê e o que fazer a seguir"
```

Regras de linguagem, aplicadas em todas as superfícies:

- Nível 2 usa o verbo **"Ver"/"Continuar"** e a palavra **grátis**: CTA
  "Ver a auditoria completa · grátis". Nunca "desbloquear", nunca "porquê".
- Nível 3 é o único que usa **"Desbloquear"** e o único que mostra **preço**.
- "Porquê" e "o que fazer a seguir" passam a ser exclusivos do Pro.

## Alterações

### 1. Copy do nível 2 (`src/i18n/locales/pt/conversion.json` e en)
- `gate.title`: "Já viste os sinais. Falta ver o conteúdo por trás deles."
- `gate.body`: "Com o teu email vês as publicações completas, o mix de formatos e a
  análise das conversas. Grátis, sem pagamento."
- `gate.cta`: "Ver a auditoria completa · grátis"
- `cta.comment_intelligence` → passa a "Ver a auditoria completa · grátis" (o botão
  deixa de prometer só conversas)
- `subcopy`: alinhada com o gate (publicações, formatos e conversas)
- `deepen.title` (bloco de estado): "A preparar a auditoria completa" em vez de
  "Aprofundar a análise", para não colidir com o Pro.

### 2. Uma só mensagem em A
`StickyFreeCtaBar` passa a mostrar a mesma frase-resumo e o mesmo rótulo de botão do
gate. Sem mudar quando aparece nem o comportamento de dismiss.

### 3. Nível 3 mais distinto
- `StickyUnlockBar`: headline passa a "Diagnóstico e plano de acção" (deixa de repetir
  "porquê" do gate gratuito); mantém preço e o CTA "Desbloquear Pro · 9€".
- `ReportEndOfFreeBlock`: mantém-se como está — é a peça canónica do nível 3.

### 4. Sidebar coerente com os três degraus
Badges: "GRÁTIS" (nível 1), "GRÁTIS COM EMAIL" (nível 2), "PRO · 9€" (nível 3), com o
ponto do nível 2 a usar o mesmo verde do nível 1 mas contorno em vez de sólido, para
serem distinguíveis; o nível 3 usa o azul de acento. Sem mudar as regras de acesso.

## Fora de âmbito

`access-gating.ts` e as regras A/B/C, preços, checkout, eventos de analytics
(`deepen_cta_viewed/clicked`, `premium_cta_clicked`) e o conteúdo dos cards.

## Detalhes técnicos

- Ficheiros: `src/i18n/locales/pt/conversion.json`, `src/i18n/locales/en/conversion.json`,
  `src/components/product/sticky-free-cta-bar.tsx`,
  `src/components/product/deepen-analysis-cta.tsx`,
  `src/components/report-redesign/v2/sticky-unlock-bar.tsx`,
  `src/components/report-redesign/v2/report-block-nav.tsx`.
- Novo teste `conversion-hierarchy.test.ts`: garante que nenhuma cópia de nível 2 contém
  "desbloquear"/preço e que "porquê"/"o que fazer" só aparecem em cópia de nível 3.
- Suites existentes (`access-gating`, `report-shell-composition`, `premium-cta-unification`)
  mantêm-se verdes.
