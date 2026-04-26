## Objetivo

Adicionar duas opções de proteção de custo suportadas pela API do Apify (`maxItems` e `maxTotalChargeUsd`) ao cliente, e usá-las com limites conservadores no `fetchProfileWithPosts()` antes do primeiro smoke test real.

Isto garante que mesmo que algo corra mal (loop, payload inesperado, actor mal configurado), o Apify nunca vai cobrar mais do que **0,10 USD** ou devolver mais do que **1 item** durante o smoke test.

Não é feita nenhuma chamada ao Apify nesta tarefa.

---

## Ficheiros a alterar

### 1. `src/lib/analysis/apify-client.ts`

**Estender `RunActorOptions`:**

```ts
interface RunActorOptions {
  timeoutMs?: number;
  apifyTimeoutSecs?: number;
  memoryMbytes?: number;
  maxItems?: number;            // novo
  maxTotalChargeUsd?: number;   // novo
}
```

**Destructurar no corpo de `runActor()`:**

```ts
const {
  timeoutMs = DEFAULT_TIMEOUT_MS,
  apifyTimeoutSecs = 50,
  memoryMbytes = 1024,
  maxItems,
  maxTotalChargeUsd,
} = options;
```

**Anexar à query string apenas se definidos** (logo a seguir aos `set("timeout"|"memory"|"format")` existentes):

```ts
if (typeof maxItems === "number") {
  url.searchParams.set("maxItems", String(maxItems));
}
if (typeof maxTotalChargeUsd === "number") {
  url.searchParams.set("maxTotalChargeUsd", String(maxTotalChargeUsd));
}
```

**Não tocar:**
- `Authorization: Bearer ${token}` continua via header (token nunca na query string).
- `format=json`, `timeout`, `memory` mantêm-se exatamente como estão.
- Tratamento de erros, timeouts e tipos de retorno mantêm-se.

### 2. `src/routes/api/analyze-public-v1.ts`

**Em `fetchProfileWithPosts()` (linha ~152), passar os novos limites conservadores ao `runActor`:**

```ts
const rows = await runActor<Record<string, unknown>>(
  UNIFIED_ACTOR,
  {
    directUrls: [`https://www.instagram.com/${username}/`],
    resultsType: "details",
    resultsLimit: POSTS_LIMIT,
    addParentData: false,
  },
  {
    timeoutMs: 60_000,
    apifyTimeoutSecs: 55,
    maxItems: 1,                // teto duro: 1 perfil por chamada
    maxTotalChargeUsd: 0.10,    // teto de custo por chamada: 0,10 USD
  },
);
```

**Mantém-se igual:**
- `actor: apify/instagram-scraper` (constante `UNIFIED_ACTOR`)
- `resultsType: "details"`
- `resultsLimit: 12` (constante `POSTS_LIMIT`)
- `directUrls` inalterado
- Restante lógica (cache, allowlist, kill-switch, logging, alerts) intacta

---

## Verificação

1. `bunx tsc --noEmit` — confirmar que tipos compilam.
2. `bun run build` — confirmar que o build passa.
3. **Não** chamar o Apify.
4. **Não** chamar `/api/analyze-public-v1`.

---

## Notas de segurança

- **Token**: continua exclusivamente no header `Authorization: Bearer ...`. Nenhum dos novos parâmetros é um secret.
- **Cap duplo**: `maxItems=1` limita pelo volume; `maxTotalChargeUsd=0.10` limita pelo custo. O Apify aplica o que for mais restritivo.
- **Não-regressão**: como ambos os campos são opcionais e só são adicionados à URL quando definidos, qualquer outro chamador de `runActor` (atual ou futuro) continua a funcionar sem alterações.

---

## Saída esperada após implementação

- Lista exata dos ficheiros alterados.
- Confirmação de que nenhuma chamada ao Apify foi feita.
- Confirmação de que o token continua a ir pelo header `Authorization`.
- Confirmação de que o smoke test fica protegido por `maxItems=1` e `maxTotalChargeUsd=0.10`.

---

## Checkpoint

- ☐ `RunActorOptions` estendido com `maxItems` e `maxTotalChargeUsd`
- ☐ Parâmetros anexados à query string apenas se definidos
- ☐ `fetchProfileWithPosts()` passa `maxItems: 1` e `maxTotalChargeUsd: 0.10`
- ☐ Token continua via `Authorization` header
- ☐ `tsc --noEmit` passa
- ☐ `bun run build` passa
- ☐ Nenhuma chamada ao Apify feita
