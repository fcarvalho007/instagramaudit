## Avaliação das fases do prompt original

| Fase | Estado |
|---|---|
| 1. Secrets (`BREVO_API_KEY`, `BREVO_LEAD_MAGNET_LIST_ID=16`, `BREVO_FROM_EMAIL`, `BREVO_FROM_NAME`) | ✅ todos presentes |
| 2. Helpers `client.server.ts`, `contacts.server.ts`, `sync.server.ts`, `types.ts` | ✅ existem |
| 3. `syncLeadToBrevo(leadId, reason)` | ✅ implementado |
| 4. Chamada fire-and-forget no unlock | ✅ `unlock.server.ts:494-501` |
| 5. Payload com 11 atributos + `listIds:[16]` + `updateEnabled:true` | ⚠️ código correto, **mas tem bug** |
| 6. Best-effort + eventos `brevo_contact_synced` / `brevo_contact_sync_failed` | ✅ |

## Bug bloqueador detectado

`src/lib/brevo/sync.server.ts` linha 52 faz `SELECT ... goal ...` da tabela `leads`, mas a coluna real é **`purpose`** (confirmado no schema). O Supabase devolve erro de coluna inexistente → cai sempre em `LEAD_LOAD_ERROR` → nunca chama o Brevo. A sincronização está 100 % partida em produção.

Os testes unitários não apanharam porque o mock devolve `goal` em vez de espelhar o schema real.

## Refinamento mínimo para concluir a fase

### Edits

**`src/lib/brevo/sync.server.ts`**
- Linha 52: substituir `goal` por `purpose` na lista do `select`.
- Linha 92: ler `lead.purpose` em vez de `lead.goal` (mantém o nome do atributo Brevo `GOAL` — esse mapeamento é intencional e está alinhado com o spec do prompt).

**`src/lib/brevo/__tests__/sync.test.ts`**
- Atualizar o mock do lead: `purpose: "improve_content"` em vez de `goal: ...`.
- Adicionar 1 teste regressivo: o argumento passado a `.select(...)` contém `"purpose"` e **não** contém `"goal,"`.

### Não tocar

- `client.server.ts`, `contacts.server.ts`, `types.ts`, `customer-sync.server.ts`
- `unlock.server.ts` (wiring já correto)
- `tracking.functions.ts` / allowlist de eventos (já contém os 2 eventos)
- BD (sem migração — `purpose` já existe)
- UI pública, Resend, Apify, OpenAI, DataForSEO

## Payload final que o Brevo vai receber (após fix)

```http
POST https://api.brevo.com/v3/contacts
Content-Type: application/json
api-key: ***

{
  "email": "ana@empresa.pt",
  "updateEnabled": true,
  "listIds": [16],
  "attributes": {
    "INSTAGRAM_HANDLE": "frederico.m.carvalho",
    "REPORTS_COUNT": 3,
    "LAST_REPORT_URL": "https://instagramaudit.lovable.app/analyze/frederico.m.carvalho",
    "LAST_REPORT_AT": "2026-05-10T14:22:01.123Z",
    "PROFILE_OWNERSHIP": "own_profile",
    "GOAL": "grow_audience",
    "USER_TYPE": "creator",
    "PRICING_PREFERENCE": "29-49 EUR",
    "LEAD_SOURCE": "public_report_gate",
    "COMMERCIAL_STATUS": "novo_pedido",
    "IS_CUSTOMER": false
  }
}
```
(Atributos `null`/`""` são removidos por `cleanAttributes` antes do envio.)

## Eventos `product_events`

Ambos já registados pelo código existente:
- `brevo_contact_synced` — metadata: `sync_reason`, `brevo_id`, `status`, `latency_ms`, `email_masked`, `reports_count`
- `brevo_contact_sync_failed` — metadata: `sync_reason`, `reason`, `latency_ms`, `email_masked`

## Validação

- `bunx tsc --noEmit`
- `bunx vitest run` (atualiza testes Brevo + novo regressivo passa)
- Manual após deploy:
  1. Unlock com email novo → contact aparece em lista 16 com 11 atributos
  2. Unlock 2× com mesmo email → mesmo contact, `REPORTS_COUNT` incrementa
  3. Unlock continua a funcionar mesmo se Brevo falhar; `brevo_contact_sync_failed` registado

## Ficheiros alterados

- `src/lib/brevo/sync.server.ts` (2 linhas)
- `src/lib/brevo/__tests__/sync.test.ts` (mock + 1 teste novo)