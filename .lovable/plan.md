## Diagnóstico

No fluxo onboarding-first atual, qualquer utilizador que chega a `/analyze/$username` já completou o onboarding (caso contrário o backend devolve `ONBOARDING_REQUIRED` e reabre o modal). Apesar disso, o estado `unlocked` em `analyze.$username.tsx` continua a ser lido de `sessionStorage["ib_unlock:{snapshotId}"]`, que **nunca é escrito pelo onboarding** — só pelo antigo `UnlockModal` de 5 passos. Resultado:

- `unlocked === false` permanentemente pós-onboarding.
- `ReportLockGate` (body) renderiza e o botão "Ver relatório gratuito →" chama `handleUnlockClick` → abre o `UnlockModal` antigo ("PASSO 1 DE 5 · ~1 MIN"). Não emite `premium_cta_clicked`. ❌
- `StickyUnlockBar` está condicionado a `unlocked && lockBoundary === "engagement"`, portanto **nunca aparece** no mobile pós-onboarding. ❌

O *AnalysisPeriodSelector* e o `ReportEndOfFreeBlock` já passam pelo `PremiumCtaProvider` corretamente.

No selector, o overflow no mobile vem dos chips com labels longos ("60 dias", "90 dias", "365 dias") — já existe `overflow-x-auto` no mobile, mas a UX é pobre (parece corte, não scroll intencional).

---

## Fix 1 — Body CTA (`ReportLockGate`) passa a abrir o modal premium

Em `src/components/report-redesign/v2/report-shell-v2.tsx`, no bloco `lead-magnet-card` (linhas 248–257), trocar o `onUnlockClick={handleUnlockClick}` por um handler que consome `usePremiumCta()`:

- Extrair pequeno wrapper inline `<LockGatePremium handle={...} />` dentro de `ReportShellV2` (já está dentro do `PremiumCtaProvider`).
- O wrapper chama `handlePremiumAccessClick("lock_gate", { cta: "body_unlock" })` em vez de abrir o `UnlockModal`.
- Eficácia: emite `premium_cta_clicked` com `source_component: "lock_gate"`, não toca em onboarding, Apify, OpenAI, nem créditos.

`handleUnlockClick` continua a ser passado a `ReportBlockSidebar`/`ReportBlockTopTabs`/`onUnlockClick` do shell — esses caminhos já são premium (sidebar usa `usePremiumCta` diretamente; o `onUnlockClick` da rota não é invocado por mais nenhum CTA visível pós-onboarding). Mantém-se a prop como defensiva.

Manter a copy `lockGate.cta` ("Ver relatório gratuito →") na PT por causa de outros consumos? Não — `ReportLockGate` só é renderizado aqui. Em vez de mexer no componente partilhado, **passamos o `onUnlockClick` premium** e deixamos o componente intacto (zero alteração em `report-lock-gate.tsx`). O texto do CTA mantém-se mas o destino é o modal premium correto.

> Nota: a copy "Ver relatório gratuito" perde sentido pós-onboarding. Não é parte deste ticket reescrevê-la (o user pediu explicitamente opção A: mesma copy/posição, comportamento premium). Fica registado como follow-up de copy.

---

## Fix 2 — Selector mobile: labels compactos + sem clipping visual

Em `src/components/report-redesign/v2/analysis-period-selector.tsx`:

- Adicionar keys i18n compactas em `report.json` (PT e EN):
  - `selector.premium_30_compact` = "30d"
  - `selector.premium_60_compact` = "60d"
  - `selector.premium_90_compact` = "90d"
  - `selector.premium_365_compact` = "365d"
- Renderizar dois spans por chip:
  - `<span class="sm:hidden">{compact}</span>`
  - `<span class="hidden sm:inline">{full}</span>`
- O `aria-label` continua a usar o label completo (`selector.locked.aria` com `{window: full}`) — leitores de ecrã ouvem "30 dias".
- Manter `overflow-x-auto` no container (defensivo para viewports ≤320px), mas com labels compactos os 4 chips + chip ativo cabem em 360px sem scroll.

Não toca no popover, no estado activo, no tracking nem na lógica de locked.

---

## Fix 3 — Sticky unlock bar restaurada no mobile

Em `src/components/report-redesign/v2/report-shell-v2.tsx`, alterar a condição do `<StickyUnlockBar />` (linha 418):

- Antes: `unlocked && lockBoundary === "engagement"`.
- Depois: `lockBoundary === "engagement" && !premiumUnlocked`.

Justificação (em comentário no código): no fluxo onboarding-first, qualquer utilizador que chega ao shell já tem `lead_session`; o `unlocked` baseado em sessionStorage está obsoleto para gating de CTAs premium. O sticky bar deve aparecer sempre que há conteúdo gated por pagar.

Posicionamento: `bottom-[64px]` mantém-se (acima da bottom-nav mobile). Não há overlap com o period selector (topo da página). Componente já usa `usePremiumCta()` com `source_component: "sticky_unlock_bar"`. Não emite tracking duplicado.

---

## Testes

Estender `src/components/report-redesign/v2/__tests__/premium-cta-unification.test.ts`:

1. Assert das 4 keys `selector.premium_{30,60,90,365}_compact` em PT e EN (valores "30d", "60d", "90d", "365d").
2. Assert defensivo: `lockGate.cta` continua a existir em ambos os locales (regressão se removerem por engano).
3. Em `report-shell-v2.tsx`: o uso de `<StickyUnlockBar />` depende de `lockBoundary` e não de `unlocked` — verificável por leitura do source (regex), em linha com o estilo dos testes existentes.

Não adicionamos teste React renderizado (a suite atual é node-pure). Validação visual fica para o smoke manual.

---

## Validação

- `bunx tsc --noEmit`
- `bunx vitest run src/components/report-redesign/v2/__tests__/premium-cta-unification.test.ts`
- Visual manual no preview (360×800 e 390×844):
  - Selector chips: sem clipping, "30d/60d/90d/365d".
  - Sticky bar visível acima da bottom-nav.
  - Body CTA, period selector e sticky bar abrem o **mesmo** `PremiumInterestDialog`; nenhum abre o `UnlockModal` de 5 passos.
  - Nenhum dos cliques desencadeia `/api/analyze-public-v1` (verificar Network).

---

## Ficheiros tocados

- `src/components/report-redesign/v2/report-shell-v2.tsx` — wrapper `LockGatePremium` + nova condição do sticky bar + comentário.
- `src/components/report-redesign/v2/analysis-period-selector.tsx` — chips com dual-label (compact/full).
- `src/i18n/locales/pt/report.json` — 4 novas keys compactas.
- `src/i18n/locales/en/report.json` — 4 novas keys compactas.
- `src/components/report-redesign/v2/__tests__/premium-cta-unification.test.ts` — assertions extra.

## Não toca

- `onSuccess` do onboarding, `/api/onboarding/start`, `/api/analyze-public-v1`.
- Lógica de créditos, Apify, OpenAI, DataForSEO, scoring, payload.
- `UnlockModal` antigo (mantém-se em código para casos legacy / fallback do `onUnlockClick` da rota).
- `report-lock-gate.tsx` (zero alterações no componente partilhado).
- Preços, emails, thumbnails, admin cost accounting.

## Checkpoint

- ☐ Fix 1 — body CTA abre `PremiumInterestDialog` e emite `premium_cta_clicked`
- ☐ Fix 2 — chips mobile sem clipping (labels compactos)
- ☐ Fix 3 — sticky bar restaurada no mobile
- ☐ Testes verdes + `tsc --noEmit` limpo
- ☐ Smoke manual a 360 e 390 px confirma os 3 fixes
