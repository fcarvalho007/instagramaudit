# PR1 — Comandos browser para validação manual

Lead de teste: `7b946d45-ecb1-49dc-8702-68d85a860c47` (`fredericodigital@gmail.com`).
Handle de teste: `frederico.m.carvalho` (ajusta se preferires outro do allowlist).
Endpoint: `POST /api/analyze-public-v1` (mesma origem do preview/published — o cookie `lead_session` viaja automaticamente com `credentials: "include"`).

Tu fazes os 4 fetch no DevTools. Eu faço todas as leituras SQL, o insert temporário de entitlement Pro, e o rollback.

---

## Snippet base (cola uma vez por chamada)

Cada cenário só muda o `window`. Define isto antes:

```js
const HANDLE = "frederico.m.carvalho";

async function analyze(windowKind) {
  const t0 = performance.now();
  const res = await fetch("/api/analyze-public-v1", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      instagram_username: HANDLE,
      competitor_usernames: [],
      window: windowKind,
    }),
  });
  const ms = Math.round(performance.now() - t0);
  let body;
  try { body = await res.json(); } catch { body = await res.text(); }
  console.log("STATUS", res.status, "in", ms, "ms");
  console.log(JSON.stringify(body, null, 2));
  return { status: res.status, body, ms };
}
```

Cola a resposta de cada chamada (status + JSON resumido — não precisas do payload todo, basta `success`, `error_code`, `data_source` / `outcome` / `cache_key` se existirem, e `analysis_snapshot_id` se vier).

---

## Sequência dos 4 cenários

### A. Baseline sem janela (Free OK)

Pré-condição: **sem** `lead_entitlements` Pro para este lead. (Eu confirmo via SELECT antes.)

```js
await analyze("baseline");
```

Esperado: `200`, sucesso normal Free. Consumo de 1 crédito ou cache hit, sem `WINDOW_REQUIRES_PRO`.

---

### B. Pro 30d — primeira chamada

Pré-condição: eu insiro entitlement `report_full_9` temporário em `lead_entitlements` para este lead (com `metadata.kind = "qa_temporary"` para distinguir). Confirmo `hasEntitlement` SELECT antes de te dar luz verde.

```js
await analyze("30d");
```

Esperado: `200`, sucesso Pro com janela 30d, sem `WINDOW_REQUIRES_PRO`, e geração fresh (ou cache fresh se já existir snapshot 30d) — eu confirmo no `analysis_events` / `provider_call_logs`.

---

### C. Pro 30d — repetição (cache hit)

Mesma cookie, mesmo entitlement ainda ativo. Logo a seguir a B:

```js
await analyze("30d");
```

Esperado: `200`, `data_source: "cache"` (ou equivalente), zero novas chamadas Apify, e — se o relatório já está associado ao lead — zero crédito adicional reservado.

---

### D. Free 30d após rollback do entitlement

Pré-condição: eu faço rollback (`DELETE` da linha temporária inserida em B). Confirmo via SELECT que `hasEntitlement(leadId, "report_full_9") === false`.

```js
await analyze("30d");
```

Esperado: `403`, `error_code: "WINDOW_REQUIRES_PRO"`, mensagem em PT, **sem** consumir crédito e **sem** chamada Apify (gate corre antes do `reserveCredit`).

---

## Verificações server-side que eu corro entre cenários

Antes de A, depois de cada cenário, e no fim:

1. `credit_balance(leadId)` antes/depois para ver delta de cada cenário.
2. `credit_ledger` últimas 10 linhas para o `leadId` — confirmar que A consumiu (ou cache), B reservou+confirmou crédito, C não criou nova linha (ou só `reservation` revertida), D não criou linha nenhuma.
3. `analysis_events` últimas 10 linhas para `handle = frederico.m.carvalho` — confirmar `outcome` e `data_source` (fresh vs cache vs blocked_credits) por cenário.
4. `provider_call_logs` últimas 5 linhas para confirmar se houve ou não chamada Apify em cada cenário (sobretudo confirmar que C e D **não** geram nova linha).
5. `analysis_snapshots` mais recente para `frederico.m.carvalho` — confirmar `cache_key` (sufixo `:w=30d`) em B/C.

## Inserts / rollbacks que eu corro

- **Antes de B**: `INSERT INTO lead_entitlements (lead_id, product_code, metadata) VALUES ('7b946d45-…', 'report_full_9', '{"kind":"qa_temporary","granted_by":"qa_pr1"}');`
- **Depois de C, antes de D**: `DELETE FROM lead_entitlements WHERE lead_id = '7b946d45-…' AND product_code = 'report_full_9' AND metadata->>'kind' = 'qa_temporary';`
- **No fim**: confirmar que não ficou nenhum entitlement `qa_temporary` ativo, e reportar deltas de saldo.

## Restrições

- Sem `INTERNAL_API_TOKEN`, sem header `x-internal-token` — o cookie `lead_session` é o único auth.
- Sem `window: "90d"` em nenhum momento.
- Sem expor o valor do cookie no chat.
- Sem mexer em pagamentos, EuPago, ou nos +3 créditos do plano paralelo.

## O que reporto no fim

Tabela com, por cenário: `status`, `error_code` (se houver), `data_source`, `outcome`, delta `credit_balance`, nova linha em `provider_call_logs` (sim/não), `cache_key` resultante, e confirmação do gate Pro em D.
