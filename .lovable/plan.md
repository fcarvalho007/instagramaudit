## Objetivo

Redesenhar a experiência de pricing para 3 cards claros — **Grátis**, **1 relatório (7€)**, **Pack 5 relatórios (28€)** — em `/precos` e no `PremiumInterestDialog`, com um motivo visual premium (`cleanPrism` + glass + prismas 3D subtis) que respeite o sistema light-first existente.

## Leitura do estado atual

- `src/components/pricing/pricing-page.tsx`: hoje mostra 2 cards (single + pack) + secção "como funciona o acesso" em lista numerada. Falta o card Grátis e o motivo visual.
- `src/components/report-redesign/v2/premium-interest-dialog.tsx`: hoje mostra 2 cards (single + pack). Falta o card Grátis "Incluído".
- i18n `pricing.json` e `report.json` já têm a base de 7€/28€ — vão ser estendidos, nunca reduzidos.
- Tokens existem em `src/styles/tokens-light.css`; primary `#3772E5`, secondary `#7664E4`, surfaces brancas. Memory regra: **sem dark navy, sem cyan neon, sem glow**. JetBrains Mono proibido em UI pública.

## Interpretação visual (cleanPrism / Glass / 3D Multiscreen)

Reler como **decoração contida**, não como tema:

- **Glass cards**: `bg-white/80` com `backdrop-blur-sm`, `border` em navy a baixa opacidade, sombra leve `shadow-[0_24px_60px_-32px_rgba(15,23,42,0.18)]`.
- **Prismas 3D**: 2–3 formas `div`/`svg` absolutas no fundo da secção dos cards (não nos cards) — gradient suave indigo→blue, `blur-3xl`, `opacity-30`, sem animação contínua. Servem de "profundidade", não de espetáculo.
- **3D multiscreen**: aplicado apenas no card Pack (recomendado) via um leve `translate-y-[-4px]` em desktop e uma "moldura fantasma" atrás (segundo card desfocado a 8% de opacidade) que sugere "vários relatórios empilhados".
- **Tipografia**: Fraunces para H1/H2; Inter SemiBold para preços (tabular-nums); nada de mono.
- **Reflexo prism**: linha gradient horizontal de 1px no topo de cada card (`from-transparent via-accent-primary/30 to-transparent`).
- **Mobile**: prismas 3D escondidos (`hidden md:block`); cards empilham; sem moldura fantasma.

## Alterações

### 1. i18n — `src/i18n/locales/pt/pricing.json` + `en/pricing.json`

Reestruturar com 3 cards e copy exato do brief:

```
hero.title:    "Preços simples, com acesso progressivo"  /  "Simple pricing with progressive access"
hero.subtitle: <texto do brief>
free.label:    "Grátis" / "Free"
free.title:    "Visão inicial do perfil" / "Initial profile overview"
free.bullets:  ["Bloco 1 incluído", "Diagnóstico editorial disponível como oferta de lançamento", "Ideal para conhecer o perfil antes de aprofundar"]
free.cta:      "Começar grátis" / "Start free"
single.label:  "Premium"
single.price:  "7€" / "€7"
single.bullets:["1 perfil", "1 desbloqueio premium", "Ideal para uma análise pontual"]
single.cta:    "Escolher 1 relatório" / "Choose 1 report"
pack.label:    "Melhor valor" / "Best value"
pack.unit:     "5,60€/relatório" / "€5.60/report"
pack.savings_badge: "Poupa 20%" / "Save 20%"
pack.bullets:  ["5 relatórios", "Melhor para comparar vários perfis", "Mais flexibilidade por menos custo"]
pack.cta:      "Escolher pack de 5" / "Choose pack of 5"
access.title:  "Como funciona o acesso"
access.steps:  [
  { title: "Explora gratuitamente", body: "Vê a primeira leitura do perfil sem compromisso." },
  { title: "Recebe o extra de lançamento", body: "O Diagnóstico editorial está atualmente aberto para mostrar melhor o valor do produto." },
  { title: "Desbloqueia o premium", body: "As secções de Desempenho, Conteúdo, Procura e Comparação ficam disponíveis com compra." }
]
trust_note + pending_note: manter
```

`access.items` (lista plana) é substituído por `access.steps` (array de objetos). Atualizar consumidor.

### 2. i18n — `src/i18n/locales/{pt,en}/report.json`

Em `premium.dialog`, adicionar bloco `free`:
- `dialog.title`: "Desbloquear acesso premium" / "Unlock premium access"
- `dialog.subtitle`: copy do brief (primeiro bloco grátis, diagnóstico aberto, etc.)
- `dialog.free`: `{ label: "Incluído"/"Included", title, bullets, currentBadge }`
- Mantém `single` e `pack`. CTAs atualizados para "Escolher …".

### 3. `src/components/pricing/pricing-page.tsx`

- Adicionar `PricingOption = "free" | "single_report" | "pack_5_reports"`.
- Grelha `grid-cols-1 md:grid-cols-3 gap-4 md:gap-5`.
- Container relativo com 2 `<div aria-hidden>` posicionados absolutamente para os prismas (gradient blur).
- `PricingCard` aceita `tone: "free" | "premium" | "best-value"`:
  - **free**: surface `bg-surface-muted/70`, label badge cinza, CTA `variant="outline"`.
  - **premium**: surface branca, label badge `accent-primary/10`.
  - **best-value**: surface branca + reflexo prism + moldura fantasma (`::before` ou div decorativa em desktop), label `accent-secondary/10`, badge "Poupa 20%" canto superior direito, CTA `variant="primary"`.
- Linha unit price (`5,60€/relatório`) por baixo do preço no card pack.
- Microcopy `pending_note` mantida abaixo dos cards.
- Secção "Como funciona o acesso" passa a renderizar 3 *step cards* (não lista numerada): grelha 3 colunas em desktop, stack mobile; cada card com número grande em Fraunces (`text-3xl font-fraunces`), título Inter SemiBold, body Inter.

### 4. `src/components/report-redesign/v2/premium-interest-dialog.tsx`

- `DialogContent` aumenta para `sm:max-w-[720px]`.
- `PricingOption` estende para incluir `"free"` (não emite tracking; só fecha o modal).
- Grelha `grid-cols-1 sm:grid-cols-3 gap-3`.
- Card Free com badge "Incluído", tone neutro, CTA `variant="ghost"` que fecha o modal e mantém o utilizador na secção atual.
- Pack card emfatizado igual à página.
- `pending_note` por baixo dos cards.

### 5. Tokens

Sem novos tokens globais; usar utilitários Tailwind compostos com tokens existentes (`bg-surface-base`, `border-border-default`, `text-content-*`, `accent-primary`, `accent-secondary`). Reflexo prism e prismas decorativos via classes inline locais (sem hardcode de cores fora de tokens — tudo via `accent-primary/30` etc.).

### 6. Tracking

- `pricing_option_clicked` mantém-se para `single_report` e `pack_5_reports`.
- Click no card Free emite `pricing_option_clicked` com `pricing_option: "free"` (extensão back-compat — só adiciona um valor possível em metadata, não quebra schema do evento).

## Fora de âmbito

- Sem novos endpoints de checkout.
- Não tocar em geração de report, Apify, OpenAI, DataForSEO, cache, snapshots, unlock logic.
- Sem novas dependências (sem libs 3D — tudo CSS/SVG inline).
- `app.plan.tsx` continua redirect para `/precos`.

## Validação

- `bunx tsc --noEmit`
- `bunx vitest run`
- Visual: `/precos` e `PremiumInterestDialog` mostram 3 cards na ordem Free → 7€ → 28€; pack destacado; sem €3, €13, Pro, Agency, "plano mensal", "monthly plan".
- Mobile 375px: cards empilham, CTAs visíveis, badge "Poupa 20%" não sobrepõe título, prismas decorativos escondidos.
- PT/EN paridade nas chaves novas.

## Checkpoint

- ☐ i18n PT/EN atualizado com Free + access.steps
- ☐ `pricing-page.tsx` reescrito para 3 cards + prismas + step cards
- ☐ `premium-interest-dialog.tsx` reescrito para 3 cards
- ☐ Consumidor de `access.items` migrado para `access.steps`
- ☐ Tracking estendido (`free` adicionado, sem regressão)
- ☐ `tsc --noEmit` e `vitest run` verdes
- ☐ Smoke visual mobile + desktop
