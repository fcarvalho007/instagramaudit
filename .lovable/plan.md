## Objetivo

Auditoria end-to-end **read-only** do fluxo operacional beta (15 passos). Sem alterações de código, sem providers pagos, sem emails reais — exceto se o utilizador autorizar pontualmente um lead de teste.

---

## Cobertura mapeada

| # | Etapa | Superfície a auditar |
|---|---|---|
| 1 | Submissão beta | `src/routes/beta.request.tsx` + `src/routes/api/request-full-report.ts` |
| 2 | Aparece no Kanban | `src/routes/api/admin/leads-kanban.ts` + UI `BetaLeadsKanban` |
| 3 | Lead detail | `src/components/admin/v2/beta-leads/lead-detail-sheet.tsx` + `lead-timeline.$id.ts` + `leads-kanban.$id.ts` |
| 4 | Generate/refresh report | `src/routes/api/admin/generate-beta-report.ts` + `force-refresh.ts` |
| 5 | Report link disponível | `report_requests.pdf_storage_path` + estado `report_status` |
| 6 | Send report link | `src/routes/api/admin/send-report-link.ts` + template email |
| 7 | Evento `report_link_sent` | `product_events` (via `recordProductEvent`) |
| 8 | Visualização pública | `src/routes/analyze.$username.tsx` |
| 9 | Evento `report_viewed` + auto-advance | `tracking.functions.ts` + `lead-lifecycle.ts` |
| 10 | Send feedback request | `send-feedback-request.ts` + dialog em `lead-detail-sheet.tsx` |
| 11 | Submissão feedback | `src/routes/feedback.$requestId.tsx` + `api/public/feedback.$requestId.ts` |
| 12 | Evento `feedback_submitted` | `product_events` + lifecycle update |
| 13 | Feedback no detail | secção "Feedback beta" + `feedback-intent.ts` |
| 14 | Status atualiza | `lead-lifecycle.ts` ladder |
| 15 | Próxima ação sugerida | `feedback-intent.ts` `nextAction` |

---

## Método (3 fases sequenciais)

### Fase A — Inspeção estática (read-only, ~15 min)

Para cada um dos 15 passos:
- Ler o ficheiro responsável
- Verificar contrato esperado (input/output, status codes, eventos disparados)
- Confirmar idempotência onde requerido (passos 11, 6)
- Confirmar fallback de erro (rollback de status quando email falha)

Verificações transversais:
- **Sem providers no público**: rg em `src/routes/api/public/*` por chamadas a `apifyClient`, `dataforseo`, `openai`, `lovable-ai-gateway`. Esperado: zero.
- **Rotas quebradas**: `bunx tsc --noEmit` + verificar `src/routeTree.gen.ts` cobre `/beta/request`, `/beta/submitted/$requestId`, `/feedback/$requestId`, `/analyze/$username`, todas as `/api/admin/*` e `/api/public/*` referenciadas.
- **Allowlist de eventos**: `tracking.functions.ts` contém `report_link_sent`, `report_viewed`, `feedback_submitted`, `feedback_requested`, `unlock_clicked`, `pricing_option_clicked`.
- **Form mobile**: classes responsivas em `feedback.$requestId.tsx` e `beta.request.tsx` (grid, padding, tap targets ≥ 44px).

### Fase B — Inspeção de dados live (read-only DB, ~10 min)

Via `psql` (read-only) ou `supabase--read_query`:

1. **Lead mais recente com fluxo completo** (se existir):
   ```sql
   select id, email, commercial_status, created_at
   from leads
   order by created_at desc limit 5;
   ```
2. **Eventos por lead** (sanity da timeline):
   ```sql
   select event_type, created_at, metadata
   from product_events
   where lead_id = '<id>'
   order by created_at;
   ```
   Confirmar ordem esperada: `report_link_sent` → `report_viewed` → `feedback_requested` → `feedback_submitted`.
3. **Feedback duplicado**:
   ```sql
   select report_request_id, count(*) from beta_feedback
   group by 1 having count(*) > 1;
   ```
   Esperado: zero linhas (constraint deve impedir).
4. **Report sem link**:
   ```sql
   select rr.id, rr.delivery_status, rr.pdf_storage_path
   from report_requests rr
   where rr.delivery_status = 'sent' and pdf_storage_path is null;
   ```
   Esperado: zero linhas.
5. **Status leads vs eventos** (deteta drift do lifecycle):
   ```sql
   select l.commercial_status, count(*) from leads l
   group by 1;
   ```

### Fase C — Smoke HTTP (apenas endpoints públicos, ~5 min)

Sem disparar custos:

- `GET /feedback/<requestId-inválido>` → esperado: estado vazio amigável (não 500)
- `GET /analyze/<handle-inexistente>` → esperado: empty/error state
- `POST /api/public/feedback/<requestId>` com payload inválido → 400 com `error.message`
- `POST /api/public/feedback/<requestId-válido>` duplicado → 409 / `already_submitted`

Endpoints admin: **não chamar** sem aprovação (geram custo / enviam email).

---

## Critérios de severidade

- **Blocker**: quebra qualquer dos 15 passos numa run normal (lead real perderia funcionalidade)
- **Important**: degrada UX/dados (timeline desordenada, status que não avança, rótulos errados)
- **Nice-to-have**: cosmética, copy, micro-acessibilidade

---

## Fórmula do score (0–100)

```
score = 100
  − 25 por cada blocker
  − 8 por cada important
  − 2 por cada nice-to-have
mínimo 0
```

Tetos: ≥85 = beta-ready · 60–84 = ready com ressalvas · <60 = não-pronto.

---

## Output (entrega no próximo turno)

1. **Tabela PASS/FAIL** com 15 linhas (uma por passo) + 7 linhas de verificações transversais
2. **Lista de blockers** com ficheiro:linha + correção sugerida
3. **Lista de important** idem
4. **Lista de nice-to-have** idem
5. **Score 0–100** com decomposição
6. **Top 3 next fixes** prioritizados por impacto/esforço

---

## Não fazer

- Não enviar emails reais (não chamar `send-report-link` nem `send-feedback-request`)
- Não chamar Apify / DataForSEO / OpenAI
- Não alterar código nem dados (só `SELECT`)
- Não tocar `/report.example`, pipeline PDF, ou geração de relatório

---

## Pedido ao utilizador antes de começar (opcional)

Se quiseres que eu exercite os endpoints admin contra um **lead de teste real** (com email teu), aprova explicitamente. Caso contrário, fico apenas pela inspeção estática + DB read-only + smoke público.

---

## Checkpoint

- ☐ Fase A: 15 passos + 7 verificações transversais inspecionadas
- ☐ Fase B: 5 queries DB executadas, drifts identificados
- ☐ Fase C: 4 smoke calls públicos sem 5xx
- ☐ Tabela PASS/FAIL produzida
- ☐ Blockers / important / nice-to-have catalogados
- ☐ Score 0–100 calculado com fórmula explícita
- ☐ Top 3 next fixes priorizados