# Auditoria de Consolidação — InstaBench MVP

Auditoria read-only. Nada foi alterado em código, BD ou serviços externos.

## 1. Sumário executivo

O MVP está num estado **operacionalmente funcional** para beta privado interno: 25 ficheiros de teste / 243 testes a passar, `tsc --noEmit` limpo, fluxo de unlock end-to-end ligado a Brevo + sequência de emails, admin reorganizado por módulo (kanban, automações, visão geral, email lab). A infraestrutura de email está unificada num único sender Brevo→Resend (fallback) e os atributos Brevo foram alinhados ao schema (enums mapeados para IDs numéricos). Restam essencialmente **inconsistências de superfície (UI/copy)**, alguns **labels de eventos por completar** e validação de envio real ainda por confirmar com lead orgânico.

## 2. Readiness score

**78 / 100** — pronto para beta interno alargado, ainda não para beta externo público sem o checklist da secção 7.

## 3. O que está completo

- **Unlock 4 passos**: `processReportUnlock` (`src/lib/unlock.server.ts`) faz validação Zod estrita, idempotência por unique index `report_requests_lead_snapshot_unique`, dedup de eventos por janela 5s, race handling 23505 e merge conservador de campos do lead. Pricing question NÃO está no Zod do unlock (apenas opcional).
- **Brevo sync**: `syncLeadToBrevo` (11 atributos), `enum-mappers.ts` converte `pricing_preference` / `source` / `commercial_status` para IDs numéricos. Eventos `brevo_contact_synced` (7) / `brevo_contact_sync_failed` (1) registados em produção. `BREVO_LEAD_MAGNET_LIST_ID` lido de env. Cliente é `brevoFetch` partilhado, sem list IDs hardcoded.
- **Secrets configurados**: `BREVO_API_KEY` (via connector), `BREVO_FROM_EMAIL`, `BREVO_FROM_NAME`, `BREVO_LEAD_MAGNET_LIST_ID`, `RESEND_API_KEY`.
- **Email orchestrator**: `transactional-email.server.ts` (Brevo primário, Resend fallback) + 7 templates (`request-received`, `report-ready`, `feedback-request`, `personal-area-saved`, `welcome-beta`, `report-summary`, `commercial-followup`). `lead-magnet-sequence.server.ts` orquestra welcome + summary com dedup por `metadata.report_request_id`.
- **Admin v2**: sidebar, topbar, command palette (`admin-command-palette.tsx`), kanban beta-leads, lead detail sheet com timeline, automações (templates/people/metrics), visão-geral (funil + intent + kanban + revenue + expense + priority follow-ups), email lab.
- **Public report**: `cache-status-badge` com `expires_at` + TTL fallback, gate de unlock, blur reveal.
- **DB**: 52 migrações aplicadas, indexes críticos presentes (`report_requests_lead_snapshot_unique`, `idx_product_events_*`, `idx_leads_commercial_status`); migração mais recente (`20260510104527`) faz limpeza de duplicados (`DROP INDEX social_profiles_*_idx`).
- **Testes**: 243/243 a passar incluindo `unlock-flow`, `unlock-schema`, `unlock-check-endpoint`, `lead-magnet-sequence`, `transactional-email`, `report-summary`, `templates`, `cache-status-badge`, `lead-communication-timeline`, `customer-sync` (Brevo), `brevo-client` (mocked com `fetch` stub — seguros, não chamam rede).

## 4. O que está parcialmente completo

- **Mapa `EVENT_LABELS`** em `lead-detail-sheet.tsx:134` cobre só ~17 eventos. **Faltam labels pt-PT** para: `unlock_email_submitted`, `unlock_completed`, `returning_lead_detected`, `report_saved_to_account`, `brevo_contact_synced`, `brevo_contact_sync_failed`, `personal_area_email_sent`, `beta_welcome_email_sent`, `report_summary_email_sent`, `brevo_email_failed`, `brevo_email_sent`, `*_email_failed` (4 variantes). A timeline mostra o `event_type` cru.
- **Sender config**: `src/lib/email/sender.ts` ainda devolve `onboarding@resend.dev` se `RESEND_FROM` não estiver definida — e **`RESEND_FROM` não está nos secrets**. Se Brevo falhar, fallback envia de identidade sandbox.
- **Lead-magnet email real**: 7 contactos sincronizados com Brevo, mas só 1 evento `brevo_email_failed` registado e nenhum `brevo_email_sent`. **Smoke test de envio real ainda não confirmado**.
- **CRM mobile**: kanban e lead detail sheet existem mas auditoria mobile (≤375px) ainda não validada nesta sessão.

## 5. O que está em falta

- `pricing_micro_survey_*` events: **não implementados** (nem no allowlist tracker, nem nos componentes — só existem `pricing_clicked` / `pricing_option_clicked`).
- **RLS hardening**: das tabelas `leads`, `product_events`, `report_requests`, `analysis_*`, `app_config`, só `profiles` e `report_requests` têm policies declaradas no schema dump. As restantes não têm policies visíveis (acesso só via service role nas server functions, mas qualquer chave anon ficaria sem barreira). O linter Supabase não foi corrido nesta sessão.
- **Página `/me`**: referenciada em copy do `unlock-modal.tsx:622` (`"Acede sempre que quiseres em /me"`) — **a rota real é `/app/reports`**. Inconsistência de copy/UX.
- **Lead-magnet email duplicate protection**: existe via `eventAlreadyEmitted(... metadata.report_request_id)` — mas não há teste explícito que cubra reentrância simultânea (race em segundos).

## 6. O que está em risco (ordenado por severidade)

- **P0** — Copy `/me` no unlock modal aponta para rota inexistente. Visível ao utilizador final no momento de maior atrito (sucesso). Trivial fix.
- **P0** — Smoke test de envio real (welcome + report-summary) por confirmar com lead orgânico. Sem isto, beta externo arrisca silêncio.
- **P1** — `EVENT_LABELS` incompleto na timeline do CRM. Operacionalmente lê-se "unlock_completed" em vez de "Unlock concluído".
- **P1** — `RESEND_FROM` em falta: fallback envia de `onboarding@resend.dev` (Resend só entrega ao dono da conta).
- **P1** — RLS policies não verificadas via linter; tabelas `leads`/`product_events`/`analysis_*` aparentam não ter policies explícitas.
- **P2** — `pricing_micro_survey` planeado mas não existente.
- **P2** — Mobile audit do admin por completar (≤375px).
- **Nice-to-have** — Tabela inversa de status lifecycle: documentar mapping `event_type → próximo commercial_status` num único lugar (`lead-lifecycle.ts`). Já existe `maybeAdvanceLeadStatus` mas a documentação está dispersa.

## 7. Ações manuais necessárias

1. **Adicionar `RESEND_FROM`** aos secrets (e.g. `"InstaBench <relatorios@instagramaudit.pt>"`) — caso contrário o fallback Resend não entrega.
2. **Verificar domínio sender no Brevo** (`BREVO_FROM_EMAIL=frederico.carvalho@digitalfc.pt`) — confirmar SPF/DKIM ativos no painel Brevo.
3. **Smoke test de unlock real**: usar email pessoal (não `frederico+brevotest_*`), confirmar receção de welcome-beta + report-summary, validar links e tracking pixels.
4. **Confirmar atributos Brevo**: `PRICING_PREFERENCE`, `LEAD_SOURCE`, `COMMERCIAL_STATUS` agora populados no contacto 264 (último teste). Se não, voltar a correr backfill.
5. **Publicar para produção** se o último deploy ainda for anterior às correções de enum-mappers.

## 8. Bugs / inconsistências encontradas

- `src/components/product/unlock-modal.tsx:622` → `"Acede sempre que quiseres em /me"` mas a rota é `/app/reports`.
- `src/components/admin/v2/beta-leads/lead-detail-sheet.tsx:134` → `EVENT_LABELS` só cobre ~17 eventos dos ~30+ existentes em produção (12 distintos só nos últimos 7 dias).
- `src/lib/email/sender.ts:9` → fallback `onboarding@resend.dev` quando `RESEND_FROM` em falta (e está em falta).
- Sem migrações novas pendentes: a última (`20260510104527`) já é hoje. OK.
- Sem testes a falhar. `tsc --noEmit` limpo.

## 9. Próximos 5 prompts recomendados

1. Corrigir copy `/me` → `/app/reports` no unlock modal (1 ficheiro, P0).
2. Completar `EVENT_LABELS` no `lead-detail-sheet.tsx` (extrair para `src/lib/admin/event-labels.ts`, cobrir todos os eventos vivos em `product_events`).
3. Smoke test real de lead-magnet sequence com email pessoal + verificação no Brevo + Resend logs (read-only manual).
4. Adicionar `RESEND_FROM` secret + ajustar `sender.ts` para falhar fechado (return error em vez de sandbox) quando em falta.
5. Correr `supabase--linter` + auditar policies RLS de `leads`, `product_events`, `analysis_*`, `app_config`; abrir migração para adicionar policies restritivas service-role-only.

## 10. Decisão Stop / Go beta externo

**STOP — condicional.**

Pronto para **beta interno alargado** (10–20 utilizadores convidados). Para **beta externo público**, completar primeiro:

- ☐ P0: copy `/me` → `/app/reports`
- ☐ P0: smoke test real de envio (welcome + summary) confirmado
- ☐ P1: `EVENT_LABELS` completo
- ☐ P1: `RESEND_FROM` configurado e fallback testado
- ☐ P1: RLS linter verde

Estimativa: 2 prompts focados resolvem P0; 3 adicionais resolvem P1. Após isso → **GO beta externo**.
