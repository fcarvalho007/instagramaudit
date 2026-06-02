## Smoke test — idempotência de créditos (fresh lead)

Este teste **escreve na base de dados** (cria lead novo, invoca Apify/OpenAI, grava ledger). Por isso preciso de mudar para build mode para o correr. Sem alterações de código.

### Pré-flight (read-only — posso fazer já se quiseres)

- `select count(*) from leads` e `select max(created_at) from leads` para ter baseline.
- Confirmar índice único `credit_ledger(lead_id, cache_key) WHERE reason='reserve'` existe (`pg_indexes`).

### Execução (browser automation)

1. `navigate_to_sandbox` → abrir homepage limpa (sessão browser nova → cookies/sessionStorage vazios por defeito).
2. `observe` para localizar o input do handle.
3. `act` → escrever `frederico.m.carvalho` e submeter.
4. Completar os 3 passos do modal de onboarding (nome + email único de teste tipo `smoke+{ts}@auditprofiles.com`, relação, objetivo, consentimentos).
5. `list_network_requests` durante e após o flow para capturar:
   - `POST /api/onboarding/start` (status, payload)
   - cookie `lead_session` (via response headers)
   - `POST /api/analyze-public-v1` — **contar chamadas** e validar todas as respostas
6. Aguardar o relatório renderizar (screenshot final).
7. **Recarregar a página do relatório** (`navigate_to_url` para o mesmo URL) e capturar novamente as chamadas a `/api/analyze-public-v1` — deve devolver duplicate sem consumir crédito.

### Validação (SQL read-only após o flow)

```sql
-- Identifica o lead criado neste smoke
SELECT id, email, handle_or_username_field, created_at
FROM leads
WHERE email LIKE 'smoke+%@auditprofiles.com'
ORDER BY created_at DESC LIMIT 1;

-- Ledger completo desse lead
SELECT reason, delta, cache_key, created_at, metadata
FROM credit_ledger
WHERE lead_id = $1
ORDER BY created_at;

-- Saldo final
SELECT credit_balance($1);

-- Associação lead_reports
SELECT id, cache_key, handle, created_at
FROM lead_reports
WHERE lead_id = $1;
```

### Output a produzir

1. **Tabela de sequência de pedidos** — método, path, status, ts, duração, marca de duplicate.
2. **Tabela do credit_ledger** — reason / delta / cache_key / created_at.
3. **Saldo final** (esperado: 1).
4. **Duplicates observados?** sim/não; **consumiram crédito?** sim/não.
5. **Verificação de error codes ausentes**: `ONBOARDING_REQUIRED`, `ONBOARDING_SESSION_LOST`, `INSUFFICIENT_CREDITS`.
6. **Veredicto final**: **READY** / **BLOCKED** com razão.

### Critérios de aprovação

- Exactamente 1× `initial_grant +2`, 1× `reserve -1`, 1× `confirm 0`, saldo = 1.
- Exactamente 1 linha em `lead_reports` para o (lead_id, cache_key).
- Recarregar o relatório → zero novas linhas no ledger, saldo continua 1.
- Sem nenhum dos 3 error codes acima nos logs do servidor.
- Todas as respostas HTTP 200 (incluindo as duplicate que devem responder com payload `{ kind: "duplicate" }` mas status 200).

### Notas

- O lead vai ficar na BD em `commercial_status='novo_pedido'` (não rollback). Posso arquivar no fim, se quiseres — só requer 1 UPDATE.
- O run real do Apify para `frederico.m.carvalho` deve estar em cache (foi analisado várias vezes), por isso o custo extra deve ser **$0** (cache hit). Confirmo isso na sequência de pedidos via `data_source` em `analysis_events`.
- Se o browser sandbox falhar a arrancar (capacidade), reporto e não retento.

## Checkpoint

- ☐ Aprovação para mudar para build mode (escreve em BD via flow real)
- ☐ Baseline capturada (counts pré-test)
- ☐ Flow completo até relatório renderizado
- ☐ Reload do relatório verifica idempotência
- ☐ Tabelas + veredicto READY/BLOCKED entregues no fim