## Diagnóstico — estado actual

Verifiquei o código antes de propor mudanças.

### O que já está correcto

1. **`src/routes/analyze.$username.tsx` (linha 457)**
   `const effectiveVariant: "public_mvp" = "public_mvp";`
   → Free e Pro pago usam **sempre** `public_mvp`. **Nenhum** mapeamento `premiumUnlocked ? "pro_preview" : "public_mvp"` existe na rota pública. O ponto §1 do pedido já está aplicado.

2. **`src/lib/report/report-variant.ts`**
   `public_mvp` **e** `pro_preview` já têm `blockPerformance / blockContent / blockSearch / blockBenchmark = "hidden"` nos defaults estáticos. Só `internal_lab` os expõe.

3. **`src/components/report-redesign/v2/report-shell-v2.tsx`**
   Os 4 blocos são gated com `premiumUnlocked && features.blockX !== "hidden"` (ou `=== "full"`). Como `public_mvp` força `hidden`, `premiumUnlocked` sozinho **não** os expõe na configuração estática.

4. **Sidebar pública** (`buildCommercialSidebarItems`, `COMMERCIAL_SECTIONS` em `block-config.ts`) usa os **7 itens comerciais** (Visão geral, Engagement, Frequência, Formatos, Publicações-chave, Diagnóstico editorial, Prioridades) — ancorados dentro dos blocos 01/02. **Não** lista os blocos lab (Performance/Content/Search/Benchmark). A lista flat de 6 blocos lab só é renderizada quando `variant === "internal_lab"`.

> ⚠️ Nota de nomenclatura: os "blocos 03/04/05/06" do pedido referem-se aos **blocos lab** definidos em `BLOCKS` com `tier: "lab"` (Performance, Conteúdo, Procura, Comparação). Os itens 03–06 da sidebar comercial (Frequência editorial, Formatos, Publicações-chave, Diagnóstico editorial) são sub-secções aprovadas para Pro e **não** são afectados — confirmar antes de implementar.

### Risco real remanescente

**Overrides administrativos** (`variant_overrides` na DB, lidos por `getPublishedFeatures`/`getDraftFeatures` em `src/lib/admin/variant-overrides.functions.ts`):
um admin pode publicar um override que vire `blockPerformance/Content/Search/Benchmark` para `"full"` em `public_mvp` ou `pro_preview`. Isso bypassa os defaults estáticos e renderiza blocos lab no Pro público. **Isto é o único caminho onde §5 ("premiumUnlocked alone never exposes 03/04/05/06") pode falhar hoje.**

---

## Fix mínimo seguro

### 1. Floor server-side em `getEffectiveFeatures`

Em `src/lib/report/effective-features.ts` (ou onde reside a função), após merge de overrides, forçar:

```ts
if (variant !== "internal_lab") {
  merged.blockPerformance = "hidden";
  merged.blockContent     = "hidden";
  merged.blockSearch      = "hidden";
  merged.blockBenchmark   = "hidden";
}
```

Floor é a defesa canónica: independente do estado da DB, dos overrides publicados, ou de bugs futuros no admin UI, os 4 blocos lab só podem ser `"full"` em `internal_lab`.

### 2. Floor client-side em `useVariantFeatures` (defesa-em-profundidade)

Em `src/lib/report/report-variant.ts`, dentro de `useVariantFeatures()`, aplicar o mesmo clamp sobre o resultado final (override ou static). Custo: ~5 linhas. Garante que mesmo que alguém passe um `featuresOverride` manual via prop, os 4 blocos lab continuam hidden fora de `internal_lab`.

### 3. Nenhuma mudança em rota pública necessária

`analyze.$username.tsx` já usa `public_mvp` para Free e Pro. Não tocar.

### 4. Sidebar — sem mudança

`buildCommercialSidebarItems` não inclui blocos lab; `buildSidebarItems` flat só é usado em `internal_lab`. Já correcto.

### 5. Admin lab / preview — sem mudança

`/admin/report-lab` e `/admin/report-preview/...` continuam a usar `internal_lab` e `pro_preview` como hoje. O floor exclui explicitamente `internal_lab`.

---

## Testes a adicionar

Ficheiro novo: `src/lib/report/__tests__/lab-blocks-floor.test.ts`

1. `getEffectiveFeatures("public_mvp", defaults, override_que_põe_blockPerformance="full")` → resultado tem `blockPerformance: "hidden"`. Idem Content/Search/Benchmark.
2. Idem para `pro_preview`.
3. `getEffectiveFeatures("internal_lab", defaults, override_que_põe_blockPerformance="hidden")` → respeita o override (`"hidden"`). Sanidade: lab pode esconder, mas público nunca pode mostrar.
4. Smoke test sobre `getVariantFeatures("public_mvp")` confirma blocos lab = `hidden`.
5. Smoke test sobre `getVariantFeatures("pro_preview")` confirma blocos lab = `hidden`.

(Não vou montar testes de render React full-DOM — o floor a nível de dados já garante o invariante para shell, sidebar e overrides simultaneamente, com superfície de teste muito menor.)

---

## Deliver pós-implementação

- **Ficheiros alterados**: `src/lib/report/effective-features.ts`, `src/lib/report/report-variant.ts`, `src/lib/report/__tests__/lab-blocks-floor.test.ts` (novo).
- **Variant Free pública**: `public_mvp`.
- **Variant Pro pública (paga)**: `public_mvp`.
- **Variantes que mostram blocos 03/04/05/06 lab**: **apenas** `internal_lab` (admin/report-lab, admin/report-preview/snapshot).
- **Testes**: `bun test src/lib/report/__tests__/lab-blocks-floor.test.ts`.

## Não tocado (regra do pedido)

Checkout, EuPago, credit_ledger, pricing, payments, 30d/90d, competitor logic, cache, enrichments, Report Lab content, `report_full_9` entitlement.

## Pergunta de confirmação antes de implementar

Os "blocos 03–06" do pedido são os **blocos lab** (Performance, Conteúdo, Procura, Comparação — `tier: "lab"` em `block-config.ts`), correcto? Os itens 03–06 da sidebar comercial (Frequência, Formatos, Publicações-chave, Diagnóstico editorial) são sub-secções Pro aprovadas e **não** serão escondidas.
