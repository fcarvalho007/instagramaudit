## Causa raiz

Duas chamadas quase concorrentes ao `/api/analyze-public-v1` (StrictMode / double mount) para o mesmo `lead_id + cache_key`:

1. Ambas leem `leadOwnsReport(lead, cache_key)` → `false` (ainda ninguém escreveu em `lead_reports`).
2. Ambas chamam `reserveCredit` → cada uma insere `-1` em `credit_ledger` com `reason='reserve'`.
3. Ambas terminam, ambas fazem `confirm` + `upsertLeadReport`.
4. Saldo final: `+2 − 1 − 1 = 0` em vez de `1`.

`upsertLeadReport` tem `UNIQUE(lead_id, cache_key)`, mas só é escrito **depois** do snapshot pronto, demasiado tarde para servir de gate.

## Estratégia escolhida

Idempotência atómica no `credit_ledger` via índice único parcial. É a mais pequena, totalmente atómica em Postgres, e não altera a semântica do `lead_reports` (continua a representar "entregue").

- **Migração**: índice único parcial em `credit_ledger(lead_id, cache_key) WHERE reason = 'reserve' AND cache_key IS NOT NULL`.
- **Código**: `reserveCredit` capta `23505` no insert do `reserve` e devolve um sinal `duplicate`. O endpoint trata duplicado como "skip reserve" (igual ao caminho `alreadyAssociated`): serve a resposta sem reservar/confirmar/libertar — a primeira chamada já está a tratar do ciclo.
- **Frontend**: guarda de in-flight em `fetchPublicAnalysis` por `(username, competitors)` para anular o double-mount no cliente.

## Detalhes técnicos

### 1. Migração (nova)

```sql
CREATE UNIQUE INDEX IF NOT EXISTS uniq_credit_ledger_reserve_per_report
  ON public.credit_ledger (lead_id, cache_key)
  WHERE reason = 'reserve' AND cache_key IS NOT NULL;
```

Notas:
- Parcial → só restringe linhas `reason='reserve'` com `cache_key` definido. Não afeta `initial_grant`, `confirm`, `release`, nem reservas legacy sem `cache_key`.
- Se houver duplicados pré-existentes em produção, o índice falha a criar. Mitigação: a migração começa com um `SELECT` em modo `NOTICE` listando duplicados (apenas log) e usa `CREATE UNIQUE INDEX` direto (a migração corre em transação e aborta se houver duplicados; será sinalizado ao operador).
- Sem alterações de RLS/GRANT (tabela já é acedida só via service role).

### 2. `src/lib/credits/credits.server.ts`

- Adicionar tipo `ReserveOutcome = { kind: "reserved"; reservationId; balanceAfter } | { kind: "duplicate" }`.
- `reserveCredit` passa a:
  1. Ler `balance`. Se `< 1` → `InsufficientCreditsError` (inalterado).
  2. Insert do `reserve` com `cache_key`. Se erro `23505` **e** `cacheKey` presente → devolver `{ kind: "duplicate" }` sem ler saldo nem libertar.
  3. Caso contrário: recheck de saldo (lógica de compensação atual mantida).
- Compatibilidade: callers existentes que esperam `ReserveResult` recebem `kind: "reserved"` (manter export retro-compatível com type guard).

### 3. `src/routes/api/analyze-public-v1.ts`

- Bloco do gate (linhas ~507–548):
  - Após `alreadyAssociated = await leadOwnsReport(...)`, decidir `skipReserve` como hoje.
  - No `try` do `reserveCredit`, se resultado for `duplicate`: tratar igual a `skipReserve` — `reservation = null`, marcar flag `duplicateInFlight = true`. **Não** abortar pedido (relatório ainda tem de ser servido — o primeiro vai escrever em `lead_reports`).
  - `finalizeCredit` já é no-op quando `reservation === null` (linha 557), portanto não confirma nem liberta.
- `logEvent` adicional para outcome `duplicate_reservation_skipped` (não bloqueia; apenas métrica).

### 4. `src/lib/analysis/client.ts`

- Adicionar `Map<string, Promise<PublicAnalysisResponse>>` no module-scope. Chave = `${cleaned}|${competitors.join(",")}`. Antes do `fetch`, se já existe promise → devolver a mesma. `finally` remove a chave.
- Razão: defesa em profundidade; o backend já garante a invariante.

### 5. Testes

Atualizar `src/routes/api/__tests__/analyze-public-v1-credits.test.ts` + `src/lib/credits/__tests__/credits.test.ts`:

1. Fresh success — saldo 2 → 1.
2. **(novo)** Sequencial duplicado mesmo `lead+cache_key` → consome 1 total, segunda chamada loga `duplicate_reservation_skipped`.
3. **(novo)** Concorrente: `Promise.all` de duas chamadas → 1 só `reserve` no ledger, ambas devolvem `success`.
4. `lead_reports` já existe → 0 créditos (mantém).
5. Provider error → release, saldo 2 (mantém).
6. Personal no feed → release, saldo 2 (mantém).
7. Internal bypass → 0 mutações no ledger (mantém).
8. Cache hit novo para o lead → consome 1, cria associação (mantém).

Mock do `supabaseAdmin.from('credit_ledger').insert` precisa de simular a violação de unique para `(lead_id, cache_key, reason='reserve')` — adicionar Map em memória no teste já existente.

Frontend: pequeno teste em `src/lib/analysis/__tests__/` para o in-flight guard (duas chamadas paralelas → um só `fetch`).

## Validação

- `bunx tsc --noEmit`
- `bunx vitest run src/lib/credits src/routes/api/__tests__/analyze-public-v1-credits.test.ts src/lib/analysis/__tests__`
- Smoke manual no preview:
  - Lead fresco → onboarding → relatório abre.
  - `psql` ao `credit_ledger` filtrado pelo `lead_id`: exatamente `initial_grant +2`, `reserve -1`, `confirm 0`. Saldo = 1.
  - Recarregar mesmo relatório → ledger inalterado, saldo = 1.

## Ficheiros afetados

- `supabase/migrations/<timestamp>_credit_ledger_reserve_unique.sql` (novo)
- `src/lib/credits/credits.server.ts`
- `src/routes/api/analyze-public-v1.ts` (apenas bloco do gate + logEvent)
- `src/lib/analysis/client.ts`
- `src/lib/credits/__tests__/credits.test.ts`
- `src/routes/api/__tests__/analyze-public-v1-credits.test.ts`
- `src/lib/analysis/__tests__/fetch-public-analysis-inflight.test.ts` (novo)

## Não-alterado

Onboarding modal, `/api/onboarding/start`, cookies, Apify, OpenAI, DataForSEO, UI do relatório, pricing, gating premium, thumbnails, emails.

## Riscos

- **Duplicados pré-existentes em produção** podem impedir a criação do índice. Mitigação: correr `SELECT lead_id, cache_key, count(*) FROM credit_ledger WHERE reason='reserve' AND cache_key IS NOT NULL GROUP BY 1,2 HAVING count(*) > 1` antes (já pedido ao approver no momento da migração). Se houver, limpar com um script de reconciliação que mantém o primeiro `reserve` e marca os outros como compensados.
- **Reservas legacy sem `cache_key`** ficam fora do índice (intencional) — não retroquebra nada.
