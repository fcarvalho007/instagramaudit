## Plano de teste manual — Brevo sync após unlock real

### Inputs confirmados

- **Perfil:** `frederico.m.carvalho`
- **Snapshot ID:** `683e4c21-60e0-4045-b43a-dfcd85fe9896` (ready, expira 2026-05-10 11:21 UTC — válido)
- **List ID Brevo:** 16 (lido de `BREVO_LEAD_MAGNET_LIST_ID`)
- **Endpoint:** `POST /api/public/report-unlock` (público, sem auth)

### ⚠️ Falta um input

Preciso do **alias exato** que queres usar (ex: `frederico+brevotest1@…`). Não invento o teu email pessoal. Diz-me qual na próxima mensagem e executo imediatamente.

Sugestão: usar um sufixo único tipo `+brevotest-2026051001` para isolar este teste e poder identificar/apagar depois no Brevo.

---

### Sequência que vou executar

**1. Pré-condições (read-only):**
   - Confirmar que não existe `lead` com esse `email_normalized` (garante caminho "novo lead" + welcome email)
   - Snapshot `683e4c21…` existe e está ready ✅ (já confirmado)

**2. Disparar unlock** via `stack_modern--invoke-server-function`:
   ```
   POST /api/public/report-unlock
   Content-Type: application/json
   {
     "email": "<alias>",
     "instagram_username": "frederico.m.carvalho",
     "analysis_snapshot_id": "683e4c21-60e0-4045-b43a-dfcd85fe9896",
     "profile_ownership": "own_profile",
     "goal": "improve_content",
     "user_type": "creator"
   }
   ```
   - Esperado: `200 { success: true, lead_id, report_request_id, returning_lead: false, access_state: "unlocked" }`
   - Sync Brevo dispara em fire-and-forget após resposta — esperar 3-5s antes de verificar

**3. Aguardar 5s** para o async sync completar.

**4. Verificar `product_events`** (queries paralelas, read-only):
   ```sql
   SELECT event_type, created_at, metadata
   FROM product_events
   WHERE lead_id = '<lead_id>'
     AND event_type IN (
       'report_unlocked',
       'brevo_contact_synced',
       'brevo_contact_sync_failed',
       'lead_magnet_welcome_sent',
       'lead_magnet_summary_sent'
     )
   ORDER BY created_at DESC;
   ```

   **Critérios de sucesso:**
   - ✅ `brevo_contact_synced` presente → sync OK; `metadata.brevoId` populado
   - ❌ `brevo_contact_sync_failed` presente → sync falhou; ler `metadata.reason` para diagnóstico
   - ✅ `report_unlocked` presente em qualquer caso (unlock não bloqueado)

**5. Inspecionar logs server-side** se houver falha:
   - `stack_modern--server-function-logs` com `search="brevo"` para apanhar o `console.error("[unlock] brevo sync error:", …)` ou stack trace do `brevoFetch`

**6. Verificação manual no painel Brevo (tu fazes):**
   - Abrir https://app.brevo.com/contact/list/16
   - Procurar pelo alias
   - Confirmar:
     - ☐ Contacto existe na lista 16
     - ☐ `INSTAGRAM_HANDLE = "frederico.m.carvalho"`
     - ☐ `REPORTS_COUNT = 1`
     - ☐ `LAST_REPORT_AT` ≈ now
     - ☐ `LAST_REPORT_URL` aponta para `/analyze/frederico.m.carvalho`
     - ☐ `IS_CUSTOMER = false`
     - ☐ `LEAD_SOURCE = "public_report_unlock"` (ou `public_report_gate` — o default da tabela leads)
     - ☐ `COMMERCIAL_STATUS = "novo_pedido"` (default)

---

### Riscos e mitigações

| Risco | Mitigação |
|---|---|
| Welcome email Resend é enviado para alias real | É o comportamento atual e desejado (Resend OK conforme requisito 4). Alias `+brevotest` evita poluir inbox. |
| Lead já existe se já testaste antes com este alias | Sufixo único timestamp evita; verifico antes |
| Brevo cria atributos como Text se não criaste manualmente | Sync continua a funcionar; só perde tipagem. Vimos isto no plano anterior. |
| Snapshot expira durante o teste | Expira 2026-05-10 11:21 UTC — verifico hora UTC antes de disparar |
| Atributos Brevo ainda não criados manualmente | Pode-se prosseguir mesmo assim (auto-criação como Text); recomendado criar antes (ver plano anterior) |

---

### Não vou fazer

- ❌ Chamar Apify/OpenAI/DataForSEO (snapshot já existe, unlock não invoca providers)
- ❌ Regenerar report
- ❌ Repetir o unlock (uma única chamada)
- ❌ Mutar leads/report_requests existentes
- ❌ Inserir directamente em `product_events` (deixo o fluxo real fazê-lo)

---

### Output que vou devolver

1. **Email de teste usado** (o alias que indicares)
2. **Resposta HTTP do unlock** (status + JSON)
3. **Lead ID + Report Request ID** criados
4. **Lista de `product_events`** desse lead com `event_type` + `metadata` resumido
5. **Veredicto Brevo:** `synced` / `failed:<reason>` (server-side, via product_events)
6. **Logs** se algo falhar
7. **Checklist Brevo painel** para tu validares manualmente o conteúdo do contacto

## Checkpoint

- ☐ Utilizador fornece o alias exato (ex: `frederico+brevotest1@…`)
- ☐ Disparar 1× `POST /api/public/report-unlock`
- ☐ Aguardar 5s + ler `product_events`
- ☐ Reportar resultado server-side completo
- ☐ Utilizador valida no painel Brevo (lista 16) com a checklist acima