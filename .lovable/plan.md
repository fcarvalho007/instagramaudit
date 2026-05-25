## Objetivo

Simplificar o modal premium para mostrar apenas as 2 opções comerciais finais (1 relatório 7€ / pack 5 × 28€), removendo planos exploratórios (mensal, agência, "em estudo", "em breve", "sob proposta", "sem pagamento agora").

## Estado de checkout

**Não existe endpoint de checkout real** (sem Stripe, sem EuPago, sem rota `/api/public/checkout`). Conforme as instruções, não vou criar checkout falso nem links partidos. Já existe o evento de tracking `pricing_option_clicked` (em `src/lib/tracking.functions.ts`, usado em `premium-interest-dialog.tsx`). Os 2 CTAs vão continuar a emitir esse evento, agora com os identificadores tipados `single_report` e `pack_5_reports`, e o modal sinaliza visualmente o estado (cartão "selecionado" após clique). **Wiring real de pagamento fica pendente** — reportado no output final.

## Ficheiros alterados

1. **`src/components/report-redesign/v2/premium-interest-dialog.tsx`** — reescrita do conteúdo:
   - `PricingOption` passa a `"single_report" | "pack_5_reports"`.
   - Remove `monthly`, `agency` e respetivos badges.
   - Layout: 2 cartões, `grid-cols-1 sm:grid-cols-2`, dialog `sm:max-w-[560px]`.
   - Cada cartão: título (Inter SemiBold), preço grande (Inter Bold, `tabular-nums`), 2 bullets com ícone `Check`, descrição/secundário curto, `Button` full-width como CTA.
   - Pack recomendado de forma subtil: `ring-1 ring-accent-secondary/30` + badge pequeno "Poupa 20%" / "Save 20%" no canto, cor `accent-secondary` indigo. Sem agressividade.
   - Trust note no rodapé substitui o footer antigo.
   - `handleSelect` mantém a emissão de `pricing_option_clicked` (com os novos IDs), marca o cartão como selecionado, e não navega. Comentário inline indica que wiring de pagamento está pendente.
   - Props públicos mantêm-se → call-sites (`premium-callout.tsx`, `report-block-nav.tsx`) ficam intactos.

2. **`src/i18n/locales/pt/report.json`** e **`src/i18n/locales/en/report.json`** — bloco `premium.dialog`:
   - Substituir `title`, `description` (renomear para `subtitle` para clareza, ou manter `description`).
   - Remover `single_price`, `bundle_*`, `monthly_*`, `agency_*`, `footer`.
   - Adicionar:
     - `single.title`, `single.price`, `single.bullet_profile`, `single.bullet_unlock`, `single.note`, `single.cta`
     - `pack.title`, `pack.price`, `pack.bullet_reports`, `pack.bullet_unit`, `pack.savings_badge`, `pack.cta`
     - `trust_note`
   - Copy exatamente como abaixo.

## Copy final

**PT**
- Título: "Desbloquear acesso premium"
- Subtítulo: "O primeiro bloco continua gratuito. Nesta fase de lançamento, o Diagnóstico editorial está incluído como oferta. As restantes secções premium ficam disponíveis com um desbloqueio pago."
- Cartão 1: "1 relatório" · "7€" · "1 perfil" · "1 desbloqueio premium" · "Ideal para uma análise pontual" · CTA "Escolher 1 relatório"
- Cartão 2: "Pack 5 relatórios" · "28€" · "5 relatórios" · "5,60€/relatório" · badge "Poupa 20%" · CTA "Escolher pack de 5"
- Trust: "Sem subscrição. Sem renovação automática."

**EN**
- Title: "Unlock premium access"
- Subtitle: "The first block remains free. During the launch phase, the Editorial diagnosis is included as a launch offer. The remaining premium sections are available with a paid unlock."
- Card 1: "1 report" · "€7" · "1 profile" · "1 premium unlock" · "Ideal for a one-off analysis" · CTA "Choose 1 report"
- Card 2: "Pack of 5 reports" · "€28" · "5 reports" · "€5.60/report" · badge "Save 20%" · CTA "Choose pack of 5"
- Trust: "No subscription. No automatic renewal."

## Design

- Tokens existentes apenas: `surface-base`, `surface-muted`, `border-default`, `content-primary/secondary/tertiary`, `accent-primary`, `accent-secondary`. Sem hardcoded colors.
- Inter para tudo (Fraunces fica para H1/H2 editoriais, não para títulos de modal). `tabular-nums` para preços.
- Sem JetBrains Mono. Sem amber. Sem ring agressivo.
- Mobile-first, testar em 375px.

## Fora de âmbito

- Não toca `report-block-nav.tsx`, `premium-callout.tsx`, `report-shell-v2.tsx` (apenas o conteúdo do dialog muda).
- Não cria pricing source-of-truth central (plano anterior, ainda por aprovar). Valores ficam no i18n por agora.
- Não mexe em geração de relatório, Apify/OpenAI/DataForSEO, lead magnet, Block 1–6, Supabase, autenticação.
- Não cria integração de pagamento.

## Validação

- `bunx tsc --noEmit`
- `bunx vitest run`
- Manual em `/analyze/frederico.m.carvalho`:
  - Abrir modal via `PremiumCallout` → ver 2 cartões, sem mensal/agência/"em estudo".
  - PT↔EN → copy correto em ambos.
  - 375px → cartões empilhados e legíveis.
  - Clicar CTA → evento `pricing_option_clicked` emitido, sem navegação/checkout.

## Output (após implementação)

- Lista de ficheiros alterados.
- Confirmação: checkout não wired, integração de pagamento pendente.
- Outras referências a pricing exploratório fora do modal, se restarem.
