## Smoke test pré-lançamento beta — AuditProfiles (DigitalFC sender)

Validação puramente operacional. Zero alterações de código, schema ou secrets.

### O que vou verificar

#### 1. Configuração efectiva do sender

Inspecção read-only do que está actualmente em runtime (a tool de secrets só revela nomes; valores são confirmados por diagnóstico e pelo envio real):

- `BREVO_FROM_NAME` — esperado `AuditProfiles`
- `BREVO_FROM_EMAIL` — esperado `frederico.carvalho@digitalfc.pt`
- `RESEND_FROM` — presença confirmada (valor não impresso; apenas a identidade do remetente que aparecer no email real)
- `BREVO_TRANSACTIONAL_ENABLED` — deve estar a `true` (default) para a Brevo ser o provider primário

Método: `stack_modern--invoke-server-function` contra `/api/admin/email-config-status` (se existir) ou inspecção via `system-queries.server.ts`; em alternativa leio o `product_events` recente para extrair o `provider`/`from` registado nas últimas tentativas.

#### 2. Teste end-to-end de unlock

a. **Selecção do snapshot**: procuro o snapshot mais recente, cached, na BD (`report_snapshots`), preferencialmente do handle `frederico.m.carvalho` (testing profile do projeto). Se existir, reutilizo — zero chamadas Apify.
b. **Submissão**: envio um POST a `/api/request-full-report` com:
   - `email` = endereço de teste indicado por ti
   - `name` = `Smoke Test`
   - `instagram_username` = handle escolhido
   - `analysis_snapshot_id` = id do snapshot cached
c. **Inspecção de eventos** (`product_events`, filtrados pelo lead criado):
   - `unlock_email_submitted`
   - `unlock_completed`
   - `beta_welcome_email_sent` (ou explicação se foi `…_failed`/skipped)
   - `report_summary_email_sent` (ou `report_summary_skipped_no_data` com motivo)
d. **Confirmação de envio via Brevo**: leitura do `email_send_log` / `product_events` (campos `provider`, `provider_message_id`, `status`) para confirmar que o provider efectivo foi `brevo`, não fallback Resend.
e. **Inspecção do conteúdo do email recebido** (tu confirmas após receberes):
   - Links apontam para `https://auditprofiles.com/…`
   - Sender visível: `AuditProfiles <frederico.carvalho@digitalfc.pt>`
   - Zero ocorrências de “InstaBench” em subject / body / footer / alt text

#### 3. Veredito final

Devolvo **GO** ou **NO-GO** com justificação por cada um dos 7 critérios acima. Se algo falhar, indico exactamente o evento/log/linha em causa e a remediação proposta (sem aplicar).

### Restrições aceites

- Nenhum write de código, secrets, ou schema.
- Nenhuma chamada Apify — só reuso snapshot cached. Se não houver cached para nenhum handle elegível, devolvo NO-GO operacional e peço autorização explícita antes de gerar fresh.
- Envio real de email apenas para o endereço de teste que indicares.

### Preciso de ti antes de avançar

- [ ] **Email de teste** para receber o welcome + report summary (não enviar para nenhum outro endereço).
- [ ] **Handle preferencial** para o teste (default sugerido: `frederico.m.carvalho`, único na `APIFY_ALLOWLIST` do projeto).
- [ ] **Confirmação explícita** de que posso enviar 2 emails reais (welcome + summary) para esse endereço.

Sem estes 3 inputs paro aqui — não invento email de teste nem disparo a sequência por iniciativa própria.

### Checkpoint

- ☐ Sender effective config validado
- ☐ Snapshot cached identificado (sem Apify)
- ☐ Unlock submetido com sucesso
- ☐ `unlock_completed` presente
- ☐ `beta_welcome_email_sent` presente ou justificado
- ☐ `report_summary_email_sent` presente ou justificado
- ☐ Provider efectivo = Brevo
- ☐ Links → auditprofiles.com
- ☐ Zero menção a “InstaBench” no email recebido
- ☐ Veredito GO / NO-GO emitido
