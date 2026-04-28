## Objetivo

Eliminar rejeições `EVIDENCE_INVALID` causadas por aliases curtos (ex.: `average_comments`) que o modelo devolve em vez do caminho canónico (`content_summary.average_comments`), combinando duas defesas: prompt mais explícito + normalizador determinístico no validador. Sem nova chamada OpenAI/Apify/DataForSEO nesta fase.

## Alterações

### A) `src/lib/insights/prompt.ts`

1. **Reforço no `INSIGHTS_SYSTEM_PROMPT`** — substituir a linha atual sobre `evidence` por um bloco mais firme:
   - "Cada item de `evidence` DEVE ser uma string copiada exatamente, carácter a carácter, de `available_signals` (também repetido em `allowed_evidence_paths`)."
   - "Do not invent, shorten, abbreviate or paraphrase evidence paths. Use the exact strings from available_signals."
   - "Não usar aliases curtos como `average_comments`; usar o caminho canónico `content_summary.average_comments`."

2. **Duplicar a lista no payload do utilizador** — adicionar campo `allowed_evidence_paths: string[]` ao `InsightsUserPayload`, espelhando exatamente `available_signals`. Mantém compatibilidade (apenas adição) e reforça visualmente a regra. Atualizar `buildInsightsUserPayload` para emitir ambos os campos com o mesmo array.

   Nota: o hash de drift (`hashInsightsPrompt`) muda por inclusão do novo campo e pelo system prompt revisto — comportamento esperado, marca a nova versão do contrato.

### B) `src/lib/insights/validate.ts`

1. **Mapa estático de aliases → caminhos canónicos** (constante module-level):
   ```
   average_comments          → content_summary.average_comments
   average_likes             → content_summary.average_likes
   average_engagement_rate   → content_summary.average_engagement_rate
   engagement_rate           → content_summary.average_engagement_rate
   posts_per_week            → content_summary.estimated_posts_per_week
   estimated_posts_per_week  → content_summary.estimated_posts_per_week
   followers                 → profile.followers_count
   followers_count           → profile.followers_count
   posts_count               → profile.posts_count
   dominant_format           → content_summary.dominant_format
   ```

2. **Função `normalizeEvidencePath(path: string): string`** — pura, determinística:
   - Trim.
   - Se já corresponde a um caminho canónico em `allowedEvidence`, devolve tal e qual.
   - Caso contrário consulta o mapa de aliases; se houver match e o canónico estiver em `allowedEvidence`, devolve o canónico.
   - Caso contrário devolve o input original (deixa o validador rejeitar com `EVIDENCE_INVALID` como hoje).

3. **Aplicar antes da validação** dentro de `validateInsights`:
   - Para cada `item.evidence`, mapear cada string via `normalizeEvidencePath(ev, allowedEvidence)`.
   - Substituir o array em memória pelo array normalizado **antes** da verificação contra `allowedEvidence`.
   - O array final guardado em `sorted[i].evidence` usa os caminhos canónicos normalizados — assim persiste o canónico, não o alias.

4. **Guardrails inalterados**: contagem 3–5, `body ≤ 280`, `evidence.length > 0`, marcador quantitativo, deteção pt-BR, schema Zod, confidence enum.

### C) Validação local

- `bunx tsc --noEmit`
- `bun run build`
- Inspeção: confirmar que `normalizeEvidencePath("average_comments")` devolve `content_summary.average_comments` (assumindo que esse sinal está em `allowedEvidence`, o que é verdade para o snapshot do `frederico.m.carvalho` onde `cs.average_comments > 0`).

### D) Fora de âmbito (explícito)

- Sem chamada OpenAI.
- Sem Apify, sem DataForSEO.
- Sem invalidação de cache, sem migração SQL.
- Sem alterações de UI.
- Validação fresh fica para aprovação separada num próximo prompt.

## Detalhes técnicos

- O mapa de aliases é uma const `Record<string, string>` no topo do `validate.ts`; não há regex nem heurística — apenas lookup O(1).
- A normalização é idempotente: aplicar duas vezes dá o mesmo resultado.
- O `available_signals` continua a ser a fonte de verdade reconstruída via `buildInsightsUserPayload(ctx)` dentro do validador (não confiamos no echo do modelo).
- Se um alias mapear para um canónico que não esteja presente no contexto atual (ex.: modelo cita `followers` mas perfil tem 0 seguidores), o canónico não está em `allowedEvidence` e a rejeição ocorre — comportamento correto.

## Checkpoint

- ☐ `INSIGHTS_SYSTEM_PROMPT` atualizado com regra explícita "exact strings from available_signals"
- ☐ `InsightsUserPayload` ganha `allowed_evidence_paths` espelhando `available_signals`
- ☐ Mapa de aliases adicionado a `validate.ts`
- ☐ `normalizeEvidencePath` implementada e aplicada em `validateInsights`
- ☐ Caminhos canónicos persistidos no resultado (`sorted[i].evidence`)
- ☐ Guardrails (count, length, pt-BR, generic, schema) preservados
- ☐ `bunx tsc --noEmit` limpo
- ☐ `bun run build` limpo
- ☐ Sem chamadas a OpenAI/Apify/DataForSEO nesta fase
