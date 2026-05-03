
# Primeira dobra refinada + menu sticky de fundo em mobile

## Problema

1. A primeira dobra (hero + tabs) no mobile ocupa demasiado espaço vertical e não está bem organizada.
2. A navegação horizontal de tabs no topo é pouco confortável em mobile — o padrão mais eficaz para 6 items é uma **bottom navigation bar fixa** (thumb zone, à la Instagram/apps nativos).

## Alterações

### 1. Hero v2 mais compacto em mobile (`report-hero-v2.tsx`)

- Reduzir padding vertical mobile de `pt-5 pb-5` para `pt-4 pb-4`.
- Avatar ligeiramente mais pequeno em mobile (de 68px para 56px).
- Bio reduzida a `line-clamp-2` (já está 3).
- Stats (publicações/seguidores/a seguir): font-size reduzido de `1.5rem` para `1.25rem` em mobile para ser mais compacto.
- CTAs (Exportar PDF + Partilhar) movidos para dentro de uma linha compacta abaixo dos stats, em vez de coluna separada no mobile.
- Analysis meta (publicações analisadas, dias, data) mantém-se mas mais compacto.

### 2. Bottom nav bar sticky em mobile (`report-block-nav.tsx`)

- `ReportBlockTopTabs` transforma-se numa **barra fixa no fundo** (`fixed bottom-0`) em vez de sticky no topo.
- Layout: 6 ícones + label curto em grelha `grid-cols-6`, estilo bottom tab bar.
- Adicionar ícones Lucide a cada bloco (Eye, Stethoscope, TrendingUp, FileText, Search, BarChart3) — definidos em `block-config.ts`.
- Active state: ícone + label em azul, fundo claro.
- Inactive: ícone cinza, label cinza.
- Safe area padding inferior (`pb-[env(safe-area-inset-bottom)]`).
- Altura: ~60px + safe area.
- Remover a versão horizontal scrollável do topo.
- Adicionar `pb-20` ao body/main do report em mobile para não tapar conteúdo com a barra.

### 3. Sidebar desktop — inalterada

A `ReportBlockSidebar` mantém-se exactamente como está para `lg:` e acima.

### 4. `block-config.ts` — adicionar ícones

Adicionar um campo `icon` a cada `BlockConfig` com o nome do ícone Lucide correspondente. O componente de nav importa e renderiza.

## Ficheiros editados

1. `src/components/report-redesign/v2/block-config.ts` — campo `icon`
2. `src/components/report-redesign/v2/report-block-nav.tsx` — bottom bar mobile
3. `src/components/report-redesign/v2/report-hero-v2.tsx` — hero mais compacto
4. `src/components/report-redesign/v2/report-shell-v2.tsx` — padding inferior mobile
5. `src/components/report-redesign/report-tokens.ts` — ajuste de tokens hero compacto se necessário

## Restrições respeitadas

- Sem alterações ao backend, adapter, admin, tokens globais, base de dados.
- Sem alterações a outros blocos do report.
- Desktop sidebar inalterada.
