
# Redesign do hero — homepage AuditProfiles

## Estado atual

`/` (src/routes/index.tsx) → `<HeroSection />` (light, centrado, single-column).
Composição atual:
- `HeroSection` (locked) — fundo `bg-surface-base` + `HeroAuroraBackground` light + headline e subtitle centrados (`BlurRevealText`) + `HeroActionBar` central com `HandwrittenNote`.
- A seguir: micro-proof strip ("CONTA GRATUITA / 2 RELATÓRIOS GRÁTIS / RGPD") e `SocialProofSection`, `HowItWorksSection`, `ProductPreviewSection` (todos light).
- Tokens em `src/styles/tokens.css` são LIGHT-only (Iconosquare). Não existe paleta dark.
- Dependências: nenhuma de motion/3D/aceternity. Animação atual é CSS pura via `BlurRevealText`.

## Decisão arquitectural (precisa de flag)

⚠️ Manter o hero DARK numa app light-first é uma decisão estilística forte mas tecnicamente isolável. Implementação: o hero passa a ser uma "ilha dark" scoped por classe (`.hero-dark`) com variáveis CSS locais — **não** mexe nos tokens globais nem no resto da página. O `<body>` continua light. Transição visual: a faixa micro-proof actual passa a fazer de "costura" entre a ilha dark e a página light.

⚠️ Os ficheiros `hero-section.tsx`, `hero-action-bar.tsx`, `hero-aurora-background.tsx` estão em `LOCKED_FILES.md`. Este prompt é a autorização explícita para os modificar (regra "explicitly asks for a modification in a new prompt"). Após o merge, devem ser **re-lockados** no `LOCKED_FILES.md` com nota da data.

## Proposta — estrutura

Layout split responsivo dentro do mesmo `<HeroSection />`:

```
desktop (≥lg, 1024+)         mobile (<lg)
┌─────────────┬─────────────┐   ┌───────────────┐
│ Eyebrow     │             │   │ Eyebrow       │
│ Headline    │ Report      │   │ Headline      │
│ Subheadline │ preview     │   │ Subheadline   │
│ Action bar  │ mockup      │   │ Action bar    │
│ Trust row   │ (glass)     │   │ Trust row     │
│             │             │   │ Compact mockup│
└─────────────┴─────────────┘   └───────────────┘
   60%            40%               100% stacked
```

Mobile: mockup empurrado **abaixo** do CTA, em versão compacta (mostra score card + 1 KPI row + chips locked, esconde sidebar e premium rows blurred).

## Componentes a criar / alterar

### Novos
- `src/components/landing/hero-report-preview.tsx` — mockup tablet/dashboard dark. Sub-blocos internos (sem ficheiros separados): header mini, chips temporais (1 activo + 4 locked com 🔒), score card "Índice do perfil 37/100" (label "Pré-visualização"), KPI row 3 cols, sidebar "Visão geral · 5 secções premium", 4 linhas premium blurred (`backdrop-blur` + overlay), legenda explicativa. Todos os valores marcados como preview (badge `PREVIEW · Dados ilustrativos`).
- `src/styles/hero-dark.css` — escopo `.hero-dark { --hero-bg, --hero-fg, --hero-fg-muted, --hero-border, --hero-accent, --hero-accent-soft, --hero-glass-bg, --hero-glass-border }`. Importado em `src/styles.css`.

### Alterar
- `src/components/landing/hero-section.tsx` — substitui layout centrado por split grid `lg:grid-cols-[1.1fr_0.9fr]`. Aplica `className="hero-dark"`. Headline + subtitle alinhados à esquerda em desktop, centrados em mobile.
- `src/components/landing/hero-aurora-background.tsx` — versão dark: gradient radial cyan/indigo subtil sobre `--hero-bg` (navy near-black). Sem glow agressivo, fine grain via SVG noise opcional.
- `src/components/landing/hero-action-bar.tsx` — variante dark: input/border/text consomem tokens `--hero-*` em vez de `surface-*`. Mantém validação, errors, onSubmit, todo o comportamento. **Sem alteração lógica.**
- `src/components/landing/handwritten-note.tsx` — remover do hero (já não cola com a nova composição split). Ficheiro permanece, mas `<HandwrittenNote />` deixa de ser renderizado.
- `src/routes/index.tsx` — faixa micro-proof actual: trocar background `from-surface-base to-surface-secondary` para gradiente de transição dark→light (`from-[var(--hero-bg)] to-surface-base`) para suavizar a costura. Resto da página intocado.

### NÃO mexer
- `src/components/landing/mockup-dashboard.tsx`, `mockup-metric-card.tsx`, `mockup-benchmark-gauge.tsx`, `product-preview-section.tsx` — continuam light e servem a secção "Preview do produto" mais abaixo.
- `src/components/landing/how-it-works-*`, `social-proof-section.tsx` — intocados.
- Tokens globais (`tokens.css`, `tokens-light.css`, `styles.css` @theme) — intocados.
- Onboarding, report, /analyze, admin, créditos, Apify, OpenAI, pricing, emails, plano premium — intocados.

## i18n — chaves a actualizar

### `src/i18n/locales/pt/landing.json`
```jsonc
"hero": {
  "eyebrow": "Benchmark de Instagram",  // novo
  "headline": "Analisa qualquer perfil de Instagram em segundos.",  // alterado
  "subtitle": "Benchmark, diagnóstico editorial e pistas claras para melhorar a presença digital.",  // alterado
  "trust": {
    "freeReports": "2 relatórios grátis",
    "publicData": "Só dados públicos",
    "freeAccount": "Conta gratuita"
  },
  "previewMock": {
    "header": "Pré-visualização do relatório",
    "sampleActive": "Últimas 12 publicações",
    "windowsLocked": ["30 dias", "60 dias", "90 dias", "365 dias"],
    "scoreLabel": "Índice do perfil",
    "scoreValue": "37/100",
    "scoreCaption": "Preview · Dados ilustrativos",
    "kpis": {
      "engagement": "Engagement",
      "frequency": "Posts/sem",
      "growth": "Crescimento"
    },
    "sidebar": "Visão geral grátis · 5 secções premium",
    "premiumRows": ["Diagnóstico editorial", "Conteúdo", "Procura", "Comparação"],
    "footnote": "O resumo gratuito mostra o essencial. O relatório completo aprofunda o diagnóstico."
  }
}
```
`actionBar.placeholder` muda para `"@perfil ou URL do Instagram"`.
`actionBar.submit` mantém-se `"Analisar"`.

Remover do faixa micro-proof actual ("CONTA GRATUITA / 2 RELATÓRIOS GRÁTIS / RGPD") — passa a estar dentro do hero como trust row. Faixa abaixo pode ser eliminada ou repurposed (sugestão: eliminar para evitar redundância).

### `src/i18n/locales/en/landing.json`
Espelho EN — destaque:
- `"headline": "Analyze any Instagram profile in seconds."`
- `"subtitle": "Benchmarks, editorial diagnosis and clear cues to improve your digital presence."`
- `"trust"`: `"2 free reports"`, `"Public data only"`, `"Free account"`
- `"previewMock.header": "Report preview"`, `"sampleActive": "Latest 12 posts"`, `"windowsLocked": ["30 days","60 days","90 days","365 days"]`, `"scoreLabel": "Profile index"`, `"scoreCaption": "Preview · Illustrative data"`, `"kpis": { engagement, Posts/wk, Growth }`, `"sidebar": "Free overview · 5 premium sections"`, `"premiumRows": ["Editorial diagnosis","Content","Reach","Comparison"]`, `"footnote": "The free summary shows the essentials. The full report goes deeper."`

## Estilo visual

- Fundo `--hero-bg: #060A18` (navy near-black) com radial gradient subtil `--accent-luminous @ 8%` no canto superior direito + grain SVG opcional `opacity-[0.03]`.
- Texto: headline `#FFFFFF`, subtitle `#C9D2E3` (contraste AA 8.3:1 sobre #060A18 ✓), trust items `#9AA8C2` (contraste 5.4:1 ✓), placeholder `#7E8CA8` em fundo input `rgba(255,255,255,0.04)` (contraste 4.6:1 ✓).
- Headline Fraunces medium (regra core: H1 = Fraunces). Subtitle/UI/números Inter (regra 2-font). **Sem JetBrains Mono.** Números KPI `tabular-nums`.
- Mockup: card glass `bg-white/[0.03] backdrop-blur-xl border border-white/10 rounded-2xl shadow-[0_30px_80px_-20px_rgba(0,0,0,0.6)]`. Chips locked: `border-white/8 text-white/40` + ícone `Lock` lucide 12px. Score card: highlight ring `ring-1 ring-cyan-400/20`. Premium rows blurred: `blur-[3px] select-none pointer-events-none` + overlay com micro-CTA.
- Sem fake brand logos, sem screenshots, sem dados que pareçam de cliente real (badge "Preview · Dados ilustrativos" no score card resolve a regra).
- CTA "Analisar": botão accent (consome `--hero-accent: #3772E5` ou cyan luminous). Já é o componente UI/button (locked) — variante via className.

## Acessibilidade

- Hero envolto em `<section aria-label="…">` mantido.
- Tap targets ≥44px no input/CTA mobile.
- Contraste AA validado nos 4 níveis de texto (números acima).
- `aria-hidden="true"` nas linhas premium blurred (não devem ser anunciadas como conteúdo real).
- Mockup é decorativo: wrapper com `role="img" aria-label="Pré-visualização ilustrativa do relatório"`.
- Sem `text-[10px]`. Mínimo 12px em conteúdo lido.

## Mobile (<lg)

- Stack vertical: eyebrow → headline → subtitle → input → CTA → trust row → mockup compacto.
- Input full-width acima do fold em 390×844.
- Mockup mobile mostra: header mini + chips horizontais scrollable (com fade-edge à direita para indicar overflow — resolve também a issue conhecida do "60 day…" clipado) + score card + KPI row 3 cols. Esconde sidebar e premium rows (`hidden lg:block`).
- Sem horizontal scroll na página.

## Dependências

**Nenhuma.** Tudo construído com Tailwind + tokens scoped + componentes já existentes. Sem Spline, sem three, sem motion, sem aceternity.

## Animação

Reutilizar `BlurRevealText` (já no projecto) para headline e subtitle. Mockup com fade-in CSS staggered (`animation-delay` em chips/score/KPIs) — sem libs. Premium rows com pulse muito subtil `animate-pulse opacity-50` opcional.

## Riscos

1. **Dark island** num design system light-first pode parecer inconsistente se a transição entre hero e resto da página não for fluida. Mitigação: faixa de transição com gradient + dois screenshots antes/depois antes de merge.
2. **Locked files** — necessária re-lock após merge com nota no `LOCKED_FILES.md`.
3. **Tokens scoped vs globais** — futuros engenheiros podem tentar consumir `--hero-*` fora do hero. Mitigação: comentário no topo do `hero-dark.css` a delimitar uso.
4. **Mockup pode parecer dados reais** — mitigado pelo badge "Preview · Dados ilustrativos" + valores deliberadamente neutros (37/100).
5. **Faixa micro-proof actual** fica redundante — proposta de eliminação. Se o utilizador preferir manter, pode ficar como "social proof bar" com outro conteúdo (logos de imprensa, etc.) — decisão pendente.

## Plano de implementação (sequência sugerida quando aprovado)

1. Criar `src/styles/hero-dark.css` + import em `src/styles.css`.
2. Criar `src/components/landing/hero-report-preview.tsx`.
3. Actualizar `hero-aurora-background.tsx` para variante dark scoped.
4. Actualizar `hero-action-bar.tsx` para consumir tokens `--hero-*` (mantém lógica intacta).
5. Reescrever `hero-section.tsx` com layout split + remoção do `HandwrittenNote`.
6. Actualizar `pt/landing.json` + `en/landing.json` com chaves novas.
7. Actualizar faixa micro-proof em `routes/index.tsx` (eliminar ou converter em transição).
8. Re-lock `LOCKED_FILES.md` com nota da data e do prompt de autorização.
9. QA mobile 360/390 + desktop 1440 + contrast audit.

Sem alterações de código até aprovação.
