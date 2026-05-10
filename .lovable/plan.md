## Smoke test controlado — Lead magnet (1 envio real)

### Bloqueador antes de executar

Preciso do **email exato** a usar no teste.

Sugestão: um alias pessoal (ex: `frederico+smoke@…`) — não usar emails de equipa, nem `@digitalfc.pt` que já é o `BREVO_FROM_EMAIL` (auto-envios para o sender podem ser filtrados).

Vou pedir via `ask_questions` antes de prosseguir.

### Snapshot a usar (cache existente, sem provider calls)

Cache disponível (sem chamar Apify/OpenAI/DataForSEO):

| handle | snapshots | último |
|---|---|---|
| `martimsilvai` | 1 | 2026-05-04 |
| `karmel_loja_` | 1 | 2026-05-02 |
| `karmel` | 1 | 2026-05-02 |
| `frederico.m.carvalho` | 1 | 2026-04-29 |

**Proposta**: usar **`martimsilvai`** (mais recente, não é o profile do owner → evita confusão de eventos antigos no `frederico.m.carvalho`). Mudo se preferires outro.

### Pré-flight (read-only, antes do clique)

1. Verificar gates de envio: `BREVO_API_KEY`, `BREVO_FROM_EMAIL`, `BREVO_FROM_NAME`, `BREVO_LEAD_MAGNET_LIST_ID`, `RESEND_API_KEY`, `RESEND_FROM`, `LOVABLE_API_KEY`. Confirmar `BREVO_LEAD_MAGNET_LIST_ID == 16`.
2. `SELECT` em `leads` pelo email do teste — se já existir, registar `lead_id` e `created_at` para comparar deltas (não apago — constraint do briefing: não mutar leads não relacionados, mas o do teste é o alvo legítimo).
3. `SELECT` em `product_events` pelo email/lead nos últimos 7d para baseline.

### Execução do teste (browser, fluxo real)

1. `browser--navigate_to_sandbox` para `/p/{snapshot-id-ou-handle}` ou rota pública equivalente do snapshot escolhido.
2. Confirmar visualmente: report carrega, sem regenerar (sem chamadas a `/analyze/...`).
3. Acionar unlock → preencher email do teste → submeter.
4. Capturar screenshots: (a) modal antes do submit, (b) modal pós-sucesso, (c) "Welcome back" se aplicável.
5. Validar copy do modal de sucesso contra a versão aprovada.

### Verificações pós-envio (sem mais sends)

#### Brevo
- Listar contacto via gateway `GET /v3/contacts/{email}` (mocked? **não — leitura real, não envia**).
- Confirmar:
  - `email` correto
  - `listIds` inclui `16`
  - atributos populados (NOME, HANDLE, REPORT_URL, etc. — listo os reais ao ler `contacts.server.ts`)
- Se contacto já existia: confirmar update incremental, não duplicado.

#### Supabase — `product_events`
Query por `lead_id` (do email do teste) ordenando por `created_at DESC LIMIT 30`. Esperar:
- `unlock_email_submitted`
- `unlock_completed`
- `report_saved_to_account`
- `brevo_contact_synced`
- `beta_welcome_email_sent`
- `report_summary_email_sent`

Cada um **uma única vez** para o `metadata.report_request_id` do teste — comprova idempotência da `lead-magnet-sequence`.

#### Email (caixa do tester)
- Welcome-beta chega.
- Report-summary chega.
- Métricas no report-summary batem com `analysis_snapshots` row do snapshot usado (followers, engagement, top posts).
- Links: domínio `instagramaudit.pt` (PUBLIC_APP_BASE_URL), apontam para o public report e para `/app/reports`.

#### Fallback Resend
- Inspecionar `product_events` para `brevo_email_failed` / `resend_fallback_email_sent` / `*_email_failed`.
- Caminho esperado em sucesso: **só** `brevo_email_sent` × 2 (welcome + summary), **sem** Resend.
- Se Brevo falhar: documentar `reason` e se Resend pegou (deve, pois `RESEND_FROM` está agora configurado).

### Critérios GO / NO-GO

**GO (beta interno)** se:
- ✅ Modal flui sem erro, copy correto
- ✅ Welcome-beta + report-summary chegam à caixa do tester
- ✅ Brevo contacto na lista 16 com atributos
- ✅ 6 eventos esperados, sem duplicados
- ✅ Métricas/links consistentes
- ✅ Sem chamadas a Apify/OpenAI/DataForSEO durante o teste

**NO-GO** se qualquer falha não-recuperável (email não chega, contacto não criado, dados errados nos emails, eventos duplicados).

### Constraints respeitados

- 1 unlock só, 1 email só.
- Sem regenerar report (uso snapshot cache).
- Sem chamar paid providers (verificável nos logs).
- Sem campanhas Brevo manuais.
- Sem mexer em outros leads.

### Output final ao briefing

Retorno:
- email usado
- snapshot/handle usado + `report_request_id`
- lista de eventos com timestamps
- payload Brevo do contacto (mascarado)
- screenshot dos 2 emails recebidos (ou colagem do HTML)
- falhas/observações
- decisão GO/NO-GO

### Checkpoint antes de começar

- ☐ Receber email exato do tester
- ☐ Confirmar snapshot (default `martimsilvai`, ou outro)
- ☐ Confirmar `BREVO_LEAD_MAGNET_LIST_ID == 16`
- ☐ Pré-flight read-only (envs + baseline `product_events`)
- ☐ Executar unlock no browser
- ☐ Auditar Brevo + DB + caixa do tester
- ☐ Emitir GO/NO-GO
