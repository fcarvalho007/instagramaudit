
# Micro-alteração no adapter — novos campos enriched

Expor dois arrays derivados dos `posts[]` já existentes no snapshot, sem alterar backend, API, base de dados nem campos locked.

## Campos a adicionar em `ReportEnriched`

```ts
postingTimeline: Array<{
  date: string;       // YYYY-MM-DD
  published: boolean;
  postCount: number;
}>;

analysedPostFormats: Array<{
  date: string;       // YYYY-MM-DD
  type: "carousel" | "reel" | "image" | "video" | "unknown";
}>;
```

## Ficheiro afetado

`src/lib/report/snapshot-to-report-data.ts` — único ficheiro.

## Implementação

1. **Tipo**: adicionar os dois campos à interface `ReportEnriched` (linhas ~244-317).

2. **Builder `buildPostingTimeline`**: iterar `posts[]`, agrupar por data ISO (`taken_at_iso`). Gerar uma entrada por dia no intervalo `[minDate, maxDate]` com `published: true/false` e `postCount`. Se `posts` vazio → array vazio.

3. **Builder `buildAnalysedPostFormats`**: mapear cada post para `{ date, type }`, normalizando `format` via lookup (`"Reel" → "reel"`, `"Carousel" → "carousel"`, `"Imagem"/"Image" → "image"`, `"Video" → "video"`, fallback `"unknown"`). Ordenar por data ascendente. Se `posts` vazio → array vazio.

4. **Ligação**: chamar ambos em `snapshotToReportData()` e incluir no objecto `enriched` (~linha 1128).

5. **Sem efeitos colaterais**: nenhum componente é alterado — os campos ficam disponíveis para a Zona D os consumir na próxima iteração.

## Validação

- `tsc --noEmit` passa
- Suite de testes existente passa (103 testes)
- Nenhum outro ficheiro é tocado
