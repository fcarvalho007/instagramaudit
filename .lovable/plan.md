
# QA editorial — Profile vs Competitor

Auditoria estática (browser admin bloqueado em "A verificar sessão…"). Validei cada item por leitura do código que renderiza `/admin/report-preview/nunomarkl?variant=pro_preview&draft=false` em modo `all` com `firstCompetitor`.

---

## 1. PASS / FAIL

| # | Critério | Verdict | Evidência |
|---|---|---|---|
| 1 | Abre claramente em comparison mode | **PASS** | `report-overview-block.tsx:212` — quando `firstCompetitor` existe, renderiza `ComparisonHero` em vez de `EditorialIdentityCard` |
| 2 | Primeiro card sem 100/100 antigo | **PASS** | `comparison-hero.tsx` não tem qualquer score 0–100; mostra duelo + 4 métricas + verdict editorial |
| 3a | Fraunces só em títulos/separadores | **PASS** | `font-serif` em hero verdict (l. 90), shell title (`compare-card-shell.tsx:67`), divisor "vs" (`compare-handle-row.tsx:71,171`). Nenhum uso em body/labels |
| 3b | Inter em labels/body/métricas | **PASS** | `font-sans` em handles (`compare-handle-row.tsx:150`, `comparison-hero.tsx:147`); métricas com `tabular-nums` Inter (`comparison-hero.tsx:164`, `competitor-engagement-compare.tsx:230`) |
| 3c | Sem labels abaixo de 12px | **FAIL** | `comparison-hero.tsx:62` usa `text-[11px]` no chip "Concorrente em janela baseline". CompareCardShell já usa `text-xs` no mesmo chip (`compare-card-shell.tsx:78`) — inconsistência |
| 4 | Cor primary azul / competitor indigo | **PASS** | Token `--compare-competitor: #7664E4` confirmado em `tokens-light.css:27`. Aplicado consistentemente: hero (`comparison-hero.tsx:127-129`), pills (`compare-handle-row.tsx:91-94`), engagement markers (`competitor-engagement-compare.tsx:169-170,186`), format donuts (`competitor-format-compare.tsx:109-120`), cadence strips (`competitor-cadence-compare.tsx:199`), bio panel (`competitor-bio-compare.tsx:103-106`) |
| 5 | Avatares + fallback iniciais limpos | **PASS** | `Avatar` (`compare-handle-row.tsx:228-311`): `onError` → setFailed, gradient tint side-coloured, verified check, anel opcional. Usado por shell, hero e identity cards |
| 6 | "Publicações na amostra" + caveat | **PASS** | Linha no hero (`comparison-hero.tsx:209-215`); rodapé metodológico abaixo do hero (l. 96-103) `Comparação com base nas últimas N publicações disponíveis.`; cadence card também escreve "Amostra: últimas N publicações disponíveis." (`competitor-cadence-compare.tsx:113-117`) |
| 7a | Engagement profile vs competitor | **PASS** | `CompetitorEngagementCompare` mostra par primário/concorrente com `CompareStatBlock` + delta pp |
| 7b | Engagement explica relação à escala | **PASS** | `BenchmarkRail` (l. 113-166) com tick de referência e zona "strong"; `SideBenchmarkLine` por lado (l. 202-237) com `↗ +X % vs referência Micro` + classificação `Abaixo/Em linha/Acima/Muito acima da referência do escalão`; verdict combina ambos (l. 268-295) |
| 8a | Mix de formatos forte | **PASS** | Donuts side-by-side 160-176px com cores por slice tonalmente derivadas do accent do lado (`competitor-format-compare.tsx:109-120`), centro com formato dominante + %, legenda completa, fallback "Sem dados" + insight HHI determinístico |
| 8b | Ritmo por dia da semana forte | **PASS** | `CompareBarPair` paired bars, insight de pico determinístico (`competitor-weekday-compare.tsx:137-155`); shell unificado |
| 9 | 375px sem overflow | **PASS** | Hero: `md:grid-cols-[1fr_auto_1fr]` colapsa em mobile; handles com `truncate max-w-[16rem]`/`max-w-[8rem]`; donut 160px cabe em 375-48; format legend `max-w-[200px]` |
| 10 | Sem duplicação single-profile | **PASS** | Guardas `(mode === "all" && !firstCompetitor)` nas linhas 231, 278; competitor cards substituem `EngagementCardRefined`, `FrequencyCard`, `FormatCard` via ternário (l. 382-470). Nenhum branch renderiza ambos |
| 11 | Sem provider calls no render | **PASS** | Todos os 5 ficheiros compare são puros (`useMemo`, sem `useQuery`/`useEffect`/fetch). Dados vêm de `result`/`payload` já carregados |
| 12 | Free/Public inalterado | **PASS** | Branches `mode === "free"` (l. 231, 278) e `mode === "free_with_engagement"` (l. 302-376) intactos; `EditorialIdentityCard`, `MethodologyLine`, `PremiumTeaserCard` continuam montados |

**Resultado:** 11 PASS · 1 FAIL (cosmético, micro-patch trivial).

---

## 2. Problemas visuais por severidade

### MEDIUM
- **`text-[11px]` no chip baseline do hero** — `src/components/report-redesign/v2/overview/comparison-hero.tsx:62`. Viola regra core ≥ 12px e é inconsistente com o mesmo chip já normalizado em `compare-card-shell.tsx:78` (`text-xs`). Patch: trocar `text-[11px]` por `text-xs`.

### LOW
- **`font-display` em `displayName` do `LargeIdentity`** — `src/components/report-redesign/v2/compare/compare-handle-row.tsx:154`. `font-display` mapeia a Fraunces; a regra core diz "Fraunces: H1/H2 editorial only". `displayName` é dado de utilizador, não título editorial. Não usado pelo hero (que tem o seu próprio `IdentityCard` em Inter), mas presente no shell em `size="lg"` — actualmente não invocado em nenhum compare card. Sugestão: trocar para `font-sans` por defesa, ou marcar como "intencional editorial only no Comparison Hero".
- **Iniciais do fallback em `text-[0.72em]`** — `compare-handle-row.tsx:289`. Em pill `size-7` com parent `text-sm` resulta em ~10px. Aceitável por serem 1-2 caracteres decorativos, mas tecnicamente abaixo do mínimo. Sem acção recomendada.
- **`BenchmarkRail` em 375px**: quando ambos os ER ficam perto do benchmark, os labels `@handle` podem colidir visualmente (ambos com `max-w-[8rem]` absolute `-translate-x-1/2`). Sem overflow horizontal real, mas pode haver sobreposição de texto. Sem acção urgente; tolerância aceitável para o snapshot `nunomarkl`.

### NONE (validados)
- Single-profile `FormatCard` / `FrequencyCard` / `EditorialIdentityCard` não renderizam quando `firstCompetitor` existe.
- Insight do donut só aparece quando ambos os lados têm ≥90% de share aggregado e janela alinhada — degrada limpo.
- `CompareThumbPlaceholder` usado em strips de cadência quando thumb falha.

---

## 3. Componente/ficheiro por issue

| Issue | Ficheiro | Linha |
|---|---|---|
| Chip baseline `text-[11px]` | `src/components/report-redesign/v2/overview/comparison-hero.tsx` | 62 |
| `font-display` em displayName | `src/components/report-redesign/v2/compare/compare-handle-row.tsx` | 154 |
| Iniciais `text-[0.72em]` | `src/components/report-redesign/v2/compare/compare-handle-row.tsx` | 289 |
| BenchmarkRail label collision mobile | `src/components/report-redesign/v2/competitor-engagement-compare.tsx` | 185-198 |

---

## 4. GO / NO-GO

**GO para Fase 3** — com 1 micro-patch trivial antes (≤ 3 linhas):

```diff
- // comparison-hero.tsx:62
- <span className="inline-flex items-center rounded-full border border-border-default px-2.5 py-0.5 text-[11px] font-medium text-content-secondary">
+ <span className="inline-flex w-fit shrink-0 items-center rounded-full border border-border-subtle bg-surface-muted px-2.5 py-1 text-xs text-content-tertiary">
    Concorrente em janela baseline
  </span>
```

Esta mudança alinha o chip do hero com o chip do `CompareCardShell` (mesmo token, mesma tipografia, mesmo padding) e fecha o último ponto de inconsistência editorial. Tudo o resto está sólido.

---

## 5. Limitação desta auditoria

A rota `/admin/report-preview/...` está protegida e o browser do sandbox não tem sessão. Validação ocular real (contraste em ecrã, "feel" tipográfico, sobreposição efectiva do BenchmarkRail em 375px com este snapshot específico) requer login no preview. A auditoria acima é por leitura de código — cobre 11/12 critérios com alta confiança, o ponto 9 (375px) é inferido por análise de classes Tailwind.
