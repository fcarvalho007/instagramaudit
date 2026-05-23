## Diagnóstico

### Problemas de dados encontrados

**1. `count` é estimado, não é a fonte de verdade.**
Em `report-overview-block.tsx` (L60-66):
```ts
count: Math.round((f.sharePct / 100) * k.postsAnalyzed)
```
O snapshot já traz `format_stats[k].count` (campo real do payload — ver `SnapshotFormatStat` em `snapshot-to-report-data.ts:65-69`), mas `buildFormatBreakdown` descarta-o e só guarda `sharePct`. Round-trip via `sharePct` pode produzir **Σcount ≠ postsAnalyzed** (ex: 50%/50% em 11 posts → 6+6 = 12).

**2. Total do donut pode divergir da grelha de miniaturas.**
- Donut central mostra `postsAnalyzed` (vindo de `content_summary.posts_analyzed`).
- Miniaturas usam `analysedPostFormats.length` (posts com data ISO válida — pode ser menor).
- Σcount da legenda pode dar um terceiro valor.

**3. Percentagens podem divergir entre subtítulo e donut.**
- Subtítulo "X em cada Y são…" usa o `count` derivado.
- Donut recalcula `Math.round((count/postsAnalyzed)*100)` — pode dar 74% quando o `sharePct` autoritativo era 75%.

### Problemas de clareza / UX

**4. Singulares vs plurais inconsistentes.**
A legenda nova mostra "Carrossel / Reels / Imagem". O resto do card (subtítulo, legenda das miniaturas, `FORMAT_PT`) usa **plurais** ("carrosséis, reels, imagens"). Convenção pt-PT do projeto = plural.

**5. Eyebrow "Publicações" no donut duplica "X posts analisados" logo abaixo.**
São o mesmo número visto duas vezes em 40px de distância.

---

## Implementação

### A. `src/lib/report/snapshot-to-report-data.ts`
1. Adicionar `count: number` ao tipo `ReportData["formatBreakdown"]` (ou ao item retornado).
2. Em `buildFormatBreakdown` (L597+), preencher `count` a partir de `s.count` (já existe em `SnapshotFormatStat`). Fallback `0` quando ausente.

### B. `src/components/report-redesign/v2/report-overview-block.tsx`
1. Em `formatEntries` (L60-66), usar `f.count` direto da fonte. Manter o cálculo round-trip apenas como fallback quando `count` for `0` e `sharePct > 0`.
2. Garantir invariante: se `Σcount > 0` e diferir de `postsAnalyzed`, usar `Σcount` como total exibido (fonte interna coerente).

### C. `src/components/report-redesign/v2/overview/format-card.tsx`
1. **Total único**: passar a usar `total = Σ(entry.count)` em vez de `postsAnalyzed` quando os dois divergirem; isto garante coerência donut ↔ legenda ↔ percentagens.
2. **Percentagens autoritativas**: preferir `entry.sharePct` quando presente; só recalcular a partir de `count/total` como fallback. Evita 74% vs 75%.
3. **Labels em plural** em `FORMAT_SINGULAR_PT` → renomear para `FORMAT_LEGEND_PT` e usar: `Carrosséis`, `Reels`, `Imagens`, `Vídeos`. Capitalizada.
4. **Remover redundância**: substituir o eyebrow `Publicações` dentro do donut por algo descritivo do que está a ser medido — ou removê-lo e manter apenas o número grande. Eu sugiro **manter o número + remover o eyebrow interno**, e renomear o eyebrow externo de "X posts analisados" para "Distribuição dos X posts" (1 leitura, 1 sítio).
5. **Σ garantida**: snap final — se rounding produzir Σpct = 99 ou 101, somar/subtrair 1 ao maior formato. Evita "75% + 25% + 0% = 100%" virar 76+25+0.
6. **Estado vazio**: se `total = 0`, não renderizar (já garantido).
7. **a11y**: adicionar `aria-label` ao container do bloco breakdown a descrever a distribuição (ex: "Distribuição: 9 carrosséis, 3 reels, 0 imagens").

### D. Sem alterações
- Não tocar em `buildAnalysedPostFormats` (já correto).
- Não tocar no subtítulo do card nem no `InsightCallout`.
- Não tocar em `DominantFormatCard` (card diferente).
- Sem novas libs.

---

## Validação

- `/analyze/frederico.m.carvalho`: confirmar que o número central do donut, a Σ da legenda e o número da grelha de miniaturas dão o mesmo valor.
- Confirmar que as % batem com o `format_stats` original do payload (não recalculadas a partir de counts redondos).
- Testar mobile 375px.
- `bunx tsc --noEmit` para validar a mudança de tipo em `formatBreakdown`.

## Checkpoint
- ☐ `formatBreakdown` carrega `count` real do `format_stats`.
- ☐ `formatEntries` usa esse count directamente.
- ☐ Donut/legenda/grelha mostram o **mesmo** total.
- ☐ Percentagens batem com `sharePct` autoritativo do payload.
- ☐ Labels em plural pt-PT consistentes.
- ☐ Eyebrow duplicado removido.
- ☐ Σpct = 100% garantido por snap.
- ☐ `tsc --noEmit` ok.