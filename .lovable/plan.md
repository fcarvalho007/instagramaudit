
# Pergunta 04 · Caption Intelligence Upgrade

## O que já existe

A infraestrutura Caption Intelligence foi criada numa iteração anterior e já cobre:

- `src/lib/report/caption-intelligence.ts` — motor determinístico com 5 blocos (temas, contentTypeMix, expressões, CTA, leitura editorial), separação explícita hashtags/temas, fallback quando não há IA
- `src/components/report-redesign/v2/report-caption-intelligence.tsx` — UI com layout 2 colunas, source badges, CTA stats, leitura editorial, nota de rodapé
- `src/components/report-redesign/v2/source-badge.tsx` — badges extracted/auto/ai
- Ponte para prioridades via `injectCaptionImprovement` no `report-diagnostic-block.tsx`

## O que falta (delta desta iteração)

### 1. Top Snapshot Row (3 mini-cards)

Adicionar uma fila de 3 cartões compactos logo abaixo do header:
- **A) Tema dominante** — `themes.items[0].label` · badge `auto`
- **B) Intenção principal** — derivado de `contentTypeMix.dominant` (ex.: "Educar e gerar autoridade") · badge `auto`
- **C) Oportunidade principal** — derivado de `editorialReading.recommendedImprovement` ou CTA weakness · badge `auto`/`ai`

Estes 3 valores já existem nos dados; é só extraí-los e renderizar. Sem novas chamadas.

### 2. Theme clusters com role + confidence + evidence

Adicionar ao tipo `CaptionThemeItem`:
- `role`: `"educativo" | "autoridade" | "conversão" | "comunidade" | "opinião" | "promocional" | "outro"` — inferido deterministicamente a partir dos termos do `CONTENT_MIX_TERMS` que co-ocorrem com o tema
- `confidence`: `"low" | "medium" | "high"` — baseado em `postsCount` vs. `sampleSize` (high ≥ 40%, medium ≥ 20%, low < 20%)

O evidence/excerpt já existe. A UI muda de lista plana para cluster cards com role tag + barra de confiança.

### 3. CTA strength label

Adicionar `ctaStrength: "weak" | "moderate" | "strong"` ao `CtaPatternsBlock`:
- strong: `hasCtaPct ≥ 50`
- moderate: `hasCtaPct ≥ 20`
- weak: `< 20`

Renderizar como chip colorido no bloco CTA.

### 4. Action Bridge strip

Adicionar ao tipo `CaptionIntelligence`:
```ts
actionBridge: {
  title: string;
  body: string;
  priorityType: "alta" | "media" | "oportunidade";
}
```

Derivado deterministicamente da `editorialReading.recommendedImprovement` + CTA gap. Renderizado como strip final antes da nota de rodapé. Também consumível pelo `injectCaptionImprovement` existente.

### 5. Microcopy update

Header sub-copy muda para:
> "Análise ao texto das legendas, CTAs, temas recorrentes, expressões e intenção editorial."

### 6. Content Type Mix dominant highlight

Adicionar texto acima da barra de distribuição:
> "Função dominante: Educativo / autoridade"
> "7 de 8 legendas procuram ensinar ou contextualizar."

Já temos `dominant` e `count` — é só formatar.

## Ficheiros a alterar

| Ficheiro | Alteração |
|---|---|
| `src/lib/report/caption-intelligence.ts` | Adicionar `role`, `confidence` a `CaptionThemeItem`; adicionar `ctaStrength` a `CtaPatternsBlock`; adicionar `actionBridge` ao output; adicionar `snapshot` convenience object |
| `src/components/report-redesign/v2/report-caption-intelligence.tsx` | Snapshot row, cluster UI com role/confidence, CTA strength chip, action bridge strip, microcopy, dominant function highlight |

## NÃO muda

- Não há chamada a OpenAI/Lovable AI — tudo continua determinístico + `aiLanguageText` opcional que já existia
- Não muda o schema da base de dados
- Não mexe em ficheiros locked
- Não duplica hashtags (separação já garantida por `buildThemes`)
- Não toca em PDF, admin, /report.example, pagamento, auth, scraping, benchmark
- Não refactora o action-plan system (o `injectCaptionImprovement` já consome `actionBridge`)
- `source-badge.tsx` — não muda (já completo)
- `report-diagnostic-block.tsx` — ajuste mínimo se o `injectCaptionImprovement` precisar de ler `actionBridge` em vez de campos separados

## JSON shape resultante (para referência)

A `CaptionIntelligence` fica com esta forma:

```ts
{
  sampleSize: number;
  available: boolean;
  snapshot: {
    dominantTheme: string;
    mainIntent: string;
    mainOpportunity: string;
  };
  themes: { source; items: CaptionThemeItem[] };   // +role, +confidence
  contentTypeMix: { source; items; dominant };
  recurringExpressions: { source; items };
  ctaPatterns: CtaPatternsBlock;                     // +ctaStrength
  editorialReading: EditorialReadingBlock;
  actionBridge: { title; body; priorityType };
}
```

## Validação

- `bunx tsc --noEmit` passa
- `bunx vitest run` passa (51/51)
- Verificação visual no preview: snapshot row legível em < 5s, clusters com role tags, CTA com strength chip, action bridge strip
- Mobile 375px: stacked, sem overflow horizontal
