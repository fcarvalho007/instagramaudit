# Roadmap de Correção — InstaBench Beta MVP

Baseado na auditoria final (score 82/100). Plano de correção isolado por tema, sem misturar UI, DB e providers no mesmo batch.

---

## 1. Agrupamento por Prioridade

### P0 — Bloqueia lançamento beta

**P0-A++ · Hardening de RLS e SECURITY DEFINER** *(detetado pelo linter)*
- **Problema:** 1 tabela `public.*` com RLS desativada exposta via PostgREST + 5 funções `SECURITY DEFINER` executáveis pelo role `anon` (`record_analysis_event`, `set_admin_email_session`, `link_user_to_existing_reports`, `handle_new_user`, `set_enrichment_status`, `get_knowledge_context`).
- **Ficheiros:** nova migration SQL.
- **Risco:** privilege escalation, leitura/escrita não autorizada de dados de leads e snapshots. **Severidade: ALTA.**
- **Fix proposto:** habilitar RLS na tabela exposta + políticas restritivas; `REVOKE EXECUTE ... FROM anon, public` nas 5 funções; `GRANT EXECUTE` apenas a `authenticated`/`service_role` consoante uso real.
- **Validação:** `supabase--linter` 0 erros; smoke test do happy path (request → report → feedback) com sessão real e com `anon`; confirmar que edge functions ainda funcionam (usam `service_role`).
- **Migração DB:** **Sim.**
- **Provider/email:** **Não.**

---

### P1 — Antes dos primeiros testers externos

**P1-NEW-3 · Labels de timeline em falta**
- **Problema:** 6 eventos sem label no `lead-lifecycle`: `request_received_email_sent`, `request_received_email_failed`, `pricing_clicked`, `public_report_link_copied`, `module_visibility_published`, `request_status_changed`.
- **Ficheiros:** `src/lib/admin/lead-lifecycle.ts` (mapeamento de labels).
- **Risco:** baixo (cosmético no CRM); afeta legibilidade do operador comercial.
- **Fix:** adicionar entradas no dicionário de labels pt-PT.
- **Validação:** abrir lead detail sheet com eventos destes tipos; verificar texto renderizado.
- **DB:** Não. **Provider/email:** Não.

**P1-C · Índices de performance**
- **Problema:** queries do CRM sobre `product_events`/`leads` sem índices em colunas filtradas (event_type, lead_id, created_at).
- **Ficheiros:** nova migration.
- **Risco:** degradação com volume; nenhum em <100 leads.
- **Fix:** `CREATE INDEX IF NOT EXISTS` em colunas usadas pelo Kanban e timeline.
- **Validação:** `EXPLAIN` antes/depois.
- **DB:** **Sim.** **Provider/email:** Não.

**P1-A · Smoke tests E2E (Vitest)**
- **Problema:** happy path validado manualmente apenas (1 lead em produção).
- **Ficheiros:** `src/__tests__/e2e/beta-flow.test.ts` (novo).
- **Risco:** regressões silenciosas em iterações futuras.
- **Fix:** testes mockados do fluxo: request → email → view → feedback (sem providers reais).
- **Validação:** `bunx vitest run` verde.
- **DB:** Não. **Provider/email:** mockados.

**P1-B · Decisão sobre `commercial-followup`**
- **Problema:** template orfão importado mas nunca emitido.
- **Ficheiros:** `src/emails/commercial-followup.tsx` + sites de import.
- **Risco:** confusão / dead code.
- **Fix:** decidir — wire-up no CRM (botão "enviar follow-up") **OU** remover. Recomendação: remover e re-introduzir quando houver UX definida.
- **Validação:** `rg commercial-followup` = 0 hits após remoção; tsc + vitest verdes.
- **DB:** Não. **Provider/email:** Não (apenas import; sem envio).

---

### P2 — Pós primeira wave de beta

**P2-A · Colapsar duplicação de `report_viewed`**
- **Problema:** lógica de dedup espalhada; possível dupla contagem em edge cases.
- **Fix:** centralizar em helper único.
- **DB:** Não. **Provider/email:** Não.

**P2-B · Suprimir `lead_status_changed` ruidoso**
- **Problema:** evento gerado em transições internas pollui timeline.
- **Fix:** filtrar no recordProductEvent OU no render de timeline.
- **DB:** Não. **Provider/email:** Não.

**P2-NEW-1 · Tipagem estrita de event_type**
- **Problema:** 4 sites fazem `INSERT` direto bypassando validação `ALLOWED_EVENTS`.
- **Fix:** refatorar para usar `recordProductEvent`.
- **DB:** Não. **Provider/email:** Não.

---

### P3 — Nice-to-have

- Documentação de runbook de incidentes (provider down, Resend bounce).
- Dashboard admin com KPIs de funil (request → view → feedback).
- Limpeza de comentários TODO / código morto residual.

---

## 2. Batches de Implementação

| Batch | Tema | Toca | Migração | Provider |
|---|---|---|---|---|
| **B1** | P0-A++ RLS + SECURITY DEFINER | DB only | Sim | Não |
| **B2** | P1-C índices | DB only | Sim | Não |
| **B3** | P1-NEW-3 labels timeline | UI/lib only | Não | Não |
| **B4** | P1-A smoke tests E2E | Tests only | Não | Mock |
| **B5** | P1-B decisão commercial-followup | Code cleanup | Não | Não |
| **B6** | P2-A dedup report_viewed | lib only | Não | Não |
| **B7** | P2-B filtro lead_status_changed | lib only | Não | Não |
| **B8** | P2-NEW-1 refactor inserts diretos | lib only | Não | Não |

Cada batch isolado, sem misturar camadas. Risco crescente concentrado em B1.

---

## 3. Ordem Recomendada (segurança crescente → estabilidade → polish)

```text
B1 (P0 segurança)  ← crítico, requer aprovação migration
  ↓
B2 (índices)        ← migration trivial, melhora perf
  ↓
B3 (labels)         ← UI cosmético, zero risco
  ↓
B4 (smoke tests)    ← rede de segurança antes de testers
  ↓
B5 (cleanup)        ← decisão produto
  ↓
B6 → B7 → B8        ← refactor pós-beta
```

**Rationale:** B1 primeiro porque expõe dados; B2 logo a seguir aproveita janela de migration; B3-B4 antes de convidar testers; B5+ podem correr em paralelo com beta.

---

## 4. Risco Estimado por Batch

- **B1:** MÉDIO-ALTO — pode partir edge functions se `service_role` não estiver corretamente granted. Mitigação: testar cada função após migration.
- **B2:** BAIXO — `CREATE INDEX IF NOT EXISTS` é idempotente e seguro.
- **B3:** MUITO BAIXO — apenas strings.
- **B4:** BAIXO — só adiciona ficheiros de teste.
- **B5:** BAIXO — remoção de código morto verificável com `rg`.
- **B6-B8:** BAIXO-MÉDIO — refactor com testes do B4 como rede.

---

## 5. Primeiro Prompt de Implementação (B1)

> ```
> Use Plan Mode first.
>
> Goal:
> Implement Batch B1 — RLS hardening + SECURITY DEFINER lockdown.
>
> Scope:
> 1. Identify the public.* table flagged by supabase--linter as
>    "RLS Disabled in Public" (ERROR 21).
> 2. Enable RLS on that table and add minimum-viable policies:
>    - SELECT: only owner / service_role (depending on table semantics)
>    - INSERT/UPDATE/DELETE: service_role only, unless the table has a
>      legitimate authenticated write path
> 3. For these 5 SECURITY DEFINER functions, REVOKE EXECUTE FROM anon, public
>    and GRANT EXECUTE only to the roles that actually call them:
>    - record_analysis_event
>    - set_admin_email_session
>    - link_user_to_existing_reports
>    - handle_new_user (must remain callable by trigger context)
>    - set_enrichment_status
>    - get_knowledge_context
>
> Deliverable:
> - One migration file via supabase--migration tool
> - No code changes outside the migration
> - Run supabase--linter after to confirm 0 errors remain
>
> Constraints:
> - Do not modify edge function code in this batch
> - Do not touch UI
> - Do not call providers
> - Stop and request confirmation before applying if any policy could
>   break the existing happy path (request → report → feedback)
> - Map each function's actual call sites (rg) before changing GRANTs
>
> Validation:
> - supabase--linter: 0 ERROR-level findings on these items
> - bunx tsc --noEmit: 0 errors
> - bunx vitest run: 163/163 pass
> - Manual smoke: load /admin CRM as authenticated admin; load a public
>   report URL as anonymous; confirm both render
> ```

---

## Notas técnicas

- **Política de migrations:** B1 e B2 são migrations separadas para permitir rollback granular.
- **Idempotência:** todas as migrations usam `IF NOT EXISTS` / `IF EXISTS` para serem re-executáveis.
- **Edge functions:** usam `SUPABASE_SERVICE_ROLE_KEY`, logo bypass de RLS — B1 não as afeta desde que `service_role` mantenha `EXECUTE`.
- **`handle_new_user`:** chamada por trigger no `auth.users`; precisa de `EXECUTE` para `supabase_auth_admin` (não para `anon`).
