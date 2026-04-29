# Auditoria — Consistência e qualidade dos prompts R4-A → Prompt 18

## Estado real verificado

| Prompt | Estado | Evidência |
|---|---|---|
| R4-A (enriquecer normalized_payload) | ✅ Implementado em `src/lib/analysis/normalize.ts` (linhas 283-297, 565-572) e tipos espelhados em `SnapshotPost` (`snapshot-to-report-data.ts` 81-89) | `video_duration`, `product_type`, `coauthors`, `tagged_users`, `caption_length`, `location_name`, `music_title`, `is_pinned` |
| R4-A.1 (invalidar snapshot + repopular) | ❌ Não executado | Sem migração de invalidação aplicada; snapshot atual do Frederico ainda sem campos R4-A |
| R4-B (`editorialPatterns` no adapter) | ❌ Não implementado | Sem `editorial-patterns.ts`; `ReportEnriched` (linhas 227-279) não expõe `editorialPatterns` |
| Prompt 18 (UI "Padrões que explicam") | ❌ Não implementado | Sem componente em `src/components/report-redesign/` |

Conclusão: só R4-A foi entregue. R4-A.1, R4-B e Prompt 18 continuam pendentes — o que afeta a consistência da sequência prometida.

## Refinamentos recomendados (antes de avançar com R4-B)

### 1. Fechar R4-A.1 antes de R4-B (ordem importa)

R4-B foi desenhado assumindo snapshots com campos novos. Se avançarmos com R4-B sobre o snapshot atual do Frederico (sem `video_duration`, `coauthors`, etc.), 4 dos 10 derivados ficam permanentemente `available:false` mesmo depois de re-analisar — porque o snapshot em DB nunca será refrescado sem invalidação explícita.

**Refinamento:** correr R4-A.1 (migração de invalidação + 1 análise fresh) **antes** de R4-B, para que os testes de aceitação do R4-B possam validar realmente os patterns que dependem de campos R4-A.

### 2. Falta um teste local da camada de normalização

R4-A foi entregue sem fixture test, embora o prompt original o recomendasse ("Add a small local fixture test if there is existing test infrastructure"). Existe infra de testes (`src/lib/insights/__tests__/validate-market.test.ts`).

**Refinamento:** adicionar `src/lib/analysis/__tests__/normalize-r4a.test.ts` com 2-3 fixtures (post Apify completo, post Apify mínimo legacy, post híbrido) para travar regressões nos novos pickers (`pickLocationName`, `pickMusicTitle`, `extractHandleList`).

### 3. Inconsistência de nomes entre `normalize.ts` e `SnapshotPost`

O módulo de normalização usa nomes snake_case persistidos (`video_duration`, `product_type`, `caption_length`, `location_name`, `music_title`, `coauthors`, `tagged_users`) e o adapter espelha-os exactamente — bom. Mas no `SnapshotPost` falta um campo que existe no normalize: `is_sponsored` / `productType === "ad"` (nenhum campo equivalente de "post patrocinado" foi propagado).

**Refinamento:** verificar se R4-A pretendia capturar `isSponsored` ou apenas `productType`. Se sim, adicionar `is_sponsored?: boolean | null` ao `SnapshotPost` e ao mapping; senão, documentar explicitamente que ficou fora do âmbito de R4-A para evitar confusão no R4-B (onde pode tentar usar-se "lift de posts patrocinados").

### 4. Defensividade de `caption_length` quebra retrocompatibilidade silenciosa

`normalize.ts:570` faz `caption_length: caption ? caption.length : 0`. Snapshots antigos não têm o campo; ao re-ler ficam com `undefined`. O R4-B vai usar `caption_length` para os "captionLengthBuckets" — se cair em `undefined`, o pattern fica vazio sem aviso.

**Refinamento:** no adapter (R4-B), derivar `caption_length` em runtime a partir de `caption?.length ?? 0` quando o campo persistido estiver ausente. Garante que o pattern funciona retroativamente em snapshots legacy sem precisar de re-análise.

### 5. Documentar versionamento do `normalized_payload`

Adicionar campos sem bumpar nenhum marcador de versão torna difícil saber, no futuro, se um snapshot tem ou não os campos R4-A. Hoje só se descobre por inspeção.

**Refinamento:** adicionar `normalized_payload.schema_version: 2` (ou `r4a_present: true`) no momento da escrita em `analyze-public-v1.ts`, para que R4-B (e futuras secções) possam decidir gates com base num único boolean em vez de testar campo a campo.

### 6. Plano R4-B precisa estado da arte do `report-shell` confirmado

`report-shell.tsx` é onde o Prompt 18 vai inserir a nova secção entre Market Signals e Performance over time. O ficheiro **não está em LOCKED_FILES.md**, mas é estrutural. Convém antes do Prompt 18 confirmar a ordem actual de secções e onde encaixar.

**Refinamento:** no Prompt 18, antes de escrever JSX, ler `report-shell.tsx` completo e citar a posição exata (entre quais componentes irmãos) onde o novo `<ReportEditorialPatterns />` vai ser inserido.

## Sequência corrigida proposta

```text
1. R4-A.1   → migração invalidate + 1 análise fresh (validar R4-A em DB)
2. R4-A.2   → fixture test do normalize (refinamento 2) + schema_version (refinamento 5) + decisão sobre is_sponsored (refinamento 3)
3. R4-B     → editorial-patterns.ts + integração no adapter (com fallback de caption_length, refinamento 4)
4. Prompt 18 → UI "Padrões que explicam" no report-shell
```

## Notas

- Nenhum refinamento exige tocar em ficheiros locked.
- Nenhum refinamento envolve novas chamadas a providers (excepto R4-A.1, já planeado).
- Todos cabem em prompts atómicos pequenos (≤ 1 ficheiro novo cada).

## Próximo passo

Aprovar a **sequência corrigida** acima — em particular, executar R4-A.1 antes de R4-B. Se aprovares, o próximo prompt cria a migração de invalidação da snapshot do Frederico + corre 1 análise fresh para validar os campos R4-A em DB.
