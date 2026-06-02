## Objetivo

Reverter a homepage `/` para o modo dark "Editorial Tech Noir" (deep navy + cyan + gold) que existia antes, alinhado com a direção de design do projeto. A versão light atual foi um desvio — vamos repor o hero dark e garantir que renderiza correctamente.

## Diagnóstico

A homepage actual usa o scope `.hero-light` com tokens claros (`surface-base`, `content-primary` navy, accent azul). O ficheiro `src/styles/hero-dark.css` foi esvaziado do bloco `.hero-dark` e do `color-scheme: dark`. O `HeroAuroraBackground` foi reescrito como gradiente claro. O `HeroReportPreview` perdeu o glass dark. O `index.tsx` perdeu a transição de gradiente dark→light.

## Plano

1. **`src/styles/hero-dark.css`** — Restaurar o bloco `.hero-dark` com `color-scheme: dark` e tokens locais (`--hero-bg-base #060A18`, `--hero-cyan`, `--hero-cyan-soft`, `--hero-glass-bg`, `--hero-glass-border`, `--hero-text-primary`, `--hero-text-secondary`, `--hero-text-tertiary`, `--hero-gold`). Manter as animações já presentes.

2. **`src/components/landing/hero-section.tsx`** — Trocar `hero-light` por `hero-dark`. Restaurar headline com `var(--hero-text-primary)` + highlight cyan, subtitle com `var(--hero-text-secondary)`, eyebrow chip cyan sobre fundo `rgb(var(--hero-cyan) / 0.08)`.

3. **`src/components/landing/hero-aurora-background.tsx`** — Reescrever para fundo dark: gradiente `#060A18 → #0A1230`, blobs aurora cyan/violet em opacidade baixa, grain noise subtil.

4. **`src/components/landing/hero-report-preview.tsx`** — Repor glass dark: container `bg-[var(--hero-glass-bg)]` com border `var(--hero-glass-border)`, shadow profundo cyan, mini-cards internos sobre `--hero-bg-elevated`, glow cyan.

5. **`src/components/landing/hero-action-bar.tsx`** — Repor tokens dark: barra glass (`--hero-glass-bg`, `--hero-glass-border`), input com `var(--hero-text-primary)` e placeholder `var(--hero-text-tertiary)`, ícones e check cyan, micro-label cyan.

6. **`src/routes/index.tsx`** — Repor banda gradiente `#060A18 → surface-base` (16px) entre hero dark e a `SocialProofSection` light para transição limpa.

7. **Forçar atualização** — Após patches, `code--restart_dev_server` para garantir que o Vite recarrega o CSS dos tokens e o cliente vê a versão nova.

## Validação

- `bunx tsc --noEmit`
- Screenshot do preview em 390×844 (mobile) e 1366×900 (desktop) para confirmar:
  - fundo navy escuro no hero
  - headline branca com últimas duas palavras em cyan
  - report preview em glass dark com glow cyan
  - transição suave para a secção social proof clara abaixo

## Fora de scope

- Restantes secções da homepage (já são light e mantêm-se)
- `ReportThemeWrapper` e relatórios (continuam light Iconosquare)
- Tokens globais em `src/styles/tokens.css`
- `LOCKED_FILES.md`
