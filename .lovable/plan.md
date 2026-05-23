## Diagnóstico

Existem hoje DOIS pontos que parecem modais sobre o mesmo assunto:

1. **`ReportLockGate`** (`src/components/product/report-lock-gate.tsx`) — overlay inline sobre o relatório desfocado, com card "Desbloquear análise completa" + 3 benefit rows + botão.
2. **`UnlockModal.IntroCover`** (`src/components/product/unlock-modal.tsx`, linhas 753–836) — primeiro ecrã DENTRO do diálogo, com "+4 secções grátis", barra "2 das 6 secções", 3 highlights e badge BETA.

Resultado: o utilizador clica no card overlay e cai noutra capa quase igual antes do formulário. É a duplicação que o utilizador refere.

## Decisão

**Unificar num só gateway** que adopta o desenho do screenshot enviado:

- O card overlay (`ReportLockGate`) passa a ser o ÚNICO gateway visível e adopta o desenho minimal: badge BETA, título editorial "Continua a leitura do @handle", subtítulo cirúrgico, um CTA, 3 micro-tags no rodapé.
- O `UnlockModal` arranca directamente no formulário (step 1). A IntroCover desaparece.

Regra aplicada (do brief do utilizador): **não vender o que ainda não existe** — sem lista de blocos premium, sem indicador 2/6, sem barra de progresso 2:4, sem badge "+4 PARA DESBLOQUEAR", sem menção a Conteúdo · Procura · Comparação.

## Alterações

### 1. `src/components/product/report-lock-gate.tsx` (rewrite do overlay)

- Nova prop `handle: string` (Instagram username, sem @).
- Card overlay passa a ter:
  - **Badge** pill branca topo-esquerda: ponto verde (`bg-emerald-500`) com `animate-pulse` + texto "ACESSO GRATUITO · BETA" em eyebrow.
  - **Título** Fraunces ~28–32px, leading-tight: `Continua a leitura\ndo @{handle}` — handle em itálico cor `text-accent-primary`.
  - **Subtítulo** Inter 14–15px text-content-secondary: *"Indica o nome e email e responde a 3 perguntas rápidas para abrir o resto do relatório."*
  - **CTA** único largura total, gradient `from-accent-primary to-secondary` (azul→indigo já em tokens), label "Ver relatório gratuito →".
  - **Rodapé** 3 micro-tags em flex-wrap centrado, text-xs text-content-tertiary, com ícones lucide:
    - `Clock` + "~1 minuto"
    - `ShieldCheck` + "RGPD · sem spam"
    - `Heart` + "Construído em Leiria"
- **Remover**: eyebrow "Análise completa", título "Desbloquear análise completa", parágrafo antigo, lista `BenefitRow` (3 itens), parágrafo final "Acesso gratuito durante a beta · demora cerca de 1 minuto".
- Manter blur do conteúdo, fade superior, `DevResetButton` em dev.
- Mobile-first: padding `p-6`, badge e título empilham bem a 375px; CTA `w-full`.

### 2. `src/components/product/unlock-modal.tsx` (remover IntroCover)

- `useState<Step>("intro")` → `useState<Step>(1)`.
- Tipo `Step`: remover `"intro"` (passa a `1 | 2 | 3 | 4 | 5 | "welcome-back"`).
- Render: remover branch `step === "intro" ? <IntroCover ... /> : ...`.
- `goBack`: a partir de step 1 fecha o modal (`onOpenChange(false)`) em vez de voltar a intro; `welcome-back` volta a step 1.
- `stepNumForBar`: simplificar (remover ref a `"intro"`).
- Remover effect `unlock_modal_intro_viewed`.
- Remover/limpar: função `IntroCover`, constante `INTRO_HIGHLIGHTS`, imports que ficam órfãos (`Activity`, `BarChart3`, `Compass`, `Sparkles`, `Clock`, `ShieldCheck` se só usados aqui — verificar antes de remover).
- Tracking `unlock_modal_intro_cta_clicked` desaparece (deixa de existir o botão que o despoletava).

### 3. `src/components/report-redesign/v2/report-shell-v2.tsx` (passar handle)

- No JSX do `ReportLockGate` (linha 188), acrescentar `handle={result.data.profile.username}`.

## Não mexer

- Pipeline de unlock backend (`/api/public/report-unlock`, `/api/public/unlock-check`), schema Zod, snapshot, IA, restantes blocos do relatório.
- `ReportGateModal` (usado apenas em `public-analysis-dashboard.tsx` e `premium-locked-section.tsx`, NÃO na rota `/analyze/$username`) fica como está — fora do scope deste pedido.
- Tokens, fontes, copy dos outros blocos.

## Validação

- `bunx tsc --noEmit`
- `bunx vitest run`
- Manual em `/analyze/frederico.m.carvalho`:
  - Existe UM único bloco de unlock visível (o overlay).
  - Visual igual ao screenshot: badge verde pulsante, título com handle azul itálico, subtítulo, CTA gradient, 3 micro-tags rodapé.
  - Sem menções a "+4 secções", "6 secções", "Análise completa", lista de benefícios.
  - Clicar no CTA abre o diálogo directamente no formulário (Primeiro nome / Apelido / Email), sem capa intermédia.
  - Mobile 375px: card cabe, CTA tem largura total, micro-tags fazem wrap.

## Checkpoint

- ☐ Rewrite `report-lock-gate.tsx` com novo desenho + prop `handle`
- ☐ Remover `IntroCover` + estado `"intro"` em `unlock-modal.tsx`
- ☐ Passar `handle` em `report-shell-v2.tsx`
- ☐ `bunx tsc --noEmit` verde
- ☐ `bunx vitest run` verde
- ☐ Verificação visual em `/analyze/frederico.m.carvalho` (desktop + 375px)
