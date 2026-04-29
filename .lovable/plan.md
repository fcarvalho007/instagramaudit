# Conclusão do Prompt R1 — Iconosquare puro

## Estado da auditoria

A maioria do R1 já está implementada e validada por inspeção:

- ✅ `LOCKED_FILES.md` regista o unlock dos componentes do report
- ✅ `tokens-light.css` contém o sistema completo de tokens `--insight-*` + paleta Iconosquare
- ✅ `ai-insight-box.tsx` e `sparkline.tsx` criados
- ✅ `ai-insights-mock.ts` com as 9 mensagens em pt-PT
- ✅ 9 `AIInsightBox` injetadas em `report-page.tsx` nos pontos certos
- ✅ Sparklines aplicadas nos KPIs hero (`report-key-metrics.tsx` + `report-kpi-card.tsx`)
- ✅ Gauge horizontal refeito em `report-benchmark-gauge.tsx`
- ✅ Estilo de cartão unificado (bg-surface-secondary + border-border-default + rounded-2xl + shadow-card) em todos os blocos
- ✅ Fraunces (`font-display`) reduzido a uma única ocorrência: o H1 do `report-header.tsx`
- ✅ Zero `italic` nos componentes do report

## Lacunas a fechar

### 1. Hex hardcoded em `report-temporal-chart.tsx`

Restaram 8 literais a violar a regra "never hardcode colors" e a decisão "Color tokens: Add semantic tokens to tokens-light.css and consume them" que foi aprovada para o R1:

```text
linha 24-26:  series cores "#3B82F6", "#06B6D4", "#6366F1"
linha 88-89:  gradient stops "#3B82F6"
linha 98-99:  gradient stops "#06B6D4"
linha 129/141/153: stroke das linhas
```

**Correção:**

- Adicionar a `tokens.css` (dark) e `tokens-light.css` três tokens semânticos para o gráfico temporal:
  - `--chart-likes`, `--chart-comments`, `--chart-views`
  - Em dark: mantêm os valores atuais (azul/cyan/indigo)
  - Em light: todos colapsam para `--accent-primary` (37 99 217) e variações de luminosidade, alinhado com a decisão "Single editorial blue. Anything decorative was demoted to the same blue"
- Em `report-temporal-chart.tsx` substituir literais por leitura via CSS variable:
  ```ts
  const seriesColor = (token: string) => `rgb(var(--chart-${token}))`;
  ```
  e usar `seriesColor("likes")` no `series`, nos `<stop>` dos `<linearGradient>` e no `stroke` dos `<Line>`.
- Atalho equivalente para `stopOpacity` mantém-se inline (não é cor).

Resultado: zero hex no diretório `src/components/report/`. A regra "never hardcode colors" passa a ser respeitada por todo o report.

### 2. Persistir memória de design dos novos tokens

O resumo anterior indica explicitamente: *"I tried to persist a design memory describing the new --report-* / --insight-* system but the bash heredoc isn't the right channel for mem://. Worth saving in a follow-up so future prompts don't reintroduce hardcoded hex."*

**Acção:**

- Criar `mem://design/report-light-tokens` com:
  - frontmatter `type: design`
  - descrição do sistema `--insight-{default|positive|negative|neutral}-{bg|border|icon|text}`, surfaces (`--surface-base/secondary/muted`), accent único `--accent-primary`, sombras suaves, `--chart-{likes|comments|views}`
  - regra: report em modo light usa exclusivamente estes tokens; nunca reintroduzir hex literais nos componentes do report
- Atualizar `mem://index.md`, secção **Memories**, com a nova entrada (preservando integralmente as restantes linhas — `code--write` substitui o ficheiro inteiro)
- Atualizar a linha Core "Design tokens em src/styles/tokens.css" para mencionar também `tokens-light.css` como fonte canónica do report

## Detalhes técnicos

**Ficheiros a editar:**

```text
src/styles/tokens.css                          (+ 3 vars dark)
src/styles/tokens-light.css                    (+ 3 vars light)
src/components/report/report-temporal-chart.tsx (substituir 8 hex)
mem://design/report-light-tokens               (novo)
mem://index.md                                 (entrada nova)
```

**Validação:**

- `bunx tsc --noEmit` passa
- `rg "#[0-9A-Fa-f]{6}" src/components/report/` devolve zero resultados
- Inspeção visual em `/report/example` mantém o mesmo aspeto (os tokens light apontam para a mesma paleta editorial azul)
- Componentes locked não são tocados (apenas `tokens.css` é locked — adicionar variáveis novas a um ficheiro locked é uma alteração que requer permissão; ver checkpoint)

## ☐ Checkpoint

- [ ] `tokens.css` está em LOCKED_FILES — adicionar 3 variáveis novas requer confirmação. **Confirma que posso adicionar `--chart-likes`, `--chart-comments`, `--chart-views` ao bloco existente, sem alterar o resto?**
- [ ] Adicionar as mesmas 3 vars em `tokens-light.css` (não locked)
- [ ] Refatorar `report-temporal-chart.tsx` para consumir as vars
- [ ] Criar `mem://design/report-light-tokens`
- [ ] Atualizar `mem://index.md` preservando todas as linhas existentes
- [ ] `bunx tsc --noEmit` verde
- [ ] `rg "#[0-9A-Fa-f]{6}" src/components/report/` devolve vazio
