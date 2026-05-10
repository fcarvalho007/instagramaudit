## Diagnóstico do trigger de pagamento

Pesquisei todo o `src/` por integrações de pagamento (EuPago, Stripe, webhooks `paid`, `subscription`, `payment_status`, etc.). **Não existe nenhuma integração real de pagamento implementada.** Tudo o que aparece em `src/components/admin/v2/receita/*` e `src/lib/admin/mock-data.ts` é mock/UI de demonstração. Não há webhook, edge function nem rota `/api/public/*` que receba confirmação de pagamento real. A tabela `leads` também não tem colunas de pagamento (`paid_at`, `plan`, `payment_amount`).

A única forma real e atual de marcar uma conversão é o admin mover manualmente o lead para `commercial_status = "convertido"` no Kanban, que faz `PATCH /api/admin/leads-kanban/$id` (`src/routes/api/admin/leads-kanban.$id.ts`). Esse handler já atualiza `commercial_status` e regista `lead_status_changed` em `product_events`.

Pela restrição explícita do prompt — *"Do not implement unless a real payment success event exists. Do not fake conversions."* — **não vou criar webhook EuPago/Stripe nem inventar fluxo de pagamento**. Vou apenas ligar o sync ao único trigger real de conversão que existe hoje: a transição admin `→ convertido`. Quando um gateway real for adicionado (próximo prompt), basta chamar a mesma função `syncCustomerToBrevo(leadId, reason)`.

## Âmbito desta fase

1. Detetar transição `commercial_status → "convertido"` no PATCH admin.
2. Disparar `syncCustomerToBrevo(leadId, "admin_conversion")` em fire-and-forget (nunca bloqueia o PATCH nem reverte o estado).
3. Sync com Brevo a marcar contacto como cliente.

Fora de âmbito (próximos prompts):
- Webhook real de pagamento (EuPago/Stripe).
- Schema changes para `paid_at`, `plan`, `amount` na tabela `leads`.
- Lista paga só é usada se o secret existir; não vou criar o secret nem alterar config.

## Arquitetura

**Novo módulo `src/lib/brevo/customer-sync.server.ts`** — paralelo ao `sync.server.ts` existente (que faz lead-magnet). Reutiliza `upsertBrevoContact`. Diferenças:

- Sempre envia `IS_CUSTOMER = true` e `COMMERCIAL_STATUS = "convertido"`.
- Inclui `LAST_PAYMENT_AT` (ISO timestamp do momento do sync, já que não há `paid_at` real ainda).
- `PLAN`: lê de `leads.pricing_preference` como melhor proxy disponível (não há coluna `plan`); fica `null` se vazio.
- Adiciona à lista paga **apenas** se `BREVO_PAID_CUSTOMERS_LIST_ID` estiver definido e for um inteiro válido. Caso contrário, faz upsert sem alterar listas (lista lead-magnet continua a apanhar via fallback do `upsertBrevoContact`, ou — alternativa — passamos `listIds: [paidId]` só quando existir; se não existir, passamos `listIds` undefined → cai no default lead-magnet, que é aceitável e mantém o contacto sincronizado).
- Eventos: `brevo_customer_synced` / `brevo_customer_sync_failed` em `product_events`.

**Tipos** em `src/lib/brevo/types.ts`:
- Estender `BrevoSyncReason` com `"admin_conversion"` e `"payment_webhook"` (este último reservado para futuro uso).

**Tracking** em `src/lib/tracking.functions.ts`:
- Adicionar `brevo_customer_synced` e `brevo_customer_sync_failed` ao `ALLOWED_EVENTS`.

**Hook em `src/routes/api/admin/leads-kanban.$id.ts`**:
- Após o `update` ter sucesso, se `updates.commercial_status === "convertido"` **e** o estado anterior era diferente, disparar `void syncCustomerToBrevo(params.id, "admin_conversion").catch(...)` (fire-and-forget, não usa await que bloqueie a resposta).
- Ler estado anterior antes do update (single `select commercial_status`) para evitar re-sync em PATCHes que só mudam `internal_notes`.

## Payload Brevo (exemplo)

```json
POST /v3/contacts
{
  "email": "lead@example.com",
  "updateEnabled": true,
  "listIds": [17],
  "attributes": {
    "INSTAGRAM_HANDLE": "frederico.m.carvalho",
    "REPORTS_COUNT": 3,
    "LAST_REPORT_URL": "https://instagramaudit.lovable.app/analyze/frederico.m.carvalho",
    "LAST_REPORT_AT": "2026-05-10T12:00:00.000Z",
    "PROFILE_OWNERSHIP": "owner",
    "GOAL": "growth",
    "USER_TYPE": "creator",
    "PRICING_PREFERENCE": "pago_unico_30_50",
    "LEAD_SOURCE": "public_report_gate",
    "COMMERCIAL_STATUS": "convertido",
    "IS_CUSTOMER": true,
    "PLAN": "pago_unico_30_50",
    "LAST_PAYMENT_AT": "2026-05-10T12:00:00.000Z"
  }
}
```

Se `BREVO_PAID_CUSTOMERS_LIST_ID` não existir → `listIds` cai em `[BREVO_LEAD_MAGNET_LIST_ID]` (id 16). Atributos `IS_CUSTOMER=true` continuam a permitir segmentação na Brevo mesmo sem lista dedicada.

## Eventos product_events

- `brevo_customer_synced` — `{ sync_reason, brevo_id, status, latency_ms, email_masked, list_id, plan }`
- `brevo_customer_sync_failed` — `{ sync_reason, reason, latency_ms, email_masked }`

Mascaramento de email reutiliza o helper já existente (`f***@example.com`).

## Garantias de segurança

- Sync é fire-and-forget; falha **nunca** reverte o update do lead.
- Sem chaves Brevo no bundle do browser (módulo `.server.ts`, usa gateway Lovable já em produção).
- Sem alterações de schema.
- Sem chamadas a providers fora de Brevo.
- Sem envio de emails.
- Sem mock de conversão: trigger só dispara em transição real `→ convertido`.

## Ficheiros a alterar/criar

Criar:
- `src/lib/brevo/customer-sync.server.ts`
- `src/lib/brevo/__tests__/customer-sync.test.ts` (cenários: sucesso, lead sem email, falha Brevo, lista paga ausente vs presente)

Editar:
- `src/lib/brevo/types.ts` — estender `BrevoSyncReason`.
- `src/lib/tracking.functions.ts` — 2 novos `ALLOWED_EVENTS`.
- `src/routes/api/admin/leads-kanban.$id.ts` — ler estado anterior, disparar sync em transição para `convertido`.

## Validação

- `bunx tsc --noEmit`
- `bunx vitest run` (todos verdes, incluindo novos testes do customer-sync)
- Smoke test manual (após aprovação): mover 1 lead de teste para "Convertido" no Kanban → confirmar:
  - Lead atualizado em Supabase com `commercial_status = "convertido"`.
  - Contacto na Brevo com `IS_CUSTOMER=true`, `COMMERCIAL_STATUS=convertido`, `LAST_PAYMENT_AT` preenchido.
  - Evento `brevo_customer_synced` em `product_events`.
  - Forçar falha (chave inválida) → `brevo_customer_sync_failed` registado e PATCH continua 200 OK.

## Checkpoint

☐ Confirmar que aceitas usar a transição admin `→ convertido` como trigger desta fase (não há gateway de pagamento real ainda).
☐ Confirmar se queres que adicione já o secret `BREVO_PAID_CUSTOMERS_LIST_ID` ou se deixo o fallback para a lista lead-magnet.
