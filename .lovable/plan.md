# Por que ainda não vês imagens reais

A implementação anterior está **tecnicamente correta**:
- O `thumbnail_url` chega ao componente.
- O `<img>` é renderizado e o browser tenta carregar.
- **Todas as 5 imagens falham com erro de rede** (confirmado por inspeção).
- O `onError` esconde o `<img>` → vês o gradiente.

O Instagram CDN (`scontent-*.cdninstagram.com`) **recusa pedidos diretos do browser** vindos de outros domínios, mesmo com `referrerPolicy="no-referrer"`. Isto não se resolve no cliente — só com proxy server-side.

## Solução: endpoint proxy `/api/public/ig-thumb`

Um endpoint server-side (Cloudflare Worker) faz o `fetch` à URL do Instagram (sem restrições CORS no servidor), faz cache, e devolve o binário ao browser.

```text
Browser  →  /api/public/ig-thumb?url=...  →  cdninstagram.com
         ←  image/jpeg + Cache-Control     ←
```

## Plano de implementação

1. **Criar `src/routes/api/public/ig-thumb.ts`**
   - GET com query `?url=<encoded>`
   - Validar que a URL pertence ao domínio `*.cdninstagram.com` (anti-SSRF)
   - `fetch(url, { headers: { 'User-Agent': '...', 'Referer': 'https://www.instagram.com/' } })`
   - Reencaminhar `Content-Type` e `body`
   - `Cache-Control: public, max-age=86400, s-maxage=604800` (1d browser, 7d edge)
   - Devolver 404 se Instagram retornar erro (deixa o gradiente assumir)

2. **Atualizar `src/lib/report/snapshot-to-report-data.ts`**
   - Em `buildTopPosts`, em vez de devolver a URL crua, devolver `/api/public/ig-thumb?url=${encodeURIComponent(rawUrl)}`
   - Manter o gradiente como fallback (já implementado)

3. **Não tocar em `report-top-posts.tsx`**
   - O componente já está pronto. Só muda o conteúdo de `thumbnailUrl`.

## Detalhes técnicos

- **Anti-SSRF**: validar `new URL(url).hostname.endsWith('.cdninstagram.com')`. Rejeitar tudo o resto com 400.
- **Sem custos provider**: não chama Apify, OpenAI nem DataForSEO.
- **Robustez**: se o Instagram expirar a URL (campo `oe=`), o proxy devolve 404 → o `onError` no cliente revela o gradiente. Comportamento idêntico ao atual mas com taxa de sucesso muito maior.
- **Edge runtime safe**: usa apenas `fetch` nativo, compatível com Workers.

## Validação

- `bunx tsc --noEmit`
- Visual QA em `/analyze/frederico.m.carvalho`: confirmar que pelo menos 4 das 5 imagens carregam.
- `/report/example` permanece intacto (não usa este endpoint).
- PDF não afetado (continua a usar URLs cruas no servidor, onde não há CORS).

## Checklist

- ☐ Criar `src/routes/api/public/ig-thumb.ts` com validação de hostname
- ☐ Ajustar `buildTopPosts` para devolver URL proxy
- ☐ Typecheck
- ☐ QA visual em `/analyze/frederico.m.carvalho`
- ☐ Confirmar `/report/example` inalterado

## Risco residual

- **Instagram pode bloquear o IP do Worker** se houver volume alto. Mitigação: cache agressiva no edge (já planeada). Para volumes maiores, futura migração para storage próprio (R2/Supabase Storage) com upload no momento do snapshot.
- **URLs `oe=` expiram** (cerca de 30 dias). Não há solução sem rehosting. Os snapshots atuais expiram em 2026 → tempo suficiente.
