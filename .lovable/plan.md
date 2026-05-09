## Estado actual vs. spec

A sidebar variant-aware já existe em `src/components/report-redesign/v2/report-block-nav.tsx`, ligada por `report-shell-v2.tsx`, com `public_mvp` a usar `blockPerformance: "lightweight"` e 04–06 `hidden`. O body já não renderiza 04–06 em público e 03 mostra teaser parcial.

Faltam **acabamentos visuais** para alinhar com a referência (premium, comercial, editorial). Esta plano é puramente UI/typografia/acabamento — sem mudanças funcionais nem em providers, scoring ou body.

## Deltas a implementar

### 1. `src/components/report-block-nav.tsx`

**Header**
- `@username` em **Fraunces** SemiBold (`font-display`) em vez de Inter, mantendo `text-content-primary`. Pequeno (text-base) para não competir com hero.
- Manter avatar circular azul + fallback inicial (já feito).
- Continuar sem data, tier, LIVE/AUDITORIA — esses badges vivem só no hero.

**Numeração das secções**
- `01`, `02`, … em **Fraunces italic** (`font-display italic`) com `tabular-nums`, em substituição do estilo mono atual. Tamanho `text-xs` para não dominar o label.

**Group headers**
- `INCLUÍDO`: bullet `•` (caractere literal) verde + label uppercase Inter, contador à direita. Manter cor emerald.
- `PREMIUM`: glifo `✦` (caractere literal) âmbar + label uppercase Inter, contador à direita.
- Tudo em Inter, sem ícones Lucide para os labels — combina melhor com a referência.

**Premium tinted area**
- Envolver os itens locked num bloco com fundo amber muito subtil (`bg-signal-warning/[0.04]`), borda `border-signal-warning/15`, padding interno `p-2 rounded-xl`. Cria a "warm amber tinted area" pedida.
- Locked items: nome em **Fraunces italic** âmbar suave (`text-accent-gold/90`), cadeado pequeno âmbar (`text-accent-gold`), sem hover azul. Hover apenas eleva levemente o fundo (`hover:bg-signal-warning/10`) e mostra cursor `cursor-pointer` (continua a fazer scroll para o cofre).

**Active item**
- Continuar com `bg-blue-50` + barra azul à esquerda + ponto azul à direita. Já está bem; ajustar apenas para que o número Fraunces italic fique `text-blue-600` quando activo.

**Partial badge `3/5`**
- Manter pill amber pequena (`bg-signal-warning/15 text-accent-gold`, `tabular-nums`).

**Progress bar — 6 segmentos**
- Substituir as duas barras proporcionais por **6 cells fixas** (uma por bloco), cada uma `flex-1 h-1.5 rounded-sm`:
  - accessible → `bg-emerald-500`
  - partial → `bg-signal-warning`
  - locked → `bg-signal-warning/25`
- Legendas mantêm-se: esquerda "3 acessíveis" (emerald), direita "3 por desbloquear" (amber). Inter `text-[11px]`.

**Cofre card — premium dark**
- Fundo `bg-content-primary` mas com glow radial subtil sobreposto:
  - `relative overflow-hidden`
  - duas `<div>` absolutas com `bg-[radial-gradient(...)]`:
    - âmbar quente no canto inferior-direito (`rgba(186,117,23,0.18)` → transparente)
    - índigo/violeta no canto superior-esquerdo (`rgba(118,100,228,0.18)` → transparente)
  - Conteúdo em `relative z-10`.
- Título com `✦` antes de "Abrir o cofre" (Inter SemiBold, branco).
- Grid de preços mantém-se. Pequenos ajustes:
  - "UMA VEZ" card: `bg-white/5` + `ring-white/10` (mais discreto que `bg-white/10`).
  - "BUNDLE 5" card âmbar: manter destaque amber, adicionar `shadow-[0_8px_24px_-12px_rgba(186,117,23,0.5)]`.
  - Badge "★ POUPA €2" em pill âmbar escuro sobre topo do card destacado (já está, manter).
- CTA "DESBLOQUEAR →" branco sobre escuro (já está).

### 2. Layout dos grupos no `SidebarList`

- Inserir wrapper `<section>` com a tinted area apenas à volta do grupo Premium, mantendo Incluído sem tint.
- Espaçamento vertical entre grupos `space-y-3` (era `mt-3`).

### 3. Mobile drawer

- O mesmo `SidebarList` é usado, logo herda automaticamente a nova tinted area, progress bar segmentada e cofre. Verificar apenas que o drawer continua scrollável (`max-h-[88vh] overflow-y-auto` já existe).

### 4. Anti-regressão

- Nenhuma alteração em `report-variant.ts`, `block-config.ts`, `report-shell-v2.tsx`, `use-active-block.ts`.
- `internal_lab` e `pro_preview` continuam sem grupo Premium (ramo `buildSidebarItems` já trata) → sem cofre, sem tinted area.

## Comportamento por variant (recap)

| Variant | Header | 01 | 02 | 03 | 04 | 05 | 06 | Premium tint | Progress | Cofre | Badge topo |
|---|---|---|---|---|---|---|---|---|---|---|---|
| `public_mvp` | avatar + `@username` (Fraunces) | ✓ | ✓ | parcial 3/5 | 🔒 | 🔒 | 🔒 | sim, âmbar subtil | 6 cells (3 verde + 1 âmbar + 2 âmbar claro) | sim, dark com glow âmbar+indigo | — |
| `internal_lab` | avatar + `@username` | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | — | — | — | "Laboratório interno" |
| `pro_preview` | avatar + `@username` | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | — | — | — | "Pro ativo" |

## Tipografia (rules)

- `@username`: `font-display` (Fraunces) SemiBold
- Números das secções: `font-display italic` tabular-nums
- Nomes de secções locked: `font-display italic` âmbar
- Tudo o resto (labels, contadores, badges, preços, CTA): Inter
- Sem `font-mono`, sem `slate-*`, sem hardcode de cores fora dos tokens (`signal-warning`, `accent-gold`, `content-primary`, `surface-muted`, `border-default`, `blue-*` já permitidos)

## Validação

- Build automático do harness corre `tsc` em cada edit (não corro manualmente).
- `bunx vitest run` → executar no fim para confirmar que nenhum teste partiu (sidebar não tem testes dedicados; mas há testes em `src/lib/report/*` que validam variant features — não são tocados).
- Smoke manual via preview:
  - `/analyze/frederico.m.carvalho` (default `public_mvp`) → ver Incluído (3 itens, 03 com `3/5`), Premium tint com 04–06 trancados, progress bar 6 cells, cofre dark com glow.
  - `?variant=internal_lab` → 6 itens acessíveis, sem cofre, badge "Laboratório interno".
  - `?variant=pro_preview` → idem com badge "Pro ativo".
- Body em `public_mvp`: confirmar que 04, 05, 06 não renderizam (já tratado pelas guardas `features.blockX !== "hidden"`).

## Constraints respeitadas

- UI/tipografia apenas. Sem chamadas a Apify/OpenAI/DataForSEO. Sem mudanças em Supabase, PDF, scoring ou normalização. CTA "Desbloquear" continua placeholder (sem checkout).

## Checkpoint final

☐ `@username` em Fraunces SemiBold no header da sidebar.
☐ Números das secções em Fraunces italic.
☐ Group labels com `•` verde / `✦` âmbar.
☐ Grupo Premium dentro de área âmbar subtil.
☐ Locked items em Fraunces italic âmbar com cadeado âmbar.
☐ Progress bar com 6 cells (verde / âmbar / âmbar claro).
☐ Cofre dark com glow âmbar + indigo radial subtil.
☐ Mobile drawer mostra a mesma estrutura sem overflow.
☐ `internal_lab` e `pro_preview` continuam limpos, sem Premium nem cofre.
☐ Sem mudanças funcionais, sem providers, sem PDF.