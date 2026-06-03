## Objetivo

Substituir `/precos` pela página da maquete: 3 níveis (0€, 9€, 97€ herói com 149€ riscado), secção dark de serviços, cupão funcional, FAQ. Atualizar diagnóstico de 49€ → 97€ em servidor + DB. Criar página `/servicos` com formulário para auditoria/formação.

## 1. Backend — diagnóstico passa a 97€ (riscado 149€)

### Migração DB
- `ALTER TABLE lead_payments DROP CONSTRAINT` da CHECK atual em `product` e recriar com `('report_single','pack_5','authority_diagnosis_97','report_full_9')` — remove o `_49`.
- `UPDATE lead_payments SET product='authority_diagnosis_97' WHERE product='authority_diagnosis_49'` (apenas para o caso de existirem linhas de teste — `lead_payments` está vazio).
- `UPDATE lead_entitlements SET product_code='authority_diagnosis_97' WHERE product_code='authority_diagnosis_49'`.

### Catálogo servidor (`src/lib/payments/`)
- `products.ts`: `PRODUCT_CODES` → `['authority_diagnosis_97','report_full_9']`. Renomear chave; `priceLabel: "97€"`, adicionar `strikePrice: "149€"` opcional + `eyebrow: "Preço de lançamento · sobe para 149€"`.
- `products.server.ts`: chave `authority_diagnosis_97`, `amountCents: 9700`, descrição actualizada. Manter `report_full_9` em 900.

### Frontend que referencia o código antigo
- `ReserveDiagnosisButton` prop `productCode` passa a `"authority_diagnosis_97"`.
- `premium-interest-dialog.tsx` (no relatório): atualizar copy do banner 49€ → 97€/149€ e o `productCode`.
- Testes em `src/lib/payments/__tests__/products.test.ts` actualizar valor esperado.

### Cupão (novo)
- Tabela `payment_coupons` (migração separada): `code text PK`, `discount_percent int`, `applies_to text[]`, `max_uses int`, `uses int default 0`, `expires_at timestamptz`, `active bool default true`. GRANTs: só `service_role`. RLS on.
- Tabela `coupon_redemptions` (`coupon_code`, `lead_id`, `payment_id`, `redeemed_at`).
- ServerFn `validateCoupon({ code, productCode })` em `src/lib/payments/coupons.functions.ts` (público, sem auth) — retorna `{ valid, discountPercent, finalCents }` ou `{ valid:false, reason }`. Normaliza para uppercase, rate-limit por IP (5/min via `request_ip_hash`).
- ServerFn `createEupagoCheckout` ganha input opcional `couponCode`; servidor revalida e aplica desconto sobre `amountCents`. Regista `coupon_code` em `lead_payments.metadata`.
- Webhook: ao marcar `paid`, se `metadata.coupon_code` presente, inserir em `coupon_redemptions` e `UPDATE payment_coupons SET uses = uses + 1`.

## 2. Frontend — `/precos` reescrita

Reescrever `src/components/pricing/pricing-page.tsx` (mantém rota `src/routes/precos.tsx` intacta) seguindo a maquete:

### Zona 1 — Cabeçalho
- H1 Fraunces: "Do diagnóstico automático à leitura humana."
- Sub Inter: "Começa grátis. Sobe quando quiseres mais profundidade — sem subscrição, pagas só o que usas."

### Zona 2 — Grid 3 níveis (cards brancos, light)
Cada card: chip eyebrow, título, **linha de contexto** (nova), preço, bullets, CTA.

| Slot | Chip | Título | Contexto | Preço | CTA |
|---|---|---|---|---|---|
| Free | Incluído | Visão inicial | Para perceber o ponto de partida do perfil. | 0€ | Continuar grátis → `/` |
| Auto | Automático | Relatório completo | Todo o diagnóstico, gerado automaticamente. | 9€ por relatório · pagamento único | Desbloquear relatório → server fn (já existe `report_full_9`, ainda `exposed:false`; expor agora; CTA chama checkout EuPago) |
| Herói | Mais útil (badge azul absoluta) + chip "Relatório + humano" | Diagnóstico de Autoridade Digital | O relatório, mais uma leitura humana dos próximos passos. | **97€** com **149€** riscado + nota "preço de lançamento · sobe para 149€" | Reservar diagnóstico → `ReserveDiagnosisButton` (97€) |

Linha por baixo do grid: à esquerda link discreto "Tenho um código de acesso" (abre popover/input que chama `validateCoupon` e guarda em estado local para passar ao checkout); à direita "Vários perfis ou clientes? Pack de agência →" (link para `/servicos#agencia`).

### Zona 3 — Serviços (fundo dark, secção separada)
Fundo `--surface-dark` (criar token se não existir; usar `oklch` baseado em `#0F1B3D` da paleta hero-dark já existente em `src/styles/hero-dark.css`). Conteúdo:
- Eyebrow "Serviços · sob consulta"
- H2 Fraunces: "Quando o diagnóstico precisa de ir mais longe."
- Sub: "Para marcas e equipas que querem transformar a análise em estratégia e execução."
- 2 cards dark com ícone:
  - **Auditoria de Autoridade Digital** — "Vai além do Instagram: website, LinkedIn, SEO, presença de marca e funil de contacto. Plano de melhoria prioritário." — "A partir de 300€" + CTA "Pedir auditoria →" `/servicos?topico=auditoria`
  - **Formação: Redes Sociais e IA** — "Workshop para equipas, com benchmarks reais dos perfis da marca. Dados transformados em plano editorial." — "A partir de 1.500€" + CTA "Falar sobre formação →" `/servicos?topico=formacao`

### Zona 4 — FAQ
Componente accordion (`@/components/ui/accordion` shadcn). 4 itens com a 2ª aberta por defeito:
1. "Preciso de dar o meu login do Instagram?" — Não. Só usamos dados públicos do perfil.
2. "De onde vêm os dados?" (open) — Apenas de dados públicos do perfil. Os benchmarks de comparação são construídos a partir de estudos de referência da indústria, usados como sinais direcionais.
3. "É uma subscrição?" — Não. Pagamento único, sem renovação automática.
4. "O que acontece na chamada de 30 minutos?" — Reveis o diagnóstico contigo, identifico 3 prioridades para os próximos 90 dias e respondo às tuas dúvidas.

Toda a copy em PT, em `src/i18n/locales/pt/pricing.json` (substituir conteúdo). EN idem para paridade.

## 3. Página `/servicos` (nova)

- `src/routes/servicos.tsx` — meta SEO próprio.
- `src/components/services/services-page.tsx` — hero dark + 2 secções (auditoria, formação) com mais detalhe + formulário de pedido.
- Formulário: nome, email, empresa (opcional), tópico (select: auditoria/formação/outro — pré-seleciona via `?topico=`), mensagem. Server fn `submitServicesInquiry` que insere em nova tabela `service_inquiries` (`name, email, company, topic, message, ip_hash, created_at`) com RLS service-only.

## 4. Tracking

Adicionar a `src/lib/tracking.functions.ts`:
- `pricing_coupon_attempt` (metadata: code_hash, valid, product)
- `pricing_coupon_applied`
- `services_inquiry_submitted` (metadata: topic)

`pricing_option_clicked` já existe — reutilizar com novos `pricing_option`: `"free" | "report_full_9" | "authority_diagnosis_97" | "service_audit" | "service_training"`.

## 5. Ficheiros

**Criar:**
- `src/components/services/services-page.tsx`
- `src/components/services/services-inquiry-form.tsx`
- `src/components/pricing/coupon-input.tsx`
- `src/components/pricing/pricing-faq.tsx`
- `src/lib/payments/coupons.functions.ts`
- `src/lib/payments/coupons.server.ts`
- `src/lib/services/services-inquiry.functions.ts`
- `src/routes/servicos.tsx`
- 2 migrations (rename product + coupons/inquiries/redemptions)

**Alterar:**
- `src/components/pricing/pricing-page.tsx` (reescrita completa)
- `src/i18n/locales/pt/pricing.json` + `en/pricing.json`
- `src/lib/payments/products.ts` + `products.server.ts`
- `src/lib/payments/eupago.functions.ts` (aceitar `couponCode`, aplicar desconto server-side)
- `src/routes/api/public/eupago-webhook.ts` (registar redemption)
- `src/components/payments/reserve-diagnosis-button.tsx` (aceitar `couponCode` opcional, novo code)
- `src/components/report-redesign/v2/premium-interest-dialog.tsx` (copy + code)
- `src/lib/payments/__tests__/products.test.ts`
- `src/lib/tracking.functions.ts` (novos eventos)

**Não tocar:** `/report.example`, restantes rotas `app.*`, onboarding, pipeline de análise.

## 6. Validação

- Testes Vitest: catálogo (97/900), validação de cupão (válido/expirado/limite atingido), webhook ainda idempotente.
- `bunx tsc --noEmit`.
- Smoke manual: `/precos` renderiza 3 cards, cupão inválido mostra erro, CTA Reservar abre EuPago, link agência → `/servicos`, formulário grava em DB.

## 7. Riscos / notas

- Trocar `authority_diagnosis_49` → `_97` é breaking se já existirem pagamentos. Confirmado vazio.
- Secção dark dentro de página light: usar tokens existentes da hero dark para coerência; não criar paleta nova.
- Cupão: não exposto a humanos no UI (só link discreto). Códigos criados via SQL admin por agora — sem CRUD UI nesta iteração.
- Página `/servicos` é mínima: form simples + DB. Não envia email automático (pode vir depois via Brevo).
