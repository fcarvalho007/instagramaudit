
## Ficheiro

`src/components/report-redesign/v2/report-hero-v2.tsx` — único ficheiro.

---

## Estrutura actual vs. pretendida

Atualmente o hero tem 2 rows (profile + KPI strip). O pedido é voltar a 3 colunas mas com whitespace como separador em vez de dividers rígidos.

## Layout desktop (lg+)

```text
┌─────────────────────────────────────────────────────────────────────────┐
│                                                                         │
│  [avatar]  @handle ✓              1.234        0,45%      -62%    [PDF] │
│            Nome completo          seguidores   engagement  bench  [Share]│
│            [Instagram] [Ativo]                                    [Novo] │
│            Bio do perfil...       156 publicações                       │
│            📅 7 mai · 12 posts                                          │
│                                                                         │
├─────────────────────────────────────────────────────────────────────────┤
│  👥 Comparar Pro · Facebook · TikTok · YouTube Em breve                 │
└─────────────────────────────────────────────────────────────────────────┘
```

Três zonas visuais numa única row, separadas por whitespace generoso (`gap-8 lg:gap-12`), sem linhas verticais.

## Alterações detalhadas

### 1. Layout principal — volta a 3-col, sem dividers

- Remover a row-1 / row-2 split (`border-b border-border-default/50`)
- Estrutura: `flex flex-col lg:flex-row lg:items-start` com `gap-6 lg:gap-10`
- Padding generoso: `px-7 py-7 sm:px-8 sm:py-8 lg:px-10 lg:py-9`
- Sem `divide-x`, sem `w-px` dividers

### 2. Coluna esquerda — Profile (flex-1, min-w-0)

- Manter: avatar, handle (Fraunces), verified, fullName, badges, bio, metadata
- Aumentar gap avatar→texto: `gap-5`
- Bio: `max-w-lg`, `line-clamp-2`, `mt-3`
- Metadata: `mt-3`
- Largura mínima natural, `flex-1` para ocupar espaço disponível

### 3. Coluna central — KPIs (shrink-0)

- Layout: `grid grid-cols-2 gap-x-8 gap-y-5` — 4 KPIs num grid 2×2
- Engagement rate: `text-[2rem] lg:text-[2.5rem]` — visivelmente maior que os outros
- Followers, publicações, delta: `text-xl lg:text-2xl`
- Engagement aparece primeiro (top-left do grid 2×2) para ser o anchor visual
- Ordem: Engagement → Seguidores → Delta benchmark → Publicações
- Sem dividers entre KPIs

### 4. Coluna direita — Actions (shrink-0, w-auto)

- `flex flex-col items-end gap-2` — stack vertical alinhado à direita
- Botões: `h-8`, `text-xs`, compactos
- PDF: primary (accent), Share: ghost border, Novo: ghost sem borda
- `hidden lg:flex` — esconder em tablet/mobile
- Largura natural dos botões, sem `w-[180px]` fixo

### 5. Mobile (< lg)

- Profile empilha normalmente (flex-col)
- KPIs: `grid grid-cols-2 gap-4` abaixo do profile, com `mt-5`
- Actions: `flex gap-2 mt-4` horizontal, visíveis
- Sem overflow horizontal

### 6. Footer

- Manter como está (já refinado)

---

## Riscos

Mínimo — CSS/layout puro.
