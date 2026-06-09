## Goal

Revisar o plano de "`/precos` → checkout inline onboarding" agora que `/api/onboarding/start` já não emite `lead_session` por si só. O acesso ao checkout só se desbloqueia depois de OTP/magic-link verificado via `/api/onboarding/claim-existing`.

## Estado actual (verificado no código)

`CheckoutAccountGate` (`src/components/checkout/checkout-account-gate.tsx`) já monta o `OnboardingModal` com `purpose="checkout"` e `onSuccess` ligado a `queryClient.invalidateQueries(leadSessionQueryOptions)`. O modal foi recentemente reestruturado em 3 passos visíveis + OTP:

1. `entry` — email apenas.
2. `qualification` — `LEAD_QUALIFICATIONS` (obrigatório).
3. `final` — nome + email pré-preenchido + telemóvel opcional + GDPR/marketing.
4. `otp` — 6 dígitos via `supabase.auth.verifyOtp` → POST `/api/onboarding/claim-existing` → set `lead_session` cookie → `onSuccess(handle, { leadId, credits })`.

Para emails que já existem em `leads`, `entry` despacha directo para `otp` (sem qualification/final). `/start` agora dispara o OTP server-side e devolve `verification_required: true`; só o claim-existing concede sessão.

Conclusão: o fluxo OTP **já está integrado** no `CheckoutAccountGate`. O plano original ("substituir MissingLeadSession por inline onboarding") está conceptualmente correcto e já implementado. Esta revisão **confirma** o que ficou no código, documenta as invariantes que faltavam, e adiciona hardening + um guard novo para `/checkout/credits`.

## Fluxo unificado (após revisão)

```text
/precos (CTA "Obter relatório completo"/"Comprar 1 crédito · 9€")
  └─► /checkout/<product>?source=...&return=...&coupon=...&intent=...
        ├─ getLeadSessionStatus()
        ├─ hasLead === false  → <CheckoutAccountGate>
        │     └─ <OnboardingModal purpose="checkout">
        │         email novo  : entry → qualification → final → /start → otp
        │         email existente: entry → otp (claim)
        │         OTP OK → /claim-existing → lead_session cookie
        │              → onSuccess() → invalidate leadSessionQueryOptions
        │              → useSuspenseQuery refetcha → hasLead === true
        └─ hasLead === true   → <CheckoutSteps> (Billing → EuPago)
```

Em todo o caminho, **os search params (`source`, `return`, `coupon`, `pack`, `intent`) ficam intactos** porque o `CheckoutAccountGate` não navega — só invalida a query. O re-render usa `Route.useSearch()` da mesma URL.

## Invariantes a garantir (e como)

1. **OTP obrigatório antes do checkout**: garantido porque `OnboardingModal.onSuccess` só dispara dentro de `handleOtpVerify`, depois do `claim-existing` 2xx. O gate nunca chama `onSignedIn` por outra via.
2. **Qualification sempre enviada**: `entry → qualification` é obrigatório para emails novos; `final.submit` chama `/api/onboarding/start` que rejeita 400 se faltar. Emails existentes saltam qualification — está correcto porque o lead já tem registo prévio e o `/start` não é chamado nesse ramo (vai por `claim-existing`).
3. **Search params preservados**:
   - `searchSchema` em cada checkout route já valida e propaga `source / return / coupon / pack / intent`.
   - `CheckoutAccountGate` não faz `navigate(...)` ao concluir; usa apenas `invalidateQueries`. URL fica idêntica.
   - O botão "Voltar" do gate usa `exitPath` (default `/precos`), preservando `return` quando passado pelo route (`exitPath={search.return ?? "/precos"}`).
4. **Sem dead-end**: `MissingLeadSession` foi removido das 3 rotas de checkout; o gate substitui-o.

## Mudanças a aplicar (delta sobre o plano anterior)

### A. Documentação / comentários (sem mudança funcional)
- `src/components/checkout/checkout-account-gate.tsx`: adicionar JSDoc explicitando que `onSignedIn` só é chamado após OTP verificado e `lead_session` emitido por `/claim-existing`.
- `src/components/onboarding/onboarding-modal.tsx`: cabeçalho — confirmar que para `purpose="checkout"` o caller deve invalidar a query de sessão no `onSuccess`, sem navegar.

### B. Hardening de query params no gate
- `CheckoutAccountGate`: aceitar prop opcional `returnPath?: string` e usá-la como `exitPath` quando presente (hoje já vem via `exitPath={search.return ?? "/precos"}`; renomear para clareza não é estritamente necessário — manter).
- Após `onSignedIn`, em vez de só invalidar, fazer `await queryClient.invalidateQueries(...)` + `refetchQueries(...)` para garantir que o `useSuspenseQuery` reentra com `hasLead = true` antes do próximo render. Evita pisca-pisca onde o modal fecha mas o gate ainda mostra placeholder.

### C. Guard / aviso novo em `/checkout/credits`
- Adicionar um banner informativo (não bloqueante) **no `CheckoutSteps` de `/checkout/credits`** dizendo: "Os créditos só são úteis se já tiveres acesso Pro — caso ainda não tenhas, começa pelo relatório completo." Com CTA secundário "Ver opções Pro" → `/precos`.
  - Justificação: créditos extra só fazem sentido para utilizadores Pro; um lead recém-criado pode chegar aqui via campanha/link e comprar créditos sem ter o relatório completo.
  - Decisão de não bloquear: até termos sinal claro de "Pro vs não-Pro" no client (`entitlements`/`getMyCreditBalance` ainda não devolve esse flag), preferir banner em vez de redirect. Risco documentado.
- Tracking: emitir `credits_pack_non_pro_warning_shown` quando o banner aparecer (i.e., sempre que o lead não tenha relatório `report_full_9` confirmado — sinal ainda não disponível server-side; numa primeira fase mostrar sempre, refinar quando houver flag).

### D. Tracking adicional
- Em `CheckoutAccountGate`, emitir `checkout_onboarding_shown` no mount e `checkout_onboarding_completed` no `onSignedIn`, ambos com `{ product_code, source, return }`. Útil para medir conversão da gate.

### E. i18n
- Nenhuma key nova obrigatória além do que já existe (`onboarding.entry.*Checkout`, `onboarding.final.*Checkout`, `onboarding.qualification.*`).
- Adicionar `checkout.credits.proWarning.{eyebrow,title,body,cta}` para o banner do guard.

## Fora do scope (recordatório)

- `report_full_9`: nada muda.
- Sem packs 3/10/25, sem selector de quantidade.
- Sem alteração ao webhook EuPago, `grantCreditPackLaunchBonus`, ou `+2 bónus`.
- Sem alteração à copy pública ("1 crédito · 9€"); o bónus continua só visível em `PostPurchaseSuccessPanel`.
- Não mexer em `/api/onboarding/start` nem em `claim-existing` para além do já feito (phone opcional já adicionado).

## Ficheiros tocados (delta vs plano anterior)

Já feitos no turno anterior (não precisam reedição):
- `src/components/onboarding/onboarding-modal.tsx` — 3 passos + OTP.
- `src/components/checkout/checkout-account-gate.tsx` — monta modal + invalida sessão.
- `src/routes/checkout.report-full.tsx`, `checkout.authority-diagnosis.tsx`, `checkout.credits.tsx` — usam gate.
- `src/i18n/locales/{pt,en}/gate.json` — keys checkout/qualification.
- `src/lib/unlock-flow.ts`, `src/lib/leads/build-start-payload.ts`, `src/routes/api/onboarding/start.ts` — phone opcional.

Por aplicar nesta iteração:
1. `src/components/checkout/checkout-account-gate.tsx` — JSDoc + `await invalidateQueries + refetchQueries`, eventos `checkout_onboarding_{shown,completed}`.
2. `src/routes/checkout.credits.tsx` — banner "Não-Pro" + tracking + uso da key i18n nova.
3. `src/i18n/locales/{pt,en}/checkout.json` (ou bloco em `gate.json` se preferirmos manter um namespace) — `checkout.credits.proWarning.*`.

## QA manual (revisto)

1. **Email novo, `/precos` → relatório completo**, em incógnito:
   - `entry` → escreve email → `qualification` (escolhe opção) → `final` (nome + GDPR; telemóvel vazio) → submit → modal mostra `otp` → introduz código do mailbox → claim-existing 200 → modal fecha → `CheckoutSteps` aparece → query params (`source/return/coupon`) preservados na URL.
2. **Email existente, `/checkout/credits?source=ad&return=/relatorio/x`**:
   - `entry` → reconhece email → vai direto a `otp` → confirma código → checkout abre → search params intactos → banner "Não-Pro" visível.
3. **OTP errado**: erro inline; pode reenviar; sessão não é criada; gate continua a mostrar placeholder.
4. **Voltar no gate**: redirecciona para `exitPath` (default `/precos`).
5. **Telemóvel preenchido** no passo `final` é gravado em `leads.phone`.
6. **Lead Pro real** (com `report_full_9` activo): banner do `/checkout/credits` ainda aparece nesta fase (sem flag server-side); registar como melhoria futura.

## Riscos remanescentes

- Detecção "Pro vs não-Pro" no cliente ainda inexistente — banner é genérico até `getMyCreditBalance` (ou um novo `getMyEntitlements`) devolver esse sinal. Mitigação: aceitar banner para todos até ao próximo ciclo.
- Race: utilizador completa OTP e fecha tab antes de o webhook do EuPago disparar — irrelevante aqui (ainda não está em checkout no momento do OTP); risco coberto pelo `PostPurchaseSuccessPanel` que faz polling.
- Cookie SameSite/secure em domínio custom: já validado anteriormente.
