## Objetivo

Em mobile (<640px) o /admin tem letras pequenas (11–13px) que dificultam a leitura. Vamos elevar a escala tipográfica **apenas em mobile**, sem afetar o desktop (que está calibrado em estilo Iconosquare).

## Ficheiros a tocar

1. `src/styles/admin-tokens.css` — adicionar bloco `@media (max-width: 640px)` com overrides de tipografia.
2. `src/components/admin/v2/admin-topbar.tsx` — aumentar título e badge em mobile.
3. `src/components/admin/v2/admin-sidebar.tsx` — itens da nav e eyebrows de grupo maiores no drawer mobile.
4. `src/components/admin/v2/admin-page-header.tsx` — h1 já está em 28px mobile (ok); reforçar subtítulo.
5. `src/routes/admin.tsx` — pequena melhoria de espaçamento vertical (py-4 → py-5) no `<main>` mobile.

## Mudanças concretas

### 1. `admin-tokens.css` — bloco mobile

Adicionar no fim do ficheiro:

```css
@media (max-width: 640px) {
  .admin-v2 { font-size: 15px; line-height: 1.5; }

  /* Escala semântica */
  .admin-v2 .admin-body        { font-size: 15px; line-height: 1.55; }
  .admin-v2 .admin-meta        { font-size: 13px; }
  .admin-v2 .admin-table-cell  { font-size: 14px; }
  .admin-v2 .admin-card-title  { font-size: 17px; }
  .admin-v2 .admin-section-title { font-size: 16px; }
  .admin-v2 .admin-panel-title { font-size: 22px; }
  .admin-v2 .admin-eyebrow     { font-size: 12px; letter-spacing: 0.14em; }
  .admin-v2 .admin-eyebrow-sm  { font-size: 11px; }

  /* Bump genérico de utilities Tailwind text-[Npx] usadas no admin */
  .admin-v2 .text-\[10px\] { font-size: 11px; }
  .admin-v2 .text-\[11px\] { font-size: 12px; }
  .admin-v2 .text-\[12px\] { font-size: 14px; }
  .admin-v2 .text-\[13px\] { font-size: 15px; }
  .admin-v2 .text-\[14px\] { font-size: 16px; }
}
```

Nota: o escape `\[` permite atingir as classes geradas pelo Tailwind para os arbitrary sizes que aparecem em vários componentes (sidebar, command palette, tabelas, badges, etc.). Limitado ao scope `.admin-v2` para não afetar relatórios públicos nem o resto do site.

### 2. `admin-topbar.tsx`

- Altura: `h-14` → `h-14 sm:h-14` mantida; em mobile o conteúdo já cabe.
- Título (linha 140): `text-[14px]` → `text-[16px] sm:text-[14px]` e `font-semibold` mantém.
- Badge ExecutionMode (linha 82): `text-[11px]` → `text-[12px] sm:text-[11px]`; em mobile mostrar texto curto "Cache" mantém-se (já implementado).
- Botão hamburger: `h-9 w-9` → `h-10 w-10` em mobile para área de toque ≥40px.

### 3. `admin-sidebar.tsx`

No drawer mobile, os tamanhos atuais (13px nos itens, 10px nos eyebrows) ficam pequenos. Soluções:

- Acrescentar variantes responsivas em `ITEM_BASE` e `ITEM_ACTIVE`: substituir `text-[13px]` por `text-[15px] md:text-[13px]`.
- Eyebrow do grupo (linha 129): `text-[10px]` → `text-[12px] md:text-[10px]`.
- Brand "InstaBench" (linha 112): `text-[14px]` → `text-[16px] md:text-[14px]`.
- Aumentar `py-2` dos itens para `py-2.5 md:py-2` no mobile (alvo de toque).

### 4. `admin-page-header.tsx`

- H1 mantém `text-[28px] sm:text-[36px]` (legível).
- Subtítulo já usa `.admin-body` → fica em 15px em mobile pelo override do CSS.
- Espaço entre header e conteúdo: `mb-6` → `mb-5 sm:mb-7` (compactar mobile, já que tudo cresceu).

### 5. `admin.tsx`

- `<main className="px-3 py-4 sm:px-5 sm:py-5 …">` → `px-4 py-5 sm:px-5 sm:py-5 …` (mais respiro lateral em mobile, base de 16px).
- Banner de modo demo: `text-[11px]` → o override em `admin-tokens.css` já trata; sem mudança aqui.

## O que NÃO muda

- Desktop (≥640px) permanece exatamente igual — Iconosquare-aligned.
- Tokens semânticos de cor, spacing, radii: sem alteração.
- `src/styles.css` (locked): não é tocado.
- Relatório público (`/report.example`, `/r/$slug`): fora do scope `.admin-v2`, intacto.

## Checkpoint (☐)

- ☐ `admin-tokens.css` com bloco `@media (max-width: 640px)` adicionado
- ☐ `admin-topbar.tsx` com título e badge maiores em mobile
- ☐ `admin-sidebar.tsx` com itens, eyebrows e brand maiores em mobile
- ☐ `admin-page-header.tsx` com margin ajustada
- ☐ `admin.tsx` com padding mobile melhorado
- ☐ Verificação visual em viewport 375px com `browser--navigate_to_sandbox` + `screenshot` em `/admin`, `/admin/visao-geral` e `/admin/beta-leads`
