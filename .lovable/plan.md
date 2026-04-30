# Phase 1A.2 — Cleanup dos resíduos do six-block

Três edições cirúrgicas em ficheiros não-locked. Sem novo design, sem providers, sem mudanças funcionais.

## Edições

### A. `src/components/report-redesign/report-tokens.ts`
Ajustar a classe `h1Hero` para evitar quebra a meio do nome em handles tipo `@frederico.m.carvalho`.

Antes:
```
h1Hero:
  "font-display text-[1.75rem] sm:text-[2rem] md:text-[2.5rem] lg:text-[2.75rem] font-semibold tracking-[-0.02em] text-slate-900 leading-[1.1] [overflow-wrap:anywhere]",
```

Depois:
```
h1Hero:
  "font-display text-[1.5rem] sm:text-[2rem] md:text-[2.5rem] lg:text-[2.75rem] font-semibold tracking-[-0.02em] text-slate-900 leading-[1.1] break-words [word-break:normal] [hyphens:none]",
```

Mudanças:
- `[overflow-wrap:anywhere]` → `break-words` (só quebra se a "palavra" exceder a linha; respeita pontos como pontos de quebra naturais)
- `[word-break:normal]` explícito para neutralizar qualquer herança
- `[hyphens:none]` para evitar hifenização automática
- Mobile clamp `text-[1.75rem]` → `text-[1.5rem]` (≈24 px), suficiente para `@frederico.m.carvalho` numa linha em 375 px com avatar ao lado

### B. `src/components/report-redesign/v2/report-shell-v2.tsx`
Adicionar `overflow-x-clip` ao canvas root para conter qualquer overflow lateral residual sem partir o `position: sticky` das tabs/sidebar (`overflow-x-hidden` num ancestral cria um novo scroll container e mata o sticky; `overflow-x-clip` não).

Antes:
```
<div className={cn(REDESIGN_TOKENS.pageCanvas, "min-h-screen")}>
```

Depois:
```
<div className={cn(REDESIGN_TOKENS.pageCanvas, "min-h-screen overflow-x-clip")}>
```

### C. `src/components/report-redesign/v2/report-block-section.tsx`
Adicionar `min-w-0` ao wrapper de conteúdo para que filhos com tabelas, gráficos ou listas longas não forcem a coluna do bloco a crescer horizontalmente.

Antes:
```
<div className="space-y-8 md:space-y-10">{children}</div>
```

Depois:
```
<div className="min-w-0 space-y-8 md:space-y-10">{children}</div>
```

## Ficheiros tocados

- `src/components/report-redesign/report-tokens.ts` (não locked)
- `src/components/report-redesign/v2/report-shell-v2.tsx` (não locked)
- `src/components/report-redesign/v2/report-block-section.tsx` (não locked)

Nenhum ficheiro locked é tocado. Sem dependências novas, sem alterações de schema, sem provider calls.

## Não-objetivos

- Não corrigir os erros AO90 (`actual`, `acção`) que aparecem nos cards do Bloco 02 — esses vêm dos prompts OpenAI e estão fora de scope desta fase. Fica registado para uma frente futura "Microcopy AI insights".
- Não redesign visual de blocos (isso é Phase 1B).
- Não tocar PDF, `/report/example`, admin, providers, Supabase, validators ou ficheiros locked.

## Validação

1. `bunx tsc --noEmit` — sem erros
2. `bunx vitest run` — todos os testes passam
3. QA visual em `/analyze/frederico.m.carvalho`:
   - **375 × 812**: sem scrollbar horizontal; hero `@frederico.m.carvalho` numa linha (ou quebra entre `m.` e `carvalho`, nunca a meio de `carvalho`); tabs sticky funcionam
   - **768 × 1024**: sem scrollbar horizontal; tabs sticky no topo durante scroll
   - **1366 × 768**: sem scrollbar horizontal; sidebar sticky à esquerda durante scroll

## Critérios de aceitação

- Sem scrollbar horizontal a 375, 768 ou 1366 px
- Hero handle não parte a meio do nome
- Tabs (mobile/tablet) e sidebar (desktop) continuam sticky após o `overflow-x-clip`
- KPIs e gráficos não forçam overflow da página
- Nenhuma mudança de design para além das três edições acima
