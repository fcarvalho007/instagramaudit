Refactor surgical da sidebar do relatório (Variante C) + 3 ajustes de copy no modal premium. Sem tocar em geração, unlock, preços ou APIs externas.

---

## 1. Correção de dados (primeiro)

**Ficheiro**: `src/components/report-redesign/v2/report-block-nav.tsx` — função `buildSidebarItems`.

Hoje, em `public_mvp`, `features.blockPerformance === "lightweight"` torna **Desempenho** em estado `partial` → contado como acessível. Resultado errado: "3 acessíveis".

Fix **só na sidebar** (não tocamos em `report-variant.ts` para não afetar a renderização do corpo):

- Para `variant === "public_mvp"`: tratar **apenas** `overview` e `diagnostico` como `accessible` / grupo `incluido`. Todos os outros (`performance`, `conteudo`, `procura`, `benchmark`) → `locked` / grupo `premium`. O estado `partial` deixa de existir na sidebar.
- Para `internal_lab` / `pro_preview`: mantém-se a lógica atual (tudo acessível).

Resultado: contagem 2 acessíveis / 4 bloqueados.

---

## 2. Sidebar — Variante C (zonas + barra de progresso)

Reescrita do `SidebarList` (ramo `isPublic`) com componentes novos locais. Ramo não-público (lab / pro_preview) mantém-se mais simples (lista plana sem barra de progresso nem CTA).

### Estrutura (top → bottom)

1. **Header** — `ProfileHeader` existente (mantém-se inalterado).
2. **ProgressSummary** (novo, substitui `ProgressBar`)
   - Label: `t("nav.access.progress")` → PT "2 de 6 secções acessíveis" / EN "2 of 6 sections accessible".
   - Barra 6 segmentos `h-[5px]`, gap `gap-1`, `rounded-sm`:
     - seg 1: `bg-emerald-500` (free)
     - seg 2: `bg-blue-500` (included)
     - seg 3–6: `bg-border-default` (locked, neutro)
   - `aria-hidden` (resumo de estado, não interativo).
3. **Zone 1 — "Disponível agora"**
   - Label pequena `.text-eyebrow-sm text-content-tertiary`: `t("nav.access.available_now")`.
   - Row 01 Visão geral (`ItemRow` revisto):
     - Estado activo → `bg-surface-muted/70` + barra esquerda `bg-border-strong` (neutra, não azul).
     - Pill direita: PT "Grátis" / EN "Free" — `bg-emerald-50 text-emerald-700 ring-emerald-200`.
   - Row 02 Diagnóstico:
     - Pill direita: PT "Incluído" / EN "Included" com ícone `Gift` (lucide) prefixado — `bg-blue-50 text-blue-700 ring-blue-200`.
4. **Beta note** — um `<p>` muted, `text-xs leading-relaxed text-content-secondary mt-3`:
   - PT "O Diagnóstico está incluído nesta fase beta."
   - EN "Diagnosis is included during this beta phase."
   - Chave i18n: `nav.access.beta_note` (reescrita).
5. **Zone 2 — Premium block** (novo `PremiumBlockCard`, substitui o card antigo + grupo premium da lista)
   - Card: `rounded-lg border border-border-default bg-surface-muted/40 p-3`.
   - Header: linha com `Lock` icon + `Premium` + `ml-auto` count "4 por desbloquear" → `t("nav.access.premium_count", { count: 4 })`. Hairline divider por baixo (`border-b border-border-default/60 pb-2 mb-2`).
   - 4 linhas muted: só `numero` + `shortLabel`, `text-sm text-content-tertiary`, sem pill, sem cadeado per-row, sem botão. `aria-disabled`.
   - CTA full-width: `Button` inline-styled `bg-content-primary text-white hover:bg-content-primary/90`, com `ArrowRight` no final. Label: `t("nav.access.cta")` "Ver opções de acesso".
   - Microcopy abaixo, centrada, `text-[11px] text-content-tertiary`: `t("nav.access.trust")` "1 relatório ou pack de 5. Sem subscrição." (**remove-se** o `pending_note` da sidebar — vive só no modal).
   - CTA chama o mesmo `openDialog()` actual → abre `PremiumInterestDialog` existente.

### Remoções

- `GroupHeader` (toda a função) — já não há "Incluído" / "Premium" como cabeçalhos de grupo.
- `AccessSummaryCard` antigo — substituído pelo `PremiumBlockCard`.
- `ProgressBar` antigo — substituído por `ProgressSummary`.
- `AccessBadge === "launch"` e a chave `nav.access.badge_launch` — eliminadas. O badge passa a ser só `free` ou `included`.
- Tipo `Group` reduzido (mantemos `incluido` / `premium` só para particionar).
- Estado `partial` removido do tipo `AccessState` no caminho `public_mvp` (a função continua a ler features para `internal_lab`/`pro_preview`).

### `ItemRow` — ajustes mínimos

- Remover o ramo `isLocked` (deixa de ser usado em zona 1; locked passou para `PremiumBlockCard`).
- Barra activa esquerda: trocar `bg-blue-500` por `bg-border-strong` (token neutro). Texto activo: `text-content-primary font-semibold` (sem azul).
- A pill aceita `tone: "free" | "included"` com ícone opcional `Gift`.

### Variante não-pública (lab / pro_preview)

Mantém um fallback simples: header + lista plana com todos os items (sem barra de progresso, sem zonas, sem CTA premium). Reaproveita `ItemRow` com pill desactivada (sem badge). Comportamento já existente preservado.

### Mobile

`ReportBlockTopTabs` (bottom tabs) — apenas dois efeitos colaterais:
- `accessible` array passa a ter 2 items em vez de 3 → tabs mobile mostram só Visão geral + Diagnóstico (correcto).
- A drawer `Sheet` que abre o `SidebarList` herda automaticamente a nova UI.

Largura desktop continua `w-64 xl:w-72`. Drawer mobile usa toda a largura.

---

## 3. Modal premium — só copy

`src/components/report-redesign/v2/premium-interest-dialog.tsx` + chaves i18n. Sem mudanças de estrutura, valor, tracking, CTA.

- **Single (7€)**: substituir 2 bullets (`bullet_profile`, `bullet_unlock`) por **um único** bullet `bullet_combined`:
  - PT "1 perfil · todas as secções premium"
  - EN "1 profile · all premium sections"
  - `array bullets` no JSX passa de 2 → 1.
- **Single**: adicionar linha pequena por baixo do preço (`text-[11px] text-content-tertiary mt-0.5`): `t("premium.dialog.single.launch_price")` → "Preço de lançamento" / "Launch price". Renderizada via prop opcional `launchPriceLabel` no `PricingCard`.
- **Pack (28€)**: alterar valor de `bullet_reports` para "5 perfis" / "5 profiles". Mantém `bullet_unit` "5,60€/relatório" + `savings_badge` "Poupa 20%".
- `trust_note` ("Sem subscrição. Sem renovação automática.") fica intacto.

---

## 4. Mudanças i18n (`src/i18n/locales/{pt,en}/report.json`)

### `nav.access` (PT)
- adicionar `available_now`: "Disponível agora"
- adicionar `progress`: "{{accessible}} de {{total}} secções acessíveis"
- adicionar `badge_included`: "Incluído"
- adicionar `premium_count`: "{{count}} por desbloquear"
- reescrever `beta_note`: "O Diagnóstico está incluído nesta fase beta."
- **remover** `badge_launch`, `pending_note` (deixa de ser usado na sidebar; `premium.dialog.pending_note` mantém-se)

### `nav.access` (EN) — espelho
- `available_now`: "Available now"
- `progress`: "{{accessible}} of {{total}} sections accessible"
- `badge_included`: "Included"
- `premium_count`: "{{count}} locked"
- `beta_note`: "Diagnosis is included during this beta phase."

### `premium.dialog.single`
- adicionar `bullet_combined` (PT/EN como acima).
- adicionar `launch_price` (PT "Preço de lançamento" / EN "Launch price").
- chaves `bullet_profile` / `bullet_unlock` podem ficar (back-compat) mas deixam de ser usadas; sem risco. Limpar se trivial.

### `premium.dialog.pack`
- alterar valor de `bullet_reports` para "5 perfis" / "5 profiles".

---

## 5. Validação

- `bunx tsc --noEmit`
- `bunx vitest run`
- Smoke visual em `/reports/$snapshotId` (desktop + mobile drawer):
  - Barra topo: 2 segmentos preenchidos (verde + azul) + 4 neutros + label "2 de 6 secções acessíveis".
  - Zona 1: apenas blocos 01 + 02; 01 destacado a neutro; pills "Grátis" (verde) e "Incluído" (azul com ícone gift).
  - Beta note presente, pequeno, calmo.
  - Bloco Premium: card único com `Lock` + "Premium" + "4 por desbloquear", 4 linhas muted (03 Desempenho, 04 Conteúdo, 05 Procura, 06 Comparação), CTA inverted "Ver opções de acesso →", microcopy "1 relatório ou pack de 5. Sem subscrição."
  - Sem "Oferta de lançamento" em lado nenhum. Sem preços na sidebar.
  - CTA abre o `PremiumInterestDialog` (modal actual).
- Modal: bullet único no 7€, "Preço de lançamento" subtil, "5 perfis" no pack.
- PT/EN alinhados.

## Fora de scope

Geração de relatório, unlock logic, valores de preço, Apify, OpenAI, DataForSEO, cache, snapshots, `report-variant.ts`, body content do bloco Desempenho (continua a render lightweight no body — apenas a sidebar reflecte a verdade comercial). Sem novos modais nem rotas.
