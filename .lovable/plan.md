
# Audit AuditProfiles — Free / Pro / Lab / Créditos

Audit read-only do código atual (sem alterações). Evidência citada por `file:line`.

---

## 1. Sumário executivo

**Veredito: NEEDS SMALL FIXES (1 blocker UI, alguns hardcodes cosméticos).**

A espinha dorsal está **realmente ligada**:

- `premiumUnlocked` em `/analyze/$username` já é derivado de `lead_entitlements` via `getMyReportEntitlement` (`src/routes/analyze.$username.tsx:399-412`, `src/lib/payments/entitlements.functions.ts:16-23`). Fail-closed correcto.
- Webhook EuPago concede entitlement + 2 créditos beta de forma idempotente (`src/routes/api/public/eupago-webhook.ts:139-188`, `src/lib/credits/credits.server.ts:109-139`).
- Consumo de crédito do "Adicionar concorrente" é real (reserve/confirm/release server-side, índice único `(lead_id, cache_key)`) — `src/components/report-redesign/v2/report-block-nav.tsx:606-735`, `src/lib/credits/credits.server.ts:164-243`.
- Variants `internal_lab` e `pro_preview` continuam apenas em rotas `admin*` protegidas.

**Há, no entanto, um bug funcional 1 BLOCKER:** o `ReportShellV2` **não passa `primaryHandle` / `existingCompetitors` / `competitorCount` ao sidebar nav**, portanto o fluxo real de "Adicionar concorrente" **falha sempre no primeiro `if (!primaryHandle)` e mostra erro genérico** — embora o backend esteja pronto. Resto são afinações.

---

## 2. Tabela de hardcoded / mocked state

| Área | Ficheiro:linha | Variável/valor | Comportamento actual | Risco | Porquê | Fix recomendado |
|---|---|---|---|---|---|---|
| Sidebar→Nav wiring | `src/components/report-redesign/v2/report-shell-v2.tsx` (não passa props) vs `report-block-nav.tsx:537-550` | `primaryHandle`, `existingCompetitors`, `competitorCount` nunca chegam ao nav | "Adicionar concorrente" abre o dialog mas no submit cai em `setErrorMessage(error_generic)` (linha 628-630) | **BLOCKER** | Promete acção que nunca acontece em produção paga | Shell precisa receber `payload.instagram_username` + `payload.competitor_usernames` do `analyze.$username.tsx` e propagar para `ReportBlockNav`/`Sidebar` |
| Sidebar | `report-block-nav.tsx:1004,1242,1322` | `competitorMax = 3` default | Texto mostra "0 de 3 concorrentes" | **HIGH** | Backend `analyze-public-v1` faz `.slice(0,2)` (`report-block-nav.tsx:648`) e Zod só aceita 2. UI promete 3. | Mudar default para `2` e/ou centralizar em `src/lib/analysis/constants` |
| Sidebar | `report-block-nav.tsx:1003,1241,1321` | `competitorCount = 0` default | Quando shell não passa, fica 0 mesmo com 2 concorrentes no URL | **HIGH** (mesmo bug do BLOCKER) | Sidebar fora de sincronia com corpo do relatório | Derivar de `payload.competitor_usernames` no shell |
| Período 30d/90d | `report-block-nav.tsx:606-623` | Intent `period` apenas faz `trackEvent`, fecha dialog | UI permite clique mas nada acontece | **MEDIUM** | Esperado por design ("em preparação") — mas o utilizador paid clica e parece sem efeito | Etiquetar visualmente como "em breve" no chip (não só dentro do dialog) ou desativar |
| Cookie de lead | `src/lib/credits/credits.functions.ts:13-17` | `getLeadFromCookie()` server-only | Saldo `0` quando o cookie não acompanha a navegação cross-domain | **MEDIUM** | Após `payment_confirmed` num browser sem cookie de lead activo, sidebar mostra "0 créditos" mesmo com saldo real | Confirmar que `lead_session` é recolocado no return URL do EuPago |
| Lab routes | `admin.report-lab.tsx:462`, `admin_.report-preview.snapshot.$snapshotId.tsx:191`, `admin_.report-preview.$username.tsx:205` | `premiumUnlocked={variant !== "public_mvp"}` / `premiumUnlocked` hard true | Por design (preview admin) | LOW | Só vive sob `admin.tsx` gate | OK |
| Tracking | `report-block-nav.tsx:654-673` | Emite **dois** eventos (`beta_credit_used_competitor` + `beta_credit_used`) no sucesso | Duplicação no funnel | LOW | Sobre-contagem em analytics | Manter só um (`beta_credit_used` com `metadata.action_type`) |
| i18n | `pt/report.json:619-621` | Textos `beta_credits_available/empty` | OK — recebe `count` real | LOW | — | — |
| Pricing/checkout | `src/lib/pricing`, `checkout.report-full.tsx`, `eupago.functions.ts` | Lê `pricing_plans` da DB, EuPago real | OK | — | — | — |
| `mock-analysis.ts` / `admin/mock-data.ts` | só usado em `/report.example` e admin demo | — | LOW | Não afecta `/analyze/$username` | — |

Nada mais marcado `TODO`/`FIXME`/`mock` aparece nos paths Free/Pro do relatório.

---

## 3. Free → Pro lifecycle map

| Passo | Esperado | Actual | Observação |
|---|---|---|---|
| Free view `/analyze/$h` | Mostra 01+02, locked 03-07 | OK | `report-shell-v2.tsx:215-401` |
| Click locked section | Abre `PremiumInterestDialog` via `usePremiumCta` | OK | `premium-cta-context.tsx` |
| Click locked período (free) | Abre dialog premium | OK | `report-block-nav.tsx:737-741` |
| Click "Adicionar concorrente" (free) | Abre dialog premium | OK | `report-block-nav.tsx:748` |
| Pagar 9€ EuPago | Checkout Pay-by-Link | OK | `eupago.functions.ts`, `eupago.server.ts` |
| Webhook `paid` | `status=paid` + `grantEntitlement` + `grantPostPurchaseBetaCredits(+2)` idempotentes + email | OK | `eupago-webhook.ts:139-238` |
| Voltar ao relatório | `getMyReportEntitlement` retorna `premiumUnlocked:true` | OK | `analyze.$username.tsx:399-412` |
| Sidebar paid | Mostra "X créditos beta disponíveis", chips 30d/90d + "Adicionar concorrente" | OK visual | balance correcto; competitorCount=0 ❌ |
| Click 30d/90d paid | Abrir dialog → confirmar → nova análise | **Parcial**: dialog abre, confirm apenas regista evento — "em preparação". Por design. |
| Click "Adicionar concorrente" paid | Dialog → confirma → endpoint reserva crédito → refresh sidebar + URL | **FALHA**: `primaryHandle` undefined → erro genérico no submit | BLOCKER |

---

## 4. Entitlement audit

- **Fonte real:** `lead_entitlements (product_code='report_full_9')` via `hasEntitlement` (`entitlements.server.ts:40-55`).
- **Wiring UI:** `getMyReportEntitlement` (server fn) chamada num `useEffect` em `analyze.$username.tsx:400`. Default `false` (fail-closed).
- **Cookie:** `getLeadFromCookie()` server-side.
- **Bugs:** nenhum `premiumUnlocked` hardcoded falso em rotas de produção. Os hardcodes que existem (`admin.report-lab.tsx:462`, `admin_.report-preview.*`) estão só em rotas admin.
- **Fix necessário aqui:** nenhum.

---

## 5. Credits audit

| Função | Estado |
|---|---|
| Grant inicial (+2 onboarding) | Real, idempotente — `credits.server.ts:85-97`, `routes/api/onboarding/start.ts:350` |
| Grant pós-compra (+2 beta) | Real, idempotente por `payment_id` — `credits.server.ts:109-139`, webhook `eupago-webhook.ts:167` |
| Leitura de saldo (sidebar) | Real — `getMyCreditBalance` (`credits.functions.ts`) chamado em `report-block-nav.tsx:564-578`, refrescado após uso |
| Consumo (Adicionar concorrente) | Real backend (reserve→confirm/release atómico em `analyze-public-v1.ts`), mas **inacessível em produção** por falta de `primaryHandle` no shell |
| Consumo (Período 30d/90d) | Não implementado por design (endpoint não aceita `period_days`) — UI mostra "em preparação" |
| Eventos | `credits_post_purchase_granted`, `beta_credit_intent_*`, `beta_credit_used*`, `beta_credit_use_failed` — todos disparados |
| Hardcodes | Nenhum valor de saldo hardcoded; só `INITIAL_GRANT=2` e `POST_PURCHASE_BETA_BONUS=2` em `credits.server.ts` (source-of-truth correcta) |

**Fix:** propagar `primaryHandle` + `existingCompetitors` do route → shell → nav.

---

## 6. Sidebar / report consistency

- Lista das 7 secções comerciais vem de **`COMMERCIAL_SECTIONS`** em `block-config.ts:154-162` (única source of truth). ✅
- Acesso por secção (`free`/`pro`) é centralizado lá. ✅
- Free teasers no corpo do relatório usam `features[block.featureKey]` + `premiumUnlocked` no shell — mesma flag global. ✅
- Lab-only (`blockPerformance/Content/Search/Benchmark`) escondidos quando `variant === public_mvp` mesmo com `premiumUnlocked` real, porque `effective-features.ts` define `internal_only`. ✅
- **Divergência única**: `competitorMax=3` na UI vs `2` no backend (Zod + slice). ❌

---

## 7. Plano de fixes recomendado (sequenciado)

### Fix 1 — BLOCKER: wiring de competitor add (smallest, safe)
- **Ficheiros:** `src/routes/analyze.$username.tsx`, `src/components/report-redesign/v2/report-shell-v2.tsx`, `src/components/report-redesign/v2/report-block-nav.tsx`.
- **O quê:** adicionar `primaryHandle` e `existingCompetitors` (e `competitorCount` derivado) às props do shell, propagar até `<ReportBlockNav>`/sidebars. `analyze.$username.tsx` já tem `payload.instagram_username` e `payload.competitor_usernames` (e o `vs` do URL).
- **Risco:** baixo — só passar props. Nada toca a backend, schema, ou unlock logic.
- **Validação:**
  1. Pago, 0 concorrentes, adicionar `@x` → débito de 1 crédito visível, URL passa a `?vs=x`, relatório re-renderiza.
  2. Repetir add → 2/2, próximo botão fica disabled.
  3. Duplo-click → só 1 débito (índice único).
  4. Free, click "Adicionar concorrente" → continua a abrir pricing modal.

### Fix 2 — `competitorMax` alinhar com backend
- **Ficheiros:** `report-block-nav.tsx` (3 defaults `competitorMax = 3` → `2`). Idealmente, exportar `COMPETITOR_MAX` de `src/lib/analysis/constants`.
- **Risco:** baixo.
- **Validação:** sidebar mostra "0 de 2", coerente com slice do endpoint.

### Fix 3 — UI clarificar período "em preparação"
- **Ficheiros:** `report-block-nav.tsx` (chips 30d/90d em estado paid).
- **O quê:** adicionar badge "em breve" + `aria-disabled` em estado paid, ou suprimir abertura de dialog.
- **Risco:** baixo, cosmético.

### Fix 4 — Eventos duplicados de credit_used
- **Ficheiros:** `report-block-nav.tsx:654-673`. Manter só `beta_credit_used`.
- **Risco:** baixíssimo (afecta analytics, não UX).

---

## 8. Próximo prompt seguro (não executar ainda)

> **Plan Mode → Edit Mode.** Objectivo: ligar o fluxo "Adicionar concorrente" pago à rota real, propagando `primaryHandle` e `existingCompetitors` desde `analyze.$username.tsx` até `ReportBlockNav` via `ReportShellV2`.
>
> Restrições: não alterar pricing, checkout, EuPago, entitlements, créditos (server), schema, ou lógica de unlock/geração.
>
> Mudanças:
> 1. `src/components/report-redesign/v2/report-shell-v2.tsx`: aceitar `primaryHandle: string` e `competitorUsernames: string[]` (derivados em `analyze.$username.tsx` a partir de `payload.instagram_username` e do search `vs`), e passá-los para `<ReportBlockNav>` e variantes sidebar.
> 2. `src/routes/analyze.$username.tsx`: derivar `primaryHandle = payload.profile?.username ?? payload.instagram_username` e `competitorUsernames = (search.vs ?? "").split(",").map(s=>s.trim()).filter(Boolean)`, passar ao shell.
> 3. `src/components/report-redesign/v2/report-block-nav.tsx`: mudar default `competitorMax = 3` para `2` nas 3 ocorrências (ou importar constante partilhada).
>
> Validar manualmente os 4 casos do Fix 1 acima e confirmar que o estado Free continua igual.
