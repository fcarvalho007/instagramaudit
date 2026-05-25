## Objectivo

Refinar o `ReportLockGate` em `/analyze/$username` — o cartão branco que aparece sobre o conteúdo desfocado — para ter mais presença visual e reforçar a gratuidade do acesso, mantendo o registo Iconosquare claro (sem dark navy, sem glow, sem neon).

## Mudanças

### 1. Copy — destacar "leitura gratuita"

Alterar o título no `lockGate` (PT e EN) para reforçar a palavra-chave:

- **Antes (PT):** "Continua a leitura / do @robs.cortez"
- **Depois (PT):** "Continua a **leitura gratuita** / do relatório de @robs.cortez"

Implementação: usar `<Trans>` com três slots — `<free>` para "leitura gratuita" e `<accent>` para o handle. O `<free>` recebe `font-semibold`, cor `text-content-primary` e um sublinhado decorativo em `accent-primary` via `underline decoration-2 underline-offset-4 decoration-accent-primary/60`. Sem itálico (Fraunces fica reservado para o resto do título). Mantém-se a tipografia editorial.

Atualizar ambos os ficheiros `src/i18n/locales/pt/gate.json` e `src/i18n/locales/en/gate.json` substituindo `titleLine1` + `titleLine2Prefix` por uma chave única `title` com placeholders.

### 2. Visual — "Clean Prism Glass" aplicado ao cartão

Sem hero 3D dominante (não cabe no estilo Iconosquare e o cartão tem de continuar legível por cima do conteúdo desfocado). Em vez disso, adicionar uma camada decorativa subtil que evoca prismas/vidro:

a. **Halo prismático atrás do cartão** — uma `div` decorativa absoluta (`-z-10`, `pointer-events-none`, `aria-hidden`) com dois blobs cónicos translúcidos:
   - blob 1: top-left, `from-accent-primary/15 via-accent-secondary/10 to-transparent`, `blur-3xl`, `~320px`
   - blob 2: bottom-right, `from-accent-secondary/12 to-transparent`, `blur-3xl`, `~280px`
   - opacidade total ≤ 40% para nunca competir com o conteúdo

b. **Glass shell no cartão** — manter `bg-surface-card` mas adicionar:
   - borda gradiente suave (técnica `border-image` ou pseudo-elemento) com `linear-gradient(135deg, color-mix(in oklab, var(--accent-primary) 25%, transparent), transparent 60%)`
   - `backdrop-blur-xl` (já está sobre conteúdo desfocado, reforça a sensação de vidro)
   - sombra refinada em duas camadas: existente + `0 1px 0 0 white inset` no topo (highlight de vidro)

c. **Prism chip no canto superior direito** — pequeno quadrado 56×56px com gradiente cónico (`conic-gradient`) translúcido em `accent-primary/secondary/transparent`, `rounded-2xl`, `rotate-[12deg]`, posicionado a `-top-3 -right-3`. Apenas decorativo (`aria-hidden`), reforça o motivo "prism glass" sem adicionar componentes pesados.

d. **Badge "Acesso gratuito"** — passa a ter um leve `bg-emerald-50` em vez de `bg-white` plano, com `ring-1 ring-emerald-200/60`, para alinhar com o reforço da gratuidade.

e. **Micro-animação de entrada** — `animate-in fade-in slide-in-from-bottom-2 duration-500` no cartão para que apareça com presença (uma única vez).

### 3. Token e CSS

Tudo via classes Tailwind + tokens existentes (`accent-primary`, `accent-secondary`, `surface-card`, `border-default`). Se for preciso o gradiente cónico do prism chip, adicionar uma única utility custom em `src/styles.css`:

```css
.bg-prism-chip {
  background:
    conic-gradient(from 140deg at 50% 50%,
      color-mix(in oklab, var(--accent-primary) 35%, transparent),
      color-mix(in oklab, var(--accent-secondary) 30%, transparent),
      color-mix(in oklab, var(--accent-primary) 25%, transparent));
}
```

Zero cores hardcoded em componentes.

## Ficheiros tocados

- `src/components/product/report-lock-gate.tsx` — título com `<Trans>`, halo, glass shell, prism chip, badge tonal, animação
- `src/i18n/locales/pt/gate.json` — nova chave `lockGate.title` com slots `<free>` e `<accent>`
- `src/i18n/locales/en/gate.json` — espelho EN ("Keep reading the **free** report from @handle")
- `src/styles.css` — uma utility `.bg-prism-chip` (5 linhas)

## Fora de âmbito

- Não tocar no `UnlockModal` (o stepper que abre ao clicar no CTA).
- Não tocar no conteúdo desfocado por baixo.
- Não introduzir bibliotecas 3D (three.js, spline, etc.) — incompatível com o registo Iconosquare e com o budget de bundle do `/analyze`.

## Checkpoint

- ☐ Título em PT lê "Continua a **leitura gratuita** do relatório de @handle" com "leitura gratuita" a bold + sublinhado em accent
- ☐ Cartão tem halo prismático translúcido por trás (visível mas subtil)
- ☐ Prism chip decorativo no canto sup. direito
- ☐ Badge com tom esmeralda suave
- ☐ Animação de entrada subtil
- ☐ Sem cores hardcoded, sem dark navy, sem glow, sem libs novas