# Eliminar zeros enganosos nos cards Profile vs Competitor

## TL;DR
Centralizar 5 frases canónicas no primitivo `CompareMissingDataNote` (existe, mas só cobre 2 cenários) e usá-lo em todos os cards de comparação. Cards passam a distinguir **true zero** (publica e tem 0) de **dado em falta** (campo não está no snapshot ou janela vazia), sem renderizar barras/donuts/zeros fabricados. Apenas copy, flags do adapter e métodos já existentes — sem schema, sem provider, sem novos fetches.

---

## Tarefa 1 — Extensão do primitivo `compare-missing-data-note.tsx`

Passa a aceitar uma API explícita por cenário; tudo é opcional, render só sai quando há pelo menos uma frase.

```ts
interface Props {
  // Frase de amostra (mutually exclusive)
  sampleN?: number | null;                              // "Amostra: últimas N publicações disponíveis."
  perSide?: {                                           // "Amostra: P publicações (@primary) · C publicações (@competitor)."
    primaryHandle: string; primaryN: number;
    competitorHandle: string; competitorN: number;
  } | null;

  // Estados de ausência (independentes)
  competitorNoPosts?: boolean;     // "Sem publicações do concorrente nesta janela."
  competitorMissing?: boolean;     // "Dados do concorrente indisponíveis nesta amostra."
  thumbnailsMissing?: boolean;     // "Miniaturas indisponíveis nesta amostra."

  qualifier?: string | null;       // free-form escape hatch (CDN-expired, etc.)
  className?: string;
}
```

Ordem fixa: `[amostra] [competitorNoPosts] [competitorMissing] [thumbnailsMissing] [qualifier]`. `perSide` ganha precedência sobre `sampleN` quando ambos forem passados. Quando `perSide` é assimétrico (uma das contagens = 0), o caller deve preferir `sampleN` + flag de ausência, mas o primitivo é robusto se ambos forem passados.

## Tarefa 2 — Strings canónicas (single source of truth)
Definidas dentro do primitivo como constantes não-exportadas. Não há duplicação noutros componentes — eliminamos `"Sem dados suficientes do concorrente para comparar o ritmo semanal."` e variantes locais.

## Tarefa 3 — `competitor-format-compare.tsx`
- **Linha metodológica sempre renderizada** (mesmo sem insight) na base do card.
- Quando `competitorHasStats === true` e ambos lados têm `postsAnalyzed > 0` → usa `perSide` (mostra ambas as contagens explicitamente).
- Quando apenas o primary tem amostra → `sampleN={primaryPostsAnalyzed}` + `competitorMissing` (renderiza `MissingSide` no donut como já faz).
- **True-zero por categoria**: dentro de `DonutSide`, manter `—` (já é o que faz para `share <= 0` com tooltip explicativo). Não tocar.
- **Distinção crítica**: continuar a gatear o render do donut do concorrente em `competitorHasStats` (`hasFormatStats !== false`); zero verdadeiro mostra 0% num donut existente, missing mostra `MissingSide`.

## Tarefa 4 — `competitor-weekday-compare.tsx`
- Manter o gate `competitorHasData` que **não renderiza** os 7 bars do concorrente quando não há dados.
- Substituir o `aside` de copy local pela combinação:
  - `hasWeekdayData === false` → passa `competitorMissing` no primitivo + aside com a mesma frase canónica.
  - `hasWeekdayData !== false && totalCompetitor === 0` → passa `competitorNoPosts`.
- Footer da `CompareCardShell`: manter o insight quando há dados; quando não há, footer = a mesma frase canónica do primitivo (lê do helper exportado do primitivo, evita duplicação).
- Metodologia: se ambos têm `total > 0`, usa `perSide`; senão `sampleN` do primary.

## Tarefa 5 — `competitor-engagement-compare.tsx`
- `MethodologyLine` interno é eliminado; passa a usar `CompareMissingDataNote` com:
  - `perSide` quando ambos têm `postsAnalyzed > 0`.
  - `sampleN = primary.postsAnalyzed` + `competitorMissing` quando só primary tem.
  - Nunca fabricar 0 quando `postsAnalyzed` é null/undefined — primitivo simplesmente não emite a sentence de amostra.

## Tarefa 6 — `competitor-cadence-compare.tsx`
- Manter a lógica atual de `competitorBlocked` (hasPosts true + miniaturas 0) e `competitorPostsMissing` (hasPosts false), mas mapear para o novo primitivo:
  - `competitor.hasPosts === false` → `competitorMissing` (frase canónica "Dados do concorrente indisponíveis nesta amostra.").
  - `competitor.hasPosts === true && competitorThumbs === 0` → `qualifier = "Miniaturas do concorrente indisponíveis (links de CDN expirados)."` (mantém a explicação técnica única deste card).
- Substituir o `<p>` inline "Miniaturas indisponíveis nesta amostra." dentro do `SampleStrip` por dependência do primitivo na base do card; o strip por lado mantém o subtítulo "Sem amostra disponível" como label curto contextual.
- Metodologia: usar `perSide` baseado em **postsAnalyzed** (não em thumbs) quando ambos > 0.

## Tarefa 7 — `comparison-hero.tsx`
- Manter a caixa visual destacada (não trocar pelo primitivo, é editorial).
- Reescrever a construção da frase usando as mesmas regras do primitivo (refactor interno do `<p>` dentro da caixa):
  - **Sample simétrico** (`primaryPostsAnalyzed > 0 && competitorPostsAnalyzed > 0`): `Comparação com base em P publicações de @primary e C publicações de @competitor.` (substitui o "últimas N" que mascarava assimetria).
  - **Sample assimétrico** (uma das contagens = 0): `Comparação com base em N publicações de @{ladoComDados}.` + suffix canónico:
    - competitor 0 + `hasPosts === false` → `Dados do concorrente indisponíveis nesta amostra.`
    - competitor 0 + `hasPosts === true` (ou indeterminado) → `Sem publicações do concorrente nesta janela.`
  - **Ambos 0/unknown**: `Comparação com base nas publicações disponíveis.` (genérico, sem número).
- Manter os suffixes já existentes (`Concorrente em janela de referência.` e `Algumas comparações detalhadas requerem análise mais recente do concorrente.`).
- **Não implicar shared sample size quando assimétrico**: `methodologySampleSize` actual (`Math.min` quando ambos, `Math.max` caso contrário) gera o problema → substituído pelas regras acima.

---

## Constraints respeitadas
- ✅ Sem schema, sem provider, sem novos secrets.
- ✅ Sem checkout/EuPago/credits/entitlements.
- ✅ Sem Free/Public changes — só `report-redesign/v2` e `overview/comparison-hero.tsx`.
- ✅ Sem novos componentes além do primitivo já existente (apenas extensão).

## Validação
1. `bunx vitest run` para os testes que tocam `compare/` e `competitor-*` (se existirem; senão typecheck via build automático).
2. Browser na rota `/analyze/nunomarkl` com snapshot legacy (sem `format_stats`, sem `weekday_iso`, sem thumbnails) → cards devem mostrar estados intencionais:
   - Format: `MissingSide` + frase "Dados do concorrente indisponíveis…".
   - Weekday: zero bars do concorrente, aside com frase canónica.
   - Cadence: tile strip do concorrente como placeholders + "Miniaturas indisponíveis…".
   - Hero: metodologia adaptada à assimetria.
3. Browser na mesma rota com snapshot novo + concorrente fresco → cards mostram números reais sem frases de missing.
4. Browser viewport 375px → sem overflow horizontal nos cards e na caixa de metodologia do hero.
5. Grep final: `rg "indispon|fake|zero" src/components/report-redesign/v2` para confirmar que só o primitivo emite estas strings.

## Risks
- Pequeno risco de quebra de testes que dependam da string literal em weekday ou engagement — mitigado por grep prévio antes do edit.
- Hero altera o layout de uma única linha — se overflow em pt-PT longo, ajustar `text-balance` (não esperado).

## Out of scope (não tocar)
- Schema de snapshot, adapter `competitor.hasPosts/hasFormatStats/hasWeekdayData` (apenas consumir).
- Re-hosting de imagens (P0 separado).
- Gate de entitlement em add-competitor (P0 separado).
- Insight copy do `buildVerdict`, `buildCadenceInsight`, `buildWeekdayInsight` — apenas missing-data copy.
