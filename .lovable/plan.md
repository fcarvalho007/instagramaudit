# Block 1 — Correções P2 de transparência (copy + linha de metodologia)

## Estado actual auditado

- `posts.subtitle` (PT/EN) tem fallback hardcoded em "últimos 30 dias / last 30 days" em `src/i18n/locales/{pt,en}/report.json`.
- `report-post-comparison.tsx:149` escolhe entre `subtitle_with_window` (quando `windowShortLabel` existe) ou o fallback fixo — sem distinguir o método de amostra.
- O adapter (`snapshot-to-report-data.ts`) já expõe tudo o que precisamos: `enriched.cadence.method` ∈ {`window_30d`, `window_90d`, `sample_span`, `insufficient`}, `enriched.cadence.windowDays`, `enriched.cadence.sampleSize`, e `buildBlock01Sample(payload.posts).performancePosts.length` (já calculado no Bloco 1).
- Block 1 (`report-overview-block.tsx`) **não tem** linha visível de metodologia. `pinnedPostsExcluded` / `dateOutliersExcluded` estão disponíveis via `buildBlock01Sample`.

## Mudanças

### 1. i18n — `posts.subtitle` method-safe

Em `src/i18n/locales/pt/report.json` e `en/report.json`, dentro de `"posts"`, substituir as duas chaves actuais por um bloco de variantes:

```json
"subtitle_variants": {
  "window_30d": "O contraste editorial dos últimos 30 dias.",
  "window_90d": "O contraste editorial dos últimos 90 dias.",
  "sample_span_one": "O contraste editorial na última publicação.",
  "sample_span_other": "O contraste editorial nas últimas {{count}} publicações.",
  "insufficient": "O contraste editorial na amostra recolhida."
}
```

(Equivalente EN com "across the latest" e singular/plural.) Manter `subtitle` como alias de `insufficient` para retro-compatibilidade caso algo importe directamente.

Notas:
- Resolver singular/plural com sufixo `_one` / `_other` baseado em `count` (evita "últimos 8 publicações"). Como o projecto não usa i18next-icu, faço o select manualmente em código: `count === 1 ? sample_span_one : sample_span_other`.
- Remover `subtitle_with_window` (não há outro consumidor além de `report-post-comparison`).

### 2. `report-post-comparison.tsx` — selector method-safe

- Trocar prop `windowLabel?: string` por `cadenceMethod`, `cadenceWindowDays`, `sampleSize` (ou um único objecto `methodology`).
- Função pura `pickSubtitleKey(method, count)`:
  - `window_30d` → `posts.subtitle_variants.window_30d`
  - `window_90d` → `posts.subtitle_variants.window_90d`
  - `sample_span` → `_one` se `count===1`, senão `_other` com `{ count }`
  - `insufficient` ou desconhecido → `posts.subtitle_variants.insufficient`
- Linha 149 passa a renderizar o resultado desta função.

### 3. `report-overview-block.tsx` — linha de metodologia + nota de exclusões

Logo após o `EditorialIdentityCard` (ainda dentro do `mode === "all" | "free"`), adicionar um pequeno bloco:

```tsx
<MethodologyLine
  count={sample.performancePosts.length}
  observedDays={enriched.cadence.windowDays}
  sufficient={enriched.cadence.sufficient}
  pinnedExcluded={sample.pinnedPostsExcluded}
  outliersExcluded={sample.dateOutliersExcluded}
/>
```

`sample` já é computado no componente para `postAverages`; reaproveitar (extrair `useMemo` único). Novo componente `overview/methodology-line.tsx` (~40 linhas):

- Texto pequeno (`text-xs text-content-tertiary`), sem card, sem ícone novo.
- Quando `sufficient`:
  - PT: `Análise baseada nas últimas {{count}} publicações disponíveis · Período observado: {{days}} dias.`
  - PT, count===1: `Análise baseada na última publicação disponível · Período observado: {{days}} dia(s).`
  - EN equivalentes.
- Quando `!sufficient`:
  - PT: `Amostra reduzida: poucos dados disponíveis para uma leitura conclusiva.`
  - EN: `Limited sample: not enough data for a conclusive reading.`
- Se `pinnedExcluded + outliersExcluded > 0`, segundo span (mesmo parágrafo, separado por ` · `) com tooltip nativo (`title=`) — sem `<Tooltip>` shadcn para manter zero novas deps:
  - PT: `Publicações fixadas ou demasiado antigas podem ser excluídas dos cálculos de desempenho.`
  - EN equivalente.

### 4. Novas chaves i18n para a linha

Em `posts` ou novo namespace `methodology` dentro de `report.json`:

```json
"methodology": {
  "line_one": "Análise baseada na última publicação disponível · Período observado: {{days}} dia(s).",
  "line_other": "Análise baseada nas últimas {{count}} publicações disponíveis · Período observado: {{days}} dias.",
  "insufficient": "Amostra reduzida: poucos dados disponíveis para uma leitura conclusiva.",
  "exclusions_note": "Publicações fixadas ou demasiado antigas podem ser excluídas dos cálculos de desempenho."
}
```

### 5. Wiring no `report-overview-block.tsx`

- Passar para `<PostComparisonBlock>` os novos props: `cadenceMethod={enriched.cadence.method}`, `cadenceWindowDays={enriched.cadence.windowDays}`, `sampleSize={sample.performancePosts.length}`. Remover `windowLabel`.

## Ficheiros a alterar

1. `src/i18n/locales/pt/report.json` — substituir `posts.subtitle` / `subtitle_with_window` + adicionar `posts.subtitle_variants` + `posts.methodology`.
2. `src/i18n/locales/en/report.json` — idem.
3. `src/components/report-redesign/v2/report-post-comparison.tsx` — nova assinatura de props, função `pickSubtitleKey`, render linha 149.
4. `src/components/report-redesign/v2/report-overview-block.tsx` — extrair `sample` para useMemo único, montar `<MethodologyLine>`, actualizar props de `<PostComparisonBlock>`.
5. `src/components/report-redesign/v2/overview/methodology-line.tsx` — novo componente.
6. `src/components/report-redesign/v2/__tests__/post-comparison-subtitle.test.tsx` — novo (4 casos: 30d, 90d, sample_span singular/plural, insufficient).
7. `src/components/report-redesign/v2/__tests__/methodology-line.test.tsx` — novo (sufficient com count/days, count=1, insufficient, exclusões on/off).

## Testes

```text
post-comparison-subtitle.test:
  ✓ window_30d → "últimos 30 dias"
  ✓ window_90d → "últimos 90 dias"
  ✓ sample_span count=8 → "últimas 8 publicações" (sem "30 dias")
  ✓ sample_span count=1 → "última publicação" (sem "1 publicações")
  ✓ insufficient → "amostra recolhida"
  ✓ nenhuma variante excepto window_30d contém "30 dias"

methodology-line.test:
  ✓ sufficient + count=12 + days=42 → "últimas 12 publicações" + "42 dias"
  ✓ sufficient + count=1 → "última publicação"
  ✓ insufficient → "Amostra reduzida"
  ✓ pinnedExcluded=2 → renderiza nota de exclusões
  ✓ pinnedExcluded=0 && outliers=0 → não renderiza
```

Validação final: `bunx tsc --noEmit` + `bunx vitest run`.

## Fora de scope (confirmar)

Não toco em:
- Outros `"últimos 30 dias"` em landing, admin, mock data, prompts OpenAI, cadence headers do overview-cards (são contextos diferentes, com método já garantido por outras vias).
- `report-top-posts.tsx` / `report-temporal-chart.tsx` / `report-competitors.tsx` (são da versão `report-redesign/v1` legacy, fallback `?? "últimos 30 dias"`).

Se quiseres que estenda a higienização aos 3 ficheiros legacy `report/*`, diz e adiciono ao mesmo PR.

## Checkpoint

- ☐ Aprovar substituição de `posts.subtitle` + `subtitle_with_window` pelo bloco `subtitle_variants` (breaking interno, mas só um consumidor).
- ☐ Aprovar posição da linha de metodologia: **logo abaixo do `EditorialIdentityCard`**, dentro de Zona B (visível tanto no `free` como no `all`).
- ☐ Aprovar tooltip nativo (`title=`) em vez de `<Tooltip>` shadcn para a nota de exclusões.
- ☐ Confirmar se estendo aos 3 ficheiros legacy `report/report-{top-posts,temporal-chart,competitors}.tsx` ou deixo só Block 1 v2.
