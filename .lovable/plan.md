## Estado actual

A implementação requerida **já foi aplicada na ronda anterior**. Verificação read-only confirma:

- `rg "aiHeroText|aiHeroEmphasis|deriveCopyFromAi|synthesizeTitleFromEmphasis|FORBIDDEN_PREFIX|splitFirstSentence|trimParagraphToSentence" src/` → **zero ocorrências**.
- `editorial-identity-card.tsx`: `copy` deriva sempre de `resolved.title` / `resolved.paragraph` (resolver determinístico via `deriveEditorialVerdict` + `buildFallbackVerdict`). Sem ramo legado.
- Props `aiHeroText` / `aiHeroEmphasis` removidas da interface e da chamada em `report-overview-block.tsx`.
- Helpers mortos removidos.
- "Leitura provisória" aparece **uma única vez** (chip na linha 386–395, guardado por `isProvisional = resolution.source !== "ai" || hasProvisionalWarning`). Não há aviso duplicado em texto separado.

## Plano

Como todos os requisitos do prompt já estão satisfeitos no código, o plano de implementação é apenas **validação final, sem alterações de ficheiros**:

1. Correr `bunx tsc --noEmit`.
2. Correr `bunx vitest run`.
3. Re-confirmar grep `aiHeroText|aiHeroEmphasis|deriveCopyFromAi` em `src/` → 0.
4. Reportar resultado.

## Fora de âmbito

OpenAI, Apify, DataForSEO, cache, `report_snapshots`, pricing, lead magnet, gates, schemas, i18n fora das chaves já existentes em `identity.*`. Nenhuma chamada a providers.

## Nota

Se ao validar encontrar qualquer regressão (ex.: TS error residual ou teste partido por causa de prop removida), corrijo cirurgicamente apenas nesse ponto e reporto. Caso contrário, não há ficheiros a alterar.