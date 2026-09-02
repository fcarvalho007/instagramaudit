# Editorial V2 — fundação de apresentação (sem migrar secções)

Objectivo: criar a base isolada do novo desenho editorial e um interruptor seguro de apresentação. O relatório actual continua a ser o predefinido; Editorial V2 só aparece com `?report_design=editorial_v2`. Nenhuma secção é migrada nesta fase.

## Confirmações prévias

- Fraunces e Inter já estão no sistema de fontes do projecto (`--font-display` / `--font-sans` em `src/styles.css`). Não é preciso novo carregador de fontes.
- O relatório público monta `ReportShellV2` em `src/routes/analyze.$username.tsx` (ficheiro LOCKED) numa única posição; `validateSearch` já existe e é o sítio natural para o novo parâmetro.
- Números de exibição ("01", "02") são apenas rótulos — confirmado no Prompt 0.

## O que vai ser criado

Pasta única `src/components/report-editorial-v2/`:

```text
src/components/report-editorial-v2/
  editorial-v2-shell.tsx        // recebe as MESMAS props do ReportShellV2
  primitives/
    report-band.tsx
    section-intro.tsx
    status-pill.tsx
    observation-block.tsx
    reading-block.tsx
    metric-display.tsx
  section-metadata.ts           // ordem/rótulos só de apresentação
  README.md                     // regra Observação vs Leitura
src/styles/editorial-v2.css     // tokens com escopo em .editorial-v2
```

Nesta fase a shell renderiza apenas a estrutura editorial vazia (bandas, intro de secção, primitivos em contexto mínimo) a partir dos dados de produção já recebidos — sem gráficos e sem secções migradas.

### Tokens

CSS com escopo `.editorial-v2` em `src/styles/editorial-v2.css`, importado apenas pela shell V2. Nada é adicionado aos tokens globais nem se cria um segundo sistema de estilos: variáveis CSS + Tailwind via `var(...)`, como no resto do projecto.

- Superfícies: página desktop `#F7F9FC`, página mobile `#EFF3F8`, cartão `#FFFFFF`
- Texto: `#0B1524` / `#44566E` / `#7B8DA4` / `#A9B7C7`
- Fios: `#E6EBF2`, `#D2DCE7`
- Acento: `#0E6BB8`, `#3A96D9`, `#A3CDEB`, `#EAF3FB`
- Sinais: perigo `#C0403A`/`#FBEDEC`/`#F0CFCD`; aviso `#9C6B0C`/`#FBF3E1`/`#EDDCB6`; sucesso `#1C7350`/`#E5F2EC`/`#C4E0D2`
- Espaçamento: 8/16/24/32/48/64/96/120; grelha desktop 1440px, 40px de gutter, 12 colunas, 32px de gap, contexto 1–4, dados 6–12, `min-width:0` nos filhos; mobile 375px em fluxo único com 18px laterais

### Primitivos

- `ReportBand` — banda full-bleed com ritmo vertical ~96px e separador de 1px.
- `SectionIntro` — número (rótulo), título display, subtítulo.
- `StatusPill` — estado com ícone/texto além da cor.
- `ObservationBlock` — API `{ statements: string[] }`, apenas factos suportados por dados.
- `ReadingBlock` — API `{ hypothesis: string; confidence?: 'baixa'|'média'|'alta' }`, rotulado LEITURA, linguagem cautelosa.
- `MetricDisplay` — valor com `tabular-nums`, rótulo e nota opcional.

As duas APIs são estruturalmente diferentes (`statements` vs `hypothesis`), pelo que não podem ser trocadas por acidente.

### Interruptor de variante

Alteração mínima em `src/routes/analyze.$username.tsx` (LOCKED — pedido explícito nesta ronda, só apresentação):

1. `report_design?: "editorial_v2"` em `AnalyzeSearch` e em `validateSearch`.
2. No local onde hoje se renderiza `<ReportShellV2 ... />`, escolher entre essa shell e `<EditorialV2Shell ... />` com exactamente as mesmas props.

Sem novos fetches, selectores, métricas, verificações de entitlement ou eventos de analytics. Se o valor for outro, cai no relatório actual.

### Acessibilidade

Hierarquia semântica de headings, foco visível, contraste AA, `prefers-reduced-motion` a desligar as revelações, e nenhum significado transmitido só por cor.

## Testes

- `?report_design` ausente ou inválido → renderiza o relatório actual.
- `?report_design=editorial_v2` → renderiza a camada Editorial V2.
- As props de dados/gating passadas às duas shells são idênticas.
- Testes unitários dos primitivos (rótulo LEITURA, `StatusPill` não depende só da cor).

## Fora de âmbito

Migrar secções, gráficos, navegação, toggle no Report Lab, PDF, gates Free/Pro, `internal_lab`, pagamentos, créditos, checkout e analytics.

## Risco principal

O único ficheiro de produção tocado é a rota LOCKED `analyze.$username.tsx`. A alteração é um `if` de apresentação mais um campo opcional de search; se preferires, posso em alternativa colocar o interruptor dentro de um wrapper novo importado pela rota, reduzindo ainda mais o diff.
