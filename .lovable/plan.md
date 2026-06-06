# Plano — Teaser premium em 5 cards bloqueados (03–07)

## Estado atual

No modo `free_with_engagement` (lead capturado, sem PRO) o `ReportOverviewBlock` renderiza:
- 01 Identity Card
- Methodology line
- 02 Engagement (id `engagement`)
- **1 único `OverviewProTeaser`** que agrupa Frequência + Formatos + Publicações-chave (e nada para 06/07)

Já existe estrutura para o resto:
- `COMMERCIAL_SECTIONS` em `block-config.ts` define 7 secções (free + pro) com `id`, `number`, `shortLabel`, `tier`, `icon`.
- Preço dinâmico: `PUBLIC_PRODUCTS.report_full_9.priceLabel` (usado em `end-of-free-block.tsx`).
- CTA premium centralizado: `usePremiumCta().handlePremiumAccessClick("overview_pro_teaser")` — já registado no `premium-cta-context`.
- Sidebar comercial (`report-block-nav.tsx`) já consome `COMMERCIAL_SECTIONS` com tier free/pro — está OK.

## Mudanças propostas

### 1. Novo componente `PremiumTeaserCard`
Ficheiro: `src/components/report-redesign/v2/premium-teaser-card.tsx`

Props: `{ number, eyebrow, title, description, source }` (source para tracking via `handlePremiumAccessClick`).

Layout (espelha o screenshot anexado, alinhado ao design tokens Ocean Breeze já em uso):
- Container: `rounded-2xl border border-border-default bg-surface-base shadow-card p-6 md:p-8`.
- Linha topo: número grande em chip suave à esquerda (`bg-surface-muted`, número em Inter SemiBold), eyebrow + título centro, badge `Premium` (ícone Lock + label) à direita.
- Eyebrow: `.text-eyebrow-sm text-accent-primary` (e.g. "FREQUÊNCIA EDITORIAL").
- Título: `font-display text-xl md:text-2xl text-content-primary`.
- Descrição: `text-sm md:text-[15px] text-content-secondary`.
- Área blur preview: bloco decorativo com 3–4 barras `bg-accent-primary/15` + `bg-surface-muted` com `filter: blur(6px)` e `aria-hidden`. Altura ~120px md / ~80px sm. Gradient overlay branco em baixo para fade.
- CTA centrado sobre o blur: pill `bg-white border border-border-default shadow-sm` com ícone Lock + texto `Desbloquear por {priceLabel}` (preço lido de `PUBLIC_PRODUCTS.report_full_9.priceLabel` — nunca hardcoded).
- onClick → `handlePremiumAccessClick(source)`. Sem mudar lógica de checkout.

Mobile: padding `p-5`, número/badge em linha compacta, blur preview mais curto.

### 2. Substituir `OverviewProTeaser` por lista de 5 cards
Ficheiro: `src/components/report-redesign/v2/report-overview-block.tsx`

No bloco `mode === "free_with_engagement"`:
- Manter Methodology + Engagement.
- Substituir o `<OverviewProTeaser />` por uma secção com:
  - Eyebrow discreto: `RELATÓRIO COMPLETO · 5 secções premium` (opcional, alinhado à esquerda).
  - Stack vertical (`space-y-5 md:space-y-6`) de 5 `<PremiumTeaserCard>` com âncoras `id="frequencia"`, `id="formatos"`, `id="publicacoes-chave"`, `id="contexto-estrategico"`, `id="prioridades"` e `scroll-mt-24` para a sidebar continuar a funcionar.
- Remover (ou manter como deprecated não usado) a função `OverviewProTeaser` antiga.

Copy dos 5 cards (i18n via report namespace, fallback inline):

| # | Eyebrow | Title | Description |
|---|---|---|---|
| 03 | FREQUÊNCIA EDITORIAL | Com que ritmo publica este perfil? | Percebe se o perfil publica com consistência suficiente e onde existem quebras de ritmo. |
| 04 | MIX DE FORMATOS | Que formatos dominam a estratégia? | Vê se o perfil depende demasiado de um formato ou se há espaço para variar. |
| 05 | PUBLICAÇÕES-CHAVE | Que posts puxam o perfil para cima? | Identifica os melhores e piores conteúdos e percebe onde estão os padrões. |
| 06 | CONTEXTO ESTRATÉGICO | O que estes sinais dizem sobre o perfil? | Recebe uma leitura editorial sobre posicionamento, conteúdo e oportunidades. |
| 07 | PRIORIDADES DE ACÇÃO | O que testar, corrigir ou repetir? | Fica com recomendações práticas para transformar dados em decisões. |

### 3. Tracking source
Reutilizar `"overview_pro_teaser"` (já no union type de `premium-cta-context.tsx`) para todos os 5 cards — sem novo evento, evita mexer em analytics. (Alternativa, se desejado mais tarde: adicionar `"premium_teaser_card"` ao union; **fora deste plano** para respeitar a constraint de não tocar tracking.)

### 4. Sidebar
**Sem mudanças.** `report-block-nav.tsx` já lista as 7 `COMMERCIAL_SECTIONS` com badges free/premium para variantes comerciais e omite os blocos lab. Já satisfaz o requisito.

### 5. ReportEndOfFreeBlock
Permanece como está — continua a aparecer no fim, agora abaixo dos 5 teasers, reforçando o CTA único do preço.

## Ficheiros a editar

- `src/components/report-redesign/v2/premium-teaser-card.tsx` (novo)
- `src/components/report-redesign/v2/report-overview-block.tsx` (substituir `<OverviewProTeaser />` por 5 cards; pode remover a função)
- `public/locales/pt/report.json` (adicionar strings `premium_teasers.*` — opcional, com fallbacks inline para não bloquear)

## Fora do âmbito (não tocar)

- `report-variant.ts`, gating logic, `premiumUnlocked`
- `PUBLIC_PRODUCTS`, products.server.ts, EuPago, checkout, entitlements, créditos
- Cálculos, scraping, geração de relatório
- Sidebar (já correcta)
- Lab-only blocks (continuam invisíveis no fluxo comercial)
- Eventos de analytics existentes

## Riscos e salvaguardas

- **Risco:** blur excessivo prejudica leitura → mitigar com `blur(6px)` + opacidade 60% + gradient fade.
- **Risco:** preço hardcoded → garantir leitura via `PUBLIC_PRODUCTS.report_full_9.priceLabel`.
- **Risco:** quebra de âncoras da sidebar (`frequencia`, `formatos`, etc.) → aplicar os mesmos `id` nos teaser cards.
- **Risco:** mobile overflow → testar com `max-w-full`, `min-w-0`, `overflow-hidden` no container do blur.

## Checklist de validação manual

Desktop e mobile, em `/analyze/$username` no estado free com lead capturado (sem PRO):
1. Aparecem 01 Visão geral + 02 Engagement totalmente.
2. Aparecem 5 cards premium bloqueados na ordem 03→07 com títulos visíveis.
3. Cada card mostra: número, eyebrow, título, descrição, badge Premium, área blur, CTA "Desbloquear por 9€" (preço vindo de `PUBLIC_PRODUCTS`).
4. CTA abre o mesmo fluxo de unlock existente (PremiumCtaProvider).
5. Sidebar continua a mostrar 2/7 livres + 5 premium, sem blocos lab.
6. Clicar em itens da sidebar 03–07 faz scroll até cada teaser card correspondente.
7. Mobile: sem overflow horizontal, blur preview proporcional, CTA legível.
8. `ReportEndOfFreeBlock` continua a aparecer no fim.
9. Variantes `pro_preview` e `internal_lab` não são afectadas (cards reais continuam a render).

## Aprovação

Posso avançar com a implementação?
