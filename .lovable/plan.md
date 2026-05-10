## Auditoria RLS / Segurança Supabase — pré-beta externo

### 1. Status RLS por tabela

✅ **Boa notícia**: **Todas** as tabelas em `public` têm `rowsecurity = true` (RLS ativada). Postura default = **deny-all** para anon/authenticated; apenas o service role (server functions) tem acesso.

| Tabela | RLS | # Policies | Notas |
|---|---|---|---|
| `profiles` | ✅ | 2 | SELECT/UPDATE próprios (`auth.uid() = id`) — sem INSERT (criado por trigger `handle_new_user`) |
| `report_requests` | ✅ | 1 | SELECT próprios (`user_id = auth.uid()`) |
| `leads` | ✅ | **0** | Apenas service role |
| `product_events` | ✅ | **0** | Apenas service role |
| `analysis_snapshots` | ✅ | **0** | Apenas service role |
| `analysis_events` | ✅ | **0** | Apenas service role |
| `social_profiles` | ✅ | **0** | Apenas service role |
| `provider_call_logs` | ✅ | **0** | Apenas service role |
| `app_config` | ✅ | **0** | Apenas service role (admin) |
| `beta_feedback` | ✅ | **0** | Apenas service role |
| `cost_daily`, `provider_billing_*`, `usage_alerts` | ✅ | **0** | Internas/admin |
| `knowledge_*` (5 tabelas) | ✅ | **0** | Apenas admin via server fn |
| `benchmark_references`, `enrichment_jobs`, `comment_enrichment_jobs`, `report_variant_overrides` | ✅ | **0** | Internas |

### 2. Linter findings

- **21 issues**, todas **`INFO`** (severidade baixa): "RLS Enabled No Policy" — não-bloqueantes. Significa apenas que o linter detetou tabelas com RLS sem policies, o que é **intencional** para tabelas só acedidas via service role.
- Nenhum `WARN` ou `ERROR`. Nenhum aviso "RLS disabled" (que seria crítico).

### 3. Acesso client-side direto às tabelas

**`rg supabase.from(...)` em código não-server retornou 0 resultados.** Todo o acesso a tabelas é via:
- `createServerFn` + `requireSupabaseAuth` (RLS aplica como utilizador)
- `supabaseAdmin` em `*.server.ts` (service role, bypass RLS)

Browser client é usado **apenas** para `supabase.auth.*` (login/signup/sessão) em 6 ficheiros. Confirmado seguro.

### 4. Análise de risco

| Risco | Severidade | Status |
|---|---|---|
| Tabelas sem RLS expostas | **P0** | ✅ Não existe — todas têm RLS |
| `leads` (PII: emails) lida por anon | **P0** | ✅ Bloqueado por deny-all |
| `product_events` (analytics) lida por anon | **P1** | ✅ Bloqueado |
| Policy demasiado permissiva (`USING (true)`) | **P0** | ✅ Não existe |
| Mutações cliente em tabelas sensíveis | **P0** | ✅ Cliente nunca escreve direto |
| `profiles` expor PII de outros utilizadores | **P1** | ✅ SELECT restringido a `auth.uid() = id` |
| `report_requests` cross-user leak | **P1** | ✅ SELECT restringido a `user_id = auth.uid()` |
| Falta INSERT policy em `profiles` | **P2** | ⚠️ Só funciona via trigger — OK enquanto signup usar `handle_new_user` |
| `app_config` editável por anon | **P0** | ✅ Bloqueado |
| Realtime subscriptions a tabelas sem policy | **P2** | ⚠️ Confirmar que nenhum canal Realtime está ativo (não vi nenhum) |

### 5. Conclusão da auditoria

🟢 **A postura RLS atual é segura para beta externo.** Não há expostos críticos. O modelo é "service role + server functions exclusivamente", o que é o padrão **recomendado** para esta arquitetura TanStack.

### 6. Hardening proposto (não-bloqueante para beta, mas recomendado)

Para reduzir os 21 findings INFO do linter e tornar a postura **explicitamente** documentada (defense-in-depth):

#### Plano de migração (P1 — fazer antes de abrir o beta a externos)

1. **Adicionar policies "deny-all explícitas"** ou comentários `COMMENT ON TABLE` documentando a intenção em todas as tabelas service-role-only. Limpa o linter e clarifica a intenção.
2. **Adicionar SELECT policy ao próprio utilizador em `leads`** (`email_normalized = (SELECT lower(email) FROM auth.users WHERE id = auth.uid())`) **se** quisermos permitir ao utilizador autenticado ver o seu próprio lead na app. Caso contrário, manter deny-all.
3. **Adicionar SELECT em `beta_feedback`** restrito ao próprio lead via `lead_id IN (SELECT lead_id FROM profiles WHERE id = auth.uid())` se quisermos UI de "ver feedback que enviei".
4. **Confirmar `FORCE ROW LEVEL SECURITY`** nas tabelas com PII (`leads`, `profiles`, `report_requests`) — garante que mesmo o owner da tabela não escapa RLS por engano (service role bypassa na mesma).
5. **Dropar acesso ao schema `public` para `anon`** em tabelas que nunca devem ser tocadas por anon (`REVOKE ALL ON TABLE ... FROM anon`). Belt-and-suspenders.

#### Plano de rollback

- Cada policy criada = 1 statement `DROP POLICY ... ON ...`. Migração reversível.
- `FORCE RLS` reversível com `ALTER TABLE ... NO FORCE ROW LEVEL SECURITY`.
- `REVOKE` reversível com `GRANT SELECT ON TABLE ... TO anon`.
- Nenhuma alteração de schema (colunas, dados).

### 7. Primeiro prompt de hardening (a executar a seguir, em build mode)

> **Objetivo**: Aplicar P1 RLS hardening — limpar 21 INFO findings + reforçar PII.
>
> **Migração** (uma só):
> 1. `ALTER TABLE leads, profiles, report_requests, product_events FORCE ROW LEVEL SECURITY;`
> 2. `REVOKE ALL ON TABLE leads, product_events, analysis_events, analysis_snapshots, social_profiles, provider_call_logs, app_config, cost_daily, provider_billing_imports, provider_billing_import_batches, usage_alerts, knowledge_*, enrichment_jobs, comment_enrichment_jobs, report_variant_overrides, beta_feedback, benchmark_references FROM anon, authenticated;`
> 3. `COMMENT ON TABLE <each>` documentando "service-role only".
> 4. **Não** adicionar policies "deny-all" SQL (redundante com REVOKE; linter vai parar de queixar-se porque a tabela perde grants públicos).
>
> **Validação pós-migração**:
> - Re-correr `supabase--linter` → 0 findings esperados.
> - Smoke test do unlock (já validado): deve continuar a funcionar (service role bypassa).
> - Login/signup: deve continuar (auth schema intocado).
> - Página `/app` (autenticado, lê `profiles` e `report_requests`): testar manualmente — pode quebrar se a server fn `getUserDashboard` for chamada com `requireSupabaseAuth` em vez de admin.
>
> **Rollback** se quebrar:
> ```sql
> GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE <table> TO authenticated;
> ALTER TABLE <table> NO FORCE ROW LEVEL SECURITY;
> ```

### Constraints respeitados

- ✅ Auditoria read-only — 0 alterações
- ✅ 0 migrações criadas
- ✅ 0 policies alteradas
- ✅ Fluxo público de unlock/report intacto
- ✅ Sem exposição de dados privados (linter confirma)

### Checkpoint

- ☐ Aprovar plano de hardening P1 (revoke + force RLS)
- ☐ Decidir se utilizadores autenticados devem **ler o próprio `lead`** (SELECT policy) ou só via server fn
- ☐ Executar migração
- ☐ Re-correr linter e smoke test do unlock
- ☐ Validar `/app` autenticado (dashboard, account, plan)
