# Plano — fix do Brevo sync e validação Fase 6

## Causa raiz (já confirmada)

O gateway da Brovo no Lovable **strip-a o prefixo `/v3`** automaticamente.
Toda a camada `src/lib/brevo/*` envia paths `/v3/contacts`, `/v3/contacts/lists/{id}`, etc., e o gateway responde:

```
HTTP 404 {"code":"not_found","message":"Invalid route/ method passed"}
```

Foi por isso que os 6 unlocks de teste registaram 0 eventos `brevo_contact_synced` e 0 `brevo_contact_sync_failed` na BD: a chamada falhava com `BREVO_404`, mas o sync era fire-and-forget e o worker terminava antes do `safeRecordFailure` correr (até ao fix do `await` que já metemos).

Confirmado experimentalmente:
- `POST /brevo/v3/contacts` → 404
- `POST /brevo/contacts` → 201 `{"id":263}`
- `GET /brevo/account` → 200 (sem `/v3`)

## Passo 1 — Corrigir paths em `src/lib/brevo/*`

Remover o prefixo `/v3` de todos os paths usados pelo cliente. Tipicamente uma única alteração centralizada em `client.server.ts`:

- Trocar `GATEWAY_URL = "https://connector-gateway.lovable.dev/brevo"` mantém-se igual.
- Atualizar todas as chamadas `brevoFetch("/v3/...")` para `brevoFetch("/...")`. Ficheiros afetados:
  - `src/lib/brevo/contacts.server.ts` — `POST /v3/contacts` → `POST /contacts`
  - `src/lib/brevo/customer-sync.server.ts` — qualquer `/v3/...`
  - testes em `src/lib/brevo/__tests__/*` — atualizar mocks/asserts

Decisão: em vez de remover linha-a-linha, `client.server.ts` passa a normalizar automaticamente — se o path começar por `/v3`, retira-o. Isto torna o fix idempotente, robusto a chamadores futuros, e mantém os ficheiros de domínio iguais ao que existiria contra a API direta da Brevo. Justificação: o gateway é uma fachada que decide o versionamento; o nosso código não deve precisar de saber.

Implementação: 2 linhas em `brevoFetch`:
```ts
const normalized = path.replace(/^\/?v3\//, "/");
const url = `${GATEWAY_URL}${normalized.startsWith("/") ? normalized : `/${normalized}`}`;
```

## Passo 2 — Limpar instrumentação temporária

- Remover `console.log("[unlock] BREVO_SYNC_START …")` e `BREVO_SYNC_END` em `src/lib/unlock.server.ts`. Manter o `await syncLeadToBrevo(...)` (essa parte do fix mantém-se correta).
- Remover endpoint efémero `src/routes/api/public/brevo-test-sync.ts`.

## Passo 3 — Validação end-to-end (1 unlock real)

1. Unlock real via UI ou via `POST /api/public/report-unlock` para:
   - email: `frederico+brevotest7@fredericocarvalho.pt`
   - handle: `frederico.m.carvalho`
   - snapshot: `683e4c21-60e0-4045-b43a-dfcd85fe9896`
2. Esperar 5s.
3. Verificar `product_events` (últimos 2min):
   - `brevo_contact_synced` com `metadata.brevo_id` numérico, `status=201` (novo) ou `204` (existente).
4. `GET /brevo/contacts/{email}` direto pelo gateway → confirmar:
   - `INSTAGRAM_HANDLE = "frederico.m.carvalho"`
   - `REPORTS_COUNT = 1` (NUMBER)
   - `LAST_REPORT_URL = "https://instagramaudit.lovable.app/analyze/frederico.m.carvalho"`
   - `LAST_REPORT_AT` (DATE/ISO)
   - `PROFILE_OWNERSHIP / GOAL / USER_TYPE / PRICING_PREFERENCE` se enviados na unlock
   - `LEAD_SOURCE = "public_report_unlock"`
   - `COMMERCIAL_STATUS = "novo_pedido"`
   - `IS_CUSTOMER = false`
   - contact em `listIds` inclui `16` (lead-magnet)

## Passo 4 — Backfill dos 6 leads de teste já criados

Os contactos `brevotest1..6` ainda não foram sincronizados com sucesso (exceto o `6`, que upserti manualmente como teste de diagnóstico — id 263). Criar script efémero (`code--exec`) que itera sobre os 6 lead IDs e chama `syncLeadToBrevo`. Não toca em nada destrutivo. Remove-se o script após correr.

## Passo 5 — Cleanup final

- Remover secret `BREVO_DIRECT_API_KEY` (já não é necessário — só serviu para criar atributos no Passo 5 anterior; o sync corre via gateway).
- Atualizar `.lovable/plan.md` a marcar Fase 6 ✅.
- Documentar no plan.md o quirk do gateway (strip de `/v3`) para evitar regressões futuras quando adicionarmos novos endpoints Brevo.

## Notas técnicas

- Não é necessário criar nem alterar tabelas.
- Não toca em `auth/storage/realtime`.
- Não regenera reports nem chama Apify/DFS/OpenAI.
- O fix em `brevoFetch` é compatível com chamadas que já estão sem `/v3` — a regex só normaliza quando o prefixo está presente.

## Checkpoint

- ☐ `brevoFetch` normaliza `/v3` → 200/201 contra `POST /v3/contacts`
- ☐ Instrumentação debug e endpoint efémero removidos
- ☐ Unlock end-to-end de `brevotest7` valida atributos corretos no Brevo
- ☐ Backfill dos 6 leads de teste anteriores
- ☐ `BREVO_DIRECT_API_KEY` removido
- ☐ Quirk do gateway documentado no plan.md
