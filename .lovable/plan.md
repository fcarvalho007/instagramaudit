## Fix evidence allowlist for `top_posts` — sem chamadas a providers

### Diagnóstico
O modelo cita `top_posts[0].comments`, `top_posts[0].likes` e `top_posts[0].caption_excerpt` porque vê esses campos no payload, mas `computeAvailableSignals` em `src/lib/insights/prompt.ts` (linhas 153-156) só expõe `format` e `engagement_pct` por post. O validador rejeita correctamente (`EVIDENCE_INVALID`).

A correcção é apenas alinhar o allowlist com os campos efectivamente visíveis no payload.

### Alterações

**1. `src/lib/insights/prompt.ts` — `computeAvailableSignals` (linhas 153-156)**

Substituir o loop actual por uma versão que adiciona, por post incluído (cap=3, ordem preservada), o caminho canónico para cada campo presente. Ordem determinística dentro de cada post: `format`, `engagement_pct`, `likes`, `comments`, `caption_excerpt`.

```ts
const cappedTopPosts = ctx.top_posts.slice(0, PROMPT_TOP_POSTS_CAP);
cappedTopPosts.forEach((post, idx) => {
  // `format` and `engagement_pct` are always serialised by the payload
  // builder below, so they are always citable when a post exists.
  signals.push(`top_posts[${idx}].format`);
  signals.push(`top_posts[${idx}].engagement_pct`);
  // The remaining fields are only citable when present in the source
  // post — keeps the allowlist aligned with what the model actually
  // sees and prevents citing zero/empty values as evidence.
  if (Number.isFinite(post.likes) && post.likes > 0) {
    signals.push(`top_posts[${idx}].likes`);
  }
  if (Number.isFinite(post.comments) && post.comments > 0) {
    signals.push(`top_posts[${idx}].comments`);
  }
  const caption = (post.caption_excerpt ?? "").trim();
  if (caption.length > 0) {
    signals.push(`top_posts[${idx}].caption_excerpt`);
  }
});
```

Notas:
- Cap de 3 mantido.
- Ordem determinística dentro de cada post e ao longo do array.
- Só adiciona o caminho quando o campo está realmente presente no source — não polui o allowlist com paths cujo valor seria vazio/zero.

**2. `src/lib/insights/prompt.ts` — `INSIGHTS_SYSTEM_PROMPT` (linha 52)**

Acrescentar uma frase explícita de fecho na regra de evidence, em pt-PT + reforço em inglês (já é o padrão da linha 52):

> "Se um campo aparece no payload mas não consta de `allowed_evidence_paths`, NÃO o citar como evidence. Evidence paths must be copied exactly from `allowed_evidence_paths`. If a field is visible in the payload but not listed in `allowed_evidence_paths`, do not cite it as evidence."

**3. `src/lib/insights/validate.ts`**

Sem alterações. O validador já faz lookup contra o `Set` derivado de `available_signals` via `buildInsightsUserPayload(ctx)`, portanto absorve automaticamente as novas paths. Continua a rejeitar qualquer `top_posts[i].<outro_campo>`.

**4. (Opcional) Comentário curto**

Acrescentar nota acima do bloco a confirmar que `top_posts[0].comments` passa a ser aceite quando `comments > 0` no source post.

### Validação (sem providers)
- `bunx tsc --noEmit`
- `bun run build`
- Inspecção manual: confirmar que `top_posts[0].comments` aparece em `available_signals` apenas quando o post tem `comments > 0`; e que paths como `top_posts[0].likes` continuam fora do allowlist quando o post tem `likes = 0`.

### Garantias
- Sem chamadas a OpenAI / Apify / DataForSEO.
- Sem invalidação de snapshots.
- Sem alterações a UI, `/report.example`, PDF, admin, ou ficheiros locked.
- Sem nova smoke test — aguarda autorização explícita.
