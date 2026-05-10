# Sync de contactos Brevo no unlock do Lead Magnet

## Objetivo
Espelhar cada lead do unlock no Brevo via connector gateway, sem enviar emails. Best-effort: nunca bloqueia o unlock nem expõe erros ao utilizador.

## Pré-requisitos (secrets)
Já existe: `BREVO_API_KEY` (chave da connection do gateway), `LOVABLE_API_KEY`.

**Falta adicionar:**
- `BREVO_LEAD_MAGNET_LIST_ID` — ID numérico da lista Brevo "Lead Magnet Gratuito"

Vou pedir este secret via `secrets--add_secret` antes de implementar. Acompanhar com instruções para o utilizador criar a lista no Brevo (Contacts → Lists → New) e copiar o ID.

## Arquitetura

### Cliente Brevo via connector gateway
**Importante:** o `BREVO_API_KEY` é a chave da connection — chamadas vão sempre via `https://connector-gateway.lovable.dev/brevo` com headers `Authorization: Bearer ${LOVABLE_API_KEY}` e `X-Connection-Api-Key: ${BREVO_API_KEY}`. Nunca atingir `api.brevo.com` diretamente.

### Ficheiros novos

**`src/lib/brevo/brevo-client.server.ts`** (server-only)
- `GATEWAY_URL = "https://connector-gateway.lovable.dev/brevo"`
- Helper `brevoFetch(path, init)` — anexa headers, valida env vars, timeout 8s via AbortController, devolve `{ ok, status, body }` em vez de lançar.
- `upsertBrevoContact(input)`:
  - Input tipado: `{ email, attributes, listIds? }`.
  - Estratégia idempotente: `POST /v3/contacts` com `{ email, attributes, listIds: [BREVO_LEAD_MAGNET_LIST_ID], updateEnabled: true }`. O `updateEnabled: true` faz upsert num único request (cria ou atualiza, e adiciona à lista).
  - Devolve `{ ok: true, brevoId } | { ok: false, reason }` — nunca lança.
- Atributos enviados (todos opcionais; só inclui chaves não-null):
  - `INSTAGRAM_HANDLE` (text)
  - `REPORTS_COUNT` (number) — calculado server-side: `count(report_requests where lead_id = …)` após o INSERT
  - `LAST_REPORT_URL` (text) — `${PUBLIC_APP_BASE_URL}/analyze/${handle}`
  - `LAST_REPORT_AT` (date ISO)
  - `PROFILE_OWNERSHIP`, `GOAL`, `USER_TYPE`, `PRICING_PREFERENCE` (text)
  - `LEAD_SOURCE` (text) — `lead.source`
  - `COMMERCIAL_STATUS` (text) — `lead.commercial_status` (após avanço de lifecycle)
  - `IS_CUSTOMER` (boolean) — `false` na fase atual (placeholder; futuro: derivado de plan/billing)

**`src/lib/brevo/index.ts`** — re-export apenas dos tipos públicos.

### Integração em `src/lib/unlock.server.ts`
Adicionar bloco best-effort **depois** do envio do email (passo 6 atual), **dentro do `try` principal**, para que tanto novos como recorrentes sejam sincronizados a cada unlock — não só na primeira vez.

```ts
try {
  const { upsertBrevoContact } = await import("@/lib/brevo/brevo-client.server");
  const { count: reportsCount } = await supabaseAdmin
    .from("report_requests")
    .select("id", { count: "exact", head: true })
    .eq("lead_id", leadId);
  const { data: leadRow } = await supabaseAdmin
    .from("leads")
    .select("source, commercial_status, plan:profiles(plan)")
    .eq("id", leadId).maybeSingle();
  const res = await upsertBrevoContact({
    email: data.email,
    attributes: { … },
  });
  await recordProductEvent({
    eventType: res.ok ? "brevo_contact_synced" : "brevo_contact_sync_failed",
    leadId, snapshotId: data.analysis_snapshot_id, handle: data.instagram_username,
    metadata: res.ok ? { brevo_id: res.brevoId } : { reason: res.reason },
  });
} catch (err) { console.error("[unlock] brevo sync error:", err); }
```

### Eventos
Acrescentar `brevo_contact_synced` e `brevo_contact_sync_failed` à allowlist em `src/lib/tracking.functions.ts` (defesa para futuro uso client-side; já são aceites server-side).

### Testes
**`src/lib/brevo/__tests__/brevo-client.test.ts`** (novo, vitest):
- Mock global `fetch`. Casos:
  - upsert 201 → `{ ok: true, brevoId }`, payload contém `updateEnabled: true` e `listIds`
  - upsert 204 (existing contact updated) → `{ ok: true }`
  - 429/5xx → `{ ok: false, reason: "BREVO_429:…" }`
  - timeout → `{ ok: false, reason: "BREVO_TIMEOUT" }`
  - missing `BREVO_API_KEY` ou `LOVABLE_API_KEY` ou `BREVO_LEAD_MAGNET_LIST_ID` → `{ ok: false, reason: "BREVO_*_MISSING" }`
  - omite atributos `null/undefined` do payload

**`src/lib/__tests__/unlock-flow.test.ts`** — manter; sem alteração (helper Brevo é separado).

## Idempotência confirmada
- Lead Supabase: lookup por `email_normalized` (já existente).
- Report request: índice único `(lead_id, snapshot_id)` (já existente).
- Brevo: `updateEnabled: true` faz upsert por email; chamar N vezes com mesmo email atualiza o mesmo contacto e a lista é set semântico (não duplica).

## Constraints respeitadas
- ✅ Nada de Resend/email novo.
- ✅ Nada de Apify/OpenAI/DataForSEO.
- ✅ Sem alterações ao UI público nem à geração do report.
- ✅ Sem schema novo (tudo em `product_events.metadata` + tabelas existentes).
- ✅ `BREVO_API_KEY` e `LOVABLE_API_KEY` lidos só em `*.server.ts` via `process.env`, nunca no bundle do browser.

## Detalhes técnicos

**Payload exemplo enviado ao Brevo:**
```json
POST https://connector-gateway.lovable.dev/brevo/v3/contacts
Headers:
  Authorization: Bearer <LOVABLE_API_KEY>
  X-Connection-Api-Key: <BREVO_API_KEY>
  Content-Type: application/json
Body:
{
  "email": "joao@example.com",
  "updateEnabled": true,
  "listIds": [42],
  "attributes": {
    "INSTAGRAM_HANDLE": "joao.silva",
    "REPORTS_COUNT": 2,
    "LAST_REPORT_URL": "https://instagramaudit.lovable.app/analyze/joao.silva",
    "LAST_REPORT_AT": "2026-05-10T14:32:00.000Z",
    "PROFILE_OWNERSHIP": "own_profile",
    "GOAL": "improve_content",
    "USER_TYPE": "creator",
    "PRICING_PREFERENCE": "under_9",
    "LEAD_SOURCE": "public_report_unlock",
    "COMMERCIAL_STATUS": "relatorio_visto",
    "IS_CUSTOMER": false
  }
}
```

**Atributos no Brevo:** o utilizador deve criar previamente os atributos no painel Brevo (Contacts → Settings → Contact attributes) com os tipos corretos, ou aceitar que o Brevo crie dinamicamente como TEXT na primeira receção (REPORTS_COUNT/IS_CUSTOMER/LAST_REPORT_AT terão tipos errados se criados implicitamente). Vou recomendar criação manual prévia dos 3 não-text.

## Validação
1. `bunx tsc --noEmit` — verde.
2. `bunx vitest run` — verde, novos testes incluídos.
3. Teste manual via UI: unlock com email novo → ver `brevo_contact_synced` em `product_events` e contacto na lista Brevo. Repetir com mesmo email → atributos atualizados, sem duplicado, novo evento `brevo_contact_synced`.
4. Teste de falha: definir `BREVO_LEAD_MAGNET_LIST_ID` para ID inválido → unlock continua a 100%, evento `brevo_contact_sync_failed` registado com `reason`.
5. `rg "BREVO_API_KEY" dist/ 2>/dev/null` após build — não deve aparecer.

## Out of scope
- Painel admin para gerir lista/atributos Brevo
- Sync retroativo dos leads existentes (pode ser corrida manual num turno separado)
- Sync bidirecional (Brevo → Supabase)
- Templates ou envio de emails Brevo
- Workflow Brevo (automation) — configurado no painel pelo utilizador

## Checkpoint
- ☐ Adicionar secret `BREVO_LEAD_MAGNET_LIST_ID`
- ☐ Criar `src/lib/brevo/brevo-client.server.ts` com `upsertBrevoContact`
- ☐ Integrar chamada best-effort em `processReportUnlock` após envio de email
- ☐ Acrescentar 2 eventos à allowlist em `tracking.functions.ts`
- ☐ Testes vitest do helper Brevo (mock fetch)
- ☐ `bunx tsc --noEmit` + `bunx vitest run` verdes
