## Objectivo

Fechar as últimas pendências do Prompt 4 identificadas na avaliação:
1. Alinhar a **Ficha do Cliente** (`customer-card-section.tsx`) ao spec literal
2. Trocar o **hover das tabelas** para o token warm `--admin-bg-subtle`
3. Correr `bun run build` para validar bundle de produção

Sem novas funcionalidades. Sem mudanças de dados. Apenas refinamento visual + validação.

---

## 1. Ficha do Cliente · `src/components/admin/v2/clientes/customer-card-section.tsx`

### Header (avatar + nome)
- Avatar: `size={56}` → **`64`**
- Nome: `text-[18px]` → **22px** weight 500, `letter-spacing: -0.01em`, `line-height: 1.2`
- Padding do cartão: `!px-7 !py-6` → **`!px-8 !py-7`**
- Gap header: `gap-4` → `gap-5`; chips em `gap-3`
- Data "desde" passa a 12px (era 11px)

### Health Bars (componente interno)
- Dimensões: `width: 14, height: 4` → **`width: 16, height: 5`**
- Gap entre barras: `2` → **`3`**
- Cor "vazia": `--admin-neutral-50` → `--admin-neutral-200` (mais legível)

### Grid de 4 KPIs internos
Substituir o grid ad-hoc (gap-px + cartões manuais) por **`KPICard size="md"`** (primitivo partilhado), mantendo as health bars dentro do `value` quando aplicável:

```tsx
<div className="mb-7 grid gap-3 grid-cols-2 lg:grid-cols-4">
  {c.kpis.map((k) => {
    const hasBars = "bars" in k && k.bars;
    return (
      <KPICard
        key={k.eyebrow}
        size="md"
        eyebrow={k.eyebrow}
        value={
          hasBars ? (
            <span className="inline-flex items-center gap-2.5">
              <span>{k.value}</span>
              <HealthBars filled={k.bars!.filled} total={k.bars!.total} />
            </span>
          ) : k.value
        }
        sub={k.sub}
      />
    );
  })}
</div>
```

Benefícios: tipografia mono consistente (28px com `tnum`), padding alinhado, `admin-num` automático, menos código próprio.

### Timeline
- `paddingLeft`: 20 → **22**
- Pontos: 11×11 → **13×13** (cumpre spec)
- Borda do ponto: `2px solid white` → **`box-shadow: 0 0 0 2px var(--admin-bg-canvas)`** (encaixa no canvas warm em vez de branco puro)
- Linha vertical: `rgb(var(--admin-border-rgb) / 0.14)` → **`var(--color-admin-border)`** (mais visível e usa token oficial)
- Título de evento: 12px → **13px**; detalhe ganha `mt-0.5`

### Perfis analisados
- Padding por linha: `10px 12px` → **`12px 14px`**
- Background: `bg-admin-neutral-50` → **`var(--admin-bg-subtle)`** (warm)
- Tipografia: handle 12→13px, classification 10→11px com `mt-0.5`, count em `admin-num` 13px

### Notas internas
- Padding: `10px 12px` → **`14px 16px`** (cumpre spec)
- Título: 11→12px
- Corpo: 11→12px com `leading-relaxed`

---

## 2. Hover warm nas tabelas

### `src/components/admin/v2/receita/invoices-section.tsx`
Adicionar `transition-colors hover:bg-[var(--admin-bg-subtle)]` à `<tr>`.

### `src/components/admin/v2/clientes/customers-table-section.tsx`
Substituir `hover:bg-admin-neutral-50` e `bg-admin-neutral-50` (linha selecionada) por `hover:bg-[var(--admin-bg-subtle)]` e `bg-[var(--admin-bg-subtle)]`.

Razão: o canvas é `#FAF9F5` (warm) e `neutral-50` é cinzento frio — quebra a coerência cromática do design noir editorial.

---

## 3. Validação

```bash
bunx tsc --noEmit
bun run build
```

Se o build falhar, corrigir os erros e re-correr até passar.

---

## Ficheiros afectados

**Editados (3):**
- `src/components/admin/v2/clientes/customer-card-section.tsx`
- `src/components/admin/v2/receita/invoices-section.tsx`
- `src/components/admin/v2/clientes/customers-table-section.tsx`

**Intocados:**
- Mock data, primitivos, restantes secções, stubs das tabs por implementar

---

## Checklist de aceitação

- ☐ Avatar da ficha 64px
- ☐ Nome do cliente 22px / weight 500 / `-0.01em`
- ☐ Health bars 16×5 com gap 3
- ☐ 4 KPIs internos usam `KPICard size="md"`
- ☐ Timeline com pontos 13×13 e linha visível
- ☐ Perfis e notas com padding alinhado ao spec
- ☐ Hover das tabelas (faturas + clientes) usa `--admin-bg-subtle`
- ☐ `bunx tsc --noEmit` ✓
- ☐ `bun run build` ✓
- ☐ Cockpit legado e `/report.example` intactos