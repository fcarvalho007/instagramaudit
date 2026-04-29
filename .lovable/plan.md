## Refinamento section-by-section · `/analyze/$username`

A fundação visual (hero + KPI grid + tokens) já está implementada. Este plano cirurgicamente refina cada secção mantendo todos os ficheiros locked intactos. Toda a alteração acontece em `src/components/report-redesign/*` (livre) ou em wrappers já não-locked (`report-market-signals/*`, `report-share/*`).

### Constraints respeitados

- **Locked (não tocar):** `report-benchmark-gauge.tsx`, `report-top-posts.tsx`, `report-posting-heatmap.tsx`, `report-best-days.tsx`, `report-hashtags-keywords.tsx`, `report-ai-insights.tsx`, `report-section.tsx`, `report-page.tsx`, `report-mock-data.ts`, `report.example.tsx`, todos os ficheiros em `LOCKED_FILES.md`.
- **Não tocar:** providers, validador OpenAI, schema Supabase, PDF backend, `/admin`.
- **`/report/example`** continua a usar `ReportPage` locked completo — não é afectado.

### Problema estrutural detectado

Os componentes locked (`ReportBenchmarkGauge`, `ReportTopPosts`, `ReportPostingHeatmap`, `ReportBestDays`, `ReportHashtagsKeywords`) renderizam internamente o seu próprio `<ReportSection>` com label + título + subtítulo. O `ReportShell` actual envolve cada um num `ReportSectionFrame` com OUTRO eyebrow + h2 + subtítulo. Resultado: cabeçalho duplicado em 5 secções.

**Solução:** o `ReportShell` deixa de envolver estes componentes em `ReportSectionFrame`. Em vez disso, cria wrappers de framing finos (apenas card branco + alternância de banda) sem header próprio, deixando o título interno locked respirar dentro de uma moldura premium. As poucas secções sem header locked (Performance temporal, Concorrentes) continuam com `ReportSectionFrame`.

---

### 1. AI insights — Leitura estratégica

Ficheiro: `src/components/report-redesign/report-ai-reading.tsx` (já existe, refinar).

- Substituir `tone="soft-violet"` por moldura branca elevada coerente com o resto do redesign (`tone="plain"`, `framed=true` ou layout dedicado em card branco).
- Trocar barra lateral colorida por **badge numerado azul** circular no topo do card, com título em Fraunces e corpo em Inter.
- Layout 2 colunas desktop / 1 coluna mobile já está correcto — manter.
- Indicador subtil de prioridade: ponto azul/âmbar/cinza junto ao número conforme posição.
- `<details>` técnico: manter mas reescrever copy ("Confiança", "Evidência" em linguagem mais humana — "Base da leitura", "Sinais usados").
- **Garantia:** `ReportAiInsights` locked NÃO é renderizado pelo shell (já confirmado linha por linha). Insights aparecem uma única vez.
- **Sanitização de copy técnica antiga:** adicionar helper `humanizeTechnical(text)` que substitui no render `engagement_pct → envolvimento médio`, `benchmark_value_pct → referência esperada`, `profile_value_pct → valor do perfil`, `difference_pct → diferença face à referência`, `position below → abaixo da referência`, `dominant_format → formato dominante`. Aplicado tanto no `text` visível como no `evidenceSummary` do `<details>`. Não muta dados — só formatação no render.

### 2. Benchmark

Os componentes `ReportBenchmarkGauge` e `ReportFormatBreakdown` são locked e já trazem header próprio. Substituir o duplo-header:

- Em `report-shell.tsx`, trocar o `ReportSectionFrame` da secção 6 por um novo wrapper `ReportFramedBlock` (novo ficheiro, ver técnico) que apenas aplica banda + card branco SEM eyebrow/h2/subtítulo redundantes.
- O badge de status ("Acima/Abaixo do benchmark") já existe dentro do componente locked — fica preservado.
- Card branco premium dado pelo wrapper já cumpre o brief de "main reading inside a strong white card".

### 3. Market Signals

Ficheiro: `src/components/report-market-signals/report-market-signals.tsx` (não locked).

- Refinar copy do subtitle no `marketSignalsCopy` para a frase pedida: *"Cruza temas do Instagram com procura de pesquisa para perceber se há interesse fora da plataforma."*
- Refinar `EmptyCard` com fundo branco coerente com Iconosquare (substituir `bg-surface-elevated` por moldura clara `bg-white border border-slate-200 rounded-2xl`).
- Refinar `MetricCard`: aplicar mesmo `cardKpi` style do redesign (sombra + borda slate-200) em vez de `border-border-subtle/40 bg-surface-elevated/60` que não combina no canvas claro.
- Manter lógica de cache-first (`cachedSummary` curto-circuita fetch — já implementado).
- Manter silêncio em `disabled`/`blocked` (já implementado).

### 4. Top posts

Componente locked. Wrapper-only refinement:

- Trocar `ReportSectionFrame` por novo `ReportFramedBlock` (sem header duplicado).
- O componente locked já renderiza thumbnails reais (`post.thumbnailUrl`) com fallback gradient — funciona.
- O `ReportEnrichedTopLinks` (não locked) por baixo continua a aparecer.
- Não duplicar grid (resolvido ao remover header redundante; o grid 5-cols continua dentro do card branco).

### 5. Heatmap + Best Days

Ambos locked, com headers internos próprios. Para os agrupar visualmente sob um único título:

- Criar wrapper `ReportAudienceResponse` em `src/components/report-redesign/` que renderiza um `ReportSectionFrame` (com título "Quando a audiência mais responde" + subtítulo "Ajuda a perceber quando a audiência tende a responder melhor") contendo os dois componentes locked dentro do card framed.
- O subtítulo pedido fica no `ReportSectionFrame`.
- Os títulos internos locked dos dois componentes vão aparecer dentro do card como sub-headings — aceitável desde que o frame externo seja o título dominante. Se ficar visualmente pesado, em alternativa cortamos o frame externo e usamos só `ReportFramedBlock` mais o subtítulo no topo.
- Decisão final no momento da implementação após screenshot — iremos com o agrupamento sob frame único.

### 6. Hashtags e palavras-chave

Componente locked. Wrapper-only:

- Trocar `ReportSectionFrame` actual por `ReportFramedBlock` (remove header duplicado).
- Microcopy *"Temas e padrões recorrentes identificados nas legendas."* já idêntica ao subtítulo do header interno locked → não duplicar.
- O `ReportEnrichedMentions` por baixo permanece.

### 7. Methodology

Ficheiro: `report-methodology.tsx` (já existe).

- Reescrever o card actual para visual coerente com Iconosquare:
  - Fundo branco (`REDESIGN_TOKENS.card`) em vez de `border-border-subtle bg-surface-base`.
  - Tone do frame: `plain` (já está em `calm`/`bandSoftBlue` — manter para alternância editorial).
  - Manter as 4 fontes (Recolha, Referência, Leitura editorial, Sinais de pesquisa).
  - Garantir copy não-técnica (já está OK — sem "payload", "snapshot", "normalized").

### 8. Final CTA block

Ficheiro: `report-share/report-final-block.tsx` (não locked).

- Refinar para canvas claro:
  - Fundo da section: trocar gradient escuro `bg-[radial-gradient(...rgba(6,182,212,0.10)...)]` por `bg-white border-t border-slate-200`.
  - Card interno: `REDESIGN_TOKENS.card` (sombra + branco) em vez de `bg-surface-base/70`.
  - Botão PDF primário: cores azul `bg-blue-600 text-white` (consistente com hero) em vez de `bg-accent-primary text-surface-base` (que pode ficar invisível em fundo claro).
  - Botão PDF e fallback: `w-full md:w-auto` já garante full-width mobile.
  - Texto: trocar `text-content-secondary/tertiary` (tokens dark) por `text-slate-600/500`.
- Auditar links: nenhum `href="#"` (confirmado: `feedback.action.href` vem de copy real).

### 9. Mobile 375px

- `overflow-x-hidden` já está no shell root.
- Hero `[overflow-wrap:anywhere]` no h1 já protege username longo.
- KPI grid 2-cols no mobile com 5º card span-2 já implementado.
- AI cards 1-col em mobile já implementado; `<details>` colapsado por defeito (HTML nativo).
- CTAs full-width mobile no final block (corrigido em §8).
- Validar visualmente após implementação que nenhum chip ou métrica force overflow.

---

### Detalhes técnicos

**Novo ficheiro:** `src/components/report-redesign/report-framed-block.tsx`

```tsx
import { cn } from "@/lib/utils";
import { REDESIGN_TOKENS } from "./report-tokens";

interface Props {
  /** Banda alternada para ritmo visual (white | soft-blue | canvas). */
  tone?: "white" | "soft-blue" | "canvas";
  /** Aria-label obrigatório (a section interna locked tem o título visível). */
  ariaLabel: string;
  /** ID âncora opcional. */
  id?: string;
  children: React.ReactNode;
  spacing?: "default" | "tight";
}

/**
 * Wrapper de framing apenas: aplica banda + card branco elevado em
 * volta de componentes locked que JÁ trazem o seu próprio
 * `<ReportSection>` header. Não renderiza eyebrow/h2/subtítulo —
 * evita duplo cabeçalho.
 */
export function ReportFramedBlock({ tone = "canvas", ariaLabel, id, children, spacing = "default" }: Props) {
  const band =
    tone === "white" ? REDESIGN_TOKENS.bandWhite
    : tone === "soft-blue" ? REDESIGN_TOKENS.bandSoftBlue
    : REDESIGN_TOKENS.bandCanvas;
  const pad = spacing === "tight" ? "py-8 md:py-10" : "py-10 md:py-14";
  return (
    <section id={id} aria-label={ariaLabel} className={cn("w-full", band, pad)}>
      <div className="mx-auto max-w-7xl px-5 md:px-6">
        <div className={cn(REDESIGN_TOKENS.card, "p-5 md:p-8")}>{children}</div>
      </div>
    </section>
  );
}
```

**Helper humanização (em `report-ai-reading.tsx`):**

```tsx
const TECH_REPLACEMENTS: Array<[RegExp, string]> = [
  [/engagement_pct/gi, "envolvimento médio"],
  [/benchmark_value_pct/gi, "referência esperada"],
  [/profile_value_pct/gi, "valor do perfil"],
  [/difference_pct/gi, "diferença face à referência"],
  [/position\s+below/gi, "abaixo da referência"],
  [/dominant_format/gi, "formato dominante"],
];
function humanize(text: string): string {
  return TECH_REPLACEMENTS.reduce((acc, [re, sub]) => acc.replace(re, sub), text);
}
```

**Mudanças em `report-shell.tsx`:**

- Secção 6 (Benchmark + formatos) → `ReportFramedBlock tone="soft-blue"` envolvendo gauge + breakdown.
- Secção 8 (Top posts) → `ReportFramedBlock tone="soft-blue"` envolvendo `ReportTopPosts` + `ReportEnrichedTopLinks`.
- Secção 9 (Resposta da audiência) → `ReportSectionFrame` (mantém título agrupador) framed + os dois componentes locked dentro.
- Secção 10 (Hashtags + menções) → `ReportFramedBlock tone="soft-blue"`.
- Secções 5 (Performance temporal) e 7 (Concorrentes) → `ReportSectionFrame framed` mantém-se (estes locked têm header mas o redesign frame substitui-o de forma coerente porque o header interno desses dois é mais leve — alternativa: mudar também para `ReportFramedBlock` para uniformizar).

**Decisão de uniformização:** todos os blocos analíticos com componente locked-com-header-próprio passam a `ReportFramedBlock`. Apenas Hero, KPI Grid, Leitura Estratégica IA, Market Signals e Methodology usam `ReportSectionFrame` (estes não duplicam porque ou são novos ou os componentes internos não trazem header).

**Validação:**

- `bunx tsc --noEmit`
- `bun run build`
- QA visual: 1366×768, 768×1024, 375×812 via `browser--navigate_to_sandbox` + `browser--screenshot`.
- Confirmar `/report/example` inalterado (rota usa `ReportPage` locked, não toca em `ReportShell`).

### Checkpoint

- ☐ Novo `report-framed-block.tsx` criado
- ☐ Shell actualizado: secções com header locked usam `ReportFramedBlock` (sem duplo header)
- ☐ AI Reading: badge numerado azul, helper `humanize()`, `<details>` reescrito
- ☐ Methodology: card branco coerente
- ☐ Final block: fundo claro, botão PDF azul sólido, full-width mobile
- ☐ Market Signals: copy actualizada + cards estilo claro coerente
- ☐ TypeScript build limpo
- ☐ QA visual nos 3 viewports
- ☐ `/report/example` inalterado
