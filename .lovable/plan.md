
# Audit — CTAs nas superfícies de pricing (sem alterar código)

## 1. Inventário de CTAs

| # | Label PT / EN | Componente / ficheiro | Acção actual | Tipo | Destino esperado | Consistente? |
|---|---|---|---|---|---|---|
| 1 | "Começar grátis" / "Start free" | `landing/dark/pricing-teaser-band.tsx` (Tier free) | `<Link to="/precos">` | Free | Hero input do home (`#hero`) ou fluxo grátis | ❌ |
| 2 | "Desbloquear" / "Unlock" (9€) | `landing/dark/pricing-teaser-band.tsx` (Tier single) | `<Link to="/precos">` | Pago | Checkout focado 9€ (`/checkout/report-full`) | ❌ |
| 3 | "Reservar" / "Book" (97€) | `landing/dark/pricing-teaser-band.tsx` (Tier diagnosis) | `<Link to="/precos">` | Pago | `/checkout/authority-diagnosis` | ❌ |
| 4 | "Continuar grátis" | `pricing/pricing-page.tsx` (card Free) | `navigate({ to: "/" })` | Free | OK (homepage / hero) | ✅ |
| 5 | "Desbloquear relatório" | `pricing/pricing-page.tsx` (card 9€) | `ReserveDiagnosisButton` → cria sessão EuPago e faz `window.location.assign(checkout_url)` (salta o checkout progressivo) | Pago | `/checkout/report-full` (progressivo, paridade c/ 97€) | ❌ |
| 6 | "Reservar diagnóstico" | `pricing/pricing-page.tsx` (card 97€) | `navigate({ to: "/checkout/authority-diagnosis", search:{...} })` | Pago | `/checkout/authority-diagnosis` | ✅ |
| 7 | "Continuar grátis" | `report-redesign/v2/premium-interest-dialog.tsx` (card Free) | Fecha dialog | Free | OK | ✅ |
| 8 | "Desbloquear relatório" (9€) | `report-redesign/v2/premium-interest-dialog.tsx` (card single) | Abre `PricingInterestModal` (captura de interesse — comentário no ficheiro confirma "9€ flow is not yet wired to a real checkout") | Interest-capture | `/checkout/report-full` | ❌ |
| 9 | "Reservar diagnóstico" (97€) | `report-redesign/v2/premium-interest-dialog.tsx` (card hero) | `navigate({ to: "/checkout/authority-diagnosis" })` | Pago | `/checkout/authority-diagnosis` | ✅ |
| 10 | "Falar sobre auditoria ou formação" | `premium-interest-dialog.tsx` (footer) | `<Link to="/servicos">` | Lead | `/servicos` | ✅ |
| 11 | "Desbloquear" (sticky mobile) | `report-redesign/v2/sticky-unlock-bar.tsx` | `handlePremiumAccessClick("sticky_unlock_bar")` → abre `PremiumInterestDialog` | Abre opções de acesso | Mantém — abre `PremiumInterestDialog` | ✅ |
| 12 | "Ver opções de acesso" / sidebar premium / lock gate / period selector / end-of-free | vários (`report-block-nav`, `premium-callout`, `analysis-period-selector`, `end-of-free-block`, `report-post-comparison`) via `premium-cta-context` | `handlePremiumAccessClick(...)` → abre `PremiumInterestDialog` | Abre opções | Mantém — único ponto de entrada | ✅ |
| 13 | "Reservar diagnóstico" (botão pequeno) | `payments/reserve-diagnosis-button.tsx` (componente partilhado) | Cria checkout EuPago directamente (sem passar por página progressiva) | Pago | Quando usado para 97€ na `/precos` está OK; quando usado para 9€ salta o checkout focado — ver linha 5 | ⚠️ depende do uso |

## 2. Inconsistências encontradas

1. **`/checkout/report-full` não existe.** Só existe `src/routes/checkout.authority-diagnosis.tsx` (e o genérico `checkout.tsx`). Sem esta rota, qualquer CTA de 9€ que tente abrir checkout progressivo cai. É a causa raiz da queixa do utilizador.
2. **Landing → `/precos` em vez de checkout directo.** Os três CTAs do teaser fazem `to="/precos"`, criando o "ecrã de decisão duplicada" que o utilizador quer evitar — sobretudo nos 9€ e 97€.
3. **`/precos` 9€ ≠ `/precos` 97€.** O 97€ entra no checkout progressivo (`/checkout/authority-diagnosis`), mas o 9€ pula directamente para a sessão EuPago via `ReserveDiagnosisButton`. Falta de paridade visual e funcional, e impede aplicar cupão/qualificação no mesmo formato.
4. **`PremiumInterestDialog` 9€ ainda é interest-capture.** O CTA "Desbloquear relatório" abre `PricingInterestModal` em vez de checkout — comentário no topo do ficheiro reconhece-o explicitamente.
5. **Landing teaser CTA "Começar grátis"** vai a `/precos` em vez de devolver o utilizador ao hero/input grátis.

## 3. Mapa de destinos recomendado

| Produto | Origem | Destino correcto |
|---|---|---|
| 0€ Visão inicial | qualquer CTA grátis | scroll/anchor ao hero (`#hero`) ou `/` |
| 9€ Relatório completo | landing teaser, `/precos`, `PremiumInterestDialog` | `/checkout/report-full` (a criar) |
| 97€ Diagnóstico | landing teaser, `/precos`, `PremiumInterestDialog` | `/checkout/authority-diagnosis` |
| "Ver opções de acesso" / sidebar / sticky / lock gate | dentro do report | abrir `PremiumInterestDialog` (manter) |
| Dentro do `PremiumInterestDialog` | botões pagos | rotas de checkout acima (não EuPago directo, não interest modal) |

## 4. Plano mínimo de implementação (para fase build)

1. **Criar rota `src/routes/checkout.report-full.tsx`** espelhando `checkout.authority-diagnosis.tsx`, com `productCode = "report_full_9"` e os mesmos passos (qualification → billing → ReserveDiagnosisButton no fim) para garantir paridade UX com o 97€. Sem mexer em EuPago, webhook, internals de checkout, ou produtos.
2. **`landing/dark/pricing-teaser-band.tsx`**: substituir o `<Link to="/precos">` único por um `href`/`to` por tier:
   - free → `to="/"` com `hash="hero"` (ou anchor `#hero`)
   - 9€ → `to="/checkout/report-full"` com `search={{ source: "landing_pricing_teaser" }}`
   - 97€ → `to="/checkout/authority-diagnosis"` com `search={{ source: "landing_pricing_teaser" }}`
3. **`pricing/pricing-page.tsx`** card 9€: trocar `ReserveDiagnosisButton` por `navigate({ to: "/checkout/report-full", search: { source: "pricing_page", return: "/precos", coupon } })` para paridade com o 97€. Manter `ReserveDiagnosisButton` como botão final dentro do checkout progressivo.
4. **`report-redesign/v2/premium-interest-dialog.tsx`** card 9€: substituir o handler que abre `PricingInterestModal` por `navigate({ to: "/checkout/report-full", search: {...mesmos parâmetros do 97€} })`. Remover (ou condicionar) a importação de `PricingInterestModal` se deixar de ser usada. Não tocar em "Continuar grátis" nem no card 97€.
5. **Tracking**: usar `eventType: "payment_cta_clicked"` com `product_code: "report_full_9"` em todos os novos entry-points, igual ao que já existe para o 97€.
6. **Smoke check pós-build**: percorrer landing → 9€ → checkout; landing → 97€ → checkout; `/precos` → ambos; report `PremiumInterestDialog` → ambos. Confirmar que nenhum CTA pago aterra em `/precos` nem em `PricingInterestModal`.

Fora do âmbito (não tocar): valores de preço, EuPago, webhook, `checkout.tsx` interno, onboarding, geração de report, schema/back-end.
