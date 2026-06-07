# PR1 window validation — execução sem partilhar cookie

Opção escolhida: **B** (split server/SQL + browser). É a mais rápida, sem código novo a fazer merge, e mantém o cookie no teu browser.

A Opção C (rota QA/admin) também é viável mas exige um endpoint novo a viver no repositório — mais superfície de ataque para uma validação pontual. Fica como fallback se a B falhar.

## Divisão de responsabilidades

### Lado AI (server / SQL) — antes
1. **T0 snapshot** (read-only) para `lead_id = 7b946d45-ecb1-49dc-8702-68d85a860c47` e `handle = frederico.m.carvalho`:
   - `credit_ledger` — saldo + últimas 10 linhas.
   - `lead_entitlements` — confirmar que `report_full_9` não existe.
   - `analysis_events` — últimas 10 entradas do handle.
   - `provider_call_logs` — últimas 10 (provider, status, custo).
   - `analysis_snapshots` — últimas 5 `cache_key` do handle.
2. **Grant temporário** de `report_full_9` via `supabase--insert`:
   ```sql
   INSERT INTO public.lead_entitlements
     (lead_id, product_code, metadata)
   VALUES
     ('7b946d45-ecb1-49dc-8702-68d85a860c47', 'report_full_9',
      '{"source":"manual_pr1_validation","granted_by":"lovable_ai","note":"temporary, will rollback"}'::jsonb);
   ```
   Sem crédito adicional. Confirmar leitura.

### Lado utilizador (browser DevTools) — depois do grant
Quatro chamadas, mesmo separador onde o cookie `lead_session` está válido (`auditprofiles.com` ou preview). Todas com `credentials: "include"`. Cola apenas as respostas JSON (não headers).

Snippet pronto a colar (corre os 4 sequencialmente e imprime o resultado):
```js
const base = location.origin;
const body = (extra={}) => ({
  method: "POST",
  credentials: "include",
  headers: {"Content-Type":"application/json"},
  body: JSON.stringify({ instagram_username: "frederico.m.carvalho", ...extra }),
});
const run = async (label, extra) => {
  const r = await fetch(`${base}/api/analyze-public-v1`, body(extra));
  const j = await r.json().catch(()=>({_nonJson:true}));
  console.log(label, r.status, j);
  return { label, status: r.status, body: j };
};
const out = [];
out.push(await run("A_baseline", {}));
out.push(await run("B_pro_30d_first", { window: "30d" }));
out.push(await run("C_pro_30d_repeat", { window: "30d" }));
// D corre DEPOIS do rollback do entitlement — não incluir aqui ainda.
copy(JSON.stringify(out, null, 2));
console.log("→ Resultados A/B/C copiados para o clipboard.");
```

Colas o output em chat. Cenário D (Free 30d sem entitlement) corre só após o rollback (passo seguinte), com:
```js
const r = await fetch(`${base}/api/analyze-public-v1`, body({ window: "30d" }));
console.log("D_free_30d_no_ent", r.status, await r.json());
```

### Lado AI (server / SQL) — depois
3. **Rollback** do entitlement:
   ```sql
   DELETE FROM public.lead_entitlements
   WHERE lead_id = '7b946d45-ecb1-49dc-8702-68d85a860c47'
     AND product_code = 'report_full_9'
     AND metadata->>'source' = 'manual_pr1_validation';
   ```
4. Após o utilizador colar a resposta de **D**, snapshot final (mesmas 5 queries de T0) + diff:
   - delta de `credit_ledger` (esperado: -1 em B, 0 em A/C/D).
   - novos `analysis_events` (data_source: fresh/cache).
   - novos `provider_call_logs` para B (esperado: 1 chamada Apify) e 0 para C (cache hit).
   - novo `analysis_snapshots` com `cache_key` distinto para a janela 30d em B; C reusa o mesmo.
5. Tabela final PASS/FAIL por regra:
   - baseline funciona sem window ✓
   - 30d só passa com `report_full_9` ✓
   - 30d primeira chamada consome 1 crédito ✓
   - 30d repeat = cache hit, 0 créditos ✓
   - 30d sem entitlement = `WINDOW_REQUIRES_PRO`, 0 créditos ✓

## Fora de escopo
- Janela 90d (excluída desta ronda).
- `INTERNAL_API_TOKEN` (não usado).
- Qualquer alteração a checkout, EuPago, preços, schema, UI, lógica de pagamento.
- Criar rota QA/admin (fica como Opção C de reserva).

## Próximo passo
Diz "ok" para eu entrar em build mode e correr o T0 + grant. Depois disso, corres o snippet no DevTools e colas o output. Eu faço rollback e relatório final.
