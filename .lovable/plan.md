# Phase 1B.1 — Redesign visual do Bloco 01 · Overview

Objetivo: elevar drasticamente a primeira impressão do relatório, mantendo dados, providers, PDF, Supabase, OpenAI, `/report/example` e admin intactos. Foco no Bloco 01: hero + posicionamento + KPI grid + insight principal.

## Restrição importante

`report-hero.tsx` e `report-kpi-grid.tsx` estão em `LOCKED_FILES.md` (secção "Report Redesign — stable foundation"). Não vão ser modificados. Em vez disso vou criar wrappers v2 paralelos e o `ReportShellV2` passa a usar essas versões. Os locked originais ficam disponíveis para rollback e continuam a ser usados pelo `ReportShell` v1.

## Escopo do que muda

Apenas o que é renderizado **antes do bloco 02** no `ReportShellV2`:
1. Hero
2. Banner de posicionamento
3. Cabeçalho do Bloco 01
4. KPI grid
5. Insight "hero" (Leitura IA)

Tudo o resto (blocos 02–06, métodos, tier teaser, share, etc.) fica intocado.

## Direção visual

Editorial premium SaaS analytics, dark-on-light, mais respiração e mais hierarquia:

- **Hero**: full-bleed com banda gradiente azul mais sofisticada (radial duplo + grain sutil via mask), tipografia maior em desktop (até 3.25rem), avatar 80–96px com ring duplo (branco + azul-100), handle como h1 serif, nome em sans medium, bio em parágrafo cinzento. CTAs: primário azul cheio com leve sombra azul, secundário "Partilhar" como ghost com borda fina. Linha de meta (publicações · janela · data) reposicionada por baixo, mono pequeno, separada por dots discretos. Badges de cobertura agrupados num cluster mais coerente.
- **Posicionamento**: fundo branco contínuo com o KPI grid (sem border-y duplo), passa a ser uma única "stage" do overview com micro-eyebrow "O que vais ver" e três chips alinhados.
- **Cabeçalho Bloco 01**: passa a ter um número grande "01" decorativo serif em outline azul-100 à esquerda da pergunta, dando sensação editorial de revista.
- **KPI grid**: 5 cards maiores, com mais respiração (p-6 md:p-7), número em display ~2.5rem, label mono em cima do número (ordem invertida vs. atual), micro-helper por baixo, ícone num quadrado arredondado azul claro com gradient suave em vez de círculo. Card de "Estado do benchmark" passa a ser visualmente distinto (fundo blue-50/40, ring blue-200) com chip dentro e linha "última verificação" se disponível. Hover eleva ligeiramente (-translate-y-0.5 + sombra).
- **Insight hero**: passa a ter um "frame editorial" próprio — eyebrow "Leitura principal" e o `AIInsightBox` envolvido num container com max-width 3xl, alinhado à esquerda como pull-quote, em vez de cair solto após o grid.

## Ficheiros a criar

```text
src/components/report-redesign/v2/report-hero-v2.tsx
src/components/report-redesign/v2/report-kpi-grid-v2.tsx
src/components/report-redesign/v2/report-overview-block.tsx   # compõe header decorativo + grid + insight
```

`report-hero-v2.tsx` e `report-kpi-grid-v2.tsx` são cópias evoluídas dos locked originais. Mesma API (props), mesmas dependências de tokens. Nada de novos design tokens globais — apenas combinações dentro dos componentes ou pequenas adições não-conflituosas em `report-tokens.ts` (constantes novas, sem alterar as existentes).

## Ficheiros a editar

```text
src/components/report-redesign/v2/report-shell-v2.tsx
  - troca import de ReportHero → ReportHeroV2
  - remove ReportPositioningBanner standalone (passa a viver dentro do overview block) OU mantém mas em banda branca contígua (decisão final no edit)
  - substitui `<ReportExecutiveSummary result={result} />` + `renderInsight("hero")` no bloco 01
    por `<ReportOverviewBlock result={result} renderInsight={renderInsight} />`

src/components/report-redesign/report-tokens.ts
  - adicionar (sem remover/alterar existentes):
      heroBandV2, kpiCardV2, kpiIconBoxV2, h1HeroV2, kpiValueV2, blockNumberDecor, insightFrameV2
```

`report-tokens.ts` não é locked, e só adiciono novas chaves — `bandWhite`, `cardKpi`, `h1Hero` etc. permanecem para v1.

## Ficheiros que NÃO mudam (garantido)

- `report-hero.tsx` (locked) — continua a servir `ReportShell` v1 e `/report/example`
- `report-kpi-grid.tsx` (locked)
- `report-executive-summary.tsx`
- `report-ai-reading.tsx`
- `ai-insight-box.tsx`
- qualquer ficheiro em `src/lib/`, `src/routes/api/`, `src/lib/pdf/`, `src/lib/insights/`, `supabase/`
- `routes/report.example.tsx`
- admin

Sem alterações a Supabase, providers (Apify/DataForSEO/OpenAI/PDFShift), prompts, validators ou schema.

## Acessibilidade

- `h1` continua a ser o handle no hero
- Todas as cores novas mantêm contraste AA (texto slate-900/700 sobre branco/azul-50)
- CTAs mantêm `min-h-[44px]`
- Chips de cobertura mantêm `aria-hidden` no dot e label legível
- Cabeçalho decorativo "01" com `aria-hidden="true"`, `h2` da pergunta intocado

## Responsivo

- Mobile (375): hero stack vertical, h1 1.5rem, KPI grid 2-col com 5º card full-width (mantém comportamento atual)
- Tablet (768): KPI 3-col, hero stack vertical mas com CTAs lado-a-lado
- Desktop (1366+): KPI 5-col, hero 2 colunas (identidade ↔ CTAs), número decorativo "01" só visível em `md:` ou superior

## Validação (regra nova do utilizador)

Após implementação corro apenas:
1. `bunx tsc --noEmit`
2. `bunx vitest run`

Sem QA visual automática no browser. O utilizador valida manualmente e envia screenshots se houver regressão.

## Critérios de aceitação

- Bloco 01 visivelmente mais premium e editorial que o atual
- Blocos 02–06 inalterados (mesma renderização)
- `/report/example` inalterado
- TS e testes passam
- Nenhum locked file foi tocado
- Nenhum dado, prompt ou provider foi tocado

## Próximos passos (fora desta fase)

Phase 1B.2 — Bloco 02 Diagnóstico, com a mesma abordagem wrapper-v2 quando os ficheiros base forem locked.
