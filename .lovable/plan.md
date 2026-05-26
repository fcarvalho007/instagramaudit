## Revisão mobile do relatório `/analyze/$username`

Inspeção feita em viewport 390 × 844 (iPhone 12/13). Encontrei três famílias de problemas que cruzam várias secções do relatório.

### 1. Hashtags cortadas (P03 — `hashtag-diagnostics-card.tsx`)

A linha de cada hashtag (`FrequencyRow`) soma larguras fixas que não cabem em 350 px úteis:

```
rank 36 + gap 12 + tag min 120 + gap 12 + barra flex + gap 12 + usos 56 + gap 12 + posts 64 ≈ 324 px + barra
```

A barra fica comprimida ou a coluna "posts" sai fora da carta, dando a sensação de "cortada". Vou:

- Reestruturar `FrequencyRow` em mobile para 2 linhas (linha 1: rank + tag + barra; linha 2: usos · share alinhados à direita), mantendo o layout 1 linha a partir de `sm`.
- Reduzir `min-w-[120px]` da tag em mobile (`min-w-0`) e deixar `truncate` fazer o trabalho.
- Garantir `overflow-hidden` no card e nenhum elemento com largura fixa que ultrapasse o pai.

### 2. Letra demasiado pequena (< 12 px) em zonas que não são "micro-labels"

A regra do projeto é mínimo `text-xs` (12 px), com `< 12 px` reservado a eixos de gráficos. Foram detetados vários `text-[9px]` / `text-[10px]` em texto de leitura:

| Ficheiro | Linha | Uso atual |
|---|---|---|
| `report-post-comparison.tsx` | 174, 187, 194, 232, 407, 413, 417 | chips VS, métricas, timestamps a 9–10 px |
| `report-comment-intelligence.tsx` | 127, 425, 487, 510 | citações e labels a 11 px |
| `report-block-nav.tsx` | 84, 92, 200, 284, 310, 342 | badges, captions a 10–11 px |
| `overview/comparison-header.tsx` | 53, 119 | badge gold + iniciais a 10–11 px |
| `overview/competitor-modal.tsx` | 98 | label a 9 px + cor `text-slate-400` (token errado) |
| `overview/format-card.tsx` | 680, 717 | tags a 11 px |
| `report-diagnostic-group.tsx` | 28, 35 | numeração + meta a 10–11 px |
| `premium-interest-dialog.tsx` | 251 | preço a 11 px |

Plano: subir tudo para `text-xs` (12 px) ou `text-[11px]` apenas se for badge decorativo com `uppercase tracking-wide`. Trocar `text-slate-400` por `text-content-tertiary` em `competitor-modal.tsx`.

### 3. Conteúdo encavalitado em mobile

- **`report-post-comparison.tsx`** (linha 171, 192): blocos VS "best/worst" com `min-w-[60px]` lado a lado mais setas/avatares — em 390 px ficam sobrepostos. Empilhar verticalmente em < `sm`.
- **`report-engagement-benchmark-chart.tsx`** (linha 163, 238, 259, 282): label + número à direita com `min-w-[60px]` + `min-w-[64px]` + barra → em mobile a barra fica < 30 % do espaço e o número colide com o label. Reduzir `min-w` em mobile e permitir wrap do label.
- **`report-hero-v2.tsx`** (linha 118): botão com `whitespace-nowrap` + `h-12 px-4` que estoura quando o handle é longo. Permitir `text-overflow` no handle (já existe `truncate` na zona de identidade, validar no botão).
- **`hashtag-diagnostics-card.tsx`** — após a correção do ponto 1 — garantir que o `InsightCallout` final mantém padding interno em `px-5` (já ok).

### 4. Mudanças que NÃO faço

- Não tocar nos tokens de design nem em `__root.tsx`.
- Não mexer em conteúdo gated/paywall (`ReportLockGate`) nem em lógica de tracking.
- Não alterar copy nem traduções.
- Não tocar nos ficheiros listados em `LOCKED_FILES.md` sem pedir confirmação.

### Ficheiros a editar

```
src/components/report-redesign/v2/hashtag-diagnostics-card.tsx
src/components/report-redesign/v2/report-post-comparison.tsx
src/components/report-redesign/v2/report-comment-intelligence.tsx
src/components/report-redesign/v2/report-block-nav.tsx
src/components/report-redesign/v2/report-engagement-benchmark-chart.tsx
src/components/report-redesign/v2/report-diagnostic-group.tsx
src/components/report-redesign/v2/premium-interest-dialog.tsx
src/components/report-redesign/v2/overview/comparison-header.tsx
src/components/report-redesign/v2/overview/competitor-modal.tsx
src/components/report-redesign/v2/overview/format-card.tsx
```

### Validação

- Verificação visual em 390 × 844, 360 × 800 e 414 × 896 com screenshot do bloco de hashtags e do bloco de comparação de posts.
- Confirmar que nenhuma linha estoura horizontalmente (`overflow-x-clip` no shell já evita scroll, mas o conteúdo não pode ser "cortado").
- `bunx tsc --noEmit` para garantir que nenhuma refatoração quebra tipos.

### Checkpoint

- [ ] FrequencyRow das hashtags reestruturada (2 linhas em mobile, 1 em `sm+`).
- [ ] Todos os `text-[9px]`/`text-[10px]` de leitura subiram para `text-xs` (≥ 12 px).
- [ ] `text-slate-400` substituído por token semântico.
- [ ] Linha VS de `report-post-comparison` empilha em mobile.
- [ ] Barras do `engagement-benchmark-chart` legíveis em 390 px sem colisão.
- [ ] Screenshots de verificação no fim.
