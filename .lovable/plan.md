# Endurecer a leitura de DATAFORSEO_ENABLED e DATAFORSEO_TESTING_MODE

## Objetivo

Eliminar a fragilidade da comparação literal `=== "true"` que está a fazer com que o runtime devolva `status: "disabled"` mesmo quando o secret `DATAFORSEO_ENABLED` está definido. Mantém-se a semântica: continua a ser preciso um valor explícito `true` para ativar, mas passa a tolerar espaços acidentais e variações de maiúsculas/minúsculas.

A mesma normalização defensiva é aplicada a `DATAFORSEO_TESTING_MODE`, que continua ON por omissão e só fica OFF quando o valor (após `trim().toLowerCase()`) for exatamente `"false"`.

## Ficheiro alterado (único)

- `src/lib/security/dataforseo-allowlist.ts`

Nenhum outro ficheiro é tocado: nem o endpoint `market-signals`, nem código Apify, nem UI do report, nem schema de BD, nem secrets, nem billing, nem PDF/email.

## Alterações exatas

### 1. `isDataForSeoEnabled()`

Antes:

```ts
export function isDataForSeoEnabled(): boolean {
  return process.env.DATAFORSEO_ENABLED === "true";
}
```

Depois:

```ts
export function isDataForSeoEnabled(): boolean {
  return (process.env.DATAFORSEO_ENABLED ?? "").trim().toLowerCase() === "true";
}
```

### 2. `isTestingModeActive()`

Antes:

```ts
export function isTestingModeActive(): boolean {
  // Default ON. Operator must explicitly set "false" to disable.
  return process.env.DATAFORSEO_TESTING_MODE !== "false";
}
```

Depois:

```ts
export function isTestingModeActive(): boolean {
  // Default ON. Operator must explicitly set "false" (case-insensitive,
  // tolerant to surrounding whitespace) to disable.
  return (process.env.DATAFORSEO_TESTING_MODE ?? "").trim().toLowerCase() !== "false";
}
```

O comentário de cabeçalho do ficheiro (linha 8) é atualizado para refletir a nova tolerância:

> `Hard kill-switch: DATAFORSEO_ENABLED (must equal "true", case-insensitive, whitespace-tolerant).`

## O que NÃO muda

- `parseAllowlist()`, `getAllowlist()`, `isAllowed()` ficam exatamente iguais.
- Semântica do `DATAFORSEO_ALLOWLIST`: inalterada.
- `DATAFORSEO_LOGIN` / `DATAFORSEO_PASSWORD`: não tocados.
- Endpoint `/api/market-signals`: não tocado.
- Código Apify, UI do report, schema, secrets, billing, PDF, email: não tocados.

## Validação

1. `bunx tsc --noEmit` — confirmar que tipos continuam válidos.
2. `bun run build` — confirmar que build passa (executado automaticamente pela harness).
3. Sem chamadas a DataForSEO.
4. Sem chamadas a Apify.
5. Sem inserts/updates em `provider_call_logs`.

## Checkpoint

- ☐ `src/lib/security/dataforseo-allowlist.ts` editado (apenas as 2 funções + comentário de cabeçalho).
- ☐ `bunx tsc --noEmit` ok.
- ☐ Build ok.
- ☐ Nenhuma chamada a provider feita.
- ☐ Reportar ao utilizador: ficheiros alterados, diff exato, e confirmação de zero chamadas a providers.

## Próximo passo (após aprovação)

Aplicar a alteração e correr a validação. Depois disso, o utilizador pode pedir novamente o smoke test single-shot do `/api/market-signals` para confirmar que o kill-switch deixa de devolver `disabled` por causa de whitespace/casing no secret.
