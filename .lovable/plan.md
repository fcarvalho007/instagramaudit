# Hero "Prism editorial" — implementação

Reescrita do `src/components/report-redesign/v2/report-hero-v2.tsx` para a direção aprovada.

## Layout final

```
┌──────────────────────────────────────────────────────────────────────────┐
│                                                              ╱ prisma ╲   │
│  [AVATAR]   @handle ✓                                       (decoração)  │
│   112px     Nome completo                                                │
│             ─────────────────────────────                  [ Novo relat.]│
│             10K seguidores · 2,6K publicações ·            [ Comparar  ]│
│             12 posts em 11 dias                            [ PDF │ Part]│
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

## Alterações em `report-hero-v2.tsx`

### Removido
- `PlatformPill` "Instagram" e `StatusPill` "Ativo"
- Bloco `CacheStatusBadge` (header e footer) + chip "X posts em Y dias" duplicado
- Grid 2×2 de KPIs (engagement, seguidores, delta, publicações)
- Footer com "Facebook · TikTok · YouTube · Em breve" e datas
- `buildProfileStats` (helper já não usado)

### Mantido / adaptado
- `Avatar` aumentado para `size-20 md:size-28` (80→112px), borda mais subtil `border border-border-default/60 p-1`
- `VerifiedBadge` posicionada sobreposta ao avatar (bottom-right) em vez de inline ao lado do handle
- `@handle` em Fraunces 2xl/3xl mantém-se; nome completo abaixo em Inter 14px

### Adicionado
- **Linha métrica única** (`Metric` inline component):
  `<followers> seguidores · <postsCount> publicações · <postsAnalyzed> posts em <windowDays> dias`
  Números em Inter SemiBold `tabular-nums`, separadores `·` em `text-content-tertiary`. Texto principal `text-[15px]`.
- **Stack de ações** (direita no desktop, full-width empilhado no mobile):
  1. `Novo relatório` — botão primário sólido preto (`bg-content-primary text-white`), full-width na coluna, h-10
  2. `Comparar com concorrente` + badge `PRO` — botão outline full-width que abre `<CompetitorModal>` via `useState`
  3. Par `PDF` │ `Partilhar` — dois botões secundários lado a lado com `surface-muted/80 backdrop-blur`, h-9
- **Decoração "Prism glass"** atrás da coluna de ações (desktop ≥ lg):
  Container `absolute inset-0 -z-10 pointer-events-none` com 2-3 formas SVG/divs:
  - prisma triangular `bg-gradient-to-br from-accent-primary/15 to-accent-violet/10 rotate-12 blur-2xl`
  - círculo `bg-accent-luminous/10 blur-3xl`
  - retângulo `bg-white/40 backdrop-blur-xl border border-white/60 rotate-[-8deg]`
  Tudo confinado ao card (overflow-hidden mantém-se).

### Estado interno
- `const [compareOpen, setCompareOpen] = useState(false)` + render condicional do `<CompetitorModal>`

## Tipografia (consistente com bloco 1)
- `@handle`: `font-display text-[2rem] lg:text-[2.5rem] font-semibold tracking-tight`
- Nome: `text-sm font-medium text-content-secondary`
- Linha métrica: `text-[15px] text-content-secondary` com números `font-semibold text-content-primary tabular-nums`
- Botões: `text-sm font-semibold`

## Responsivo
- ≥ lg: 2 colunas (identidade flex-1 | stack ações w-[280px])
- < lg: stack vertical; ações full-width abaixo da identidade; decoração de prismas oculta

## Ficheiros tocados
- `src/components/report-redesign/v2/report-hero-v2.tsx` — reescrita do componente
- Nenhuma alteração noutros ficheiros; `ReportPageActions` e `CompetitorModal` já existem

## Critério de aceitação
- Sem Instagram pill, sem "Ativo", sem "Em breve", sem datas de atualização
- Avatar 112px com check verde sobreposto quando verificado
- Linha métrica única com `seguidores · publicações · X posts em Y dias`
- 4 ações na ordem: Novo relatório (preto) → Comparar (PRO, abre modal) → PDF + Partilhar
- Decoração de prismas visível apenas ≥ lg, sem afetar clique
- Build passa
