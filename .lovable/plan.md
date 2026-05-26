## Objetivo

Endurecer a camada de dados pública do Instagram (Apify) sem mudar comportamento: centralizar o limite de posts, documentar input vs derivado, e adicionar testes-guarda. Zero chamadas a Apify, zero alteração de UI/copy/preços.

## Ficheiros a alterar

1. **`src/lib/analysis/constants.ts`** (novo)
   - Exporta `PUBLIC_INSTAGRAM_POSTS_LIMIT = 12` com JSDoc explicando que é o cap aplicado tanto ao `resultsLimit` enviado ao Apify como ao slice defensivo em `enrichPosts`.
   - Exporta `APIFY_PUBLIC_DATA_CONTRACT` (objeto `as const`) com duas listas: `fields_from_apify` e `derived_internally`, conforme o briefing. Funciona como contrato vivo e é testável.

2. **`src/routes/api/analyze-public-v1.ts`**
   - Remover constante local `POSTS_LIMIT` (linha 95); importar `PUBLIC_INSTAGRAM_POSTS_LIMIT` de `@/lib/analysis/constants`.
   - Substituir `resultsLimit: POSTS_LIMIT` (linha 223) pela constante centralizada.
   - Expandir o comentário junto ao input do actor (linhas 229-232) para deixar explícito:
     - `directUrls`: 1 URL = 1 perfil.
     - `maxItems: 1`: um perfil por run (não 1 post).
     - `resultsLimit: PUBLIC_INSTAGRAM_POSTS_LIMIT`: até 12 posts dentro de `latestPosts[]` desse perfil.
     - Nota anti-confusão: nunca significa 12 perfis.

3. **`src/lib/analysis/normalize.ts`**
   - Remover `const POSTS_LIMIT = 12` (linha 257); importar `PUBLIC_INSTAGRAM_POSTS_LIMIT` e usá-lo no slice de `enrichPosts` (linha 520) e no JSDoc (linha 513).
   - Acrescentar bloco de comentário no topo (ou imediatamente antes de `normalizeProfile` e `enrichPosts`) a explicar:
     - Apify devolve campos públicos de perfil + `latestPosts[]`.
     - Engagement rate, cadência semanal, distribuição de formatos, hashtags/mentions e benchmark são derivados internamente (não vêm do Apify).
     - Apify não fornece reach, impressions, saves, profile visits ou stories.
     - `followers_count` é gating: ausente → `normalizeProfile` devolve `null` → análise falha de forma segura (sem benchmark fiável).

4. **`src/lib/analysis/__tests__/constants.test.ts`** (novo)
   - Confirma `PUBLIC_INSTAGRAM_POSTS_LIMIT === 12`.
   - Confirma que a string source de `src/routes/api/analyze-public-v1.ts` referencia `PUBLIC_INSTAGRAM_POSTS_LIMIT` no input do actor (leitura via `fs.readFileSync`, sem importar a rota — evita arrastar deps de servidor, padrão já usado em `analyze-public-v1-normalize.test.ts`).
   - Confirma que `enrichPosts` recebendo 20 posts brutos retorna no máximo `PUBLIC_INSTAGRAM_POSTS_LIMIT`.
   - Confirma que `APIFY_PUBLIC_DATA_CONTRACT.fields_from_apify` inclui chaves-âncora (`username`, `followers_count`, `caption`, `is_pinned`) e que `derived_internally` inclui (`engagement_rate`, `weekly_cadence`, `hashtags`, `benchmark_positioning`).

5. **`src/lib/analysis/__tests__/normalize-pinned-cadence.test.ts`** (novo, leve)
   - Reforça o invariante já coberto em `snapshot-pinned-toppost.test.ts` ao nível de `enrichPosts`: posts com `isPinned: true` continuam presentes no array (com `is_pinned: true`) e com hashtags/captions extraídas, garantindo que mexer na normalização não os apaga acidentalmente. A exclusão de pinned do cálculo de cadência continua a viver na camada `snapshot-to-report-data` e mantém o teste existente.

## Fora de scope

- Não alterar o nome do actor.
- Não alterar `resultsLimit` (mantém-se 12).
- Sem chamadas a Apify nos testes (tudo puro / fixtures).
- Sem mexer em UI, prompts OpenAI, preços, gates, admin CRM, `/report.example`.

## Validação

- `bunx tsc --noEmit`
- `bunx vitest run` (espera-se 509 anteriores + ≈4 novos a passar)

## Entregáveis no fim da implementação

1. Lista de ficheiros alterados.
2. Localização única do limite: `src/lib/analysis/constants.ts` → `PUBLIC_INSTAGRAM_POSTS_LIMIT`.
3. Confirmação de que pinned continua excluído de cadência (teste `snapshot-pinned-toppost.test.ts` mantém-se verde).
4. Confirmação de que `APIFY_PUBLIC_DATA_CONTRACT` documenta Apify vs derivado.
5. Resultados de `tsc` e `vitest`.
