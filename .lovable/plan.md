## Healthcheck operacional — Status: 🟢 GO para smoke test

### Resultados de validação

| Check | Status | Evidência |
|---|---|---|
| `bunx tsc --noEmit` | ✅ | 0 erros |
| `bunx vitest run` | ✅ | 243/243 passed (25 ficheiros, 1.94s) |
| Eventos sem label visível | ✅ | Todos os 14 `event_type` em `product_events` (7d) estão em `EVENT_LABELS` após o último fix |
| Provider calls em rota pública | ✅ | `/analyze/$username` é `ssr: false`; comentário explícito mantém Apify atrás do server route |

### Critical paths — análise código + DB

**1. Public report cache-only** ✅
`src/routes/analyze.$username.tsx:73-76` — `ssr: false` + comentário "Apify boundary inside the server route". Sem imports diretos de `apify`/`openai`/`dataforseo` em rotas `report.*` ou `analyze.*`.

**2. Unlock flow** ✅
`src/lib/unlock.server.ts` orquestra: validate → lead upsert → report_request idempotente (constraint `report_requests_lead_snapshot_unique`) → email sequence → Brevo sync (awaited, try/catch). Devolve `success: true` mesmo se Brevo falhar.

**3. Lead create/update** ✅
8 leads em DB. Última semana: 14 `unlock_email_submitted` + 14 `unlock_completed` consistentes.

**4. Report request idempotência** ✅
8 report_requests = 8 leads (1:1 atual). Migration de cleanup `20260510104527` aplicada. 7 `report_saved_to_account` confirmam linkagem ao user.

**5. Brevo best-effort** ✅
7 `brevo_contact_synced` + 1 `brevo_contact_sync_failed` registados → comportamento esperado, falhas não bloqueiam unlock.

**6. Email sequence sem duplicados** ✅
`src/lib/email/lead-magnet-sequence.server.ts:44-65` — `eventAlreadyEmitted` por `(lead_id, event_type, metadata.report_request_id)` antes de cada step (welcome + summary), fail-open com idempotency key como segunda linha.

**7. Admin beta-leads** ✅
Rota `/admin/beta-leads` existe; `lead-detail-sheet.tsx` lê leads + timeline normalmente.

**8. Timeline labels pt-PT** ✅
14 event_types ativos vs `EVENT_LABELS` (24 entries). Match 100%. Render: `EVENT_LABELS[ev.event_type] ?? ev.event_type` em `lead-detail-sheet.tsx:1065` — fallback seguro.

**9. Sem provider calls em /analyze** ✅
Grep `apify|openai|dataforseo|provider-router` em `src/routes/` não devolve nada relevante para rotas públicas.

**10. Tests + typecheck** ✅
243/243 + 0 erros TS.

### Outras observações (não bloqueadoras)

- `RESEND_FROM` continua **não definido** como secret. Fallback `onboarding@resend.dev` (sender.ts:9) só entrega ao dono da conta Resend — OK para smoke test do próprio Frederico, **bloqueador antes de público**.
- Brevo sync: 8 leads em DB vs 7 `brevo_contact_synced` — 1 lead criado antes do enum-mappers fix (consistente com a 1 falha registada).
- 1 `report_link_sent` apenas → fluxo de envio manual de link ainda pouco usado, esperado em beta.

### Bloqueadores para smoke test real
**Nenhum técnico.** Pode avançar com o teste controlado de unlock descrito no plano anterior.

### Bloqueadores antes de abrir ao público (≥ 2 leads externos)
1. ⚠️ Definir secret `RESEND_FROM` com domínio verificado (SPF/DKIM)
2. ⚠️ Confirmar manualmente os 11 atributos custom em Brevo (Contacts → Settings)
3. ⚠️ Validar visualmente em Brevo após smoke test que `PRICING_PREFERENCE`/`LEAD_SOURCE`/`COMMERCIAL_STATUS` aparecem como números, não strings

### Saídas
Sem ficheiros alterados. Validação read-only completa. Aguarda decisão para smoke test ou para resolver os 3 bloqueadores acima.
