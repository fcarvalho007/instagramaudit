

## Plano — Sprint 1, Prompt 1.10: Página de relatório completa em modo claro

### Entendimento

**Auditoria atual:**
- Header e Footer **já usam tokens semânticos** (`bg-surface-base`, `bg-surface-secondary`, `text-content-*`, `border-border-*`). Zero valores hardcoded — basta o switch de tokens fazer flip automático.
- Recharts **já instalado** (`^2.15.4`), sem nova dependência.
- App-shell é simples (Header + main + Footer) — não precisa de alteração estrutural. O `ReportThemeWrapper` faz o trabalho via `data-theme="light"` no `<body>`.
- Tokens em `tokens.css` definem `:root` — basta adicionar override `[data-theme="light"]` num ficheiro novo. O `@theme inline` resolve as variáveis em runtime, então o flip é automático.

**Sistema visual dual confirmado:** landing fica dark (sem `data-theme`); `/report/example` aplica `data-theme="light"` via wrapper, restaurado no unmount. Isolamento total por route.

### Decisões-chave

1. **Token override sem tocar em `tokens.css`** — novo ficheiro `tokens-light.css` com seletor `[data-theme="light"]` redefine apenas variáveis de cor (surfaces, accents, signals, text, borders, shadows). Tipografia, espaçamentos, radii mantêm-se.

2. **Tokens novos exclusivos do light** — `--tint-*` (backgrounds para circular icon containers Iconosquare-style) e `--accent-tertiary` (cyan). Adicionados ao `@theme inline` em `styles.css` como `--color-tint-*`, `--color-accent-tertiary`, `--color-accent-secondary`. Ficam disponíveis em ambos os modos mas só fazem sentido visual no light.

3. **Body noise overlay desativado em light** — adiciono `body[data-theme="light"]::before { display: none; }` em `tokens-light.css`. A textura de ruído ficaria visualmente ruidosa no light.

4. **Header/Footer audit** — confirmado que estão limpos. Não precisam de edição. Removo da lista de ficheiros tocados (poupa risco em locked files). Apenas se a verificação revelar algo durante implementação, alinho via tokens.

5. **Mock data realista mas determinístico** — séries temporais e heatmap geradas com padrões reconhecíveis (picos quartas/sextas, weekend tarde) em vez de aleatório. Resultado consistente entre renders.

6. **Recharts custom tooltip** — componente partilhado `report-chart-tooltip.tsx` reutilizado entre temporal-chart e best-days. Card branco, border subtle, valores mono.

7. **Heatmap sem Recharts** — grid CSS simples (7×24 divs), mais leve e mais fiel ao Iconosquare. Color scale via classes condicionais.

8. **Word cloud do top-keywords** — opto pelo formato lista com barras horizontais (consistente com hashtags ao lado, cleaner que cloud tipográfico). Mantém ritmo da página.

9. **Tier badge "PERFIL" na linha do próprio perfil** em competitors — substitui possíveis confusões.

### Ficheiros a criar (16 novos)

| Ficheiro | Propósito |
|---|---|
| `src/styles/tokens-light.css` | Override de tokens em `[data-theme="light"]` |
| `src/components/report/report-theme-wrapper.tsx` | Mount/unmount `data-theme="light"` no body |
| `src/components/report/report-mock-data.ts` | Dataset único e consistente |
| `src/components/report/report-page.tsx` | Orquestrador — empilha 12 secções |
| `src/components/report/report-section.tsx` | Wrapper label + título + subtítulo + slot |
| `src/components/report/report-header.tsx` | Top bar perfil + ações |
| `src/components/report/report-kpi-card.tsx` | Atomic card Iconosquare-style |
| `src/components/report/report-key-metrics.tsx` | Grid 4 KPI cards |
| `src/components/report/report-temporal-chart.tsx` | AreaChart 3 séries 30 dias (centrepiece) |
| `src/components/report/report-chart-tooltip.tsx` | Tooltip partilhado para Recharts |
| `src/components/report/report-benchmark-gauge.tsx` | Gauge horizontal vs benchmark |
| `src/components/report/report-format-breakdown.tsx` | 3 cards (Reels/Carousels/Imagens) |
| `src/components/report/report-competitors.tsx` | Tabela 3 linhas com barras |
| `src/components/report/report-top-posts.tsx` | Grid 5 cards com thumbnails gradient |
| `src/components/report/report-posting-heatmap.tsx` | Grid 7×24 + 3 best slots |
| `src/components/report/report-best-days.tsx` | BarChart Recharts |
| `src/components/report/report-hashtags-keywords.tsx` | 2 colunas lado a lado |
| `src/components/report/report-ai-insights.tsx` | Card grande com 3 insights numerados |
| `src/components/report/report-footer.tsx` | Linha de fecho |
| `src/routes/report.example.tsx` | Route file-based + meta noindex |

### Ficheiros editados

| Ficheiro | Edição | Locked? |
|---|---|---|
| `src/styles.css` | `@import "./styles/tokens-light.css";` + adicionar `--color-tint-*`, `--color-accent-secondary`, `--color-accent-tertiary`, `--color-shadow-card` ao `@theme inline` | ⚠️ Secção `@theme inline` está locked — adicionar novos tokens é extensão, não alteração. **Pedido permissão explícita abaixo.** |
| `LOCKED_FILES.md` + `mem://constraints/locked-files` | Adicionar nova secção "Report Components (Sprint 1, Prompt 1.10)" com os 19 novos ficheiros | Não |

### Locked files — impacto

- **`src/styles.css`**: precisa de **2 novas linhas no topo** (import) + **adições à `@theme inline`** (novos tokens, sem mexer nos existentes). Pedido sancionado pelo prompt apenas para Header/Footer/AppShell, **não para `styles.css`**. Solução proposta: limitar edição estritamente a (a) adicionar uma linha de import depois do `tokens.css` import, (b) acrescentar 8-10 novas variáveis no fim do bloco `@theme inline`. Sem rescrever nada existente.
- **`src/components/layout/header.tsx`** e **`footer.tsx`**: auditoria mostra que **já estão 100% baseados em tokens semânticos** — não precisam de edição. Reporto isto no checklist final em vez de fazer edição cosmética.
- **`src/components/layout/app-shell.tsx`**: idem, sem alteração necessária.

### Schema / dependências

- Sem alterações DB
- Sem novas npm dependencies

### Validação dos guardrails

| Guardrail | Estado |
|---|---|
| Locked files intactos exceto extensão controlada de `styles.css` | ⚠️ pedir confirmação |
| Header/Footer audit confirmado limpos | ✅ |
| Recharts já instalado | ✅ |
| Theme isolation via mount/unmount | ✅ |
| Landing dark intacta | ✅ |
| Copy pt-PT pós-1990, impessoal | ✅ |
| Sem placeholders, sem lorem | ✅ |
| Mock data único e consistente | ✅ |
| Mobile responsive (375px+) | ✅ |
| `noindex, nofollow` na meta | ✅ |

### Checkpoints

- ☐ `tokens-light.css` criado com override completo + noise disable
- ☐ `styles.css` extendido com import + novos tokens (tints, accent-secondary/tertiary, shadow-card) — **requer confirmação**
- ☐ `ReportThemeWrapper` aplica/remove `data-theme` no body
- ☐ Header/Footer **verificados sem edição** (já em tokens semânticos)
- ☐ Mock data centralizado em `report-mock-data.ts`
- ☐ Route `/report/example` com meta noindex
- ☐ 12 secções renderizadas em ordem (header, key metrics, temporal, benchmark, formats, competitors, top posts, heatmap, best days, hashtags+keywords, AI insights, footer)
- ☐ Temporal chart com 3 séries suaves + área + tooltip custom + chips toggle
- ☐ Heatmap 7×24 com 5 níveis de azul + 3 best slots
- ☐ Best days BarChart com bar líder destacada
- ☐ Cards: bg-surface-secondary, border subtle, rounded-xl, shadow-card
- ☐ Mobile: cards stack 1-col, charts responsive
- ☐ Landing (`/`) confirma intacta em dark
- ☐ `LOCKED_FILES.md` + `mem://constraints/locked-files` atualizados

### Pergunta bloqueante antes de implementar

`src/styles.css` está em `LOCKED_FILES.md` e o prompt **não concede permissão explícita** para o editar (só Header, Footer, AppShell). Mas a integração do tokens-light **exige**:
1. Uma linha `@import "./styles/tokens-light.css";` (sem isto o ficheiro de tokens não é carregado)
2. Adicionar `--color-tint-*`, `--color-accent-secondary`, `--color-accent-tertiary`, `--color-shadow-card` ao `@theme inline` (sem isto as classes `bg-tint-primary`, `bg-accent-tertiary` etc. não existem em Tailwind)

**Sem permissão para editar `styles.css`, esta tarefa não pode ser executada como especificada.** Alternativa puramente cosmética seria escrever todas as cores via `style={{ background: 'rgb(var(--tint-primary))' }}` inline — mas isto viola a regra "nunca hardcode colors fora do token system" e fica inconsistente com o resto do projeto.

**Pedido**: confirmar permissão para edição cirúrgica de `src/styles.css` (apenas adicionar import + novos tokens, sem alterar existentes), OU autorizar o uso de inline styles com CSS vars como fallback.

