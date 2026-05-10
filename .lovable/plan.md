## Estado actual (auditoria honesta antes de planear)

A maior parte do scope deste prompt **já existe** desde o turno anterior. Antes de plano, partilho o que está e o que falta:

| Requisito do prompt | Estado |
|---|---|
| `BREVO_API_KEY` em secrets | ✅ existe (gerido pelo connector) |
| `BREVO_LEAD_MAGNET_LIST_ID` em secrets | ✅ existe (assumir valor `16` confirmado) |
| Cliente server-only via gateway Lovable | ✅ `src/lib/brevo/brevo-client.server.ts` |
| `upsertBrevoContact(input)` com `updateEnabled: true` + listIds | ✅ implementado |
| Mapping de atributos (11 campos pedidos) | ✅ implementado |
| Integração no fluxo de unlock | ✅ passo 7 em `src/lib/unlock.server.ts` |
| Logging em `product_events` (`brevo_contact_synced` / `_failed`) | ✅ implementado |
| Allowlist de eventos | ✅ em `src/lib/tracking.functions.ts` |
| Falha do Brevo não bloqueia unlock | ✅ try/catch envolve a chamada |
| Testes do client (`brevo-client.test.ts`) | ✅ 10 cenários |

**Gaps reais vs este prompt:**

1. **Layout de ficheiros pedido** (`client.server.ts`, `contacts.server.ts`, `sync.server.ts`, `types.ts`) — actualmente está tudo num único módulo (`brevo-client.server.ts`).
2. **Função `syncLeadToBrevo(leadId, reason)`** — actualmente a lógica de carregar lead/report/count vive inline em `unlock.server.ts`. Não existe wrapper dedicado em `sync.server.ts`.
3. **Padrão fire-and-forget verdadeiro** — actualmente faz `await upsertBrevoContact(...)` dentro de try/catch. O prompt pede `void syncLeadToBrevo(...).catch(() => {})`, o que move a chamada para fora do caminho crítico.
4. **Secrets do remetente** — `BREVO_FROM_EMAIL` / `BREVO_FROM_NAME` ainda não existem (só serão usados na Fase 2 — emails — mas o prompt pede para os adicionar agora).

Plano abaixo cobre **só estes gaps**. Funcionalidade lógica não muda; este é um refactor + 2 secrets + mudança de await→fire-and-forget.

---

## Plano

### 1. Adicionar secrets do remetente (não usados nesta fase)

Pedir via `add_secret`:
- `BREVO_FROM_EMAIL` (= `frederico.carvalho@digitalfc.pt`)
- `BREVO_FROM_NAME` (= `Frederico Carvalho`)

Justificação para já: o prompt pede explicitamente. Vou armazenar mas **não consumir** — Resend continua activo para transacional.

### 2. Refactor para o layout pedido

Manter código actual a funcionar até ao swap final. Criar:

**`src/lib/brevo/types.ts`** (client-safe — só types puros):
```ts
export type BrevoAttributes = Record<string, string|number|boolean|null|undefined>;
export interface BrevoContactPayload {
  email: string;
  attributes: BrevoAttributes;
  listIds: number[];
}
export interface UpsertBrevoContactInput { ... }
export type UpsertBrevoContactResult =
  | { ok: true; brevoId: number | null; status: number; latencyMs: number }
  | { ok: false; reason: string; status?: number; latencyMs: number };
export type BrevoSyncReason = "report_unlock" | "manual_resync" | "backfill";
```

**`src/lib/brevo/client.server.ts`** — só transporte HTTP:
- `brevoFetch(path, init)` — wrapper com gateway URL, headers, AbortController 8s, devolve `{ status, body, latencyMs }` ou erro tipado.
- Nada de lógica de domínio (sem `email`, sem atributos).

**`src/lib/brevo/contacts.server.ts`** — domínio de contactos:
- `upsertBrevoContact(input)` chama `brevoFetch("/v3/contacts", ...)`.
- Resolve `BREVO_LEAD_MAGNET_LIST_ID` aqui (não no client).
- `cleanAttributes(...)` aqui.
- Devolve `UpsertBrevoContactResult` com `latencyMs`.

**`src/lib/brevo/sync.server.ts`** — orquestração de sincronização:
- `syncLeadToBrevo(leadId: string, reason: BrevoSyncReason)`:
  1. Carrega `leads` por id (`email`, `source`, `commercial_status`, `profile_ownership`, `goal`, `user_type`, `pricing_preference`).
  2. Carrega último `report_requests` (`instagram_username`, `analysis_snapshot_id`, `created_at`).
  3. Faz count de `report_requests` por `lead_id`.
  4. Constrói payload (mesmo mapping actual de 11 atributos).
  5. Chama `upsertBrevoContact`.
  6. Regista `brevo_contact_synced` ou `brevo_contact_sync_failed` em `product_events` com metadata `{ lead_id, email_masked, reason, status, latencyMs, errorMessage }` (email mascarado, nunca em claro).
  7. **Nunca lança**: cada passo dentro de try/catch; em qualquer erro, regista `brevo_contact_sync_failed` e retorna.

**Manter** `src/lib/brevo/brevo-client.server.ts` como **re-export shim** durante uma transição curta:
```ts
// Deprecated — re-exports for backwards compat. Prefer ./contacts.server.
export { upsertBrevoContact } from "./contacts.server";
export type * from "./types";
```
Remover após o swap em `unlock.server.ts` (mesmo PR).

### 3. Substituir bloco inline em `unlock.server.ts` por chamada fire-and-forget

Trocar o try/catch awaitado (linhas 448-516) por:
```ts
// 7. Brevo contact mirror — fire-and-forget. Nunca bloqueia o unlock.
void (async () => {
  const { syncLeadToBrevo } = await import("@/lib/brevo/sync.server");
  return syncLeadToBrevo(leadId, "report_unlock");
})().catch(() => {
  // syncLeadToBrevo já regista falhas internamente
});
```

Implicação: no caminho crítico do unlock o utilizador não espera pela latência do Brevo (até 8s). O event `brevo_contact_synced` chega à BD ~1-3s depois da resposta da API ao browser.

### 4. Testes

- **Manter** `src/lib/brevo/__tests__/brevo-client.test.ts` (10 testes, agora apontados aos novos paths).
- **Adicionar** `src/lib/brevo/__tests__/sync.test.ts`:
  - Mock `supabaseAdmin` + `upsertBrevoContact`.
  - Cenário 1: lead existe → payload contém os 11 atributos correctos.
  - Cenário 2: lead inexistente → regista `brevo_contact_sync_failed` com reason `LEAD_NOT_FOUND`.
  - Cenário 3: `upsertBrevoContact` retorna `{ ok: false }` → regista failure event com reason propagada.
  - Cenário 4: `syncLeadToBrevo` nunca lança mesmo com supabase a deitar erro.

### 5. Verificações

- `bunx tsc --noEmit`
- `bunx vitest run`
- Manual:
  - Unlock real → resposta JSON imediata; ~2s depois aparece `brevo_contact_synced` em `product_events` e contacto na lista 16.
  - Forçar falha (mexer `BREVO_LEAD_MAGNET_LIST_ID` para um inválido em dev) → unlock continua a funcionar; aparece `brevo_contact_sync_failed`.
  - `bun run build` + `rg "BREVO_API_KEY|connector-gateway" dist/` → zero matches no bundle do browser.

---

## O que NÃO está no scope (confirmação explícita)

- ❌ Envio de emails via Brevo (Resend mantém-se).
- ❌ Migração de templates Resend.
- ❌ Mexer no UI público, no PDF ou no relatório.
- ❌ Apify / OpenAI / DataForSEO.
- ❌ Schema da BD (zero migrations).
- ❌ Automations dentro do Brevo.
- ❌ Listas 17 (clientes pagos) e 18 (intenção alta) — virão noutra fase.

## Atributos no Brevo (lembrete operacional)

Os 11 atributos têm de existir na conta Brevo (Contacts → Settings → Contact attributes) com tipos correctos, senão são criados como TEXT no primeiro contacto:
- `REPORTS_COUNT` → Number
- `LAST_REPORT_AT` → Date
- `IS_CUSTOMER` → Boolean
- restantes → Text

Se algum vier mal-tipado, a chamada falha com `400` e cai em `brevo_contact_sync_failed` (não bloqueia unlock). Confirmar antes de testar.

## Checkpoint

- ☐ Secrets `BREVO_FROM_EMAIL` e `BREVO_FROM_NAME` adicionados
- ☐ `types.ts` + `client.server.ts` + `contacts.server.ts` + `sync.server.ts` criados
- ☐ `brevo-client.server.ts` reduzido a re-export shim (remover após swap)
- ☐ `unlock.server.ts` passa a chamar `syncLeadToBrevo` em fire-and-forget
- ☐ Novo teste `sync.test.ts` + testes existentes verdes
- ☐ `tsc` + `vitest` verdes; `BREVO_API_KEY` ausente do bundle do browser
