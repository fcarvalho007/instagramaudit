## Estado atual

- Suite global: **293/293 verde** (já corrigida no turn anterior)
- `lead-magnet-sequence.test.ts`: 10/10 com mocks corretos (table-aware supabase, env snapshot/restore, Brevo isolado)
- `transactional-email.test.ts`: 8/8 (Brevo + Resend mockados, env override por teste)

Restam apenas as tarefas adicionais — adicionar cobertura ao endpoint `send-commercial-followup`.

## Objetivo

Criar `src/routes/api/admin/__tests__/send-commercial-followup.test.ts` cobrindo: validação de payload, gates de admin/lead/email, sucesso, falhas do provider (timeout, sandbox-block, 5xx), transição de `commercial_status`, e idempotência do `checkout_url`.

## Estratégia

Importar a `Route` real e invocar `Route.options.server.handlers.POST({ request })`. Mockar **todas** as dependências externas (sem chamadas reais a Resend/DB/Brevo):

- `@/integrations/supabase/client.server` — `supabaseAdmin` table-aware (`leads`, `beta_feedback`, `report_requests`, update)
- `@/lib/admin/session` — `requireAdminSession`
- `@/lib/admin/lead-events.server` — `recordLeadEvent`
- `@/lib/email/sender` — `resolveSender`
- `@/lib/email/templates` — `renderCommercialFollowup` (não precisa mock, é puro)
- `globalThis.fetch` — interceptar `https://api.resend.com/emails`

Snapshot/restore de `process.env.RESEND_API_KEY`, `PUBLIC_APP_BASE_URL` por teste.

## Casos de teste (10)

1. **401 sem sessão admin** → `requireAdminSession` rejeita → resposta `UNAUTHORIZED`.
2. **400 payload inválido** → falta `lead_id` → `INVALID_PAYLOAD`.
3. **400 checkout_url malformado** → `"not-a-url"` → `INVALID_PAYLOAD`.
4. **Aceita checkout_url vazio** (preprocess → undefined) → handler prossegue, body do Resend não inclui CTA com URL custom.
5. **500 sem RESEND_API_KEY** → `EMAIL_PROVIDER_NOT_CONFIGURED`.
6. **404 lead não encontrado** → `leads.maybeSingle` devolve `null` → `LEAD_NOT_FOUND`.
7. **422 lead sem email / email malformado** → `LEAD_EMAIL_MISSING` / `LEAD_EMAIL_INVALID`.
8. **Sucesso, intent alto** → fetch Resend OK → resposta `success: true`, `new_status: "potencial_cliente"`, `recordLeadEvent` chamado com `commercial_followup_sent` + `checkout_url`, update em `leads` com `commercial_status` e `contacted_at`.
9. **Sucesso preserva status terminal** → `commercial_status: "convertido"` + intent alto → update **não** sobrescreve `commercial_status`, apenas `contacted_at`.
10. **Resend 422 sandbox block** → corpo "you can only send testing emails to verified" → `RESEND_SANDBOX_RECIPIENT_BLOCKED`, `recordLeadEvent` com `commercial_followup_failed`.
11. **Resend timeout (AbortError)** → `RESEND_TIMEOUT`, evento de falha registado.

(Total: 11 testes; cobre todos os ramos relevantes.)

## Ficheiro a criar

`src/routes/api/admin/__tests__/send-commercial-followup.test.ts`

Padrão: `vi.mock` no topo, `beforeEach` reseta mocks + env, `afterEach` restaura `process.env` e `globalThis.fetch`. Helper `invokePost(body)` constrói `Request` JSON e chama `Route.options.server.handlers.POST({ request })` (com fallback para `Route.update().options...` se a API interna do TanStack assim exigir — verificar à execução).

## Riscos

- **Acesso ao handler via `Route.options`**: API interna do TanStack pode mudar. Se `Route.options.server.handlers.POST` não estiver acessível, fallback é refatorar a route mantendo o handler exportado num módulo helper (`send-commercial-followup.handler.ts`) e a route apenas faz `createFileRoute(...)({ server: { handlers: { POST: handler } } })`. Decidir à execução com base no que está exposto.
- **Side-effects de import**: importar a route não regista nada perigoso (route tree é gerada à parte). Confirmado: `routeTree.gen.ts` é o único registo real.
- **`requireAdminSession` lê headers do request**: substituído por mock que devolve `{ email: "admin@x.pt" }`.

## Validação

```
bunx vitest run src/routes/api/admin/__tests__/send-commercial-followup.test.ts
bunx vitest run
bunx tsc --noEmit
```

Alvo: **293 + 11 = 304/304 verde**.

## Fora de scope

- Sem alterações ao código de produção (a menos que `Route.options.server.handlers.POST` não seja acessível — então extração mínima do handler).
- Sem testes ao componente do diálogo (UI).
- Sem alterações à validação UI feita no turn anterior.
