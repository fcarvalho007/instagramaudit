## Diagnóstico

**Auditoria confirmada:**
- `/admin/clientes` (`src/routes/admin.clientes.tsx`) é placeholder com números fake no subtítulo: `"312 leads · 125 clientes · 38 subscritores activos"`.
- Sidebar **já não** mostra `/admin/clientes` (consolidação anterior).
- Topbar (`admin-topbar.tsx`) **ainda** mapeia `"/admin/clientes": "Contactos"` — referência órfã.
- Command palette **não** referencia `/admin/clientes`.

**Nota importante sobre as rotas reais:** o pedido menciona `/admin/crm/pipeline` e `/admin/crm/contactos`, mas esses paths **não existem** no projeto. A consolidação CRM real ficou em **`/admin/beta-leads`** (com tabs Pipeline + Tabela). Vou redirecionar para essa URL real. Se quiseres adotar o prefixo `/admin/crm/...` no futuro, é um passo separado de renomeação de ficheiros + redirects extra.

**Mocks dedicados a clientes (zero uso fora de `clientes/`):**

| Constante (em `src/lib/admin/mock-data.ts`) | Único consumidor |
|---|---|
| `MOCK_PIPELINE` | `clientes/pipeline-section.tsx` |
| `MOCK_PIPELINE_FOOTER` | `clientes/pipeline-section.tsx` |
| `MOCK_CUSTOMERS_LIST` | `clientes/customers-table-section.tsx` |
| `MOCK_CUSTOMERS_TOTALS` | `clientes/customers-table-section.tsx` |
| `MOCK_SELECTED_CUSTOMER` | `clientes/customer-card-section.tsx` |
| `MOCK_CUSTOMER_ACTIVITY` | `clientes/customer-card-section.tsx` |
| `MOCK_CUSTOMER_PROFILES` | `clientes/customer-card-section.tsx` |
| `MOCK_CUSTOMER_NOTES` | `clientes/customer-card-section.tsx` |

Não confundir com `MOCK_PIPELINE_AGGREGATES` / `MOCK_PIPELINE_PHASES` (nomes diferentes) que são usados por `relatorios/pipeline-section.tsx` — **mantêm-se intactos**.

Outros mocks (`MOCK_FUNNEL`, `MOCK_REVENUE_KPIS`, `MOCK_KANBAN`, etc.) são usados em `visao-geral`, `receita`, `perfis`, `relatorios` — **fora de âmbito**.

## Plano de cleanup

### 1. Apagar componentes mock de clientes
- `src/components/admin/v2/clientes/pipeline-section.tsx`
- `src/components/admin/v2/clientes/customers-table-section.tsx`
- `src/components/admin/v2/clientes/customer-card-section.tsx`
- (a pasta `src/components/admin/v2/clientes/` fica vazia → apagar)

### 2. Substituir rota `/admin/clientes` por redirect
Reescrever `src/routes/admin.clientes.tsx` para um redirect estático (TanStack Router) para `/admin/beta-leads`, preservando deep-link funcional para quem ainda tenha o URL guardado:

```ts
import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/admin/clientes")({
  beforeLoad: () => {
    throw redirect({ to: "/admin/beta-leads", replace: true });
  },
});
```

Sem componente. Sem header. Sem números fake.

### 3. Remover mocks customer-only de `mock-data.ts`
Apagar APENAS estas exports e respetivos blocos:
- `MOCK_PIPELINE`
- `MOCK_PIPELINE_FOOTER`
- `MOCK_CUSTOMERS_LIST`
- `MOCK_CUSTOMERS_TOTALS`
- `MOCK_SELECTED_CUSTOMER`
- `MOCK_CUSTOMER_ACTIVITY`
- `MOCK_CUSTOMER_PROFILES`
- `MOCK_CUSTOMER_NOTES`

Atualizar o comentário JSDoc do topo do ficheiro (que lista estas constantes) para deixar de as nomear.

### 4. Limpar referências órfãs
- `src/components/admin/v2/admin-topbar.tsx` linha 24: remover entrada `"/admin/clientes": "Contactos"` do mapa de títulos. Após o redirect, o utilizador nunca chega a renderizar essa página.
- Command palette: nada a fazer (não referencia).

### 5. Verificar que não sobram números fake na UI admin
Após cleanup, rodar:
```bash
rg "312 leads|125 clientes|38 subscritores" src/
```
Esperado: 0 ocorrências.

## Ficheiros afetados

**Apagar:**
- `src/components/admin/v2/clientes/pipeline-section.tsx`
- `src/components/admin/v2/clientes/customers-table-section.tsx`
- `src/components/admin/v2/clientes/customer-card-section.tsx`

**Editar:**
- `src/routes/admin.clientes.tsx` — vira redirect puro
- `src/lib/admin/mock-data.ts` — remover 8 exports + atualizar JSDoc
- `src/components/admin/v2/admin-topbar.tsx` — remover entrada órfã

## Fora de âmbito

- Sem alterações em sidebar (já estava limpa).
- Sem mexer em `relatorios/pipeline-section.tsx`, `visao-geral/*`, `receita/*`, `perfis/*` (usam outros mocks que não fazem parte deste cleanup).
- Sem alterações de schema, providers, emails, relatório público.
- Sem renomear `/admin/beta-leads` para `/admin/crm/...` (mudança maior, fica para pedido separado se quiseres).

## Validação

- `bunx tsc --noEmit`
- `bunx vitest run`
- `rg "MOCK_CUSTOMERS|MOCK_PIPELINE\b|MOCK_PIPELINE_FOOTER|MOCK_SELECTED_CUSTOMER|MOCK_CUSTOMER_|312 leads|125 clientes|38 subscritores" src/` → 0 ocorrências ativas
- Manual: navegar para `/admin/clientes` → redireciona instantaneamente para `/admin/beta-leads`.

## Checklist de aceitação

- ☐ Pasta `clientes/` apagada
- ☐ `/admin/clientes` redireciona para `/admin/beta-leads`
- ☐ 8 mocks customer-only removidos de `mock-data.ts`
- ☐ Topbar sem entrada `/admin/clientes`
- ☐ Sem números fake (`312 leads · 125 clientes · 38 subscritores`) em lado nenhum
- ☐ `tsc` e `vitest` passam
