## Auditoria — últimos ~20 pedidos

Janela analisada: 9–10 maio 2026 (mensagens #3260–#3344). Foco: lead magnet unlock end-to-end, admin v2 (visão-geral, automações, email-lab, command palette), hardening Supabase, índices de performance e auditoria mobile + back-end.

---

### 1. Lead magnet / Unlock do report público

| Fase | Estado | Notas |
|---|---|---|
| Visual gate (blur + CTA) na "Taxa de Envolvimento" | ✅ Feito | `report-lock-gate.tsx` + `report-shell-v2` com `lockBoundary="engagement"` |
| Modal 5 passos (RHF + Zod) | ✅ Feito | Email → ownership → goal → user_type → pricing |
| Persistência backend `POST /api/public/report-unlock` | ✅ Feito | Lead upsert conservador + `report_requests` idempotente |
| Migração `leads.pricing_preference` + 4 novos eventos | ✅ Feito | `unlock_email_submitted`, `unlock_completed`, `report_saved_to_account`, `returning_lead_detected` |
| Índice único parcial `(lead_id, analysis_snapshot_id)` | ✅ Feito | Race condition tratada via `code 23505` + refetch |
| Email transacional pós-unlock (`personal-area-saved`) | ✅ Feito | Sender never-throw, timeout 8s, dedupe natural via INSERT único |
| Sender configurável via `RESEND_FROM` + `resolveSender()` partilhado | ✅ Feito | Fallback para sandbox |
| CTA "Criar conta com este email" no success | ✅ Feito | `/signup?email=...` com prefill |
| `sessionStorage` por snapshot (`ib_unlock:<id>`) | ✅ Feito | Com fallback para chave legada |

**Aberto / decidir:**
- ⚠️ `RESEND_FROM` ainda **não está configurado** como secret → emails saem de `onboarding@resend.dev` e qualquer destinatário externo recebe `RESEND_403` (registado como `personal_area_email_failed`).
- ⚠️ `PUBLIC_APP_BASE_URL` não existe como secret (usa fallback `PDF_PUBLIC_BASE_URL` → `instagramaudit.lovable.app`). Funcional mas implícito.
- ⏸ Rate limit em `/api/public/report-unlock` adiado (workspace não tem primitivas; risco real de spam → leads + emails).
- ⏸ Fluxo encurtado para *returning leads* (skip dos passos já preenchidos) — discutido mas não implementado.

---

### 2. Admin v2 — cockpit operacional

| Página | Estado |
|---|---|
| `/admin/visao-geral` — funil 7 etapas + follow-ups prioritários (5 regras) | ✅ Feito |
| `/admin/automacoes` — 7 nós lifecycle, badge automatic/manual, falhas 7d | ✅ Feito |
| `/admin/email-lab` — preview read-only dos 4 templates (Wired/Orphan) | ✅ Feito |
| Command Palette ⌘K — agora pesquisa também por estado comercial | ✅ Feito |
| `/admin` mobile (padding responsivo, overflow-x-hidden, tabs wrap) | ✅ Feito |
| `/admin/report-lab` selector "Versão do relatório a pré-visualizar" + bug "Público geral" | ✅ Feito |

**Aberto:**
- ⚠️ Template `commercial-followup` continua **Orphan** (existe renderer + testes, sem endpoint que o consuma). Decidir: ligar a um trigger admin ou remover.
- ⚠️ Pedido #3291 — **"Comunicação" tab no Lead Detail Sheet** (timeline filtrado por eventos de email) ficou em plano mas não há confirmação de execução nesta janela.
- ⚠️ Pedido #3100 — clareza sobre "última atualização da cache" e até quando é válida — entrou na fila mas não há fix associado nas mensagens posteriores.

---

### 3. Back-end / DB / Segurança

| Item | Estado |
|---|---|
| Batch P0-A++ — RLS hardening: 21 deny-all policies + REVOKE/GRANT em 6 SECURITY DEFINER | ✅ Feito |
| Batch P1-C — 3 índices parciais em `product_events` (lead, snapshot, handle) | ✅ Feito |
| Drop de 7 índices duplicados (`analysis_events`, `social_profiles`) | ✅ Feito |
| Linter Supabase pós-migrações | ✅ 21 INFO (intencional, RLS-on sem policy em tabelas service_role) |
| Revisão dos 10 server functions/routes recentes | ✅ Feito |
| `tsc --noEmit` 0 erros · `vitest` 180/180 | ✅ Verde |
| Auditoria mobile páginas públicas (12 rotas, 411px) | ✅ Feito + fix do double `AppShell` em `/privacidade` e `/termos` |

**Aberto:**
- ⏸ Rate limit em endpoints públicos (`report-unlock`, `feedback`, `request-full-report`) — deferido até infra dedicada.
- ⏸ Sem RLS write-tests automatizados (só smoke manual).

---

### 4. Próximos passos sugeridos (por prioridade)

**P0 — desbloqueia entrega externa do beta**
1. Configurar `RESEND_FROM` com domínio verificado (`relatorios@instagramaudit.pt` ou similar) — sem isto, nenhum email transacional chega a leads externos.
2. Verificar/configurar registo do domínio no Resend (SPF, DKIM, DMARC).
3. Criar secret `PUBLIC_APP_BASE_URL` para tornar URLs do email 100 % explícitos.

**P1 — qualidade e completude funcional**
4. Decidir sobre `commercial-followup`: endpoint admin que dispara o email manualmente quando lead atinge `interessado`/`potencial_cliente`, ou remover.
5. Implementar pedido #3291 — "Comunicação" tab no Lead Detail Sheet (timeline filtrado por eventos `*_email_*`, `report_link_sent`, `feedback_*`).
6. Resolver pedido #3100 — mostrar claramente no UI "última atualização da cache" + "válida até" (timestamp legível, não só estado).

**P2 — robustez antes de tráfego real**
7. Rate limit por IP nos 3 endpoints públicos (memória do worker, 5/10min/20h por IP). Reabrir quando houver convergência sobre infra.
8. Encurtar o flow do unlock para returning leads (`/api/public/unlock-check` por email → skip dos passos já preenchidos).
9. Testes de integração HTTP para `report-unlock` (3 cenários: novo, returning, idempotente).

**P3 — visibilidade e operação**
10. Pequeno painel em `/admin/sistema` que liste leads com `personal_area_email_failed` recentes (para ver quando `RESEND_FROM` está mal configurado).
11. Métrica de funil "unlock_email_submitted → unlock_completed" em `/admin/visao-geral` (drop-off por passo).

---

### Checkpoint

☐ Confirmar configuração do `RESEND_FROM` (P0-1) — quem trata?
☐ Decidir destino do template `commercial-followup` (P1-4)
☐ Aprovar avanço para o pedido #3291 (Comunicação tab) — ainda relevante?
☐ Aprovar fix do display de cache (#3100)

Sem alterações de schema ou de UI propostas neste pedido — é apenas o relatório de estado.