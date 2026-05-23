## Objetivo

No `report-hero-v2.tsx`, os 4 botões da coluna direita parecem comprimidos (largura 280px) e o "Comparar com concorrente" quebra em 2 linhas com o badge PRO espremido. Refinar para uma stack mais respirada, alargada e visualmente consistente.

## Alterações em `src/components/report-redesign/v2/report-hero-v2.tsx`

1. **Largura da coluna de ações**
   - `lg:w-[280px]` → `lg:w-[320px]`
   - Ganha ~40px de respiração e impede o wrap do label "Comparar com concorrente · PRO" numa única linha.

2. **Botão primário "Novo relatório"**
   - Altura `h-11` → `h-12` (48px, mais presença).
   - `text-sm` → `text-[15px]` para alinhar com o body do hero.
   - Manter gradiente subtil: adicionar `bg-gradient-to-b from-content-primary to-[#0a0f1d]` para dar profundidade ao preto chapado.

3. **Botão "Comparar com concorrente"**
   - Altura `h-11` → `h-12`.
   - Garantir 1 linha: `whitespace-nowrap` + label encurtado para **"Comparar concorrente"** (remove "com" — economiza ~30px).
   - Badge PRO: passar de `text-[10px]` + `px-1.5` para `text-[10px]` `px-2 py-0.5`, com tracking mais apertado e cor sólida `bg-accent-primary text-white` (mais contraste do que o `/10` atual que se mistura no fundo).
   - Hover: além de mudar texto/borda para `accent-primary`, adicionar `hover:bg-accent-primary/[0.04]` para feedback mais nítido.

4. **Par PDF / Partilhar (secundários)**
   - Altura `h-10` → `h-11` (44px — target tátil consistente).
   - Substituir o atual `bg-surface-muted/80 backdrop-blur-sm` por `border border-border-default bg-white` para parar de "afundar" visualmente e harmonizar com o botão de comparação.
   - Hover passa a `hover:bg-surface-muted hover:border-border-strong`.
   - `gap-2` (em vez de `gap-1.5`) entre ícone e label, ícones `size-[15px]`.

5. **Espaçamento da stack**
   - `flex flex-col gap-2` → `gap-2.5` entre os 3 níveis (primário, secundário PRO, par utilitário).
   - Adicionar separador visual subtil: `mt-1` no grid PDF/Partilhar para sugerir agrupamento "ações de export" sem precisar de divider.

6. **Decoração prismática**
   - Aumentar o `w-[420px]` do container → `w-[460px]` para acompanhar a nova largura da coluna de ações e manter o blur centrado atrás dela.

7. **Responsivo (< lg)**
   - A stack continua full-width (`w-full`); como já não tem `lg:w-[320px]` em mobile, mantém-se idêntica.
   - O par PDF/Partilhar continua `grid-cols-2`.

## Critérios de aceitação

- Coluna de ações com 320px em desktop, sem wrap em "Comparar concorrente · PRO".
- 4 botões com alturas coerentes (48 / 48 / 44 / 44 px).
- Badge PRO legível (fundo sólido azul, branco em cima).
- PDF e Partilhar com a mesma linguagem visual do botão de comparação (border + white bg).
- Nada alterado fora de `report-hero-v2.tsx`.
