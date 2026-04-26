## Estado atual

A kill-switch `APIFY_ENABLED` **já está implementada** em `src/routes/api/analyze-public-v1.ts` (linhas 392–433) e cumpre **todos** os requisitos solicitados:

- `isApifyEnabled()` em `src/lib/security/apify-allowlist.ts` devolve `true` apenas quando `process.env.APIFY_ENABLED === "true"` (default: desligado).
- O check corre **depois** do lookup de cache (cache fresca continua a ser servida).
- Antes do check, snapshots dentro da janela "stale" também são servidos sem chamar Apify.
- Se não houver cache utilizável e `APIFY_ENABLED !== "true"`, devolve `failure("PROVIDER_DISABLED")` com HTTP 503 — sem chamar `fetchProfileWithPosts`, sem consumir créditos.
- Allowlist (`isAllowed`, `isTestingModeActive`) e `?refresh=1` com token continuam intactos antes deste bloco.

## Único delta

A mensagem atual de `PROVIDER_DISABLED` é:

> "A análise automática está temporariamente desativada. Tentar novamente mais tarde."

Pediste exatamente:

> "A análise automática ainda não está ativa. O sistema está preparado, mas a ligação ao fornecedor de dados está desligada."

## Mudança proposta

**Ficheiro a editar (1 linha):**
- `src/routes/api/analyze-public-v1.ts` — substituir o valor de `ERROR_MESSAGES.PROVIDER_DISABLED` (linha 92) pelo texto novo.

**Ficheiros que NÃO são tocados:**
- `src/lib/security/apify-allowlist.ts` (lógica já correta)
- UI pública, `/admin`, `/report.example`, PDF/email, base de dados — nenhum.
- Sem novos logs, sem novas tabelas.

## Como testar

**1) Com `APIFY_ENABLED=false` (ou não definido):**
- Limpar cache para `frederico.m.carvalho` (ou usar handle sem cache).
- POST a `/api/analyze-public-v1` com `{ "instagram_username": "frederico.m.carvalho" }`.
- Esperado: HTTP 503 com `error_code: "PROVIDER_DISABLED"` e a nova mensagem em pt-PT. Nenhuma chamada a Apify nos logs.
- Se já existir snapshot em cache fresca: devolve a análise normalmente (cache hit).
- Se existir snapshot stale: serve o stale com `data_source: "stale"`.

**2) Com `APIFY_ENABLED=true` e `APIFY_ALLOWLIST=frederico.m.carvalho`:**
- POST com `{ "instagram_username": "frederico.m.carvalho" }`.
- Esperado: chamada real a Apify, normalização, resposta `success: true`.
- Repetir com handle fora da allowlist (ex.: `cristiano`): HTTP 403 `PROFILE_NOT_ALLOWED` (allowlist corre antes do kill-switch).

## Checkpoint

- ☐ Linha 92 de `src/routes/api/analyze-public-v1.ts` atualizada com o texto novo.
- ☐ Sem outras alterações.
- ☐ `tsc --noEmit` continua a passar.
