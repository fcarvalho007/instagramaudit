# Estado: fix já aplicado

Inspeccionei `src/lib/insights/prompt.ts` e **todas as alterações pedidas já estão presentes** da iteração anterior:

## Confirmação por inspecção

### 1. `available_signals` aceita zero em campos numéricos serializados
`computeAvailableSignals` (linhas 137–196):

```ts
if (Number.isFinite(cs.posts_analyzed)) signals.push("content_summary.posts_analyzed");
if (Number.isFinite(cs.average_likes)) signals.push("content_summary.average_likes");
if (Number.isFinite(cs.average_comments)) signals.push("content_summary.average_comments");
if (Number.isFinite(cs.average_engagement_rate)) signals.push("content_summary.average_engagement_rate");
if (Number.isFinite(cs.estimated_posts_per_week)) signals.push("content_summary.estimated_posts_per_week");
...
if (Number.isFinite(post.likes))    signals.push(`top_posts[${idx}].likes`);
if (Number.isFinite(post.comments)) signals.push(`top_posts[${idx}].comments`);
```

→ `0` passa em `Number.isFinite`, logo é incluído.

### 2. `caption_excerpt` mantém-se condicional
```ts
const caption = (post.caption_excerpt ?? "").trim();
if (caption.length > 0) signals.push(`top_posts[${idx}].caption_excerpt`);
```

### 3. System prompt já reforça zero
Linha 54 de `INSIGHTS_SYSTEM_PROMPT`:
> Zero é evidência observada válida. Se um campo numérico aparece no payload com valor 0, pode ser citado como evidence desde que o caminho exacto conste de "allowed_evidence_paths". Zero is valid observed evidence: a numeric field with value 0 may be cited only if its exact path is listed in "allowed_evidence_paths".

### 4. Validador não precisa de alteração
`src/lib/insights/validate.ts` reconstrói `available_signals` via `buildInsightsUserPayload(ctx)` e rejeita qualquer caminho fora da lista. Logo:
- `top_posts[0].comments` com `comments=0` → permitido (está em `available_signals`)
- `top_posts[0].likes` com `likes=0` → permitido
- `top_posts[0].shares` → rejeitado (`EVIDENCE_INVALID`)
- Caminhos arbitrários → rejeitados

## Acção a executar

Como não há mudanças de código pendentes, proponho apenas correr validação para confirmar que o build actual da preview está limpo:

1. `bunx tsc --noEmit`
2. `bun run build`

Sem chamadas a OpenAI, Apify ou DataForSEO. Sem invalidar snapshots. Sem smoke test.

Depois disto, fica pronto para a chamada controlada quando aprovares.

## Garantias
- Sem alterações a `prompt.ts`, `validate.ts`, UI, PDF, admin, `/report.example` ou ficheiros locked.
- Sem alterações a base de dados.

**Diz "avança" para correr só typecheck + build.**
