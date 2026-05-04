
## Objetivo

Elevar a primeira dobra (hero + banner concorrentes) do report mobile para nível Apple — limpo, centrado, tipografia generosa, hierarquia clara.

## Problemas atuais (vistos no screenshot)

- Hero com layout lado-a-lado (avatar + texto) fica apertado em mobile
- Stats em `font-mono` parecem frios e técnicos
- Bio truncada a 2 linhas, texto pequeno (13px)
- Botões PDF/Partilhar desconectados da identidade
- Badge "Dados públicos" sozinho e sem contexto
- Espaçamento geral apertado, sem respiração Apple

## Solução — Hero mobile centrado, desktop lado-a-lado

### 1. Hero (`report-hero-v2.tsx`)

**Mobile (< md)** — layout centrado tipo perfil Apple/IG:
- Avatar maior (`size-20` / 80px) centrado no topo
- Handle centrado, `text-[1.75rem]` com tracking apertado
- Nome em `text-base` abaixo, texto centrado
- Bio até 3 linhas, `text-[15px]`, centrada
- Stats em row de 3 colunas centradas, valores `font-display text-[1.5rem]` (não mono), labels eyebrow
- Meta da análise numa linha subtil com separadores
- Botões PDF + Partilhar em row centrada, com `h-10` e `px-5` (thumb-friendly)
- Badge "Dados públicos" integrado na meta line

**Desktop (>= md)** — mantém layout actual com ajustes de escala:
- Avatar `size-24` (96px)
- Stats com valores `text-[2rem]` em `font-display`
- Mais padding vertical

### 2. Tipografia dos tokens (`report-tokens.ts`)

- `h1HeroV2Compact`: mobile `text-[1.75rem]` (era 1.5rem)
- `h2Section`: mobile `text-[1.625rem]` → md `text-[2rem]`
- `subtitle`: `text-[15px]` → md `text-base` (era `text-sm`)
- `heroStatValue`: `font-display text-[1.5rem]` (era `text-base` mono)
- `kpiHelp`: `text-[13px]` (era `text-xs`)

### 3. Banner concorrentes (`comparison-header.tsx`)

- Padding ligeiramente maior: `py-5 md:py-6`
- Título `text-[15px] md:text-base`
- Subtítulo `text-[13px] md:text-sm`

### 4. Espaçamento no shell (`report-shell-v2.tsx`)

- Gap entre hero e banner: `pt-4` (era `pt-5`) — mais justo para sentir como uma unidade

## Ficheiros a editar

| Ficheiro | Alteração |
|---|---|
| `report-hero-v2.tsx` | Layout centrado mobile, avatar maior, stats em font-display, botões maiores |
| `report-tokens.ts` | Escala tipográfica aumentada (h1, h2, subtitle, stats, kpiHelp) |
| `comparison-header.tsx` | Tipografia e padding ligeiramente maiores |
| `report-shell-v2.tsx` | Ajuste de espaçamento entre hero e banner |

## Notas técnicas

- Nenhum ficheiro locked é tocado
- Avatar mantém story ring gradient existente
- A lógica de `buildProfileStats` e `buildAnalysisMeta` não muda
- Layout desktop permanece side-by-side, apenas com escala maior
