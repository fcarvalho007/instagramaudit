
## Ficheiro

`src/components/report-redesign/v2/report-hero-v2.tsx` — único ficheiro.

Zero alterações a dados, lógica, providers ou PDF pipeline.

---

## Alterações

### 1. Outer card — mais espaçoso e premium

- Padding externo: `px-5 md:px-6 pt-4 pb-3` → `px-5 md:px-6 pt-5 pb-4`
- Layout principal: remover `md:divide-x md:divide-border-default` (elimina divisórias verticais rígidas)
- Substituir o 3-col flat por um layout 2-row no desktop:
  - **Row 1**: Profile identity (full width, mais espaçoso)
  - **Row 2**: KPI strip (full width) + Actions compactas à direita

### 2. Profile area — Row 1, mais respiração

- Padding interno: `px-5 py-5 sm:px-6 sm:py-5` → `px-6 py-6 sm:px-7 sm:py-7`
- Avatar: manter `size-14 md:size-[72px]` — bom tamanho
- Gap avatar→texto: `gap-4` → `gap-5`
- Handle (h1): manter `font-display` (Fraunces), `text-xl sm:text-2xl`
- Mover badges (Instagram + Ativo) para uma linha com mais `mt-1.5` de respiro
- Bio: `mt-2.5` → `mt-3`, `max-w-md` → `max-w-lg` para melhor leitura
- Metadata (data + posts): `mt-3` → `mt-3.5`
- Adicionar separador subtil (`border-b border-border-default/50`) no fundo do Row 1

### 3. KPI strip — Row 2, limpo e equilibrado

- Remover os `w-px h-10 bg-border-default` dividers
- Substituir por `gap-6 lg:gap-8` entre KPIs (espaço em vez de linhas)
- Manter todos os 4 KPIs: Seguidores, Taxa de Engagement (principal), Delta benchmark, Publicações
- Remover o label "Principal" acima do engagement — em vez disso, fazer o valor de engagement ligeiramente maior: `text-[2.25rem]` vs `text-2xl` nos outros
- Remover o `midTierLabel` pill dentro do KPI strip (informação duplicada com o card de engagement abaixo)
- KPIs: alinhar à esquerda com `justify-start` em vez de `justify-center`
- Padding: `py-5` → `py-4 sm:py-5` para não ser tão alto

### 4. Action area — compacta e secundária

- Mover de coluna vertical de 180px para uma row horizontal compacta alinhada à direita do KPI strip
- Remover "Configurar" do contexto público — envolver com check `actions.onConfigure` (se existir)
- Botões: inline `h-8` em vez de `h-9`, `text-xs` em vez de `text-[13px]`
- "Novo relatório": mover para ghost button sem borda, apenas icon + text
- Layout: `flex items-center gap-2` horizontal

### 5. Footer — manter mas refinar

- Manter "Comparar com concorrentes Pro" + "Facebook · TikTok · YouTube Em breve"
- Reduzir padding: `py-2.5` → `py-2`
- Border: `border-border-default` → `border-border-default/50` (mais subtil)

### 6. Mobile

- Profile area empilha naturalmente (já flex-col)
- KPIs: grid 2x2 em mobile em vez de wrap confuso
- Actions: row horizontal abaixo dos KPIs com scroll se necessário

---

## Estrutura resultante (desktop)

```text
┌──────────────────────────────────────────────────────────────┐
│  [avatar]  @handle ✓                                        │
│            Nome completo                                     │
│            [Instagram] [Ativo]                               │
│            Bio do perfil aqui...                             │
│            📅 7 mai 2026 · 12 posts em 90 dias              │
├──────────────────────────────────────────────────────────────┤
│  1.234      0,45%          -62%         156    [PDF] [Share] │
│  seguidores engagement    abaixo bench  posts                │
└──────────────────────────────────────────────────────────────┘
│  👥 Comparar Pro · Facebook · TikTok · YouTube Em breve      │
└──────────────────────────────────────────────────────────────┘
```

## Riscos

Baixo — layout/CSS only. O botão "Configurar" pode desaparecer do público se não tiver handler, mas isso é o comportamento desejado.
