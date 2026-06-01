## Endpoint tests para `/api/onboarding/start`

Adicionar testes focados ao handler. Uma pequena reestruturação isolada permite testar sem montar o runtime TanStack — sem mudar comportamento.

### Refactor mínimo (sem alterar comportamento)

`src/routes/api/onboarding/start.ts`:
- Extrair o corpo do `POST` para uma função exportada `handleOnboardingStart(request: Request): Promise<Response>`.
- O `Route.server.handlers.POST` passa a ser `({ request }) => handleOnboardingStart(request)`.
- Nada mais muda: mesmas validações, mesma ordem (honeypot → timing → upsert → grant → cookie → balance), mesmos status codes e error_codes, mesmas mensagens, mesmo cookie HttpOnly via `setLeadCookie`.

Justificação: o handler atual é uma closure inline dentro de `createFileRoute(...)`, inacessível a vitest sem montar o router. Extrair para função exportada é puramente organizacional.

### Novo ficheiro de teste

`src/routes/api/onboarding/__tests__/start.test.ts` com `vitest` + `vi.mock` para isolar todas as dependências de I/O:

1. **`@/integrations/supabase/client.server`** — `supabaseAdmin` mock com um store in-memory (`Map<email_normalized, { id, ...row }>`). Os chainables (`.from().select().eq().maybeSingle()`, `.from().insert().select().single()`, `.from().update().eq()`) são thenables que devolvem `{ data, error }` a partir do store.

2. **`@/lib/credits/credits.server`** — mock de `grantInitialCredits(leadId)` que incrementa um contador por lead apenas na primeira chamada (simulando o unique index `uniq_credit_ledger_initial_grant`); `getBalance(leadId)` devolve o contador.

3. **`@/lib/leads/lead-cookie.server`** — mock de `setLeadCookie` como `vi.fn()` para asserções; o teste de SESSION_SECRET sobrescreve com `mockImplementationOnce(() => { throw new Error("SESSION_SECRET missing or too short (need at least 32 chars).") })`.

### Casos cobertos

| # | Cenário | Asserções |
|---|---------|-----------|
| 1 | Payload válido (name, email, phone, consents) | `status === 200`; `body.ok === true`; `body.lead_id` é UUID; `body.credits === 2`; `setLeadCookie` foi chamado **uma** vez com `body.lead_id` |
| 2 | Payload inválido (email omitido) | `status === 400`; `body.error_code === "INVALID_PAYLOAD"`; `setLeadCookie` não foi chamado; mensagem em PT mas **não** revela o nome do campo Zod |
| 3 | Email duplicado (duas chamadas, mesmo email) | Ambas respondem 200 com o **mesmo `lead_id`**; `body.credits === 2` nas duas (não 4); o mock de `grantInitialCredits` foi chamado 2x mas o contador interno só subiu 1x |
| 4 | `SESSION_SECRET` curto / em falta | `setLeadCookie` mock lança a mensagem real do módulo; resposta `status === 500`, `body.error_code === "INTERNAL_ERROR"`, `body.message === GENERIC_FALLBACK_MESSAGE`; a mensagem **não** contém "SESSION_SECRET" nem "secret" (assert de segurança) |
| 5 | Telemóvel com formatação `"+351 912 345 678"` | `status === 200`; o payload entregue ao mock `.insert(...)` contém `phone: "+351 912 345 678"` e `phone_normalized: "351912345678"` (digits-only, conforme linha 107/129 do handler) |

### Notas

- Não testamos o header `Set-Cookie` na `Response` porque `setCookie` do TanStack escreve via AsyncLocalStorage (não no objeto Response). O proxy correto e estável é spy em `setLeadCookie` — exatamente a fronteira que o handler usa.
- Não montamos servidor HTTP nem invocamos `Route`. Os testes chamam `handleOnboardingStart(new Request(...))` diretamente.
- Honeypot, timing-guard, persistence_failed: já existem hooks no código mas ficam fora deste lote (o pedido foca-se em 5 casos). Os mocks deixam o caminho aberto para os adicionar depois sem rework.
- Se algum dos 5 casos expuser um bug real no handler, faço a correção mínima em `start.ts` e documento na nota do teste; caso contrário, `start.ts` só sofre o refactor de extração.

### Fora de âmbito

UI, modal, `credits.server` real, base de dados real, edge functions, cron, Apify, OpenAI.
