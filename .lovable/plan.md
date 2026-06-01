# Auditoria do sistema de créditos + proposta mínima

## 1. Resultado da auditoria (factual)

**Não existe sistema de créditos implementado no backend.** Confirmado por inspecção de código e da base de dados:

- **Base de dados**: nenhuma tabela com `credit` no nome no schema `public`. Não existe `user_credits` nem `credit_ledger`. Não existe coluna de saldo em `profiles` (só `plan: 'free'`).
- **Endpoint de refresh** (`src/routes/api/analyze/refresh.ts`):
  - Exige sessão autenticada (`verifyUserSession` via `supabaseAdmin.auth.getUser`).
  - Comentário explícito linhas 18-20: *"this endpoint does NOT consume credits today — the credits table is not implemented yet"*.
  - Loga `refresh_credit_not_consumed` com `reason: "credits_not_implemented"` em cada chamada bem-sucedida (linhas 278, 300-301).
- **API pública** (`analyze-public-v1.ts`): devolve `refresh_requires_credit: false` hardcoded em ambos os ramos (linhas 1326 e 1339). Campo já existe no contrato `FreshnessInfo` (`src/lib/analysis/types.ts:83`).
- **UI** (`app-topbar.tsx`, `app-sidebar.tsx`, `lead-detail-sheet.tsx`): referências a "credit" são apenas copy/placeholder, sem leitura de saldo real.
- **Outras menções** (`apify-allowlist`, `cost-sync`, `pdfshift`): referem-se a *créditos do provider* (Apify, PDFShift), não a créditos do utilizador.

**Conclusão**: o caminho de débito está pré-cabado (endpoint protegido, flag no contrato, log de "not consumed"), mas o estado persistente não existe. Implementar agora é aditivo e de baixo risco.

## 2. Proposta mínima (3 créditos / mês, requer aprovação)

Regra de produto sugerida (a confirmar contigo):
- Cada utilizador autenticado recebe **3 créditos por mês civil**.
- **1 refresh manual = 1 crédito** (apenas quando o snapshot tem 12-24h e o utilizador clica em "Recolher dados novos").
- Leitura de cache (<12h ou >24h com fallback) **não consome**.
- Análise inicial de um handle novo **não consome** (mantém funil free actual).
- Sem rollover entre meses. Sem compra avulsa nesta fase.

### Schema (uma migração, aditivo)

```text
public.user_credits
  user_id        uuid PK  → auth.users
  period_month   date     (primeiro dia do mês, UTC)
  granted        int  default 3
  consumed       int  default 0
  updated_at     timestamptz
  PK (user_id, period_month)

public.credit_ledger
  id             uuid PK
  user_id        uuid
  period_month   date
  delta          int      (-1 débito, +N crédito/grant)
  reason         text     ('refresh' | 'monthly_grant' | 'admin_adjust')
  ref_handle     text null
  ref_snapshot   uuid null
  created_at     timestamptz
```

- RLS: `SELECT` próprio em ambas; sem `INSERT/UPDATE/DELETE` directo do cliente.
- Função `consume_refresh_credit(p_user, p_handle, p_snapshot)` SECURITY DEFINER que:
  1. Faz `upsert` da linha do mês corrente com `granted=3` se não existir.
  2. Verifica `consumed < granted`; se não, devolve `insufficient`.
  3. Incrementa `consumed` e escreve linha no `credit_ledger` numa só transacção.
  4. Devolve `{ ok, remaining }`.
- Sem cron job: o grant é *lazy* na primeira chamada do mês (mais simples e idempotente).

### Wiring mínimo no código

- `src/routes/api/analyze/refresh.ts`: antes do delegate para `analyze-public-v1?refresh=1`, chamar `consume_refresh_credit`. Se `insufficient`, devolver `402` com mensagem PT. Em caso de erro do refresh, **não** reverter o débito nesta primeira versão (decisão a confirmar — alternativa abaixo).
- `src/routes/api/analyze-public-v1.ts`: passar `refresh_requires_credit: true` no payload de `freshness` para utilizadores autenticados quando o estado é `refresh_available`. Mantém `false` para anónimos.
- Novo serverFn `getCreditsBalance` (read-only, `requireSupabaseAuth`) devolvendo `{ granted, consumed, remaining, period_month }`.
- **Sem alterações de UI nesta tarefa**: a copy do CTA de refresh já existe; o badge de saldo fica para PR seguinte.

### Riscos e decisões pendentes

1. **Reembolso em falha**: se o refresh delegate falhar depois do débito, perdemos 1 crédito. Opções: (a) débito antes (simples, risco de "engolir" 1 crédito por falha de provider — raro); (b) débito após sucesso (race condition se utilizador clicar 2x); (c) débito antes + crédito compensatório se delegate devolver erro de provider. **Recomendação**: (c) — implementação ~10 linhas extra.
2. **Concorrência**: lock-by-handle já existe em `refreshingHandles`. Suficiente para evitar duplo débito do mesmo handle.
3. **Admin override**: precisamos de UI admin para adicionar/repor créditos? Proposta: deixar fora desta tarefa — `admin_adjust` via SQL directo na fase beta.
4. **Definição de "mês"**: UTC vs Europe/Lisbon. Recomendação: UTC para alinhar com `created_at` da BD.

## 3. Checkpoint — preciso da tua aprovação antes de avançar

Confirma, ponto a ponto:

- ☐ **Modelo**: 3 créditos/mês, só debitados em refresh manual entre 12-24h?
- ☐ **Schema**: aprovar `user_credits` + `credit_ledger` aditivos (sem tocar `profiles`)?
- ☐ **Grant**: lazy na primeira chamada do mês (sem cron)?
- ☐ **Reembolso em falha de provider**: opção (c) — débito antes + crédito compensatório se delegate falhar?
- ☐ **Scope**: backend + débito no `/api/analyze/refresh` apenas. UI (badge de saldo, mensagem quando esgotado) fica para PR separado?
- ☐ **Mês**: UTC?

Se aprovares, em build mode entrego: 1 migração SQL, 1 função `consume_refresh_credit`, ajuste em `refresh.ts` (~30 linhas), ajuste em `analyze-public-v1.ts` para `refresh_requires_credit`, 1 serverFn `getCreditsBalance`, testes.
