
# Superfícies · Aumentar elevação cinematográfica dos cards (dark)

## Diagnóstico

Tokens actuais (`src/styles/tokens.css`):

| Token | RGB | Hex | Luminância | Δ vs anterior |
|---|---|---|---|---|
| `--surface-base` | 10 14 26 | `#0A0E1A` | 0.0045 | — |
| `--surface-secondary` | 17 24 39 | `#111827` | 0.0092 | +0.0047 |
| `--surface-elevated` | 30 41 59 | `#1E293B` | 0.0218 | +0.0126 |

Os dois primeiros saltos são pequenos: o card `surface-secondary` quase desaparece sobre `surface-base`, e o `surface-elevated` perde fôlego porque muitos cards no produto usam **`surface-secondary` directamente** (`rounded-xl bg-surface-secondary p-…`) em vez de passarem pelo `<Card>`. Bordas existem mas estão mal padronizadas — `border-border-subtle/50`, `border-border-subtle`, ou simplesmente sem border.

A variante `elevated` do componente `Card` (linha 18 de `src/components/ui/card.tsx`) **não tem border** — só sombra. Em ecrãs reais a sombra apenas não chega.

## Estratégia (combina as duas sugestões)

Ambas as sugestões — empurrar `surface-elevated` e padronizar borda hairline — resolvem partes diferentes do problema. Aplico-as juntas:

### 1) Reescala dos 3 níveis de superfície

| Token | Antes | Depois | Hex novo | Luminância nova |
|---|---|---|---|---|
| `--surface-base` | 10 14 26 | **inalterado** | `#0A0E1A` | 0.0045 |
| `--surface-secondary` | 17 24 39 | **20 28 46** | `#141C2E` | 0.0118 |
| `--surface-elevated` | 30 41 59 | **36 48 68** | `#243044` | 0.0291 |
| `--surface-overlay` | 30 41 59 | **42 56 80** | `#2A3850` | 0.0386 |

Saltos passam de **+0.0047 / +0.0126** para **+0.0073 / +0.0173 / +0.0095**. Ainda dentro de "dark editorial" (longe de cinzentos médios), mas com elevação perceptível e card legível mesmo sem sombra.

`surface-overlay` (popovers, modals, tooltips) ganha um quarto degrau para se distinguir de cards normais.

### 2) Borda hairline obrigatória em cards elevados

- Subir `--border-subtle` de alpha `0.08` → `0.10` (mantém o ar editorial mas tem mais presença).
- Adicionar borda à variante `elevated` do `Card` shadcn:

  ```ts
  elevated: "bg-surface-elevated border border-border-subtle shadow-lg",
  ```

- Padronizar cards artesanais que hoje usam `rounded-xl bg-surface-secondary p-X` **sem border** ou com `border-border-subtle/50`. Sweep nos componentes mais visíveis (não em todos os 100+):
  - `src/components/product/post-analysis-conversion-layer.tsx` (cards de planos free/pro/agency — Pro fica gold ilha como já decidido, free e agency ganham borda subtle)
  - `src/components/product/report-gate-modal.tsx` (cards "Compra pontual" e modal-base)
  - `src/components/admin/cockpit/parts/*` (stat-card, data-table, panels) — cockpit precisa especialmente da elevação
  - `src/components/landing/*` que usem `bg-surface-secondary` directo
  - Componentes do report (`report-redesign/v2/*`, `report-enriched/*`) que usem `bg-surface-secondary` em dark mode

  Em todos estes, garantir `border border-border-subtle` na raiz do card. Onde já existe `border-border-subtle/50` ou `/60`, deixar como está (overrides intencionais).

### 3) Light theme — não mexer

`tokens-light.css` já é Iconosquare-pure com `surface-secondary: #FFFFFF` puro sobre `#FAFBFD` e bordas hairline definidas — não tem o problema. O scope é **apenas dark mode**.

### 4) Sombras — micro-tweak

`--shadow-md` actual é `0 4px 6px -1px rgb(0 0 0 / 0.3) ...`. Com surfaces mais claras, as sombras pretas puras ficam mais visíveis e acentuam a elevação. Não é necessário tocar — verificar visualmente; se for preciso reduzo a opacidade em 0.05 num passo seguinte.

## Não está no âmbito

- Light theme (`tokens-light.css`)
- Mexer em `--surface-base` (continua o "preto editorial" da brand)
- Fazer sweep dos 100+ ficheiros com `bg-surface-secondary` — só os de produto/cockpit/landing/report onde o problema é visível
- Repintar cards `Card` que já consomem o componente shadcn — esses ganham automaticamente a nova surface
- Tema light do `/report` (já é mono-azul claro)

## Validação

- [ ] `bunx tsc --noEmit` passa
- [ ] `bunx vitest run` passa (51/51)
- [ ] Inspeção visual em landing dark, `/admin`, `/analyze/$username`, `/report` (modo dark fora de `/report/example`):
  - cards `surface-secondary` legíveis sobre `surface-base` sem precisar piscar
  - cards `surface-elevated` claramente acima dos `surface-secondary`
  - hairline visível em todos os cards do produto/cockpit
- [ ] Modal `report-gate-modal` em estado paywall — separação clara entre fundo do modal e os 2 cards de plano

## Atualizar memória

- `mem://design/tokens` → novos valores das surfaces e regra "todo card elevado tem border-subtle".
- `mem://index.md` Core → uma linha curta com a regra hairline.
