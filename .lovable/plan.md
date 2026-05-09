## Auditoria de Consolidação — InstaBench Beta MVP

Auditoria **read-only**: sem alterações de código, sem chamadas a providers, sem mutações de DB, sem envios de email. Inspeção estática + consultas SQL `SELECT` + `tsc` + `vitest`.

### Abordagem

Auditoria executada em 4 fases, cada uma com ferramentas específicas. Output final é **um único relatório markdown** entregue na chat (não escrito em ficheiro), seguindo o formato exato pedido.

#### Fase 1 — Levantamento estático (15 min)

- `rg` para mapear todos os call sites dos 12 eventos listados (`beta_request_created`, `report_generated`, `report_link_sent`, `report_viewed`, `feedback_requested`, `feedback_started`, `feedback_submitted`, `unlock_clicked`, `pricing_option_clicked`, `lead_status_changed`, `request_received_email_sent`, `request_received_email_failed`).
- `rg` para detetar variantes/duplicações de nomes (ex.: `feedback_request_sent` vs `feedback_requested`).
- Listar `src/lib/email/templates`, `src/routes/api/`, `src/lib/admin/lead-lifecycle.ts`, `src/components/admin/v2/beta-leads/`, `src/routes/feedback*`, `src/routes/analyze.$username.tsx`, `src/lib/tracking.functions.ts`, `src/lib/report/report-variant.ts`.
- Confirmar `tracking.functions.ts` allowed list vs eventos realmente emitidos.
- Mapear server functions/routes que tocam Apify/OpenAI/DataForSEO/Resend e confirmar gates (`INTERNAL_API_TOKEN`, kill switches, allowlists).
- Identificar ficheiros órfãos: templates não importados, helpers só referenciados em testes, rotas sem links.

#### Fase 2 — Consistência de DB e lifecycle (10 min)

Queries `SELECT` apenas:
- distribuição de `commercial_status` em `leads` + leads parados há >7 dias por estado.
- `product_events` por `event_type` × últimos 30 dias (detetar eventos órfãos / não usados).
- `report_requests` com `delivery_status='sent'` sem `report_link_sent` correspondente (validar backfill anterior).
- `report_requests` com `feedback_requested` mas sem `feedback_request_sent` (gap análogo).
- `beta_feedback` órfão (sem lead/request).
- Índices existentes em `product_events(lead_id, event_type, created_at)`, `report_requests(lead_id)`, `beta_feedback(lead_id)`.
- FKs ausentes (já sabemos que `product_events` não tem FKs declaradas).

#### Fase 3 — Validação automatizada (5 min)

- `bunx tsc --noEmit`
- `bunx vitest run`
- `supabase--linter` para warnings de RLS/security.
- Listar testes existentes vs flows críticos sem cobertura.

#### Fase 4 — Síntese (escrita do relatório)

Relatório com **as 10 secções pedidas**, na ordem exata:

1. **Executive summary** — 5-8 linhas pt-PT.
2. **Beta readiness score 0–100** — com breakdown (functional/safety/UX/tracking/tests).
3. **Critical blockers** — bloqueiam beta launch.
4. **Important issues** — não bloqueiam mas devem ser resolvidos cedo.
5. **Nice-to-have improvements** — refinamentos.
6. **Orphan/duplicate code list** — ficheiro + razão.
7. **Event/status consistency table** — colunas: evento | aceite no schema | emitido | aparece no timeline | metadata útil | observação.
8. **Email wiring table** — template | trigger | quando emite evento | falha = bloqueante? | observações.
9. **Public vs admin route safety table** — rota | público? | chama provider pago? | requer `INTERNAL_API_TOKEN`? | risco.
10. **Recommended fix roadmap** — 3 buckets (Fix now / Fix soon / Can wait), cada item com esforço estimado (S/M/L).

### Restrições reforçadas

- Sem `code--apply_patch`, `code--write`, `supabase--migration`, `supabase--insert`, `supabase--storage_upload`.
- Sem `stack_modern--invoke-server-function` em endpoints que possam disparar Apify/OpenAI/DataForSEO/Resend (`refresh-profile`, `generate-beta-report`, `send-report-link`, `send-feedback-request`, `analyze-public-v1` em modo fresh).
- Permitido: `rg`, `code--view`, `code--list_dir`, `supabase--read_query`, `supabase--linter`, `bunx tsc --noEmit`, `bunx vitest run`.

### Entregável

Um único bloco de chat com as 10 secções acima, em pt-PT, sem placeholders, com referências a ficheiros/linhas específicas e queries usadas. Sem ficheiros novos.
