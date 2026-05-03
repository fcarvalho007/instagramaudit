
# Refinamentos UX/UI — Bloco 1 (Overview) — Iteração 2

## Melhorias identificadas

### 1. ScoreCard — interatividade e polish visual
- Adicionar ícone de seta (ChevronDown ou ArrowRight) sutil para sinalizar que o card é clicável e leva a outra secção
- Adicionar tinted background subtil por família de score (danger → rose-50, warning → amber-50, success → emerald-50) para dar significado cromático imediato
- Scorecard subtitle com `font-mono tabular-nums` para alinhamento numérico

### 2. ScoreRing — efeito glow sutil
- Adicionar `filter: drop-shadow` suave na cor do stroke quando o score está na família "success" ou "danger" — reforça a leitura emocional

### 3. ComparisonHeader — micro-interação e ícone
- Adicionar ícone `Users` à esquerda do texto para dar identidade visual ao CTA
- Adicionar animação pulse suave no badge PRO para chamar atenção

### 4. EngagementCardRefined — hierarquia tipográfica
- Hero number: aumentar para `text-[28px]` com `font-semibold` em vez de `font-medium`
- Adicionar ícone de tendência (TrendingUp/TrendingDown) junto ao gap p.p.
- Source badge: melhorar contraste com `bg-slate-100 px-2 py-0.5 rounded-md`

### 5. CompetitorModal — ortografia + polish
- Corrigir "directa" → "direta", "directos" → "diretos" (Acordo Ortográfico)
- GhostChart: adicionar animação fade-in suave ao abrir o modal
- Melhorar espaçamento dos benefits com ícone maior

### 6. ScoreGrid — label clicável
- Tornar o eyebrow "PONTUAÇÃO GLOBAL" mais descritivo com tooltip explicativo
- Adicionar divider hairline abaixo da legend para separar da secção seguinte

### 7. Layout geral do ReportOverviewBlock
- Adicionar dividers sutis entre zonas (A, B, C) para ritmo visual
- Zona TopPosts: adicionar eyebrow "MELHORES PUBLICAÇÕES" antes do componente

## Ficheiros a editar

- `src/components/report-redesign/v2/overview/score-card.tsx` — tinted bg, seta, mono subtitle
- `src/components/report-redesign/v2/overview/score-ring.tsx` — glow sutil
- `src/components/report-redesign/v2/overview/comparison-header.tsx` — ícone Users, pulse PRO
- `src/components/report-redesign/v2/report-overview-engagement.tsx` — tipografia hero, ícone tendência, source badge
- `src/components/report-redesign/v2/overview/competitor-modal.tsx` — ortografia, fade-in, spacing
- `src/components/report-redesign/v2/overview/score-grid.tsx` — divider, tooltip
- `src/components/report-redesign/v2/report-overview-block.tsx` — dividers entre zonas, eyebrow top posts
