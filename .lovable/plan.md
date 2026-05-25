# Plano — Garantir entrega transacional do report-summary

## 1. Resultado da auditoria (o código JÁ cumpre o spec)

Após ler `src/lib/email/lead-magnet-sequence.server.ts`, `src/lib/brevo/sync.server.ts`, `src/components/product/unlock-modal.tsx`, `src/i18n/locales/pt/gate.json` e testes existentes:

- **Orquestrador** (`lead-magnet-sequence.server.ts`): NÃO bloqueia em `marketing_consent`. O único `lead_magnet_sequence_skipped` emitido tem `flag: "LEAD_MAGNET_EMAIL_SEQUENCE_ENABLED"` (kill-switch). **Não existe `NO_MARKETING_CONSENT` em código** — esses eventos no DB são históricos, de uma versão anterior.
- **Metadata** já emite `{ transactional_delivery: true, marketing_consent: <bool> }` tanto em `beta_welcome_email_sent` como em `report_summary_email_sent`.
- **Brevo sync** (`sync.server.ts`): corre após GDPR (precondição do unlock), envia o contacto com `MARKETING_CONSENT: false` quando o utilizador não opta in, e regista `marketing_consent` em `brevo_contact_synced`.
- **Unlock modal copy** (i18n pt) já é exactamente a pedida:
  - obrig.: "Aceito o tratamento dos meus dados para gerar, guardar e enviar este relatório, e li a política de privacidade."
  - opcional: "Quero receber novidades e dicas sobre relatórios, benchmarks e funcionalidades futuras."
- **Testes** (`lead-magnet-sequence.test.ts`) já cobrem os 4 cenários do spec, incluindo `transactional delivery: sends both emails even when marketing_consent=false`.

**Conclusão**: o spec já está satisfeito ao nível do código. Os 0 sends observados em produção têm outra causa.

## 2. Hipóteses para os 0 sends observados

Ordenadas por probabilidade:

1. **Lead "returning"** — `sendLeadMagnetSequence` só é invocado quando `createdReportRequest === true` (`unlock.server.ts:454`). Se o teste foi feito com um lead que já tinha um `report_request` para o mesmo handle, nenhum email é tentado. **Esta é a explicação mais provável** dado o histórico de testes repetidos.
2. **Eventos antigos no dashboard** — `lead_magnet_sequence_skipped` com `reason: NO_MARKETING_CONSENT` ficaram em `product_events` de uma versão anterior; o dashboard mostra-os como recentes mas não correspondem a código actual.
3. **Snapshot sem KPIs** — `sendReportSummaryEmail` retorna `NO_DATA`/`NO_SNAPSHOT_ID` ⇒ emite `report_summary_skipped_no_data` (não `_sent`). Possível para handles com cache muito pobre.
4. **Brevo sync** — não há `brevo_contact_synced` recente ⇒ pode ter falhado silenciosamente (regista `brevo_contact_sync_failed`). Vale a pena confirmar via logs.

## 3. Acções (mínimas, sem alterar lógica nem schema)

### A. Validação automática
- `bunx tsc --noEmit`
- `bunx vitest run src/lib/email/__tests__/lead-magnet-sequence.test.ts src/lib/brevo/__tests__/sync.test.ts`

### B. Verificação operacional (read-only no DB)
Correr 4 consultas para confirmar a hipótese 1/2/3/4:

```sql
-- (1) últimos lead_magnet_sequence_skipped — confirmar que o reason é histórico
select created_at, metadata
from product_events
where event_type = 'lead_magnet_sequence_skipped'
order by created_at desc limit 20;

-- (2) report_summary_skipped_no_data recentes
select created_at, lead_id, metadata
from product_events
where event_type in ('report_summary_skipped_no_data','report_summary_email_failed')
order by created_at desc limit 20;

-- (3) últimos unlocks: createdReportRequest=true vs false
select created_at, metadata
from product_events
where event_type in ('unlock_completed','report_saved_to_account')
order by created_at desc limit 20;

-- (4) brevo sync recentes
select created_at, event_type, metadata
from product_events
where event_type like 'brevo_contact_sync%'
order by created_at desc limit 20;
```

### C. Pequena melhoria defensiva (opcional, decisão do utilizador)
**Não altera o spec funcional**; só melhora observabilidade:

- Em `unlock.server.ts`, no ramo `if (createdReportRequest)`, registar um `product_events` com `event_type='lead_magnet_sequence_not_invoked'` (ou metadata em `unlock_completed`) quando `createdReportRequest === false`, indicando `reason: 'returning_lead_existing_report_request'`. Isto explicaria visualmente porque é que o "summary" não foi enviado num re-unlock.
- Esta acção fica **fora deste plano** se o utilizador preferir não tocar; espero confirmação.

## 4. Constraints respeitadas
- Sem chamadas reais a Brevo nem envios reais (apenas tsc + vitest local).
- Sem migrations nem mudanças de schema.
- GDPR continua obrigatório (`unlock-flow.ts` mantém `z.literal(true)`).
- Copy pt-PT mantida tal como já existe.

## 5. Checkpoint
☐ Confirmar via tsc que nada partiu (regressão).
☐ Confirmar via vitest que os 4 cenários do spec passam.
☐ Decidir se queres que execute as 4 consultas read-only no DB para confirmar a hipótese 1 (lead "returning").
☐ Decidir se queres a melhoria defensiva opcional (event `lead_magnet_sequence_not_invoked`).

Aguardo aprovação para passar a Build Mode e correr as validações.
