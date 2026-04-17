

## Plano: Refinamento light section + How it works

### Diagnóstico

1. **White haze na light section**: o gradient `from-surface-base via-surface-light to-surface-light-elevated` termina em slate-50 (quase branco) + studio stage radial off-white por trás = lavagem branca. O frame `bg-white/40` reforça o efeito.
2. **Palco "almofadado"**: `border-slate-300/40` (40% opacidade) + `bg-white/40 backdrop-blur-sm` + `p-3 md:p-5` + `--shadow-stage` cria um halo branco difuso. Falta nitidez de borda.
3. **Bloco do relatório sem nitidez estrutural**: o frame envolve o card mas a fronteira mockup↔frame fica borrada por causa do `bg-white/40` translúcido.
4. **"Como funciona" sem tensão**: 3 passos com gap uniforme, connector tracejado horizontal único, ícones com glow violet idêntico — pacing demasiado plano. Falta hierarquia (passo 02 é o "core" técnico) e diferenciação rítmica.

### Mudanças

**`product-preview-section.tsx`**
- Background gradient: terminar em `surface-light` (slate-200) em vez de `surface-light-elevated` (slate-50). Mais cor, menos lavagem. → `from-surface-base via-surface-light to-surface-light`
- Studio stage: reduzir tamanho (`h-[80%] w-[90%]` → `h-[60%] w-[70%]`) e baixar opacidade central (`60%` → `40%`) para spotlight mais focado, menos atmosférico
- Frame: `border-slate-300/40 bg-white/40 backdrop-blur-sm p-3 md:p-5` → `border-slate-300/70 bg-surface-light-elevated p-2 md:p-3` (sólido, borda definida, padding reduzido para o relatório respirar com a sua própria sombra)
- Corner brackets: aumentar para `h-4 w-4` e cor `border-slate-600/80` (mais nítidos)
- Top transition fade reduzir de `h-32 md:h-40` → `h-24 md:h-32` (transição mais decidida)

**`how-it-works-section.tsx`** — tensão visual entre passos
- Substituir grid uniforme `gap-12 md:gap-8` por grid com **separadores verticais hairline** entre passos em desktop (em vez do connector horizontal único que une só os ícones)
- Connector tracejado horizontal: substituir por **linha hairline contínua + dois nós (dots) violet** alinhados sobre os ícones do passo 02 e 03 — sugere fluxo direccional, não estática
- Adicionar coluna numerada lateral grande (passo "02" em mancha tipográfica grande) para criar ritmo visual entre os 3
- Background HUD vertical lines: aumentar opacidade `0.03` → `0.04` e adicionar segundo layer com glow radial violet shifted (não centrado) para assimetria editorial

**`how-it-works-step.tsx`** — diferenciação por step
- Adicionar prop `emphasis?: "default" | "primary"` para destacar o passo 02 (core)
- Passo 02 (`primary`): icon container maior `h-16 w-16` (vs `h-14 w-14`), glow violet mais forte (`var(--shadow-glow-violet)` continua mas adicionar `bg-accent-violet/10` no fundo do container em vez de `bg-surface-elevated/70`)
- Passos 01 e 03: manter dimensão actual mas reduzir opacidade do glow para criar hierarquia (`bg-surface-elevated/70` → `bg-surface-elevated/90` mais sólido, sem glow extra)
- Adicionar separador hairline vertical à direita de cada step em desktop (`md:border-r md:border-border-subtle md:pr-8` excepto último) para tensão estrutural

### Ficheiros tocados

| Ficheiro | Scope |
|---|---|
| `src/components/landing/product-preview-section.tsx` | Background gradient final, studio stage menor/menos opaco, frame sólido + borda nítida + padding reduzido, brackets reforçados, transição topo |
| `src/components/landing/how-it-works-section.tsx` | Connector substituído por linha + nós direccionais, HUD reforçado, glow assimétrico |
| `src/components/landing/how-it-works-step.tsx` | Prop `emphasis`, separador vertical entre steps, hierarquia visual passo 02 |

**Sem novos tokens. Sem novos ficheiros.** Reutiliza `surface-light`, `surface-light-elevated`, `accent-violet*`, `border-subtle`, `shadow-stage`, `shadow-glow-violet`.

### Confirmação

✅ UI-only. Zero alterações em routing, lógica, forms, state, integrações.
✅ Mobile 375px: studio stage `max-w-[70vw]`, separadores verticais só em `md+`, prop `emphasis` apenas afecta dimensões dentro do mesmo grid.
✅ pt-PT preservado. Acessibilidade preservada (focus, contrastes WCAG AA).
✅ Locked files autorizados pelo escopo de "refinamento visual da landing".

### Desvios face à spec

1. **Hierarquia passo 02**: a spec pede "tensão visual entre os 3 passos" sem especificar como. Interpreto como hierarquia (1 passo "âncora", 2 satélites) em vez de 3 passos iguais — gera tensão direccional. Se preferires tensão simétrica (3 iguais com mais separadores), ajusto.
2. **Frame sólido vs glass**: removo `backdrop-blur-sm` + `bg-white/40` translúcido por `bg-surface-light-elevated` sólido para nitidez estrutural. Perde o efeito glass mas ganha definição editorial — alinha com a metáfora "documento premium pousado", não "vidro flutuante".

