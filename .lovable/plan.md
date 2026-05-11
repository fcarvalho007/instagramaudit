## Objetivo
Permitir ao utilizador autenticado em `/app/account` ver e alterar o estado de `marketing_consent` do lead associado.

## Estado atual
- `src/routes/app.account.tsx` — mostra perfil + email do lead (`account.leadEmail`).
- `src/server/account.functions.ts` — tem `getAccountDetails` (devolve perfil + leadEmail) e `updateDisplayName`.
- `leads.marketing_consent` (bool) e `leads.marketing_consent_at` (timestamptz) já existem. Não há coluna `unsubscribed_at` — não vou criar nenhuma migração; uso apenas `marketing_consent_at` como timestamp da última alteração (consistente com unlock).
- `recordProductEvent()` em `src/lib/tracking.server.ts` é o helper já usado para `product_events`.

## Mudanças

### 1. `src/server/account.functions.ts`
- Estender `getAccountDetails` para devolver também:
  - `leadId: string | null`
  - `marketingConsent: boolean | null` (null se não houver lead)
- Adicionar nova server function `updateMarketingConsent`:
  - método `POST`, middleware `[withSupabaseHeaders, requireSupabaseAuth]`
  - input: `{ consent: boolean }`
  - lê `profiles.lead_id` do utilizador autenticado (`userId`)
  - se não houver `lead_id` → erro "Sem lead associado"
  - faz `update` em `leads` apenas onde `id = profile.lead_id` (segurança: nunca aceita id vindo do cliente) com `{ marketing_consent, marketing_consent_at: new Date().toISOString() }`
  - chama `recordProductEvent({ eventType: "marketing_consent_updated", leadId, metadata: { consent, source: "account_page" } })`
  - devolve `{ ok: true, marketingConsent }`

### 2. `src/routes/app.account.tsx`
Nova secção “Comunicações” (card separado por baixo do perfil), apenas visível se existir `account.leadId`:
- Título: **Comunicações**
- Linha descritiva: “Receber novidades e dicas sobre relatórios, análise de Instagram e marketing digital”
- Toggle (botão acessível, role="switch", aria-checked) ligado a `marketingConsent`
- Estado de loading durante o pedido; revert otimista se falhar
- Nota fina: “Emails estritamente necessários ao funcionamento do serviço podem continuar a ser enviados.”
- Estilo: tokens semânticos existentes (`bg-white`, `border-border-default/20`, `text-content-*`, `accent-primary`). Sem cores hardcoded.

### 3. Mobile
- Card empilha por defeito (`flex-col gap-3 sm:flex-row sm:items-center sm:justify-between`).

## Segurança
- `userId` vem sempre do middleware (`requireSupabaseAuth`).
- O update filtra `leads.id = profile.lead_id` lido no servidor — o cliente nunca passa `leadId` nem `email`.
- Nenhum outro campo do lead é alterado.

## Eventos novos
- `marketing_consent_updated` em `product_events` (metadata: `{ consent: boolean, source: "account_page" }`).

## Fora de scope
- Sem migrações de schema.
- Sem envio de emails, sem chamadas a Brevo/Resend/Apify/OpenAI/DataForSEO.
- Sem alteração ao fluxo de unlock nem ao endpoint público de unsubscribe (em paralelo).

## Validação
- `bunx tsc --noEmit`
- `bunx vitest run`
- Manual:
  - login → `/app/account` mostra toggle com estado correto
  - ON → OFF persiste em DB (`leads.marketing_consent = false`, `marketing_consent_at` atualizado), evento gravado
  - OFF → ON o mesmo
  - mobile (375px) layout legível
  - tentar chamar `updateMarketingConsent` sem sessão → 401

## Devolver no fim
- ficheiros alterados
- comportamento da nova server function
- nome do evento adicionado
- resultado da validação
