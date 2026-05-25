## Objetivo

Criar uma página pública `/precos` (PT/EN) que comunique de forma clara o modelo MVP simplificado (1 relatório 7€ / pack 5 × 28€), reaproveitando tokens, copy e padrões já existentes — em particular o estilo dos dois cartões definidos no `PremiumInterestDialog` recém-redesenhado.

## Rota

- **Path:** `/precos` (PT-first, em linha com `/privacidade`, `/termos`, `/cookies`).
- Ficheiro: **`src/routes/precos.tsx`**, com `createFileRoute` + `head()` (title, description, og:* em PT — string única; o conteúdo da página é traduzido em runtime via i18n, como o resto do site).
- Indexável (sem noindex) — site público.

## Checkout

Não existe endpoint real de checkout (sem Stripe, sem EuPago, sem `/api/public/checkout`). Logo:
- CTAs ficam visualmente presentes e clicáveis, mas **não navegam** para um checkout falso.
- Ao clicar, emitem o evento já existente `pricing_option_clicked` (em `src/lib/tracking.functions.ts`) com `pricing_option: "single_report" | "pack_5_reports"`, `source_component: "pricing_page"`.
- Microcopy honesto por baixo das CTAs: "Pagamento brevemente disponível — os botões registam o teu interesse." / "Payments coming soon — buttons register your interest."
- Wiring real fica pendente, reportado no output final.

## Ficheiros alterados/criados

1. **`src/routes/precos.tsx`** (novo) — rota + componente `PrecosPage`.
2. **`src/components/pricing/pricing-page.tsx`** (novo) — UI da página (hero + 2 cartões + secção "Como funciona o acesso" + trust note). Reaproveita estilo do `PremiumInterestDialog`.
3. **`src/i18n/locales/pt/pricing.json`** e **`src/i18n/locales/en/pricing.json`** (novos) — todo o copy da página.
4. **`src/i18n/index.ts`** — registar o novo namespace `pricing` (import + entrada em ambas as linguagens).
5. **`src/components/layout/footer.tsx`** (se existir e for não-locked) — adicionar link "Preços" / "Pricing" na coluna apropriada. Header está locked — não tocar.

(Não toca em `PremiumInterestDialog`, modelo de dados, geração de relatório, admin, legais, Apify/OpenAI/DataForSEO.)

## Estrutura visual

- Hero centrado, max-w-3xl: H1 (Fraunces, editorial), subtítulo (Inter, content-secondary).
- 2 cartões `grid-cols-1 md:grid-cols-2 gap-4` com o mesmo template visual do dialog (Inter SemiBold título, preço grande tabular-nums, bullets com `Check`, CTA full-width). Pack com `ring-1 ring-accent-secondary/30` + badge "Poupa 20%".
- Trust note (`ShieldCheck` + texto) por baixo dos cartões.
- Secção "Como funciona o acesso" — lista ordenada com 3 itens, fundo `surface-muted`, padding generoso.
- Mobile-first; sem dark navy; só tokens semânticos.

## Copy final

**PT**
- H1: "Preços simples, sem complicação"
- Subtítulo: "Começa com uma visão gratuita do perfil. Se quiseres aprofundar, existem duas opções simples para desbloquear acesso premium."
- Cartão 1: "1 relatório" · "7€" · "1 perfil" · "1 desbloqueio premium" · "Ideal para análise pontual" · CTA "Comprar 1 relatório"
- Cartão 2: "Pack 5 relatórios" · "28€" · "5 relatórios" · "5,60€/relatório" · badge "Poupa 20%" · CTA "Comprar pack de 5"
- Trust: "Sem subscrição. Sem renovação automática."
- Pending: "Pagamento brevemente disponível — os botões registam o teu interesse."
- Como funciona o acesso: 1) "A Visão geral é gratuita." 2) "O Diagnóstico editorial está temporariamente incluído como oferta de lançamento." 3) "As secções premium permitem aprofundar desempenho, conteúdo, procura e comparação."
- SEO title: "Preços — InstaBench"
- SEO description: "Preços simples e transparentes do InstaBench: 1 relatório por 7€ ou pack de 5 por 28€. Sem subscrição."

**EN**
- H1: "Simple pricing, no complications"
- Subtitle: "Start with a free profile overview. If you want to go deeper, there are two simple options to unlock premium access."
- Card 1: "1 report" · "€7" · "1 profile" · "1 premium unlock" · "Ideal for a one-off analysis" · CTA "Buy 1 report"
- Card 2: "Pack of 5 reports" · "€28" · "5 reports" · "€5.60/report" · badge "Save 20%" · CTA "Buy pack of 5"
- Trust: "No subscription. No automatic renewal."
- Pending: "Payments coming soon — buttons register your interest."
- How access works: 1) "The Overview is free." 2) "The Editorial diagnosis is temporarily included as a launch offer." 3) "Premium sections help you go deeper into performance, content, search demand and comparison."

(SEO `head()` mantém-se em PT — alinhado com o padrão das outras rotas legais.)

## Fora de âmbito

- Header (locked), checkout real, integração de pagamento, edição do dialog premium, alterações em report/admin/legais.

## Validação

- `bunx tsc --noEmit`
- `bunx vitest run`
- Manual:
  - Visitar `/precos` → ver 2 cartões + secção de acesso.
  - Trocar PT↔EN → todo o copy muda.
  - Mobile 375px → cartões empilhados, legíveis.
  - Clicar CTA → emite `pricing_option_clicked` (consola dev) sem navegar.
  - Sem qualquer referência a mensal, agência, "em estudo", "talk to us", subscrição.

## Output (após implementação)

- Rota usada: `/precos`.
- Ficheiros alterados/criados.
- Copy PT/EN final.
- Estado de checkout: não wired (pendente), CTAs apenas registam intenção via `pricing_option_clicked`.
