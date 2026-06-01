
## Refinamento do card "Melhores e piores publicações"

Mock-up perfeitamente alinhado com o ADN editorial Iconosquare/Ocean Breeze do projeto. A direção é forte e única — implemento como direção principal, e mantenho **dois variants opcionais do scatter** disponíveis por feature-flag para decidirmos depois.

## Estrutura do novo card (top → bottom)

```text
┌────────────────────────────────────────────────────────┐
│ H2 "Melhores e piores publicações"                     │
│ Eyebrow "O contraste editorial dos últimos 30 dias"    │
├────────────────────────────────────────────────────────┤
│ HERO COMPARATIVO                                       │
│  ↗ MELHOR PUB.   ●  4×  ●   PIOR PUB. ↘               │
│   0,15 %        DIFERENÇA       0,04 %                 │
│   19 mai · car.                 21 mai · reel longo    │
├────────────────────────────────────────────────────────┤
│ SCATTER TEMPORAL — "Distribuição das 38 publicações"  │
│   ··· · · ●Melhor · ·· ·· · · · ·· · · ·  (38 dots)   │
│   ·· ·· ·············· ····························   │
│   ·· · · · · · · · ·● Pior · · · · · · · · · · · ·   │
│   1 mai ────────── 15 mai ────────── 30 mai            │
│   Linha tracejada na média (0,08 %)                    │
├────────────────────────────────────────────────────────┤
│ ✦ REVEAL PREMIUM                                       │
│ "Vês os 2 extremos. As outras 36 publicações — onde   │
│  estão os padrões — desbloqueiam-se no premium."      │
│                                  [ Ver análise → ]     │
├────────────────────────────────────────────────────────┤
│ CARDS DETALHADOS (2 col)                              │
│ ┌─ ↗ MELHOR ──┐    ┌─ ↘ PIOR ─────┐                  │
│ │ [CARROSSEL] │    │ [REEL]       │                  │
│ │ 0,15% +87%  │    │ 0,04% −50%   │                  │
│ │ caption…    │    │ caption…     │                  │
│ │ ♥15  💬0    │    │ ♥3  💬0      │                  │
│ └─────────────┘    └──────────────┘                  │
├────────────────────────────────────────────────────────┤
│ ✦ DIAGNÓSTICO COMPARATIVO (insight callout)           │
│  Prescritivo: "Testar mais carrosséis e fechar com    │
│  pergunta para puxar comentários."                    │
└────────────────────────────────────────────────────────┘
```

## Decisões de design (alinhadas ao memory do projeto)

- **Tokens Ocean Breeze**: melhor = `accent-primary` (#0077B6 ocean); pior = `signal-warning` (amber #BA7517) ou um novo `signal-danger`-friendly em vez de laranja saturado. Confirmar com tokens existentes.
- **Tipografia**: H2 Fraunces; números 0,15% / 0,04% em Inter SemiBold tabular-nums; eyebrows em `.text-eyebrow-sm` (Inter uppercase). Zero JetBrains Mono.
- **Medalha "4× DIFERENÇA"**: círculo `surface-muted` com border-default; "4×" Inter Bold tabular-nums; "DIFERENÇA" eyebrow-sm.
- **Chips direcionais**: setas `ArrowUpRight` / `ArrowDownRight` (lucide) em vez das atuais TrendingUp/Down — mais editoriais.
- **Chip "+87% vs média"**: `bg-accent-primary/10` + `text-accent-primary` para o melhor; `bg-signal-warning/10` + `text-signal-warning` para o pior. Sentence case "vs média", sem uppercase.
- **Thumbnails substituídos por gradiente + ícone do formato em grande**: `bg-gradient-to-br from-accent-primary/10 to-accent-primary/5` + ícone `GalleryHorizontalEnd` (carrossel) / `Play` (reel) / `Image` (imagem) na cor do formato. Mantém o `<img>` real (proxy `/api/public/ig-thumb`) por cima quando disponível; o gradiente é o fallback quando o URL expira.

## Scatter temporal — implementação

Componente novo `<ConstellationScatter>`, SVG puro (sem libs novas):

- **Dados**: `enriched.topPosts` (tem TODOS os posts da janela, não só top — já confirmado em `snapshot-to-report-data.ts:1361`). Cada ponto tem `date`, `engagementPct`, `format`.
- **Eixo X**: datas linearmente espaçadas; ticks "1 mai · 15 mai · 30 mai" (3 marcas, Inter 12px, `text-content-tertiary`).
- **Eixo Y**: % de engagement; ticks mínimos `worst · média · best` (3 marcas à esquerda, Inter 12px tabular-nums).
- **Linha tracejada da média**: `stroke-dasharray="3 3"`, cor `border-default`, com label "média 0,08%" alinhado à direita.
- **Pontos "não-extremos" (36)**: `<circle r="3" fill="rgba(3,4,94,0.22)">` — visíveis mas sem peso.
- **Melhor**: `<circle r="6" fill="var(--accent-primary)" />` + aura `<circle r="10" fill="var(--accent-primary)" opacity="0.18" />` + pill "Melhor · 0,15%" acima.
- **Pior**: igual com `signal-warning`, pill "Pior · 0,04%" abaixo.
- **Hover**: nos 36 pontos cinza, tooltip mostra só "premium" (chip lock) — reforça o teaser.
- **Acessibilidade**: `role="img"` + `aria-label` descritivo; lista oculta `<ul class="sr-only">` com data+%.

**Variants opcionais a escolher depois** (mantenho a versão sóbria por default):
- (a) **Blur progressivo**: pontos não-extremos em `filter: blur(0.6px)` que aumenta para `blur(2px)` nas extremidades horizontais — efeito "neblina".
- (b) **Glass overlay com cadeado**: `<rect>` semi-transparente sobre os 36 pontos + ícone `Lock` central; melhor/pior ficam de fora do glass.

Já fica preparado o componente para receber `variant: "sober" | "fog" | "glass"`; defaulto a `"sober"`. Quando quiseres testar (a) ou (b), trocas a prop.

## Cálculo da média & chips "+X% vs média"

```ts
const allPosts = enriched.topPosts;
const avgEng = allPosts.reduce((s, p) => s + p.engagementPct, 0) / allPosts.length;
const bestDelta = ((bestEng - avgEng) / avgEng) * 100;  // +87
const worstDelta = ((worstEng - avgEng) / avgEng) * 100; // -50
```

Formatado com `formatNumber(..., { maximumFractionDigits: 0 })` + sinal explícito (`+87% vs média` / `−50% vs média`).

## Reveal premium integrado

Bloco entre scatter e cards detalhados, NÃO um botão isolado:
- `<div>` com `bg-accent-primary/[0.06]` + border-l `accent-primary` (2px)
- Ícone ✦ (`Sparkles`) em `accent-primary`
- Copy: **"Vês os 2 extremos. As outras {{count}} publicações — onde estão os padrões — desbloqueiam-se no premium."** (parametrizado por `count = total - 2`)
- CTA primário Ocean (`bg-accent-primary text-white`) "Ver análise completa →" — reutiliza o handler de premium-interest já existente (`PremiumInterestDialog`).

## Diagnóstico comparativo (callout final)

Substitui o atual `<AiReading>` por um `<InsightCallout tone="ai">` com:
- Headline em Inter SemiBold: padrão emergente (ex.: *"Carrosséis sobre IA são o que mais move o envolvimento."*)
- Body prescritivo: *"O pior resultado vem de um reel longo sem gancho inicial. Testar mais carrosséis e fechar sempre com uma pergunta para puxar comentários."*

Mantenho o AI fallback determinístico que já existe (linha 60-83 de `report-post-comparison.tsx`), mas reescrevo as templates de copy para serem prescritivas em vez de descritivas. Quando há `aiInsightText` real do GPT-5.4-mini, usa-o; caso contrário, fallback.

## Ficheiros tocados

- `src/components/report-redesign/v2/report-post-comparison.tsx` — refactor completo, com sub-componentes: `<ComparativeHero>`, `<ConstellationScatter>`, `<PremiumReveal>`, `<DetailedPostCard>` (substitui `<PostCard>`), `<DiagnosticCallout>`.
- `src/i18n/locales/pt/report.json` + `en/report.json` — novas chaves: `posts.eyebrow_subtitle`, `posts.hero.best_label`, `posts.hero.worst_label`, `posts.hero.diff_label`, `posts.scatter.title`, `posts.scatter.avg_label`, `posts.scatter.best_pill`, `posts.scatter.worst_pill`, `posts.scatter.axis_*`, `posts.premium.body`, `posts.premium.cta`, `posts.vs_avg.positive`, `posts.vs_avg.negative`, `posts.diagnostic.*` (prescritivos).
- Re-escrever copy do `ai_fallback.*` (mesmo ficheiro) em modo prescritivo.

## Validação

- `bunx tsc --noEmit`
- Preview 1460×905 (desktop) e 411×742 (mobile) — verificar:
  - Hero comparativo simétrico, números legíveis a 16/24px;
  - Scatter renderiza com 38 pontos (mock + real), ticks 1/15/30, linha média visível;
  - Reveal premium clicável e abre o `PremiumInterestDialog`;
  - Cards detalhados com gradiente quando thumb expira;
  - Diagnóstico com tone editorial.
- Inspeccionar com diferentes amostras: 5 posts, 12 posts, 38 posts — o scatter degrada bem em volumes baixos.

## Fora de escopo

- Outros blocos (Frequência, Formato, Identidade, etc.)
- `/report.example`, sidebar, hero do topo, lead-magnet, admin
- Backend / prompts do GPT (aiInsightText continua a vir do pipeline existente)
- Implementação dos variants (a) blur e (b) glass — código preparado mas inactivo até decisão
- Dark mode
- Alterar a fonte de dados — usa `enriched.topPosts` que já contém todos os posts ordenados por engagement (logo cobre a janela toda)

## Decisão a tomar antes de implementar

A versão sóbria do scatter (default) é a mais legível e honra o ADN Iconosquare clean. Os variants (a) e (b) são mais cinematográficos e poderiam fazer mais sentido **no card de comparação com concorrentes** (onde ainda não estamos), conforme indicaste no briefing. Sugestão: ficar na versão sóbria aqui e guardar (a)/(b) para o módulo de comparação. **Confirmas?**

---

## ☐ Checkpoint

- [ ] Hero comparativo simétrico (0,15% · 4× DIFERENÇA · 0,04%)
- [ ] `<ConstellationScatter>` SVG com 38 pontos, média tracejada, extremos com aura
- [ ] Cálculo de `+87% vs média` / `−50% vs média` e chips correspondentes
- [ ] `<PremiumReveal>` integrado entre scatter e cards, reutiliza `PremiumInterestDialog`
- [ ] Cards detalhados com gradiente + ícone do formato como fallback
- [ ] Diagnóstico reescrito em modo prescritivo (i18n pt + en)
- [ ] Sem `slate-*`, sem JetBrains Mono, tokens Ocean Breeze respeitados
- [ ] `bunx tsc --noEmit` passa
- [ ] Screenshots desktop + mobile confirmam
