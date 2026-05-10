## Fase 3 — Persistência backend do unlock público

### Objetivo

Capturar email + respostas progressivas no endpoint público `POST /api/public/report-unlock`. Reutilizar lead existente quando o email já foi visto, criar `report_request` ligado, emitir eventos, e ser idempotente para `(email, snapshot)`. Sem providers, sem email, sem auth.

### Impacto de schema (1 migração mínima)

Tabela `leads` ganha 1 coluna opcional:

- `pricing_preference text NULL` — único campo das 4 respostas que ainda não tem coluna; os outros já existem (`profile_ownership`, `purpose` para o "goal", `user_type`).

Eventos novos no enum `ALLOWED_EVENTS` (`src/lib/tracking.functions.ts`):

- `unlock_email_submitted`
- `unlock_completed`
- `report_saved_to_account`
- `returning_lead_detected`

Sem nova tabela. Sem RLS — `leads`, `report_requests` e `product_events` já operam só via `supabaseAdmin` em rotas server.

### Endpoint — `POST /api/public/report-unlock`

Ficheiro novo: `src/routes/api/public/report-unlock.ts` (server route).

**Payload (Zod, strict):**

```ts
z.object({
  email: z.string().trim().toLowerCase().email().max(255),
  instagram_username: z.string().trim().min(1).max(60)
    .transform(v => v.replace(/^@/, "").toLowerCase()),
  analysis_snapshot_id: z.string().uuid(),
  profile_ownership: z.enum(["own_profile","brand_profile","client_profile"]).optional(),
  goal: z.enum(["improve_content","benchmark_competitors","client_report","grow_audience","validate_brand","other"]).optional(),
  user_type: z.enum(["creator","brand","agency","consultant","ecommerce","other"]).optional(),
  pricing_preference: z.string().trim().max(80).optional(),
  name: z.string().trim().min(1).max(100).optional(), // fallback "Sem nome"
})
```

Rejeita corpo inválido com `400 { error: "INVALID_PAYLOAD", issues }`.

**Fluxo (em `supabaseAdmin`):**

1. Normalizar email; calcular `email_normalized = email`.
2. **Lookup snapshot** em `analysis_snapshots` por `id = analysis_snapshot_id`. Se não existir → `404 { error: "SNAPSHOT_NOT_FOUND" }`. Garante que não persistimos lixo.
3. **Lookup lead** por `email_normalized`:
   - Se existe (`returningLead = true`):
     - **Update conservador** (só preenche campos `NULL`):
       ```sql
       UPDATE leads SET
         user_type = COALESCE(user_type, $userType),
         purpose = COALESCE(purpose, $goal),
         profile_ownership = COALESCE(profile_ownership, $ownership),
         pricing_preference = COALESCE(pricing_preference, $pricing),
         updated_at = now()
       WHERE id = $leadId
       ```
     - Emite `returning_lead_detected` com `metadata: { snapshot_id, handle, fields_updated: [...] }`.
   - Se não existe:
     - INSERT lead com `name = payload.name ?? "Sem nome"`, `email`, `email_normalized`, `source = "public_report_unlock"`, `commercial_status = "novo_pedido"` (estado inicial canónico, igual ao default), e os 4 campos qualitativos.
4. **Idempotência do report_request** — procura `report_requests` com `(lead_id, analysis_snapshot_id)` igual:
   - Se existe → `report_request_id = existing.id`, `created = false`. UPDATE de `metadata` por merge JSON (`metadata = metadata || $newMeta`), nunca sobrescreve chaves já presentes. Não emite `report_saved_to_account` (já foi emitido antes).
   - Se não existe → INSERT com:
     - `lead_id`
     - `instagram_username`
     - `analysis_snapshot_id`
     - `request_source = "public_unlock"`
     - `request_status = "completed"` (snapshot já existe, não há análise pendente)
     - `is_free_request = true`
     - `metadata = { profile_ownership, goal, user_type, pricing_preference, source: "public_unlock", unlocked_at: <iso> }` (omite chaves `undefined`)
     - **Não** preenche `user_id` (não há auth ainda).
   - Emite `report_saved_to_account` apenas no INSERT, com `metadata: { snapshot_id, handle, returning_lead }`.
5. **Eventos sequenciais** via `recordProductEvent` (helper já existente):
   - `unlock_email_submitted` — sempre, no início (após validação, antes de tocar em leads). Permite medir intent vs completion.
   - `unlock_completed` — sempre, no fim, com `metadata: { fields_present: [...], returning_lead }`.
   - `returning_lead_detected` — só quando aplicável (passo 3).
   - `report_saved_to_account` — só no INSERT do report_request (passo 4).
   - Todos com `lead_id`, `snapshot_id`, `handle = instagram_username`.
6. **Lifecycle (best-effort)**: chamar `maybeAdvanceLeadStatus(current, "relatorio_visto")`. Não regride. Fail-open.

**Resposta (200):**

```ts
{
  success: true,
  lead_id: string,
  report_request_id: string,
  returning_lead: boolean,
  access_state: "unlocked",
  created_report_request: boolean,
}
```

**Cabeçalhos:** `Cache-Control: no-store`, `Content-Type: application/json`.

**Códigos de erro:** `400` payload inválido · `404` snapshot inexistente · `500` erro interno (genérico, sem stack).

### Idempotência detalhada

- Mesma chamada repetida (mesmo email + snapshot) → 200 com `created_report_request: false`, sem novos `report_saved_to_account`. `unlock_email_submitted` e `unlock_completed` voltam a ser emitidos (são eventos de intent, não de estado — útil para contar tentativas).
- Para evitar flood de `unlock_completed` em retries acidentais (ex.: duplo-clique), aplicamos dedup defensivo idêntico ao `report_viewed`: se existe `unlock_completed` com mesmo `(snapshot_id, lead_id)` nos últimos 5s, ignora silenciosamente. Mesmo padrão para `unlock_email_submitted`.

### Segurança

- Endpoint público sob `/api/public/*` (já bypassa auth, é o standard do projeto).
- Validação Zod estrita; rejeita extras com `.strict()` no schema.
- Tudo via `supabaseAdmin` → escolhas de RLS irrelevantes; nunca devolve dados privados (só os 3 IDs e flags).
- Sem PII no log: erros logados mascaram email para `a***@example.com`.
- Rate limiting: **fora de scope** desta fase (deixa nota no ficheiro a sugerir middleware futuro). Risco aceitável enquanto endpoint só persiste dados qualitativos.

### Ficheiros tocados

1. **migração nova** — adiciona `leads.pricing_preference text NULL`.
2. **`src/lib/tracking.functions.ts`** — adiciona 4 eventos ao `ALLOWED_EVENTS` (não toca em mais nada, comentário a ligar com `lead-lifecycle.ts`).
3. **`src/lib/unlock.server.ts`** (novo) — pure server helper `processReportUnlock(payload)` com toda a lógica acima. Mantém a route file fina e testável.
4. **`src/routes/api/public/report-unlock.ts`** (novo) — server route POST: parse JSON, valida, chama helper, devolve resposta. ~50 linhas.
5. **`src/lib/__tests__/unlock.server.test.ts`** (novo) — testes unitários do helper com `supabaseAdmin` mockado:
   - novo email → cria lead + report_request + 3 eventos (sem returning).
   - email existente → reusa lead + cria report_request + 4 eventos (com `returning_lead_detected`).
   - mesmo email + mesmo snapshot → não duplica report_request.
   - email inválido → schema rejeita (testa via parse).
   - snapshot inexistente → 404.
   - update conservador: lead com `purpose` já preenchido não é sobrescrito.

### Frontend

**Não é alterado nesta fase.** O `UnlockModal` continua a fazer unlock local via `sessionStorage`. Phase 4 fará a chamada real ao endpoint a partir do modal de 5 passos. Isto mantém o âmbito UI-only da fase 2 separado da persistência, e permite testar o endpoint isoladamente via cURL/`invoke-server-function`.

### Validação

- `bunx tsc --noEmit` — 0 erros.
- `bunx vitest run` — todos os existentes passam + 6 novos do unlock helper.
- **Manual via `invoke-server-function`** (após o user approve a migração):
  1. POST com email novo + snapshot real → 200, `returning_lead: false`, `created_report_request: true`. Confirma 1 lead + 1 report_request + 3 events em `psql` ou `read_query`.
  2. Repetir mesma chamada → 200, `returning_lead: true`, `created_report_request: false`. Sem novos report_requests; `returning_lead_detected` emitido; sem novo `report_saved_to_account` (nem novo `unlock_completed` se dentro de 5s).
  3. POST com email novo + snapshot diferente do mesmo handle → cria 2º report_request ligado ao mesmo lead.
  4. POST sem email / com email mal formado → 400.
  5. POST com `analysis_snapshot_id` inexistente → 404.
  6. Verificar via `psql` que não houve nenhum hit a Apify/OpenAI/DataForSEO/Resend (estes endpoints não são tocados pelo handler).

### Riscos

- `pricing_preference` chega como string livre (max 80). Se quisermos enum no futuro, basta apertar o Zod sem migração.
- Sem rate limiting → endpoint pode ser spammed. Mitigação curto-prazo: dedup de 5s nos eventos; mitigação real fica para Phase 5 (middleware).
- O update conservador de leads usa `COALESCE` em SQL bruto. Para evitar SQL inline com supabase-js, fazemos SELECT + diff em JS e UPDATE só os campos vazios.
- `request_status = "completed"` num report_request criado sem PDF/email pode confundir o admin CRM. Alternativa: usar novo valor `"unlocked"` (não requer migração — é text). Vou usar `"unlocked"` para diferenciar do fluxo beta tradicional.

### Checkpoint

- ☐ Confirmar adicionar coluna `leads.pricing_preference text` (única alteração de schema)
- ☐ Confirmar `request_status = "unlocked"` para distinguir do fluxo beta (vs. `"completed"`)
- ☐ Confirmar valor `request_source = "public_unlock"` (corresponde à spec do user)
- ☐ Confirmar que o frontend NÃO é alterado nesta fase (modal continua local-only)