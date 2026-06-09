# Floor lab-only para blocos 03–06 — estado e plano

## TL;DR
O fix mínimo que pedes **já está implementado** no código actual. Não há ficheiros novos a criar nem lógica a alterar. O plano é apenas **verificar** (correr os testes existentes) e, se passar, encerrar a tarefa sem mais edições.

## O que já existe

### 1. Floor server-side — `src/lib/report/effective-features.ts`
`LOCKED_MODULES` força `hidden` para `blockPerformance`, `blockContent`, `blockSearch`, `blockBenchmark` em `public_mvp` e `pro_preview`. Aplicado **depois** do merge de overrides em `getEffectiveFeatures`, portanto nenhum override administrativo pode expor estes blocos fora de `internal_lab`.

### 2. Floor client-side — `src/lib/report/report-variant.ts` (`useVariantFeatures`)
Após resolver `base` (override de contexto ou defaults estáticos), quando `variant !== "internal_lab"` o hook devolve `{ ...base, blockPerformance: "hidden", blockContent: "hidden", blockSearch: "hidden", blockBenchmark: "hidden" }`. Defesa em profundidade caso o `VariantFeaturesOverrideProvider` receba payload manipulado.

### 3. Defaults estáticos coerentes — `VARIANT_FEATURES`
- `public_mvp`: 03–06 = `hidden`
- `pro_preview`: 03–06 = `hidden` (com comentário a explicar a regra `internal_only`)
- `internal_lab`: 03–06 = `full`

### 4. Sidebar comercial intacta
`COMMERCIAL_SECTIONS` em `src/components/report-redesign/v2/block-config.ts` lista Frequência editorial, Mix de formatos, Publicações-chave e Diagnóstico editorial como âncoras dentro de `overview`/`diagnostico` — não são blocos lab e não são tocados por esta lógica.

### 5. Testes — `src/lib/report/__tests__/lab-blocks-floor.test.ts`
Já cobre os 6 cenários pedidos:
- defaults estáticos de `public_mvp` / `pro_preview` / `internal_lab`
- override que tenta expor 03–06 em `public_mvp` → clampado
- override que tenta expor 03–06 em `pro_preview` → clampado
- `internal_lab` continua a respeitar overrides para esconder

## Plano (1 passo, sem código novo)

1. Correr `bunx vitest run src/lib/report/__tests__/lab-blocks-floor.test.ts` para confirmar que o floor server+client + lock continua verde.
2. Reportar resultado. Se passar, fechar — não há mais nada para mudar.
3. Se algum teste falhar (não esperado), só então abrir nova edição cirúrgica no ficheiro afectado.

## Fora de scope (não tocar)
Checkout, pagamentos, créditos, janelas 30d/90d, concorrente, cache, enrichments, conteúdo do Report Lab, sidebar comercial.
