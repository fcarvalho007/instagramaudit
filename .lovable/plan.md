# Admin account deletion — gap-fix plan

## TL;DR
A maior parte da spec já está implementada (archive/purge em `leads-bulk.ts`, endpoint de diagnóstico, UI com "APAGAR" + override `force_paid`, migration `leads.archived_at`, testes de bulk). Faltam **três gaps cirúrgicos** para fechar consistência total. Plano abaixo só toca nesses gaps. Sem alterações em checkout, pagamentos, créditos, packs, 30d/90d, concorrente, cache, conteúdo de relatório ou visibilidade lab.

## Estado actual (já existe, não tocar)
| Item | Onde | Estado |
|---|---|---|
| `leads.archived_at` + índice | migration `20260609172232_…` | ✅ |
| Archive (soft) + Purge (hard, cascade + auth.users) | `src/routes/api/admin/leads-bulk.ts` | ✅ |
| Bloqueio `lead_payments.status='paid'` + override `force_paid` | mesmo ficheiro | ✅ |
| Audit `leads_bulk_archived` / `leads_bulk_purged` | mesmo ficheiro | ✅ |
| Endpoint diagnóstico (orphan auth / orphan leads / archived / dup emails) | `src/routes/api/admin/diagnostics.account-sync.ts` | ✅ |
| UI "Arquivar" + "Apagar definitivamente conta de teste" com confirmação dupla | `src/components/admin/v2/beta-leads/leads-table.tsx` | ✅ |
| Listagens admin filtram `archived_at IS NULL` por defeito | `follow-ups.ts`, `leads-kanban.ts`, `routes/admin.leads.tsx` | ✅ |
| Testes do bulk (archive / purge / paid block) | `src/routes/api/admin/__tests__/leads-bulk.test.ts` | ✅ |
| Limpeza dos 2 emails de teste | migration one-shot já corrida | ✅ |

## Gaps a fechar

### Gap 1 — `check-email` deve ignorar leads arquivados (regra D)
**Ficheiro:** `src/routes/api/onboarding/check-email.ts`
**Sintoma actual:** `findLead()` faz `select … from leads where email_normalized = ?` sem filtrar `archived_at`. Um lead arquivado devolve `exists: true` → utilizador é mandado para login de uma conta que /admin considera inactiva. Contradiz a regra D da nova spec.
**Mudança:** adicionar `.is("archived_at", null)` ao `findLead`. Manter o `authUserExists` tal como está (auth órfão continua a ser tratado como existente — defesa em profundidade contra a confusão de archive ≠ delete).
**Nota de produto a confirmar implicitamente:** archive deixa `auth.users` intacto. Se um lead estiver arquivado mas o auth user existir, `check-email` ainda devolve `exists: true` pela via auth. Isto está alinhado com a regra "archive mantém histórico, login pode continuar a funcionar" — apenas a UI do admin deixa de o ver na lista activa. Para esconder também do login é preciso purge.

### Gap 2 — UI admin para estados de excepção (regra E)
**Ficheiros:**
- `src/routes/admin.leads.tsx` (ou painel equivalente em `src/components/admin/v2/beta-leads/`) — adicionar **tab/filtro "Arquivados"** que invoca a query com `archived_at IS NOT NULL`.
- Novo componente `src/components/admin/v2/beta-leads/orphan-accounts-panel.tsx` — consome `GET /api/admin/diagnostics/account-sync` e mostra 4 secções colapsáveis (auth órfão, leads órfãos, arquivados, duplicados). Botões: "Apagar auth órfão" (chama `auth.admin.deleteUser` via novo endpoint pontual) e "Restaurar lead arquivado" (`archived_at = null`).
- Novo endpoint `POST /api/admin/auth-users/purge` para apagar auth users órfãos individualmente (recebe `{ email }`, bloqueado se existir lead activo com esse email).
- Novo endpoint `POST /api/admin/leads/$id/restore` para reverter archive (`archived_at = null`).

Sem alterações às queries existentes — só nova UI/endpoints aditivos.

### Gap 3 — Cobertura de testes adicional (regra G)
**Ficheiro:** novo `src/routes/api/onboarding/__tests__/check-email-archived.test.ts`
- arquivar lead → `check-email` devolve `exists:true` apenas se auth user existir; `false` se auth também não existir.
- lead activo → `exists:true`.
- lead inexistente, auth inexistente → `exists:false`.

**Ficheiro:** novo `src/routes/api/admin/__tests__/diagnostics-account-sync.test.ts`
- 1 lead activo + 1 auth órfão → diagnóstico devolve 1 em `orphan_auth_users`, 0 em `orphan_leads`.
- 1 lead arquivado → aparece em `archived_leads`.
- 2 leads com mesmo `email_normalized` → aparecem em `duplicate_emails`.

Os testes existentes em `leads-bulk.test.ts` já cobrem o resto (criação→admin, purge→auth deletado, paid blocked, isolamento entre leads).

## Ordem de execução
1. Patch mínimo a `check-email.ts` (gap 1).
2. Endpoints `auth-users/purge` e `leads/$id/restore` (gap 2 back-end).
3. UI `orphan-accounts-panel` + tab "Arquivados" no admin leads (gap 2 front-end).
4. Testes novos (gap 3).
5. Correr `bunx vitest run` em pasta filtrada.

## Fora de scope
checkout, EuPago, webhook de pagamento, credit grants, packs (report/credit), 30d/90d, concorrente, force refresh, cache, conteúdo do relatório, lab visibility, schema de auth, OAuth.

## Riscos / decisões implícitas
- **Archive não bloqueia login** (auth.users intacto). Documentado na UI ("Arquivar — esconde do admin mas mantém login. Para impedir login use Apagar definitivamente.").
- **Purge de auth órfão** sem lead correspondente é seguro (não há histórico de pagamento associado, por definição). Endpoint valida ausência de lead activo antes de apagar.
- **Restore** só reverte `archived_at`, não recria estado destrutivo.
