# Refinamentos do top bar /analyze/$username

## Aviso de locked files

`src/components/layout/header.tsx` está **locked** em `LOCKED_FILES.md`. Para não tocar no header, este plano usa o padrão já existente: o atributo `data-report-view="true"` colocado no `<body>` por `analyze.$username.tsx`, e CSS scoped que oculta partes do header (a regra `[data-report-view] [data-header-cta]{display:none}` já vive em `src/styles.css`).

`src/styles.css` também está locked. **Solução:** criar `src/styles/analyze-header-collapse.css` (não locked) e importá-lo em `src/routes/analyze.$username.tsx`. Para a CSS apanhar o nav institucional sem alterar o header, vamos seletar pelo `aria-label` que o nav já tem (`aria-label={t("aria.primary_nav")}` → renderiza `aria-label="Navegação principal"`). Para evitar dependência da string traduzida, usamos um seletor estrutural estável: `header nav[aria-label]`. Isto não toca em ficheiros locked e é reversível.

## Mudanças

### 1. `report-hero-v2.tsx` — limpar linha de métricas e contextualizar tier

- `CompactMetricLine`: remover totalmente o ramo `postsAnalyzed` (deixa de mostrar "12 publicações analisadas"). A informação já existe no chip ativo do selector de período.
- Tier badge: passa a ler `t("hero.tier_label_prefix") + " · " + tierLabel` →
  - PT: `Escalão · Micro (10K–50K)`
  - EN: `Tier · Micro (10K–50K)`
  - Mantém versão compacta apenas em mobile muito pequeno (já é `hidden sm:inline-flex`, mantém).
- Action group: trocar `<ShareReportPopover variant="ghost" className=... />` por um wrapper próprio que usa o trigger custom do popover. Motivo: o botão "vazio" reportado é o trigger do `ShareReportPopover` — recebe `triggerLabel=""` e um `className` que entra em conflito com o `triggerClass` interno (que aplica `min-h-[44px]`, `rounded-full`, `px-5 py-3`, `gap-2` e `border-border-subtle/50`). O Tailwind merge resolve mal essa colisão e o resultado é um botão demasiado alto, com border quase invisível, parecendo "vazio". Solução: criar um trigger pequeno consistente com o botão PDF (`size-7 sm:size-9 rounded-lg border-border-default bg-white`) que reaproveite o popover via `asChild`. Mantém o `Share2` icon e o `aria-label`.

### 2. `share-popover.tsx` — suportar trigger custom

Adicionar uma prop `asChild?: boolean` (ou `renderTrigger?: ReactNode`) para permitir que `ReportHeroV2` forneça o seu próprio botão pequeno, mantendo o `Popover` + `PopoverContent` intactos. Esta mudança é aditiva e não quebra os usos existentes do `ShareReportPopover` (que continuam a obter o trigger default).

### 3. `analysis-period-selector.tsx` — sem alterações funcionais

Apenas pequenos ajustes de alinhamento vertical para casar com a altura do action group do hero (`py-1.5 sm:py-2` já é igual, ok).

### 4. Scroll behaviour — collapse do nav institucional + utility bar sticky

Tudo confinado ao perímetro do report; landing intacta.

a) **Sinalizar scroll no body** (em `report-shell-v2.tsx`):
   - `useEffect` regista listener de scroll com `requestAnimationFrame` throttling; quando `window.scrollY > 96`, faz `document.body.setAttribute("data-report-scrolled", "true")`; abaixo de 64 (hysteresis para evitar flicker), remove. Limpa no unmount.

b) **Novo ficheiro `src/styles/analyze-header-collapse.css`**:
   ```css
   /* Oculta o nav pill institucional do header global apenas em report views
      depois do utilizador scrollar. Não toca em landing. */
   body[data-report-view="true"][data-report-scrolled="true"] header nav[aria-label] {
     display: none;
   }
   /* O "+ Novo relatório" do header já está oculto por styles.css em report views. */
   ```
   Importado em `src/routes/analyze.$username.tsx` via `import "@/styles/analyze-header-collapse.css"`.

c) **Novo componente `report-utility-bar.tsx`** (em `src/components/report-redesign/v2/`):
   - Sticky, aparece apenas quando `data-report-scrolled="true"` (controlo via classe condicional, não via CSS global, para evitar `position: sticky` competir com o header sticky).
   - Posicionamento: `sticky top-16 md:top-20` (alinha com altura do header).
   - Estilo: barra fina, sem card pesado — `border-b border-border-default bg-surface-base/95 backdrop-blur-md`, altura ~44px.
   - Conteúdo (alinhado à direita):
     - Botão **PDF** (icon + label colapsável em mobile, reusa `actions.onExportPdf`).
     - Botão **Partilhar** (via `ShareReportPopover` com novo `asChild` ou trigger custom inline).
     - Botão **Adicionar concorrente** — link âncora que faz `scrollToBlock("benchmark")` (já exportado de `use-active-block`); abre a CTA `ReportEnrichedCompetitorsCta` que existe no bloco 06. Não cria fluxo novo, não toca em premium gating.
   - Mobile: labels colapsam para icons (`sm:inline` no texto), spacing reduzido, sem overflow horizontal.
   - Renderiza dentro do shell (após `</section>` do hero), antes das tabs mobile.

### 5. i18n

Adicionar em `src/i18n/locales/pt/report.json` e `en/report.json`:
- `hero.tier_label_prefix`: "Escalão" / "Tier"
- `hero.actions.add_competitor`: "Adicionar concorrente" / "Add competitor"

### 6. Polish

- Reduzir gap entre PDF e Share no hero: `gap-1 sm:gap-1.5` (já está).
- Garantir que altura do action group e do period selector batem certo: ambos usam `py-1.5 sm:py-2`.
- Utility bar usa as mesmas classes de botão pequeno do hero para consistência visual.

## Validação

- `bunx tsc --noEmit`
- Smoke visual: 1440×900, 1280×800, 390×844, 360×800.
- Verificar:
  - Linha esquerda mostra apenas `seguidores · publicações` (sem "analisadas").
  - Tier badge mostra "Escalão · Micro (10K–50K)".
  - Nenhum botão vazio junto a PDF/Share.
  - Scroll > 96px: nav institucional do header esconde; utility bar aparece com PDF / Partilhar / Adicionar concorrente.
  - Scroll < 64px: nav volta; utility bar desaparece.
  - PDF, Share e "Adicionar concorrente" (scroll para benchmark) funcionam.
  - Landing `/` mantém nav institucional sempre visível.
  - Selector de período continua a abrir popovers premium nos chips bloqueados.
  - Sem overflow horizontal em mobile.

## Fora de scope

Dados do relatório, scoring, geração de análises, lógica do period selector, premium gating, créditos, onboarding, Apify/OpenAI/DataForSEO, PDF, share, backend, pricing, admin, header.tsx, styles.css, tokens.

## Ficheiros tocados

- `src/components/report-redesign/v2/report-hero-v2.tsx` (edit)
- `src/components/report-redesign/v2/report-shell-v2.tsx` (edit — adiciona scroll listener + monta utility bar)
- `src/components/report-redesign/v2/report-utility-bar.tsx` (novo)
- `src/components/report-share/share-popover.tsx` (edit aditivo — prop `asChild`)
- `src/styles/analyze-header-collapse.css` (novo)
- `src/routes/analyze.$username.tsx` (edit — `import` do novo CSS)
- `src/i18n/locales/pt/report.json` (2 chaves)
- `src/i18n/locales/en/report.json` (2 chaves)
