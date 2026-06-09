## Diagnóstico

### Variantes existentes (`src/lib/report/report-variant.ts`)

| Variant | Bloco 03 Performance | Bloco 04 Conteúdo | Bloco 05 Procura | Bloco 06 Benchmark |
|---|---|---|---|---|
| `public_mvp` | `hidden` | `hidden` | `hidden` | `hidden` |
| `pro_preview` | `full` | `full` | `full` | `full` |
| `internal_lab` | `full` | `full` | `full` | `full` |

### Variant usada em cada contexto

- **Public Free** (`/analyze/$username`, sem `report_full_9`) → `public_mvp` ✅
- **Public Pro pago** (`/analyze/$username` com `report_full_9`) → **`pro_preview` ❌** (é a regressão)
- **Admin Preview** (`/admin/report-preview/$username`) → `public_mvp` por defeito (ou o que vier na query string `?variant=`) ✅
- **Admin Report Lab** (`/admin/report-lab`) → `internal_lab` ✅
- **Admin Report Lab Full Preview** (`/admin-report-lab/full-preview/$handle`) → `internal_lab` ✅
- **Snapshot preview interno** (`/admin/report-preview/snapshot/$snapshotId`) → `internal_lab` ✅

### Porque é que 03/04/05/06 aparecem na Pro pública

`src/routes/analyze.$username.tsx`, linhas 415-421:

```ts
const effectiveVariant: "public_mvp" | "pro_preview" = premiumUnlocked
  ? "pro_preview"
  : "public_mvp";
```

Esta linha foi introduzida com o objectivo de "destrancar" o Bloco 03 para premium, mas como `pro_preview` tem **todos** os blocos a `full` (configuração idêntica a `internal_lab` excepto `debugLabels`), ao subir para `pro_preview` cai-se nesta cascata em `report-shell-v2.tsx`:

```tsx
{premiumUnlocked && features.blockPerformance === "full" && (...)}  // 03
{premiumUnlocked && features.blockContent !== "hidden" && (...)}    // 04
{premiumUnlocked && features.blockSearch !== "hidden" && (...)}     // 05
{premiumUnlocked && features.blockBenchmark !== "hidden" && (...)}  // 06
```

Resultado: assim que o lead tem `report_full_9`, os 4 blocos internos passam a aparecer publicamente. A sidebar/topo-tabs (`ReportBlockTopTabs`) recebem o mesmo `features` e também listam Bloco 03–06.

### Qual é a variant correcta para Pro pública

`public_mvp`. Não precisamos de uma variant nova:

- Os blocos 03–06 são **lab-only** por regra de negócio actual.
- Tudo o que é "Pro público" (premium content do Bloco 01/02, gates de competitor, janela 30d/90d, créditos, modal premium, etc.) já é controlado por `premiumUnlocked`/entitlements, **não** pela variant. A variant só decide quais blocos/módulos existem no shell.
- `pro_preview` continua útil como variant interna (admin/lab) para experimentar combinações futuras, mas não deve voltar a ser usada na rota pública enquanto 03–06 forem internos.

## Fix mínimo

### 1. `src/routes/analyze.$username.tsx` — reverter o flip
Substituir:
```ts
const effectiveVariant: "public_mvp" | "pro_preview" = premiumUnlocked
  ? "pro_preview"
  : "public_mvp";
```
por:
```ts
// Rota pública usa SEMPRE `public_mvp`. Pro adiciona conteúdo premium
// dentro dos blocos 01/02 (e gates de competitor/janela 30d/90d) via
// `premiumUnlocked`, não através da variant. Blocos 03–06 são lab-only
// e ficam `hidden` em qualquer contexto público.
const effectiveVariant: "public_mvp" = "public_mvp";
```
Manter `premiumUnlocked`, `getMyReportEntitlement`, `getPublishedFeatures({ variant: "public_mvp" })`, e o resto do fluxo intacto.

### 2. `src/lib/report/report-variant.ts` — endurecer `pro_preview` (defensivo)
Mudar em `pro_preview` apenas:
- `blockPerformance: "full"` → `"hidden"`
- `blockContent:     "full"` → `"hidden"`
- `blockSearch:      "full"` → `"hidden"`
- `blockBenchmark:   "full"` → `"hidden"`

Razão: caso alguém volte a comutar para `pro_preview` na rota pública (ou um override admin a publique), os 4 blocos internos não escapam. Se um dia se quiser usar `pro_preview` para experimentar internamente os blocos lab-only, faz-se via `internal_lab` (que continua "full" em tudo).

### 3. `report-shell-v2.tsx` — sem alterações
Os gates `premiumUnlocked && features.blockX !== "hidden"` já fecham 03–06 quando `features.blockX === "hidden"` (defaults de `public_mvp`). A sidebar/`ReportBlockTopTabs` consomem `features`, portanto também deixam de listar 03–06 automaticamente.

## O que NÃO muda

- Blocos 03/04/05/06 permanecem no código.
- `internal_lab` continua a expor 03/04/05/06 em `/admin/report-lab`, `/admin/report-preview/...?variant=internal_lab`, `/admin-report-lab/full-preview/$handle` e snapshot preview.
- `premiumUnlocked` continua a controlar Bloco 02 (diagnóstico), modal premium, competitor unlock, janela 90d, créditos e checkout — nada disso depende da variant.
- Pricing, checkout, credits, 30d/90d, competitor logic, enrichments: intactos.

## Validação após o fix

1. `/analyze/<handle>` (Free, sem `report_full_9`) → mostra 01 + 02 (free) + cofre; sidebar lista 01/02 + 03–06 como locked teaser (comportamento já existente em `public_mvp`).
2. `/analyze/<handle>` (Pro, com `report_full_9`) → mostra 01 + 02 (premium full); sidebar **não** mostra 03–06; conteúdo de 03–06 **não** renderiza. Competitor, 30d/90d, créditos e premium CTAs funcionam.
3. `/admin/report-lab?variant=internal_lab` e `/admin/report-preview/<handle>?variant=internal_lab` → 03–06 visíveis (sem regressão).
4. Snapshot preview admin → 03–06 visíveis.

## Ficheiros tocados

- `src/routes/analyze.$username.tsx` (1 bloco de 7 linhas)
- `src/lib/report/report-variant.ts` (4 linhas no objecto `pro_preview`)

Sem migrations, sem alterações de UI, sem alterações de entitlements/checkout.