# /precos → checkout: eliminar o dead-end

## Problema

Hoje `/precos` → "Obter relatório completo" → `/checkout/report-full?return=/precos`. O loader corre `getLeadSessionStatus()`; se não há cookie `lead_session`, renderiza `MissingLeadSession` com:

- Título: "Para desbloquear o relatório, começa por criar a tua conta gratuita."
- Botões: **"Voltar aos preços"** (loop) + **"Analisar perfil"** (volta ao home).

Não há forma de criar conta a partir deste ecrã — é literalmente um beco sem saída. Os 3 checkouts (`report-full`, `authority-diagnosis`, `credits`) usam o mesmo componente e têm o mesmo problema.

**Causa raiz:** o único caminho actual para obter `lead_session` é via `OnboardingModal`, aberto apenas em `/analyze/$username` depois de uma análise. Quem chega a `/precos` direto nunca passou por aí.

## Objectivo

Quando o utilizador clica num plano em `/precos`, o checkout abre — sempre. Se já tem sessão, vai direto à confirmação/faturação. Se não tem, **a criação de conta acontece dentro do próprio checkout** (sem voltar para `/precos` nem para `/`), e segue depois para o resto do fluxo de pagamento sem perder contexto (produto, cupão, source, return).

## Verificações que já fiz

- `src/routes/api/onboarding/start.ts` aceita payload **sem `handle`** (linha 50: `handle: z.string().optional()` e apenas tracking-only — não persiste).
- `OnboardingModal` usa `handle` só como metadata (drafts + tracking events) — passar string vazia é seguro funcionalmente.
- `lead_session` cookie é setado no fim do `/start` (ou `/claim-existing` para OTP); o `getLeadSessionStatus` query pode ser invalidada e o loader re-corre.
- `MissingLeadSession` é usado por 3 rotas: `checkout.report-full.tsx:94`, `checkout.authority-diagnosis.tsx:82`, `checkout.credits.tsx:119`.

## Solução

**Substituir `MissingLeadSession` por um passo de onboarding inline** dentro do próprio checkout. Em vez de mostrar um dead-end, mostra o mesmo formulário do `OnboardingModal` (entry + final + OTP) embebido na coluna principal da página de checkout. Quando termina com sucesso, invalida a query da sessão e a página re-renderiza `CheckoutSteps` no estado normal.

### Componente novo

`src/components/checkout/checkout-onboarding-inline.tsx` — variante "inline" do onboarding (não Dialog). Reutiliza:
- `EntryStep` + `FinalStep` + `OtpStep` extraídos da modal (já são sub-componentes; tornar exports nomeados).
- `useOnboardingDraft`, `buildStartPayload`, `trackOnboardingEvent`, `unlockFormSchema` — sem alterações.
- Recebe props: `source` (`"pricing_page"` etc.), `productCode`, `onSuccess` (callback que invalida `leadSessionQueryOptions` e segue).
- Passa `handle=""` ao chamar o endpoint (server já aceita).

### Wiring nas 3 rotas de checkout

Em `checkout.report-full.tsx`, `checkout.authority-diagnosis.tsx`, `checkout.credits.tsx`, substituir:

```tsx
if (!leadStatus.hasLead) {
  return <MissingLeadSession ... />;
}
```

por:

```tsx
if (!leadStatus.hasLead) {
  return (
    <CheckoutOnboardingInline
      source={search.source ?? "checkout_direct"}
      productCode={SOURCE_PRODUCT}
      onSuccess={() => queryClient.invalidateQueries(leadSessionQueryOptions)}
    />
  );
}
```

O `useSuspenseQuery` re-faz fetch automaticamente quando a query é invalidada e o cookie já foi setado pelo `/start` (ou `/claim-existing`), portanto a página transita para `CheckoutSteps` sem reload completo nem perda dos query-params (`source`, `return`, `coupon`).

### Copy do header inline (PT-PT)

- Eyebrow: "Antes de pagar" (Inter uppercase)
- H1 (Fraunces): "Cria a tua conta para continuar"
- Subtítulo: "Em ~30 segundos. Usamos o teu email para enviar o recibo e dar acesso ao relatório."
- Caixa de confiança (Inter, pequena): "Sem subscrição. Sem cobrança automática. Apagas a conta quando quiseres."

Mantém a coluna lateral `OrderSummary` visível em `lg:` para o utilizador ver sempre o produto que está a comprar e o preço — reforça que o checkout não foi abandonado.

### Manter `MissingLeadSession`?

Não é eliminado, mas deixa de ser usado pelas 3 rotas de checkout. Fica disponível como fallback para situações em que invalidar a sessão (por ex. logout no meio do checkout) — pode ser removido num passo de cleanup futuro. Sem mudança nesse componente neste plano.

## Ficheiros a tocar

1. **`src/components/onboarding/onboarding-modal.tsx`** — extrair `EntryStep`, `FinalStep`, `OtpStep` como exports nomeados (já são componentes internos). Sem mudança de comportamento.
2. **`src/components/checkout/checkout-onboarding-inline.tsx`** (novo) — variante inline, reutiliza os 3 steps + a lógica de submit / OTP da modal.
3. **`src/routes/checkout.report-full.tsx`** — trocar `<MissingLeadSession ...>` por `<CheckoutOnboardingInline ...>`.
4. **`src/routes/checkout.authority-diagnosis.tsx`** — idem.
5. **`src/routes/checkout.credits.tsx`** — idem.
6. **`src/i18n/locales/{pt,en}/gate.json`** — adicionar `onboarding.checkoutInline.{eyebrow,title,subtitle,trust}` (sem mexer nas existentes).
7. **Tracking** — adicionar evento `checkout_onboarding_shown` com `{ source, product_code }` para medir quantos chegam ao checkout sem sessão. Reutiliza `trackOnboardingEvent`.

## Comportamentos invariantes (não mudam)

- `OnboardingModal` em `/analyze/$username` continua igual (com handle real).
- Servidor `/api/onboarding/start` e `/api/onboarding/claim-existing` — zero mudanças.
- Verificação por OTP, créditos só após verificação, idempotência — tudo intacto.
- Lead criado sem handle: campo `handle` continua a ser opcional em `leads`. O utilizador pode mais tarde gerar análises e o lead fica naturalmente associado ao primeiro snapshot que crie.
- `/checkout/credits` (compra de pack) com lead já existente — sem mudança, continua a abrir directamente o billing form.

## Riscos e edge-cases

1. **Email já existente** — o `/start` rejeita com `EMAIL_REQUIRES_VERIFICATION` e a UI tem de cair no passo OTP. Já está suportado no modal; herdamos o mesmo handler.
2. **Cookie não chega a tempo de re-render** — `invalidateQueries` força refetch via `useSuspenseQuery`; o `getLeadSessionStatus` lê o cookie da request. Como o `/start` já setou o `Set-Cookie` antes de devolver, a próxima request server-fn já o envia. Cobrir com toast "A preparar checkout…" durante o refetch.
3. **Coupon / return / source nos query-params** — não tocamos no URL; `Route.useSearch()` mantém-nos disponíveis no re-render do `CheckoutSteps`.
4. **OTP modal abre como overlay** — para o passo OTP usamos a mesma UI da modal mas renderizada inline (sem `<Dialog>`). Verificar que `verifyOtp` + `claim-existing` continuam a funcionar sem mudar o ciclo de vida do form.
5. **Falta de handle no lead** — alguns reports/listas admin assumem `handle` presente; verificar `admin/leads` e `lead-context-labels` não quebram quando o campo é `null`. Spot-check rápido na build.

## Plano de implementação (build mode)

1. Extrair `EntryStep`/`FinalStep`/`OtpStep` como exports nomeados em `onboarding-modal.tsx` (sem alterar interna).
2. Criar `checkout-onboarding-inline.tsx` reaproveitando o submit handler / OTP handler da modal — mover a lógica partilhada para um hook `useOnboardingSubmit({ handle: "" })`.
3. Trocar `MissingLeadSession` pelas 3 rotas de checkout.
4. Adicionar copy i18n.
5. Adicionar `trackOnboardingEvent("checkout_onboarding_shown", { source, product_code })`.
6. Run vitest nos ficheiros tocados + smoke manual em `/precos` → cada um dos 3 CTAs.

## QA manual (após implementação)

1. Sessão limpa (cookies apagados), abrir `/precos` em incógnito → clicar "Obter relatório completo" → ver formulário inline (não dead-end). Confirmar que o card lateral mostra "Relatório completo · 9€".
2. Submeter email novo → entrar no passo final (2-col) → submeter → ver `CheckoutSteps` (Step 1 — confirmar desbloqueio). Sem redirect para `/precos` nem para `/`.
3. Repetir com email já registado → ver passo OTP inline → introduzir código → seguir para checkout.
4. Repetir cliques em "Reservar diagnóstico" (97€) e (com sessão existente) "Comprar 1 crédito" (vindo de outra origem) — confirmar que utilizadores com sessão saltam o passo inline.
5. Confirmar que `?source=pricing_page&return=/precos&coupon=XPTO` são preservados depois da criação de conta.

## Não inclui

- Não removo `MissingLeadSession` (fica como fallback defensivo).
- Não toco em `OnboardingModal` para além de extrair sub-componentes.
- Não mudo nada no servidor, schema, RLS, webhooks, créditos.
- Não adiciono campo "Instagram username" no checkout — não é necessário para criar a conta nem para pagar.
