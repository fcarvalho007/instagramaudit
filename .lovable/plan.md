## Estado atual (auditoria)

Os ficheiros indicados no prompt (`src/lib/{analysis,insights}/tests/...`) **não existem**. Os equivalentes vivem em `__tests__/`:

- `src/lib/analysis/__tests__/normalize-r4a.test.ts`
- `src/lib/insights/__tests__/validate-editorial.test.ts`
- `src/lib/insights/__tests__/validate-market.test.ts`

São scripts standalone Node (`assert/strict` + `process.exit(1)` + `console.log`). **Não há `describe`/`it`/`expect`**, e **Vitest não está instalado** no `package.json`. Não há `vitest.config.*` nem script `"test"`. Por isso o runner nunca os executou — exatamente o gap apontado pela auditoria.

Não existem pares duplicados: cada teste vive num único sítio (`__tests__/`).

## Plano

### 1. Instalar Vitest (devDependency)

```
bun add -d vitest @vitest/ui
```

Sem provider, sem rede, sem alterações de schema. Vitest tem suporte nativo a TS/ESM e respeita o `tsconfig.json` (paths `@/...` continuam a funcionar via `vite-tsconfig-paths`, que já está instalado).

### 2. Adicionar script de teste ao `package.json`

Acrescentar em `"scripts"`:

```
"test": "vitest run",
"test:watch": "vitest"
```

### 3. Criar `vitest.config.ts` mínimo

```ts
import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: "node",
    include: ["src/**/__tests__/**/*.test.ts"],
    globals: false,
  },
});
```

Razão: ambiente `node` (puros, sem DOM), include limitado a `__tests__/` para evitar varrer o repo todo.

### 4. Converter os três ficheiros para Vitest

Manter localização canónica em `__tests__/` (a que o projeto já usa). Substituir o cabeçalho `import assert from "node:assert/strict"` por `import { describe, it, expect } from "vitest"`, eliminar o runner ad-hoc (`run(...)`, `failed`, `process.exit`, `console.log`) e mapear as asserções:

- `assert.equal(a, b)` → `expect(a).toBe(b)`
- `assert.deepEqual(a, b)` → `expect(a).toEqual(b)`
- `assert.ok(x)` → `expect(x).toBeTruthy()`

#### 4a. `normalize-r4a.test.ts`

Um `describe("enrichPosts — R4-A signals")` com `it(...)` por caso, preservando integralmente os fixtures e asserções existentes:

- `it("maps full Apify Reel with all R4-A fields")` — formato Reels, `video_duration`, `product_type`, `is_pinned`, `coauthors`, `tagged_users` (objeto + string), `location_name`, `music_title` (concat song · artist), `caption_length`.
- `it("normalizes legacy minimal image post defensively")` — `format=Imagens`, `video_duration=null`, `is_pinned=false`, `coauthors=[]`, `tagged_users=[]`, `location_name=null`, `music_title=null`, `caption_length` derivado do caption.
- `it("normalizes hybrid carousel with partial fields")` — `format=Carrosséis`, `product_type=feed`, `tagged_users=["convidado"]`, restantes nulos/vazios.

Nota sobre `schema_version`: não é responsabilidade de `enrichPosts` (vive na camada do snapshot), por isso permanece coberto onde já está e não é forçado neste teste — alinhado com a regra de não inflacionar âmbito.

#### 4b. `validate-editorial.test.ts`

`describe("validateInsights — editorial_patterns")` com:

- `it("payload exposes editorial_patterns and new evidence paths")` — `buildInsightsUserPayload(ctx)` inclui `collaboration_lift.delta_pct=42` e `available_signals` contém `editorial_patterns.collaboration_lift.delta_pct` e `editorial_patterns.engagement_trend.direction`.
- `it("accepts a correct editorial_patterns insight")` — `validateInsights(passingResponse(), ctx).ok === true`.
- `it("rejects technical-token leak in body with TECHNICAL_LEAK")` — body com `editorial_patterns.collaboration_lift.delta_pct` literal.
- `it("rejects generic recommendation without numeric grounding with GENERIC_OUTPUT")`.

#### 4c. `validate-market.test.ts`

`describe("validateInsights — market_signals")` com:

- `it("payload exposes numeric market signals")` — `strongest_score=65`, `trend_delta_pct=22`, `usable_keyword_count=1`, `top_keywords=["ia"]`, `zero_signal_keywords=["marketingdigital"]`, e os respetivos paths em `available_signals`.
- `it("accepts a correct market insight with numeric grounding")`.
- `it("rejects generic market body without numeric grounding with GENERIC_OUTPUT")`.
- `it("rejects zero-signal keyword cited as strong opportunity")` — aceita `GENERIC_OUTPUT` ou `EVIDENCE_INVALID`, preservando o comentário existente que explica porquê.

### 5. Validação

```
bunx tsc --noEmit
bunx vitest run src/lib/analysis/__tests__/normalize-r4a.test.ts \
                src/lib/insights/__tests__/validate-editorial.test.ts \
                src/lib/insights/__tests__/validate-market.test.ts
```

(Path real em `__tests__/`, conforme nota da regra 5 do prompt: "se o projeto usa pasta canónica diferente, executar o equivalente e reportar".)

## Garantias

- Sem chamadas a Apify, DataForSEO, OpenAI, Supabase ou qualquer rede.
- Sem alterações de runtime: apenas testes, `vitest.config.ts`, `package.json` (scripts + devDeps).
- Sem alterações em ficheiros locked, UI, report, PDF, `/report/example`.
- Determinístico: fixtures inline, sem datas dinâmicas além das já usadas (timestamps fixos).

## Ficheiros a alterar

1. `package.json` — adicionar Vitest às devDeps + scripts `test` / `test:watch`.
2. `vitest.config.ts` — criar.
3. `src/lib/analysis/__tests__/normalize-r4a.test.ts` — reescrever em Vitest.
4. `src/lib/insights/__tests__/validate-editorial.test.ts` — reescrever em Vitest.
5. `src/lib/insights/__tests__/validate-market.test.ts` — reescrever em Vitest.

## Checkpoint

- ☐ Vitest instalado e configurado
- ☐ 3 ficheiros convertidos para `describe/it/expect`
- ☐ `bunx tsc --noEmit` limpo
- ☐ `bunx vitest run` verde com contagem reportada
- ☐ Sem providers chamados, sem mudanças de runtime/UI
