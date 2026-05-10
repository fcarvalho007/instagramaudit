## Auditoria — Brevo list ID

### TL;DR

✅ **Tudo correto. Nenhum hardcoded `42`. Sem alterações de código necessárias.**

### 1. Procura por `42` hardcoded

Foram encontradas várias ocorrências de `42` no codebase, **todas legítimas**:

- `src/lib/brevo/__tests__/brevo-client.test.ts:23,64` — fixture de teste (`BREVO_LEAD_MAGNET_LIST_ID: "42"` mockado para validar parsing)
- `src/lib/brevo/__tests__/customer-sync.test.ts:93` — `brevoId: 42` (mock do response Brevo, não list ID)
- Vários `rgba(15,23,42,...)` — cor hex em sombras Tailwind
- Vários valores `42` em fixtures de testes de insights, normalização e mock data

**Nenhuma ocorrência de `42` em código de produção como list ID.**

### 2. Onde o list ID é lido

Único ponto de leitura: `src/lib/brevo/contacts.server.ts:24-33`

```ts
function resolveListIds(override?: number[]): number[] | { error: string } {
  if (override && override.length > 0) return override;
  const raw = process.env.BREVO_LEAD_MAGNET_LIST_ID?.trim();
  if (!raw) return { error: "BREVO_LEAD_MAGNET_LIST_ID_MISSING" };
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return { error: "BREVO_LEAD_MAGNET_LIST_ID_INVALID" };
  }
  return [parsed];
}
```

- ✅ Lê de `process.env.BREVO_LEAD_MAGNET_LIST_ID` (secret confirmada na lista de secrets do projeto)
- ✅ Parse com `Number.parseInt(raw, 10)` → número
- ✅ Valida `Number.isFinite` + `> 0`
- ✅ Sem fallback hardcoded — falha explícita se ausente/inválido

Para clientes pagos, `customer-sync.server.ts:37-43` usa `BREVO_PAID_CUSTOMERS_LIST_ID` (lista 17) com mesma lógica de parsing; se ausente, faz fallback para a lista lead-magnet (16) via `upsertBrevoContact`.

### 3. Tratamento de erro / não-bloqueio

- `resolveListIds` devolve `{ error: "BREVO_LEAD_MAGNET_LIST_ID_MISSING" | "BREVO_LEAD_MAGNET_LIST_ID_INVALID" }`
- `upsertBrevoContact` propaga como `{ ok: false, reason }`
- `syncLeadToBrevo` (`src/lib/brevo/sync.server.ts:170`) regista evento **`brevo_contact_sync_failed`** com o `reason`
- `unlock.server.ts:471-476` invoca `syncLeadToBrevo` em **`void (async () => { … })().catch(...)`** — fire-and-forget, **nunca bloqueia o unlock**

✅ Comportamento exato pedido.

### 4. Payload final com list ID 16

Com `BREVO_LEAD_MAGNET_LIST_ID=16` em secrets (confirmado), o payload enviado para `POST /v3/contacts` é:

```json
{
  "email": "user@example.com",
  "updateEnabled": true,
  "listIds": [16],
  "attributes": { … }
}
```

✅ Confirmado por inspeção em `contacts.server.ts:44-52` — `listIds: listsOrErr` é o resultado direto de `resolveListIds()`, ou seja `[16]` quando a env é `"16"`.

### Recomendações

**Nenhum fix necessário.** A implementação está correta:

- Sem hardcoded `42` em produção
- Lê e valida a env como número positivo
- Falha visível via `brevo_contact_sync_failed` sem bloquear unlock
- Suporta override por chamada (usado pelo customer-sync com lista paga 17)

### Opcional (sem prioridade)

Os secrets para listas 17 (clientes pagos) e 18 (intenção alta) ainda não estão configurados — apenas `BREVO_LEAD_MAGNET_LIST_ID` (16) existe. Quando quiseres ativar segmentação, adicionar:

- `BREVO_PAID_CUSTOMERS_LIST_ID=17` (já lido por `customer-sync.server.ts`)
- `BREVO_HIGH_INTENT_LIST_ID=18` (ainda não tem leitor — precisaria de novo callsite)

## Checkpoint

- ☑ `42` é apenas exemplo/fixture; não aparece em código de produção
- ☑ List ID lido de `BREVO_LEAD_MAGNET_LIST_ID` (parse int + validação)
- ☑ Falha não bloqueia unlock; emite `brevo_contact_sync_failed`
- ☑ Payload usa `listIds: [16]` quando secret = `"16"`
- ☑ Sem alterações de código necessárias