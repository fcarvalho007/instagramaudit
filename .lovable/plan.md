## Refinamentos UX/UI no card "Índice do perfil"

Ficheiro único: `src/components/report-redesign/v2/overview/editorial-identity-card.tsx`

### 1. "Como foi calculado" — remover caixa
Hoje é um `<details>` com `border`, fundo branco/cinza e padding generoso, o que compete visualmente com o resto do card.

Mudança:
- Remover `border-border-default`, `bg-white`, `bg-surface-muted/50` e `rounded-lg` do `<details>`.
- Manter apenas o `<summary>` como link inline:
  - sem padding lateral (`px-0`), padding vertical mínimo (`py-1.5`)
  - tipografia mais discreta: `text-[10.5px]` (vs `text-[11px]` actual), uppercase, `tracking-wide`, `text-content-tertiary`
  - chevron a `h-2.5 w-2.5` (vs `h-3 w-3`)
  - gap reduzido para `gap-1.5`
- Conteúdo expandido: manter texto mas com `pt-2 pb-1 px-0` (sem indentação visual de caixa).
- Manter o `mt-auto` para ficar colado em baixo.

### 2. Ampliar régua de estágios (Líder / Competitivo / Em progresso / Emergente)
A lista actual está em `text-[13px]` com o item activo em `text-[14px]`, demasiado pequeno face ao peso narrativo desta coluna.

Mudança no `<ul>` (linha 727) e itens:
- `<ul>` passa de `text-[13px]` para `text-[15px] leading-snug`.
- Item activo (`isCurrent`) passa de `text-[14px]` para `text-[16px] font-semibold` (era `font-medium`).
- Chip "esta marca · 38": passa de `text-[12px]` para `text-[13px]`, `px-2.5 py-1` (mais respiração), mantém cor e gradiente actuais.
- Aumentar o `min-h-[148px]` do contentor para `min-h-[168px]` para acomodar o novo tamanho sem comprimir.
- Régua vertical (barra): largura passa de `w-2` para `w-2.5` para acompanhar o peso visual.

### Fora de âmbito
- Tipografia/tokens globais.
- Coluna direita (veredicto editorial) e métricas inferiores.
- Lógica de cálculo, i18n keys, dados.

### Checkpoint
- ☐ "Como foi calculado" sem borda nem fundo, apenas texto + chevron mais pequenos
- ☐ Lista de estágios maior e mais legível (15–16px)
- ☐ Chip "esta marca · N" ligeiramente maior, mesmas cores
- ☐ Régua vertical ajustada à nova escala
- ☐ Sem alterações fora de `editorial-identity-card.tsx`