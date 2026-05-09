# Plano — Teste Beta Controlado com 1 Lead Externo

Validação operacional end-to-end do fluxo beta com **um único lead real externo**, em modo observador (sem alterar código). Execução requer aprovações pontuais antes de qualquer ação que custe (Apify) ou envie email.

---

## 1. Pré-requisitos a Confirmar (antes de começar)

| # | Item | Como verificar |
|---|---|---|
| 1 | Email externo do tester definido | Tu fornecer (não usar `frederico.m.carvalho` nem o admin) |
| 2 | Username Instagram para análise | Idealmente o do próprio tester ou outro permitido pela `APIFY_ALLOWLIST` |
| 3 | Snapshot já em cache para esse handle? | `SELECT id, created_at FROM analysis_snapshots WHERE instagram_username = ? ORDER BY created_at DESC LIMIT 1` |
| 4 | Estado atual do `APIFY_ENABLED` e `APIFY_TESTING_MODE` | `secrets--fetch_secrets` (já visíveis na config) |
| 5 | Estado do `RESEND_API_KEY` + domínio de envio ativo | já configurados; confirmar antes do passo 5 |

→ **Checkpoint A**: se snapshot **não existir**, é necessário Apify run (custo). Pedir aprovação explícita antes de avançar.

---

## 2. Fluxo de Execução (16 passos auditados)

Cada passo regista: **timestamp UTC**, **lead_id**, **event_id**, **status**, **PASS/FAIL**.

### Bloco 1 — Captura
1. **Submeter beta request** via `/` (form público) com email externo real.
2. **Confirmar `leads` row** (`SELECT id, email, commercial_status, created_at FROM leads WHERE email_normalized = ? ORDER BY created_at DESC LIMIT 1`). Esperado: `commercial_status = 'novo_pedido'`.
3. **Abrir CRM Kanban** (`/admin`); confirmar card visível na coluna "Novo pedido".
4. **Abrir lead detail sheet**; confirmar timeline mostra `request_submitted`.

### Bloco 2 — Geração de Report ⚠️ *gate de custo*
5. **Checkpoint B (custo Apify):** se cache existir → reuse; se não → **PARAR e pedir aprovação**.
6. **Gerar/atribuir report** via UI admin → snapshot vinculado ao lead.
7. **Confirmar `report_requests`** (`SELECT id, request_status, analysis_snapshot_id FROM report_requests WHERE lead_id = ?`). Esperado: `request_status = 'ready'`, `analysis_snapshot_id` preenchido.

### Bloco 3 — Envio do Link ⚠️ *gate de email #1*
8. **Checkpoint C (email):** confirmar que vais clicar "Enviar link". Pedir OK.
9. **Clicar "Enviar link do report"** no lead detail.
10. **Confirmar Resend send** via `provider_call_logs` (`provider='resend'`, último 5min) + `report_requests.delivery_status = 'sent'` + `email_message_id` preenchido.
11. **Confirmar evento** `report_link_sent` em `product_events`.
12. **Confirmar `commercial_status` = `link_enviado`**.

### Bloco 4 — Visualização Pública
13. **Tester abre link do email** (URL pública `/r/<token>`).
14. **Confirmar exactamente 1 evento** `report_viewed` (`SELECT count(*), min(created_at) FROM product_events WHERE lead_id = ? AND event_type = 'report_viewed'`). Esperado: `count = 1`.
15. **Refresh do tester** (validar dedup): contagem deve permanecer `1` (P2-A já documenta este risco).

### Bloco 5 — Feedback ⚠️ *gate de email #2*
16. **Checkpoint D (email):** OK para enviar request de feedback.
17. **Clicar "Pedir feedback"** no CRM.
18. **Confirmar Resend send #2** + evento `feedback_request_sent` + `commercial_status = 'feedback_pedido'`.
19. **Tester submete formulário** público de feedback.
20. **Confirmar `beta_feedback` row** (`SELECT id, usefulness_score, purchase_intent, created_at FROM beta_feedback WHERE lead_id = ?`).
21. **Confirmar `commercial_status = 'feedback_recebido'`**.
22. **Confirmar evento** `feedback_received`.

### Bloco 6 — Coerência Final
23. **Listar timeline completa** ordenada por `created_at` para o `lead_id`. Validar:
    - sem eventos órfãos
    - sem duplicados além do esperado
    - todos os eventos têm label pt-PT renderizada (atenção: P1-NEW-3 tem 6 sem label)

---

## 3. Output que Vais Receber

### A. Tabela PASS/FAIL (16 passos)

| # | Passo | Esperado | Observado | Status | event_id / lead_id |
|---|---|---|---|---|---|
| 1 | Submit form | row em `leads` | … | ✅/❌ | … |
| … | … | … | … | … | … |

### B. Status de envio de email

| # | Trigger | Resend message_id | Status | Latência | Erro? |
|---|---|---|---|---|---|
| 1 | Report link | re_xxx | sent | xx ms | — |
| 2 | Feedback request | re_yyy | sent | xx ms | — |

### C. Timeline de eventos (cronológica)

```
HH:MM:SS  request_submitted        evt_…
HH:MM:SS  report_request_created   evt_…
HH:MM:SS  report_ready             evt_…
HH:MM:SS  report_link_sent         evt_…
HH:MM:SS  report_viewed            evt_…
HH:MM:SS  feedback_request_sent    evt_…
HH:MM:SS  feedback_received        evt_…
```

### D. Estado final do lead
- `commercial_status` final
- # eventos totais
- `beta_feedback` row presente

### E. Issues encontradas
Lista de regressões ou inconsistências (com referência à linha PASS/FAIL).

### F. Recomendação
Verde / Amarelo / Vermelho para convidar 5–10 testers + ações requeridas antes.

---

## 4. Gates de Aprovação (anti-custo / anti-spam)

| Gate | Acção | Custo | Como pedirei |
|---|---|---|---|
| **B** | Apify run novo | ~$0.05–$0.20 | Mostro handle + estado da cache, peço OK explícito |
| **C** | Resend email #1 (link) | ~$0 (incluso) | Confirmo destinatário antes de clicar |
| **D** | Resend email #2 (feedback) | ~$0 (incluso) | Confirmo destinatário antes de clicar |

Se algum gate for negado → registo "BLOCKED" no PASS/FAIL e não avanço.

---

## 5. Constraints respeitadas

- ✅ Apenas 1 lead, 1 ciclo completo
- ✅ Apify só com aprovação explícita (preferência: reusar cache)
- ✅ Máximo 2 emails (link + feedback request)
- ✅ Sem alteração de dados não relacionados
- ✅ Timestamps UTC e IDs reais registados em cada passo
- ✅ Apenas leitura via `supabase--read_query` para validação

---

## 6. O que preciso de ti antes de começar

1. **Email externo do tester** (formato real, recebível por ti ou pessoa de confiança).
2. **Username Instagram** a analisar (e confirmar se está em `APIFY_ALLOWLIST`).
3. **Confirmação:** posso avançar até ao Checkpoint B parando para pedir aprovação aí?

Sem estas 3 respostas, não inicio a execução.
