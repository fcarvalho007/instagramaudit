## Problema

O `postingFrequencyWeekly` em `keyMetrics` usa o valor do provider (`estimated_posts_per_week` = 6.0, calculado com ~14 dias), mas o card "Ritmo de publicação" já recalcula localmente com `windowDays` (= 15 dias → 5.6/semana). Isto cria inconsistência nos seguintes locais que ainda usam o valor antigo:

1. **Attention row** — threshold `>= 5` e texto "Há cerca de 6,0 publicações/semana"
2. **Share message** — texto partilhável com valor antigo
3. **KPI grid v2** — display do valor (se usado)
4. **Old KPI grid / key metrics** — display (se usado)

Exemplo concreto (perfil de teste):
- Provider diz: 6.0/semana (12 posts ÷ ~14 dias × 7)
- Card overview diz: 5,6/semana (12 posts ÷ 15 dias × 7)

## Solução

Corrigir na fonte: em `snapshotToReportData()` (snapshot-to-report-data.ts), **após** calcular `windowDays`, reescrever `keyMetrics.postingFrequencyWeekly` com a fórmula consistente:

```
if (windowDays > 0 && keyMetrics.postsAnalyzed > 0) {
  keyMetrics.postingFrequencyWeekly = round1(
    (keyMetrics.postsAnalyzed / windowDays) * 7
  );
}
```

Isto garante que todos os consumidores de `keyMetrics` (attention row, share, KPI grids) usam o mesmo valor que o card de overview — sem precisar de alterar cada componente individualmente.

Adicionalmente, o `PostingRhythmCard` pode ser simplificado para usar `k.postingFrequencyWeekly` directamente em vez do recálculo local (dado que a fonte já estará correcta).

## Ficheiros a editar

1. `src/lib/report/snapshot-to-report-data.ts` — patch `keyMetrics.postingFrequencyWeekly` após `windowDays`
2. `src/components/report-redesign/v2/report-overview-cards.tsx` — simplificar `PostingRhythmCard` para usar `keyMetrics` directamente (opcional, mas reduz duplicação)

## Validação

- `bunx tsc --noEmit`
- `bunx vitest run`
- Confirmar que: 12 posts ÷ 15 dias × 7 = 5.6/semana aparece em todos os locais
