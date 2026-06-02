## Objetivo

Remover por completo o "dark island" do hero da homepage (`/`). A homepage passa a ser 100% light, alinhada com o resto da landing (Iconosquare-style, surfaces claras + acento azul/índigo). Isto também resolve o bug visual que vês no screenshot — o `.hero-dark` está a falhar a aplicar (título a renderizar navy em vez de branco, sem aurora, sem report mockup visível à direita), provavelmente por `data-theme="light"` herdado do report wrapper a sobrepor-se ao scope `.hero-dark`. Em vez de remendar a cascata, eliminamos o conceito dark do hero.

## Scope

Apenas hero da homepage. Não toca:
- relatórios (continuam light, Ocean Breeze)
- admin
- restantes secções da landing (já são light)
- backend, i18n, tracking

## Mudanças

**1. `src/components/landing/hero-section.tsx`**
- Remover `hero-dark` do wrapper.
- Substituir `HeroAuroraBackground` (dark) por um ambient light subtil: gradient suave `surface-base → surface-muted` + 1 blob radial em `accent-primary / 8%` (mantém vida sem ruído).
- Eyebrow chip: trocar tokens `--hero-cyan*` por tokens light (`accent-primary` + soft bg). Continua a parecer "produto", mas calmo.
- Headline: remover `highlightClassName="text-[var(--hero-cyan)]"`; highlight passa a `text-[hsl(var(--accent-primary))]` (índigo/azul do design system). Cor base do título: `content-primary` (navy `#03045E`-equivalente já existente nos tokens light).
- Subtitle: `content-secondary`.
- `min-h` e estrutura grid preservadas.

**2. `src/components/landing/hero-aurora-background.tsx`**
- Reescrever como ambient light (não apagar o ficheiro — continua a ser importado e útil). Gradient `#FAFBFD → #F1F4F9`, blobs com opacidade muito baixa (8–12%) em accent + secondary. Sem noise overlay (era um truque cinematic dark).

**3. `src/components/landing/hero-report-preview.tsx`**
- Substituir referências a `--hero-glass-bg`, `--hero-glass-border`, `--hero-border` por tokens light: `surface-elevated`, `border-default`. Sombra editorial suave em vez de `shadow-[0_30px_80px_-20px_rgba(0,0,0,0.6)]`.
- Traffic lights ficam (são acromáticos).
- Glow ambiente atrás do card: baixar opacidade e trocar para accent light.

**4. `src/components/landing/hero-action-bar.tsx`, `blur-reveal-text.tsx`, `scroll-indicator.tsx`**
- Auditar e remover qualquer consumo direto de tokens `--hero-*`. Trocar por tokens light equivalentes (`content-*`, `accent-primary`, `border-default`).

**5. `src/routes/index.tsx`**
- Remover o `<div>` de costura dark→light (gradient `#060A18 → surface-base`). Já não é preciso.

**6. `src/styles/hero-dark.css`**
- Manter as animações reutilizáveis (`hero-mock-fade`, `hero-blur-reveal`, `hero-chips-scroll`) — não são dark-specific.
- Remover o bloco `.hero-dark { ... }` com todos os tokens `--hero-*` e o `color-scheme: dark`.
- Renomear o ficheiro para `src/styles/hero.css` e atualizar o import em `src/styles.css` (rename + update import na mesma migração).

**7. Verificações finais**
- `bunx tsc --noEmit`
- Screenshot do hero em mobile (390) e desktop (1366) para confirmar:
  - fundo light contínuo (sem corte dark→light a meio)
  - título navy legível
  - report preview visível à direita em desktop, em baixo em mobile
  - eyebrow chip discreto
  - CTA primary mantém-se

## Risco / fora de scope

- **Não** mexer no `ReportThemeWrapper` (continua a forçar light no `/reports/*`).
- **Não** alterar tokens globais (`src/styles/tokens.css`, `tokens-light.css`).
- **Não** mexer no `LOCKED_FILES.md`. Se algum dos ficheiros acima estiver na lockada, paro e peço confirmação antes de tocar.

## Checkpoint

☐ Hero renderiza 100% light, sem `.hero-dark`
☐ Sem gradient de costura no `index.tsx`
☐ Animações preservadas (BlurReveal + fade do mockup)
☐ Nenhuma referência a `--hero-bg*`, `--hero-fg*`, `--hero-cyan*`, `--hero-glass-*` no projeto
☐ `tsc --noEmit` verde
☐ Visual confirmado em 390 e 1366