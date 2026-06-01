## Diagnóstico

Testei o proxy `/api/public/ig-thumb` em produção com um URL real do snapshot mais recente do `@frederico.m.carvalho`:

```
proxy:  status=404  body="upstream error"
direct: status=403  (Instagram CDN bloqueia o fetch do worker)
```

Causa raiz: o Instagram CDN (`*.cdninstagram.com`) **recusa qualquer pedido server-to-server** que não venha de um browser com cookies/sessão, mesmo com User-Agent e Referer credíveis. Devolve 403 para o nosso worker Cloudflare. Por isso o proxy nunca consegue servir a imagem, e o componente `BestWorstCard` cai sempre no fallback do ícone de formato.

Notas adicionais:
- O URL nem sequer está expirado (`oe=` aponta para o futuro). É bloqueio anti-bot por IP/região, não TTL.
- O domínio `instagramaudit.lovable.app` ainda redireciona para `auditprofiles.com` (302) — irrelevante para o bug, mas pode confundir testes manuais.
- O ícone de formato (gradient + Reels/Image/Carousel) aparece exatamente porque o `<img>` faz `onError` → `setImgError(true)`.

Conclusão: **a abordagem de proxy não é viável**. O Instagram nunca vai deixar o nosso servidor passar. Tem de ser feito ao contrário — descarregar a imagem **uma única vez, no momento da análise**, e guardar permanentemente.

## Estratégia recomendada

Persistir os thumbnails em **Supabase Storage** (bucket público `post-thumbnails`) no momento em que o snapshot é construído, e gravar no `normalized_payload.posts[*].thumbnail_url` o URL público estável do bucket. O proxy `/api/public/ig-thumb` deixa de ser usado e é removido.

Vantagens:
- O fetch do CDN é feito imediatamente após o Apify devolver os dados — janela em que o URL ainda é "fresco" e, mais importante, podemos usar o **`User-Agent` + `Referer` adequados a partir do worker** dentro de um job server-side (ainda assim alguns 403s podem ocorrer; ver fallback abaixo).
- URLs do bucket nunca expiram e custam ~zero a servir.
- Remove latência por imagem em cada visualização do relatório.
- Remove um endpoint público (`/api/public/ig-thumb`) com risco de abuso.

Se mesmo no worker o IG continuar a bloquear, alternativa: usar a **Apify Key-Value Store** (`OUTPUT.images`) — alguns actors do Instagram já guardam os ficheiros internamente. Tem de ser verificado no actor atualmente em uso.

## Plano de implementação (uma feature por prompt)

Esta é uma feature isolada. Sugiro **dois prompts encadeados**:

### Prompt 1 — Persistência on-the-fly + remoção do proxy

☐ Criar migração:
   - Bucket `post-thumbnails` (public, MIME `image/*`, file_size_limit ~2 MB).
   - Política `select` pública.
   - Política `insert` apenas `service_role`.

☐ Novo módulo `src/lib/report-snapshots/persist-thumbnails.server.ts`:
   - Recebe array `{ shortcode, thumbnail_url }` (raw CDN).
   - Para cada um: `fetch` com UA Chrome + Referer; se 2xx + `image/*`, faz upload via `supabaseAdmin.storage.from('post-thumbnails').upload(\`${snapshotId}/${shortcode}.jpg\`, blob, { upsert: true, contentType })`; devolve o `publicUrl`.
   - Se falhar (403, timeout, content-type errado), devolve `null` — fallback do ícone continua a funcionar.
   - Concorrência limitada (≤4 em paralelo) para não rebentar com o worker.
   - Log estruturado por shortcode (`success` / `failed_status` / `failed_network`).

☐ Em `build-report-snapshot-payload.server.ts`:
   - Antes de gravar `normalized_payload`, chama `persistThumbnails` para `posts[]` do próprio perfil + competidores.
   - Substitui `thumbnail_url` (CDN) pelo URL do bucket; se `null`, deixa `null`.

☐ Em `snapshot-to-report-data.ts` e `block02-diagnostic.ts`:
   - Remover todos os 4 sítios que constroem `/api/public/ig-thumb?url=…`.
   - Passar `thumbnail_url` diretamente (já é URL absoluto do bucket).

☐ Apagar `src/routes/api/public/ig-thumb.ts` + entrada no `routeTree.gen.ts` (regenerado pelo plugin).

☐ Verificação: `bunx tsc --noEmit` + um analyze fresco do `@frederico.m.carvalho` + abrir Network no browser e confirmar que os pedidos a `.../storage/v1/object/public/post-thumbnails/...` devolvem 200 com `image/jpeg`.

### Prompt 2 (opcional) — Backfill de snapshots antigos

Só se for útil. Job admin pontual que percorre `analysis_snapshots` recentes onde `thumbnail_url` ainda aponta para `cdninstagram.com` e tenta migrar para o bucket. Snapshots cujos URLs já expiraram ficam sem thumbnail (fallback).

## Detalhes técnicos

- **Bucket público vs assinado**: público é mais simples e o conteúdo não é sensível (já era exibido publicamente no Instagram). Cache do CDN do Supabase trata da entrega.
- **Tamanho**: thumbnails IG `t51.71878-15` rondam 50–200 KB. 12 posts × 5 concorrentes × ~150 KB ≈ 9 MB por análise. Aceitável.
- **Custo storage**: desprezável face ao custo de Apify/OpenAI.
- **Locked files**: nenhum dos ficheiros tocados está em `LOCKED_FILES.md` (vou confirmar antes de editar).
- **Sem alterações ao mockup `/report.example`** nem ao layout dos cards (continua tudo igual; só a fonte da imagem muda).
- **Sem alterações de copy, OpenAI ou Apify limits**.

## Risco

P1 — se o Cloudflare worker também apanhar 403 do IG CDN em larga escala, o sintoma é o mesmo de hoje (ícone de fallback). Nesse caso o próximo passo é investigar se o actor Apify atual expõe `OUTPUT.images` na key-value store e usar isso como fonte. Vou medir a taxa de sucesso no Prompt 1 antes de decidir.

## Checkpoint

☐ Aprovas avançar com o Prompt 1 (persistência + remoção do proxy)?
☐ Queres que o backfill (Prompt 2) seja já planeado ou só depois de validar o sucesso live?
