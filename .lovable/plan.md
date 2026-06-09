## 1. Current flow map

```text
/precos (CTA) ─► /checkout/<product>?source&return&coupon&intent
   │
   ├─ leadSession.hasLead === true  → <CheckoutSteps>  (billing + EuPago)
   │
   └─ leadSession.hasLead === false → <CheckoutAccountGate>
         (placeholder com "Cria a tua conta para continuar" +
          OrderSummary; abre <OnboardingModal purpose="checkout">)
         │
         OnboardingModal state machine (mesmo componente do report grátis):
           View "entry"          → email + "check-email"
             ├─ existing  → sendOtp → View "otp" (mode "existing")
             └─ new       → View "qualification"
                              → View "final" (nome+email+telemóvel+consents)
                                  → POST /api/onboarding/start
                                  → View "otp" (mode "new")
           View "otp"            → verifyOtp + POST /claim-existing
                                  → set lead_session cookie
                                  → onSuccess()
         │
         CheckoutAccountGate.handleSuccess:
           await queryClient.invalidateQueries(["checkout","lead-session"])
           await queryClient.refetchQueries(...)
         │
         Route re-render → hasLead===true → <CheckoutSteps>
```

A lógica do fluxo está correcta. O problema é **copy / UI**: o mesmo `OnboardingModal` (originalmente desenhado para o relatório grátis) é reusado em `purpose="checkout"` mas só ~30% das strings têm variante de checkout.

## 2. De onde vem a copy errada de "relatório grátis"

Ficheiro `src/components/onboarding/onboarding-modal.tsx` (e `src/i18n/locales/{pt,en}/gate.json`). Componentes partilhados ignoram `purpose` na maioria das strings:

**`EntryStepBody` (linhas 535–688)** — só o trio eyebrow/title/subtitle tem fork por `purpose`. O resto é hardcoded para o relatório grátis:
- linha 617 — `onboarding.entry.newBadge` ("Novo por aqui")
- linha 622 — `onboarding.entry.newTitle` ("Criar conta grátis")
- linha 626 — `onboarding.entry.newPromise` ("Recebes o relatório guardado e 2 créditos grátis…")
- linha 662 — `onboarding.entry.newCta` ("Criar conta e abrir relatório")
- linha 669/678 — `haveAccount` / `haveAccountCta` ("Já tens conta? · Entrar com email")
- O card inteiro com borda `border-primary/40` + ícone `Sparkles` + badge "NOVO POR AQUI" é uma UI desenhada para sell-de-conta-grátis; num contexto de pagamento parece publicidade gratuita.

**`FinalStepBody` (linhas 694–980)** — só eyebrow + title do painel navy têm variante:
- linha 754/761 — usa `*Checkout` ✓
- linha 769 — bullet "reportCheckout" ✓
- linha 778–783 — **bullet `credits` é renderizado SEM fork** ("2 créditos grátis após confirmação do email")
- linha 785 — bullet "save" ✓ (texto neutro)
- linha 969 — CTA `onboarding.final.right.cta` = **"Gerar o meu relatório →"** sem variante
- linha 974 — footnote "RGPD · sem spam" ok

**`QualificationStepBody` (linhas 999–1103)** — sem fork:
- linha 1032 — eyebrow "PASSO 2 DE 3" (genérico, aceitável mas pode parecer estranho num checkout)
- linha 1035 — title "O que melhor descreve o teu contexto?" (neutro, OK)

**`OtpVerifyPanel` (linhas 1116–1242)** — sem fork:
- linha 1170 — `onboarding.otp.subtitle` = **"Confirma o código de 6 dígitos para activar os teus 2 créditos grátis."** — pior caso, fala em créditos grátis no meio de um pagamento.
- linha 1163 — `existingTitle` = "Esta conta já existe. Enviámos um link para confirmares o acesso." (neutro, OK)

**`CheckoutAccountGate` (src/components/checkout/checkout-account-gate.tsx)** — placeholder por baixo do modal:
- linha 50/53 — "Cria a tua conta para continuar" + "Demora cerca de 30 segundos. Precisamos do teu email para te enviarmos o recibo e dar acesso ao relatório na tua conta privada." → tom OK mas pode ser endurecido.

## 3. Onde o telemóvel ainda é renderizado

`FinalStepBody` linhas 841–864 (`<Label htmlFor="onb-phone">` + `<Input id="onb-phone" type="tel" {...form.register("phone")} />`). É renderizado **sempre**, independente de `purpose`. As keys i18n vivem em `onboarding.final.right.{phoneLabel,phoneOptional,phonePlaceholder}`.

O telemóvel também está presente no schema (`src/lib/unlock-flow.ts`), no payload (`src/lib/leads/build-start-payload.ts`) e na rota `src/routes/api/onboarding/start.ts`. Como a decisão aprovada é **remover o campo do UI** mas a coluna `leads.phone` já existe e o payload aceita opcional, podemos:

- (opção A — recomendada para esta iteração) Remover o `<Input>` do `FinalStepBody` para ambos os purposes — o campo continua opcional no schema/server, simplesmente nunca é enviado. Zero risco de regressão.
- (opção B) Remover também do schema/payload/route. Mais limpo mas fora do scope desta tarefa de UI.

## 4. Qualification está presente?

Sim. O fluxo já força `View "qualification"` entre `entry` e `final` para emails novos (linha 266: `setView({ kind: "qualification", email })`). Validado server-side em `/api/onboarding/start`. O componente `QualificationStepBody` (1042–1100) usa `LEAD_QUALIFICATIONS` com as 6 opções pedidas pelo utilizador (`brand_company`, `marketing_comms`, `consultant_agency`, `content_creator`, `curiosity`, `other`). Não falta — só falta consistência de copy para o contexto checkout.

## 5. O que partilhar vs. o que fica checkout-specific

**Partilhar** (mesmo componente, comportamento idêntico, copy via `purpose`):
- `OnboardingModal` (state machine email → qualification → final → otp).
- `EntryStepBody`, `FinalStepBody`, `QualificationStepBody`, `OtpVerifyPanel`.
- Validação (`unlockFormSchema`), draft (`useOnboardingDraft`), tracking, OTP/claim/check-email.

**Checkout-specific** (variantes por `purpose="checkout"` em ficheiros existentes):
- Todas as strings sob a key `onboarding.*.<key>Checkout` no `gate.json` (existentes ampliadas; sem novos namespaces).
- Comportamento UI: ocultar o badge "Novo por aqui", remover ícone `Sparkles`, neutralizar o card outline azul (fica `border-border-default` em vez de `border-primary/40`).
- Esconder o campo telemóvel (decisão aprovada).
- Esconder o bullet de "2 créditos grátis" no painel navy (não é uma promessa do checkout).

**O que NÃO criar**: um novo modal `CheckoutOnboardingModal` paralelo. Duplicaria 1200+ linhas e cria divergência. A regra é: tudo o que é checkout-aware é controlado por `purpose`.

## 6. Fluxo corrigido (UI + copy)

```text
[Step 1 — Entry]            purpose="checkout"
   Eyebrow: "ANTES DE PAGAR"
   Title  : "Continua para o checkout"
   Body   : "Indica o teu email para associarmos a compra à tua conta."
   Card   : neutro (sem badge "Novo", sem Sparkles, sem promessa de créditos)
   Email input + CTA "Continuar"
   Trust  : "Sem subscrição. Sem cobrança automática. RGPD."

[Step 1b — Email já existe]   (mesma rota OTP, copy diferente)
   OtpVerifyPanel — mode="existing", purpose="checkout"
   Title  : "Confirma o acesso à tua conta"
   Body   : "Este email já tem conta. Enviámos um código para
            confirmares que és o titular."
   CTA    : "Confirmar e continuar"

[Step 2 — Qualification]     purpose="checkout"
   Eyebrow: "ANTES DE PAGAR"
   Title  : "O que melhor descreve o teu contexto?"
   Subtit.: "Uma escolha rápida — ajuda-nos a ajustar a tua experiência."
   Select obrigatório (6 opções já existentes)
   CTA    : "Continuar"

[Step 3 — Final]             purpose="checkout"
   Eyebrow (navy left)   : "ANTES DE PAGAR"
   Title    (navy left)  : "Só faltam alguns dados"
   Bullets  (navy left)  :
      • "A tua compra fica associada à tua conta"
      • "Recebes o recibo no email indicado"
      • "Podes voltar aos relatórios sempre que quiseres"
      • "Sem subscrição nem cobrança automática"
   Form (right):
      • Nome
      • Email (com check ✓ quando válido)
      • [ telemóvel removido ]
      • Consent GDPR (obrigatório)
      • Marketing (opcional)
   CTA   : "Criar conta e continuar"

[Step 3b — OTP de confirmação (email novo, após /start)]
   OtpVerifyPanel — mode="new", purpose="checkout"
   Title  : "Confirma o teu email"
   Body   : "Enviámos um código para {{maskedEmail}}. Confirma para
            continuares para o pagamento."
   CTA    : "Confirmar e continuar"

→ /claim-existing → lead_session cookie → CheckoutSteps
   (URL e search params inalterados: source, return, coupon, intent, pack)
```

Search params são preservados porque nem `CheckoutAccountGate` nem o `OnboardingModal` navegam — apenas invalidam a query de sessão e o router re-renderiza a mesma URL.

## 7. Ficheiros afectados

| Ficheiro | Mudança |
|---|---|
| `src/components/onboarding/onboarding-modal.tsx` | Aplicar `purpose === "checkout"` a todas as strings/elementos que hoje estão hardcoded; remover render do `<Input>` telemóvel; propagar `purpose` ao `OtpVerifyPanel`; neutralizar UI do card de entry (sem badge, sem Sparkles, sem promessa créditos) quando `purpose === "checkout"`; ocultar o bullet `credits` no `FinalStepBody` quando `purpose === "checkout"`. |
| `src/i18n/locales/pt/gate.json` | Acrescentar/ajustar keys de checkout (lista abaixo). |
| `src/i18n/locales/en/gate.json` | Espelhar em EN as keys novas/alteradas. |
| `src/components/checkout/checkout-account-gate.tsx` | Apertar a copy do placeholder (eyebrow "ANTES DE PAGAR", título "Continua para o checkout", subtítulo orientado a pagamento). Sem alteração de comportamento. |

**Não tocar**: `unlock-flow.ts`, `build-start-payload.ts`, `routes/api/onboarding/*`, EuPago, webhooks, credits, produtos, checkout routes, schema da BD.

## 8. Implementation plan (a executar em build mode)

### 8.1 `gate.json` (PT + EN — espelho)

Adicionar / ajustar sob `onboarding`:

```jsonc
"entry": {
  // já existem: eyebrowCheckout, titleCheckout, subtitleCheckout
  "newCtaCheckout": "Continuar",                       // novo
  "newPromiseCheckout": "",                            // vazio → render condicional esconde a linha
  "newTitleCheckout": "",                              // idem
  "newBadgeCheckout": "",                              // idem
  "trustLineCheckout": "Sem subscrição. Sem cobrança automática. RGPD.",
  "haveAccountCheckout": "Já tens conta?",
  "haveAccountCtaCheckout": "Entrar →"
},
"qualification": {
  "eyebrowCheckout": "ANTES DE PAGAR",                 // novo
  "titleCheckout": "O que melhor descreve o teu contexto?",
  "subtitleCheckout": "Uma escolha rápida — ajuda-nos a ajustar a tua experiência."
},
"final": {
  "left": {
    // já existem: eyebrowCheckout, titleCheckout, bullets.reportCheckout
    "bullets": {
      "receiptCheckout": "Recebes o recibo no email indicado",
      "returnCheckout":  "Podes voltar aos relatórios sempre que quiseres",
      "noSubCheckout":   "Sem subscrição nem cobrança automática"
    }
  },
  "right": {
    "ctaCheckout": "Criar conta e continuar",
    "footnoteCheckout": "Sem subscrição. RGPD."
  }
},
"otp": {
  "titleNewCheckout": "Confirma o teu email",
  "subtitleNewCheckout": "Enviámos um código para {{maskedEmail}}. Confirma para continuares para o pagamento.",
  "titleExistingCheckout": "Confirma o acesso à tua conta",
  "subtitleExistingCheckout": "Este email já tem conta. Enviámos um código para confirmares que és o titular.",
  "ctaCheckout": "Confirmar e continuar"
}
```

### 8.2 `onboarding-modal.tsx`

- `EntryStepBody`:
  - quando `purpose === "checkout"`:
    - não renderizar `<span>` do `newBadge` (linha 616).
    - não renderizar o bloco `Sparkles + newTitle` (linhas 619–624).
    - não renderizar o `<p>` `newPromise` (linhas 625–627).
    - substituir CTA por `entry.newCtaCheckout` ("Continuar").
    - substituir `haveAccount` / `haveAccountCta` / `trustLine` pelas variantes Checkout.
  - container do form: trocar `border-primary/40 bg-primary/[0.03]` por `border-border-default bg-white` quando checkout — visual neutro de checkout.
- `QualificationStepBody`:
  - aceitar `purpose` (prop nova, default "analyze").
  - escolher `qualification.{eyebrow,title,subtitle}` vs `*Checkout`.
- `FinalStepBody`:
  - **remover sempre** o bloco do `<Input id="onb-phone">` (linhas 841–864) e a respectiva `<Label>` — telemóvel sai do UI em todos os purposes (decisão aprovada).
  - quando `purpose === "checkout"`:
    - esconder o `<FinalBullet>` `bullets.credits` (linhas 777–783).
    - acrescentar 3 bullets novos: `receiptCheckout`, `returnCheckout`, `noSubCheckout`.
    - CTA usa `final.right.ctaCheckout` ("Criar conta e continuar"). Manter ícone `Sparkles`? — não, em checkout usar `Lock` (visual já existente em `/checkout/credits`).
    - footnote usa `final.right.footnoteCheckout`.
- `OtpVerifyPanel`:
  - aceitar `purpose` (prop nova).
  - quando `purpose === "checkout"`:
    - `title` = `mode === "existing" ? otp.titleExistingCheckout : otp.titleNewCheckout` (com interpolação `maskedEmail` no caso `new`).
    - `subtitle` correspondente.
    - CTA = `otp.ctaCheckout`.
    - esconder o `mode === "existing"` short paragraph hoje em linha 1162 quando já cobre pelo título.
- `OnboardingModal`: propagar `purpose` a `QualificationStepBody` e `OtpVerifyPanel` (chamadas linhas 495 e 514).

### 8.3 `checkout-account-gate.tsx`

Substituir o header (linhas 46–58) por:
- eyebrow: "ANTES DE PAGAR" (já é `text-eyebrow-sm`).
- h1: "Continua para o checkout".
- subtítulo: "Cria conta ou entra em ~30 segundos. Associamos a tua compra à tua conta e enviamos-te o recibo por email."

Manter o card de trust e o `OrderSummary`. Nenhuma alteração de lógica.

## 9. Riscos & edge cases

- **Email novo vs. existente no checkout**: o ramo "existing" hoje salta `qualification` e `final` — mantém-se. Tem que continuar a aparecer copy "Confirma o acesso à tua conta" e CTA "Confirmar e continuar" (variante OTP existing/checkout).
- **Reaproveitamento do mesmo modal em `/analyze`**: garantir que `purpose` default permanece `"analyze"` e que as keys originais (`entry.newTitle`, `entry.newCta`, `final.right.cta`, `otp.subtitle`, `qualification.eyebrow`) **não são alteradas** — só são acrescentadas variantes `*Checkout`.
- **Bullet "credits" escondido em checkout**: ocultar visualmente mas continuar a conceder os 2 créditos via webhook/`claim-existing` — é uma decisão de não-anunciar, não de não-conceder.
- **Phone removido do UI mas presente no schema**: builder envia `phone` apenas quando `trim().length > 0`; sem input, o campo fica sempre vazio → payload omite. Sem regressão server-side. (Limpeza completa do schema/route fica para um turno separado.)
- **Search params**: continuam preservados (gate não navega, OnboardingModal não navega; só invalida query). Tem que ser explicitamente revalidado no QA.
- **`/analyze/$username` rota**: o `OnboardingModal` aí continua a usar `purpose="analyze"` — copy não muda. Risco zero se as keys legadas não forem renomeadas.
- **Tracking**: `trackOnboardingEvent` continua a usar os mesmos step indexes (0=entry, 1=qualification, 2=otp, 3=final). Sem mudança.
- **Acessibilidade**: o card de entry em checkout passa a ter apenas input + CTA — confirmar que mantém label/aria-label adequada (`<Label>` para `onb-entry-email` ou `aria-label` no input).
- **Mobile**: o painel navy do `FinalStepBody` empilha por cima do form em mobile; com 4 bullets em vez de 3, ganha apenas uma linha — sem layout shift relevante.
- **i18n EN**: criar as keys correspondentes em inglês ao mesmo tempo. Faltar uma trava o build via `Trans`/`t()` em ambiente de QA EN.

Sem alterações em payments, webhooks, RLS, schema da BD, ou rotas de checkout além do `CheckoutAccountGate`.
