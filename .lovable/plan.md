## Resultado da QA do Add Competitor

**VERDICT: FAIL — o fluxo Add Competitor nunca chegou ao backend após T_QA0.**

T_QA0 = `2026-06-06 19:30:56Z` · lead `01bf861c-6a17-4b36-81b7-130ef2f143da`

### 1. Add Competitor — sucesso?

**Não.** Nenhuma evidência de que o utilizador tenha submetido o formulário do modal:
- Nenhuma chamada a `analyze-public-v1` com `competitors` preenchido depois de T_QA0.
- Nenhuma linha em `product_events` para este lead desde T_QA0.
- `analysis_snapshots.competitor_usernames` continua `[]`.

### 2. Saldo de créditos antes/depois T_QA0

| Momento | Saldo | Origem |
|---|---|---|
| Antes T_QA0 (após uso inicial às 17:06) | **1** | `initial_grant +2`, `reserve -1`, `confirm 0` |
| Depois T_QA0 (agora) | **1** | sem alterações |

### 3. `credit_ledger` desde T_QA0

**0 linhas novas.** Todas as 3 linhas existentes são de `2026-06-06 17:06:35`–`17:06:36` (antes da QA):

| created_at | delta | reason | handle | reservation_id |
|---|---|---|---|---|
| 17:06:35 | +2 | `initial_grant` | — | — |
| 17:06:36 | −1 | `reserve` | frederico.m.carvalho | a0b14579-… |
| 17:06:36 | 0  | `confirm` | — | a0b14579-… |

### 4. `provider_call_logs` desde T_QA0

**0 linhas.** Apify não correu.

### 5. Só Apify? — N/A

Nenhum provider correu.

### 6. OpenAI / DataForSEO

**0 chamadas** (consistente com #4 — nenhuma análise nova foi disparada).

### 7. `analysis_snapshots` — competitor_usernames

Único snapshot de `frederico.m.carvalho` (`id=683e4c21-…`) continua com:
- `competitor_usernames: []`
- `updated_at: 2026-06-06 09:05` (anterior a T_QA0)
- `expires_at: 2026-06-07 08:51` (ainda dentro de cache)

### 8. URL / search state com competitor

Não aplicável — sem competitor adicionado, sem mudança de URL para validar. Os 2 `analysis_events` registados desde T_QA0 (07:18 e 07:21 desta manhã) são `data_source=cache`, `competitor_handles=[]` → o utilizador reabriu o relatório a partir do cache, sem submeter Add Competitor.

### Hipótese para o FAIL

O entitlement foi corretamente inserido e o `premiumUnlocked` deve estar a render — mas:
- ou o utilizador abriu o modal e não clicou em "Adicionar e comparar";
- ou o build com o redesign (acabado de fazer) ainda não tinha hot-reloaded quando o teste decorreu;
- ou o `onConfirmConsume` para `intent.kind === "competitor"` em `report-block-nav.tsx` está stub (igual ao `period`) e não chama o backend.

Vale a pena, num passo seguinte (fora desta QA de rollback), inspecionar `report-block-nav.tsx` para confirmar se o ramo `competitor` em `onConfirmConsume` chama mesmo `fetchPublicAnalysis(primaryHandle, [...existing, newHandle])` ou se ficou stub.

---

## Plano de rollback (tarefas 9–11)

A executar **em build mode**, com `supabase--insert` (um único DELETE):

```sql
DELETE FROM lead_entitlements
WHERE id = '48a99b2d-49a4-4a40-abe5-d1e5436a142c'
  AND lead_id = '01bf861c-6a17-4b36-81b7-130ef2f143da'
  AND product_code = 'report_full_9'
  AND metadata->>'source' = 'qa_manual';
```

As 4 condições (`id` + `lead_id` + `product_code` + `metadata.source=qa_manual`) garantem que **só** a linha QA é removida, mesmo no improvável caso de alguém ter inserido outra `report_full_9` entretanto.

### Pós-rollback (read-only, executado a seguir)

```sql
-- A) confirmar que a linha foi removida
SELECT COUNT(*) AS qa_row_count
FROM lead_entitlements
WHERE id = '48a99b2d-49a4-4a40-abe5-d1e5436a142c';
-- esperado: 0

-- B) confirmar que o lead não tem mais nenhuma report_full_9
SELECT COUNT(*) AS report_full_9_remaining
FROM lead_entitlements
WHERE lead_id = '01bf861c-6a17-4b36-81b7-130ef2f143da'
  AND product_code = 'report_full_9';
-- esperado: 0 (a QA já confirmou que era a única — não existia entitlement prévio independente)
```

### Estado esperado depois do rollback

- `lead_entitlements` para este lead: **0 linhas `report_full_9`** → `premiumUnlocked = false`.
- `credit_ledger`: **inalterado** (3 linhas, saldo = 1). Os 2 créditos beta iniciais ficam preservados.
- `analysis_snapshots` / `provider_call_logs` / `analysis_events`: **inalterados** (nada para reverter — nada foi consumido).

## Cleanup ainda em aberto após rollback

1. **Nenhum** do lado dos dados — todas as escritas QA limitam-se à linha de entitlement.
2. **Investigação separada (fora de scope):** confirmar se o `onConfirmConsume` para `intent.kind === "competitor"` em `src/components/report-redesign/v2/report-block-nav.tsx` chama mesmo o endpoint, ou se está stub como o ramo `period` estava. Sem isto, repetir a QA dará outra vez FAIL.

## Restrições respeitadas

Sem alterações a pricing, checkout, EuPago, schema, cálculos de relatório ou lógica de providers. Só leitura + um único DELETE alvo no rollback.
