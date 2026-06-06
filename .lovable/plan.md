## Avaliação do bloco "Transforma sinais em decisões"

Ficheiro: `src/components/report-redesign/v2/end-of-free-block.tsx`

### Diagnóstico

1. **Tipo demasiado contida** — `text-3xl sm:text-4xl md:text-[2.5rem]` é igual à escala dos cartões interiores; sendo o último bloco do relatório (momento de decisão) devia ter peso editorial superior.
2. **Card de benefícios compete com o headline** — borda + fundo muted + ícones a cor accent criam um "mini-card dentro de card" que rouba protagonismo ao título e ao CTA.
3. **`9€` em Fraunces** infringe a regra core do projecto: números públicos devem ser Inter SemiBold/Bold tabular-nums, nunca font-display.
4. **CTA modesto** — `text-sm` num momento de conversão; merece +1 nível.
5. **Hierarquia plana** — eyebrow → título → desc → card → preço → CTA → reassurance é uma sequência longa de igual peso. Falta um pico claro.
6. **Fundo branco isolado sobre canvas** é correcto, mas sem qualquer assinatura visual: o bloco lê-se como mais um card e não como um fecho.

### Mudanças propostas (visuais, sem alterar i18n nem lógica)

**Tipografia (mais impacto):**
- Título → `text-[2.25rem] sm:text-[3rem] md:text-[3.5rem]` em Fraunces SemiBold (peso `font-semibold` em vez de `font-normal`), leading `1.05`.
- Descrição → escala para `text-[17px] sm:text-[18px]`, largura max-w-2xl para respirar.
- Preço `9€` → Inter SemiBold tabular-nums `text-[4rem] sm:text-[4.5rem]` (corrige violação de tokens). Cor `--accent-primary` para criar segundo pico visual depois do título.
- Caption de preço → `text-[13px] uppercase tracking-[0.14em] text-content-tertiary` (eyebrow style) — mais elegante, menos repetitivo.
- CTA → `px-7 py-3.5 text-[15px]` + sombra ligeiramente mais presente.

**Reduzir / simplificar:**
- Lista de benefícios **sai do mini-card interior**: passa a lista hairline-divider (sem fundo, sem borda), centrada com max-w-md, ícones menos saturados (`text-content-tertiary` em vez de `accent-primary/80`). Mantém-se os 5 itens (são prova de valor concreta — não vale a pena cortar).
- Eyebrow do bloco de benefícios passa de uppercase pequena para uma linha de transição mais leve, ou remove-se (o título "vais conseguir" deixa de competir com o título principal). Avaliação: remover, deixa o título principal sozinho como ancora.
- Reassurance final → encolhe para `text-[12.5px]` mas centra-se acima do CTA OU mantém-se abaixo, mas sem max-w para terminar limpo.

**Fundo / card:**
- Card mantém-se branco, mas com:
  - Padding mais generoso: `px-6 py-12 sm:px-12 sm:py-16` (mais ar vertical, foco no título).
  - `max-w-2xl` → `max-w-xl` para o card ficar mais coeso e cinematográfico (o relatório todo respira no canvas em volta).
  - Sombra ligeiramente mais densa: `shadow-[0_8px_40px_-12px_rgba(15,23,42,0.10),0_2px_8px_rgba(15,23,42,0.04)]` — comunica "card final, distinto".
  - Gradiente vertical muito subtil interior: `bg-[linear-gradient(180deg,#FFFFFF_0%,#F8FAFE_100%)]` em vez de branco chapado — assina o fim do relatório sem ser ruidoso.
  - Border passa a `border-border-subtle/70` para acentuar a sombra.

**Hierarquia nova (mais clara):**
1. Eyebrow (kicker discreto)
2. **Título grande** (pico 1)
3. Descrição lead
4. Lista de benefícios borderless (suporte)
5. **`9€` grande em accent** (pico 2)
6. Caption uppercase pequena
7. **CTA proeminente** (pico 3)
8. Reassurance hairline

### Garantias

- Zero alterações em `i18n` keys, `PUBLIC_PRODUCTS`, `usePremiumCta`, handler `openInterest`, posicionamento no shell, ou acessibilidade (`aria-label`, `aria-hidden` mantêm-se).
- Apenas markup + classes Tailwind + um inline-style para o gradiente do card.
- Mobile validado: títulos crescem suavemente; padding adapta-se via breakpoints `sm:`.

### Resultado esperado

Bloco lê-se como o **fecho** do relatório (não como mais um cartão): título com peso editorial real, preço em destaque coerente com a paleta accent, lista de benefícios mais leve, CTA com gravidade adequada ao momento de decisão.
