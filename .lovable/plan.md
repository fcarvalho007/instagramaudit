## 1. Diagnóstico rápido (já validado no código)

**Fluxo de dados — está OK e a chegar a `/admin/estudo-mercado`:**

```
Modal "Estamos em fase de lançamento"  (src/components/pricing/pricing-interest-modal.tsx)
        │  POST /api/public/pricing-interest
        ▼
public.pricing_interest  (option, would_pay, price_fairness, email, comment, referrer, ua, ip_hash)
        │
        ▼
/admin/estudo-mercado  →  tab "Intenção de compra"
   · KPIs: Respostas / % sim+talvez / % sim convicto / Emails deixados
   · Gráficos diários (respostas + % convicto)
   · Intenção de pagar + Perceção do preço por plano
   · Tabela de comentários com Plano, Pagaria, Preço, Email (linka para /admin/clientes), Data·Hora, Comentário
```

Conclusão: nenhuma alteração necessária ao fluxo nem ao admin. Os emails são contados (`emailsCount`) e aparecem como link na tabela. O preço escolhido (`pricing_option`) é guardado em cada resposta, e a perceção (`barato/justo/caro`) é segmentada por plano.

## 2. Problemas reais a corrigir

**a) O preço só aparece no eyebrow ("LANÇAMENTO · 1 RELATÓRIO · 7€") e nunca no corpo do texto.** O parágrafo introdutório fala de "este preço" mas nunca o cita, o que enfraquece a pergunta. Queremos o valor no próprio texto: "…se este formato e este preço — **7€ por 1 relatório** — fazem sentido para ti."

**b) O valor "7€" / "28€" vive em `src/i18n/locales/pt/pricing.json` e `report.json`, em emails (`commercial-followup.ts`) e em vários módulos admin (`kanban-columns.ts`, `lead-lifecycle.ts`). Mudar o preço hoje obriga a editar ~8 ficheiros.** Solução: única fonte de verdade em DB.

## 3. Mudanças propostas

### 3.1 Tabela `pricing_plans` (DB, editável sem deploy)

```sql
create table public.pricing_plans (
  key text primary key,         -- 'single_report' | 'pack_5_reports'
  label text not null,          -- '1 relatório'
  price_cents int not null,     -- 700 / 2800
  currency text not null default 'EUR',
  unit_label text,              -- '5,60€/relatório' (opcional)
  active boolean not null default true,
  updated_at timestamptz not null default now()
);
```
- GRANT SELECT a `anon` + `authenticated` (preço público); GRANT ALL a `service_role`.
- RLS: leitura pública (`using (true)`), escrita só `service_role`.
- Seed inicial com os valores atuais (700, 2800).

### 3.2 Server function `getPublicPricing()`

`src/lib/pricing.functions.ts` → devolve `{ single_report: {label, priceFormatted, priceCents}, pack_5_reports: {...} }`. Cacheado via TanStack Query com `staleTime: 5min`.

Formatação: `Intl.NumberFormat('pt-PT', { style:'currency', currency:'EUR', maximumFractionDigits:0 })` → "7 €" / "28 €".

### 3.3 Consumidores que passam a usar a DB

- `src/components/pricing/pricing-page.tsx` → cards de preço lêem do hook.
- `src/components/pricing/pricing-interest-modal.tsx` → `planLabel` e `planPrice` vêm do hook; `intro` passa a usar i18n com interpolação `{{price}}` e `{{plan}}`.
- `src/components/report-redesign/v2/premium-interest-dialog.tsx` → idem.
- `src/components/beta/beta-request-form.tsx` linha 418 → idem.
- `src/lib/email/templates/commercial-followup.ts` → recebe `pricing` como parâmetro (já é função server-side; injectamos no call site).
- `src/routes/precos.tsx` (meta description) → continua a usar i18n com `{{single}}`/`{{pack}}` interpolados no server (mantemos i18n como template, valores vêm da DB).

### 3.4 Textos a atualizar (i18n com interpolação, sem hardcode de valor)

`pt/pricing.json` → `interest_modal.intro`:
> "O pagamento ainda não está aberto. Estamos a recolher interesse para perceber se, considerando o que já viste, **{{plan}} por {{price}}** faz sentido para ti."

`would_pay_label`:
> "Considerando o que já viste, pagarias **{{price}}** por **{{plan}}**?"

(O componente injecta `price`/`plan` vindos da DB; em `en/pricing.json` espelhamos.)

### 3.5 Admin: gestão dos preços

Pequeno cartão em `/admin/estudo-mercado` (topo do tab "Intenção de compra") com os preços atuais + link "Editar preços". Edição mínima inline (sem nova página): dois inputs numéricos (cents) + botão Guardar, server fn protegida por `requireSupabaseAuth` + check de admin allowlist (padrão já usado nas outras server fns admin).

Assim, alterar 7 € → 9 € passa a ser um clique no admin; modal, cards de preços, emails e meta tags atualizam-se na próxima request, sem deploy.

## 4. O que NÃO mudar
- Esquema de `pricing_interest` (já guarda `pricing_option` certo; preço efetivo na altura da resposta pode ser inferido pela `created_at` + histórico se um dia precisarmos).
- Fluxo do admin `/admin/estudo-mercado` (apenas adicionamos o cartão de edição de preços).
- `/report.example`, kanban e lead-lifecycle (label "Pagou 1 report · 7€") — esses textos do funil são histórico e podem ser tratados num passo seguinte; fora do âmbito deste prompt para manter a regra de uma feature por prompt.

## 5. Checkpoint

- [ ] Migração: tabela `pricing_plans` + GRANTs + RLS + seed (700/2800).
- [ ] `src/lib/pricing.functions.ts` com `getPublicPricing` + hook `usePricing`.
- [ ] `pricing-interest-modal.tsx`: intro e label usam `{{plan}}`/`{{price}}` interpolados, eyebrow continua a mostrar plano+preço.
- [ ] `pricing-page.tsx` + `premium-interest-dialog.tsx` + `beta-request-form.tsx` consomem o hook.
- [ ] `commercial-followup.ts` recebe `pricing` como parâmetro nos call sites.
- [ ] i18n `pricing.json` (pt + en): tirar `"7€"`/`"28€"` literais dos textos onde podem ser interpolados; manter como fallback só onde o valor não vier (graceful degradation).
- [ ] Cartão "Preços ativos" + edição inline em `/admin/estudo-mercado` (server fn `updatePricingPlan` com check admin).
- [ ] Verificar no preview: modal mostra "7 € por 1 relatório" no texto; mudar para 9 € no admin reflete imediatamente no modal e cards.

Aprovas para avançar?
