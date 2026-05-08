
## Problema

A caixa do número (`chapterNumberBox`) tem 112×96px em desktop — demasiado pequena para funcionar como um painel editorial isolado. Parece um badge, não um bloco visual distinto.

## Correção (apenas tokens CSS)

### `report-tokens.ts` — 2 tokens a ajustar

1. **`chapterNumberBox`**: aumentar para `w-[140px] h-[120px] md:w-[160px] md:h-[140px]` e adicionar `rounded-3xl` para maior presença editorial. Manter `bg-surface-muted`, `ring-1 ring-border-default/10`, `shrink-0`.

2. **`chapterNumber`**: aumentar para `text-[4.5rem] md:text-[5.5rem]` para preencher melhor o painel maior. Manter `text-content-tertiary/60`, `font-display`, `font-semibold`.

### `report-block-section.tsx` — sem alterações

A estrutura `flex-col md:flex-row` com `gap-5 md:gap-8` já está correta. O número já fica à esquerda em desktop e empilha em mobile.

### Ficheiros que NÃO mudam

- `block-config.ts`, dados, lógica, providers — nada muda.

### Risco

Mínimo — apenas dimensões CSS de 2 tokens.
