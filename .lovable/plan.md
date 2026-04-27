# Correções visuais finais — /admin v2

## Diagnóstico (após inspeção em viewport real)

Após auditoria com browser e leitura do código:

1. **Os AdminCard ESTÃO no código** — todas as 5 secções de `visao-geral` (e idem nas outras tabs) estão envolvidas em `<AdminCard>`. O DOM está correcto.
2. **O problema é puramente visual**: o `AdminCard` actual é **imperceptível** sobre o canvas creme:
   - `bg: #ffffff` sobre canvas `#F1EFE8` → contraste mínimo
   - `border: rgb(44 44 42 / 0.08)` → 8% sobre creme = praticamente invisível
   - **Sem `box-shadow`** → não há elevação que separe o cartão do fundo
3. **Overlap de texto** no último trapézio do funil: as labels "CONVERSÃO LEAD → CLIENTE" e "MARGEM CLIENTE" sobrepõem-se aos valores `125` / `40.1%`.
4. O **banner amarelo TEMP_AUTH_BYPASS** está activo desde a inspeção anterior — precisa de ser revertido no fim.

Por isso, ao utilizador parece que "não foram criados cartões". Estão lá, mas não se vêem.

## Alterações propostas (3 ficheiros)

### 1. `src/styles/admin-tokens.css` — reforçar token de borda + adicionar shadow

Aumentar a opacidade da borda padrão e adicionar um token de sombra subtil para os cartões.

```diff
- --color-admin-border: rgb(var(--admin-border-rgb) / 0.08);
- --color-admin-border-strong: rgb(var(--admin-border-rgb) / 0.14);
+ --color-admin-border: rgb(var(--admin-border-rgb) / 0.14);
+ --color-admin-border-strong: rgb(var(--admin-border-rgb) / 0.22);
+ --shadow-admin-card: 0 1px 2px rgb(var(--admin-border-rgb) / 0.04),
+                      0 4px 12px rgb(var(--admin-border-rgb) / 0.05);
```

### 2. `src/components/admin/v2/admin-card.tsx` — aplicar sombra + surface ligeiramente off-white nos cartões "default"

```diff
  const base =
-   "rounded-xl border border-admin-border bg-admin-surface text-admin-text-primary";
+   "rounded-xl border border-admin-border bg-admin-surface text-admin-text-primary shadow-[var(--shadow-admin-card)]";
```

A combinação `shadow + border 14%` torna o cartão claramente visível sem ser ruidoso. Mantém a estética editorial (sem o efeito "Material Design pesado").

### 3. `src/components/admin/v2/visao-geral/funnel-section.tsx` — corrigir overlap do último trapézio

Reposicionar as labels do 3.º trapézio (lead → cliente) de forma equivalente aos restantes — afastar `x` das duas colunas para que não se cruzem. Provável causa: as duas labels têm coordenadas demasiado próximas dentro do trapézio mais estreito.

(Ler o `<svg>` completo e ajustar `x` de `MARGEM CLIENTE` ou reduzir `font-size` apenas neste trapézio.)

### 4. `src/routes/admin.tsx` — restaurar auth

No fim, descomentar o bloco `AdminAuthShell`, remover o banner amarelo `TEMP_AUTH_BYPASS` e o estado `logout`. Foi pedido apenas para esta sessão de inspeção visual.

## O que NÃO vou tocar

- Nenhum dos ficheiros `LOCKED_FILES.md`
- Nenhuma das 24 secções com `AdminCard` — a correção é em **um sítio só** (token + componente)
- `src/styles/tokens.css` ou `src/styles.css` (locked)
- A página `/report.example`

## Checkpoint

- ☐ `--color-admin-border` aumentado para 14%
- ☐ `--shadow-admin-card` definido em `admin-tokens.css`
- ☐ `AdminCard` aplica `shadow-[var(--shadow-admin-card)]`
- ☐ Cartões agora visíveis sobre o canvas em todas as 6 tabs
- ☐ Overlap do último trapézio do funil corrigido
- ☐ Auth do `/admin` restaurada e banner amarelo removido
- ☐ Verificação visual em `/admin/visao-geral`, `/admin/clientes` e `/admin/sistema` antes de fechar

Após aprovação executo as 4 alterações de uma vez (são pequenas e independentes entre si).
