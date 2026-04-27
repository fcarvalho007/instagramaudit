# Auditoria read-only · Payload Apify → Report v2

## O que já fiz (exploração)

Inspeccionei os 5 ficheiros pedidos e o snapshot real persistido:

- **Snapshot**: `id 311067c4-7de3-44e0-b0ee-d20c3a2d5004`, criado a `2026-04-26 18:34:25Z`, expira em ~24h. `instagram_username = frederico.m.carvalho`, provider `apify`, status `ready`.
- **`normalized_payload` top-keys** (5): `profile`, `content_summary`, `format_stats`, `posts` (12 itens), `competitors` (vazio).
- **Profile real persistido**: username, display_name, avatar_url, bio, is_verified=true, posts_count=2615, followers_count=9458, following_count=2289 — completo.
- **Posts**: cada post traz `id`, `permalink`, `format`, `caption`, `hashtags[]`, `mentions[]`, `weekday`, `hour_local`, `taken_at`, `taken_at_iso`, `likes`, `comments`, `is_video`, `video_views` (null em imagens), `thumbnail_url`, `engagement_pct`. `shortcode` veio `null` no exemplo (a Apify não devolveu o campo) — mas o `permalink` veio completo, logo o slug pode ser extraído dele.
- **Raw Apify NÃO é guardado**. O fluxo `analyze-public-v1.ts` chama o actor `apify/instagram-scraper`, passa pelas funções `normalizeProfile` + `enrichPosts` e descarta o `Record<string, unknown>` original. Não há `raw_payload` em lado nenhum.

---

## 1 · Tabela de auditoria · 16 campos pedidos

| Campo | Origem (raw → normalized) | Persistido | Usado no report | Valor visual | Risco / Limitação |
|---|---|---|---|---|---|
| **post thumbnail** | `displayUrl/display_url/imageUrl/thumbnail*` → `posts[i].thumbnail_url` | ✅ sim (URL completo do CDN do Instagram) | ❌ **NÃO** — `buildTopPosts` usa `THUMB_GRADIENTS[idx]` | Alto — substitui placeholders gradient pelas imagens reais nos top-posts | URLs de CDN do IG são assinados e expiram em ~horas/dias (`oe=` query param). Para ficar permanente é preciso re-proxy ou armazenar |
| **post permalink** | `url/postUrl/permalink` → `posts[i].permalink` | ✅ sim | ❌ **NÃO** — `topPosts` no adapter não emite `permalink` | Médio — permite "abrir post original" no card | Nenhum — string simples. ReportData precisa de uma propriedade nova |
| **caption** | `caption/text/edge_media_to_caption` → `posts[i].caption` (truncada a 500 chars) | ✅ sim | ✅ sim — `topPosts[i].caption.slice(0,200)` + `extractTopHashtags/Keywords` | — | Truncagem a 500 chars no normalize + 200 no card. OK |
| **hashtags** | extraídas da caption via regex unicode → `posts[i].hashtags[]` | ✅ sim | ✅ sim — `topHashtags` (top 5 globais) | — | Apenas as que estão na caption. Não há hashtags do edge `tagged_users` |
| **mentions** | extraídas da caption via regex → `posts[i].mentions[]` | ✅ sim | ❌ **NÃO** | Baixo/Médio — útil para detectar parcerias / co-marketing | Nenhum — array já cá |
| **likes** | `likesCount/likes` → `posts[i].likes` | ✅ sim | ✅ sim | — | OK |
| **comments** | `commentsCount/comments` → `posts[i].comments` | ✅ sim | ✅ sim | — | OK |
| **video views** | `videoViewCount/videoPlayCount/video_views/views` → `posts[i].video_views` | ✅ sim | ⚠️ parcial — somado em `temporalSeries.views`, com flag `meta.viewsAvailable` | — | `null` em imagens, número em Reels. OK |
| **post format** | `type/productType/__typename/isVideo` → `posts[i].format` (`Reels`/`Carrosséis`/`Imagens`) | ✅ sim | ✅ sim — top posts + `format_stats` + `keyMetrics.dominantFormat` | — | OK |
| **post timestamp** | `timestamp/takenAtTimestamp/taken_at` → `posts[i].taken_at` + `taken_at_iso` | ✅ sim | ✅ sim — `formatPtDateShort` no card, `temporalSeries`, janela | — | OK |
| **post engagement %** | calculado `(likes+comments)/followers*100` → `posts[i].engagement_pct` | ✅ sim (já calculado) | ✅ sim — sort dos top posts, heatmap, best days | — | Comments=0 em todos os 12 posts do snapshot real → engagement quase só likes. Possível bug Apify (ver §5) |
| **publication weekday/hour** | derivado do timestamp UTC → `posts[i].weekday` + `posts[i].hour_local` | ✅ sim | ✅ sim — `postingHeatmap`, `bestDays`, `bestSlots` | — | `hour_local` é UTC, NÃO é local. Sem fuso do perfil, "melhor hora" pode estar deslocada (Lisboa = UTC+0/+1) |
| **profile avatar** | `profilePicUrlHD/profilePicUrl/profile_pic_url` → `profile.avatar_url` | ✅ sim | ❌ **NÃO** — adapter força `AVATAR_GRADIENT` | Médio/Alto — humaniza o cabeçalho do report | Mesmo problema das thumbs: URL CDN expira |
| **biography** | `biography/bio` → `profile.bio` | ✅ sim | ❌ **NÃO** — `ReportData.profile` não tem campo `bio` | Médio — contexto editorial no header | Adicionar campo opcional no contrato |
| **profile verification** | `verified/isVerified` → `profile.is_verified` | ✅ sim | ✅ sim — `profile.verified` chega a `ReportData` | — | OK |
| **followers/following/posts count** | `followersCount`, `followsCount`, `postsCount` (e snake_case fallbacks) → `profile.*_count` | ✅ sim, todos | ✅ sim — `profile.followers/following/postsCount` | — | OK |

**Score global**: 16/16 campos disponíveis no `normalized_payload`. **5/16 não estão a ser aproveitados pelo report** (thumbnail real, permalink, mentions, avatar real, bio).

---

## 2 · Fields que podem existir no raw Apify mas não estão persistidos

**Não posso confirmar com certeza** quais existem no raw — só o `normalized_payload` foi guardado, o raw foi descartado pelo `enrichPosts` no momento do scrape. Posso apenas listar o que `enrichPosts` já procura mas pode não chegar (não inventa campos):

- `pk`, `code` (alternativas a `id` e `shortcode`)
- `edge_media_to_caption.edges[].node.text` (variante GraphQL antiga)
- `displayUrl` vs `imageUrl` vs `thumbnailUrl` — várias variantes para a mesma imagem

Campos que **provavelmente existem** no raw da Apify `apify/instagram-scraper` (baseado na documentação pública do actor — não vi no payload real) e que poderiam ter valor:

- `locationName`/`location` — geolocalização do post
- `taggedUsers[]` — lista de menções via tag (não na caption)
- `firstComment` — primeiro comentário, frequentemente do autor (CTA)
- `latestComments[]` — últimos N comentários (sentiment, perguntas)
- `images[]`/`childPosts[]` para carousels — número de slides (`carouselMediaCount`)
- `musicInfo` para Reels — música usada
- `coauthorProducers[]` — colabs (Reels colaborativos)
- `videoDuration` — duração do vídeo em segundos

**Não estão garantidos.** Para confirmar é preciso uma execução controlada (ver §6).

---

## 3 · Recomendação sobre `raw_field_inventory`

**Sim, vale a pena**, mas em forma minimalista e sem dados sensíveis:

- Numa próxima migração (fora deste prompt), adicionar coluna nullable `analysis_snapshots.raw_field_inventory jsonb` com o formato:
  ```json
  {
    "profile_keys": ["username","fullName","biography",...],
    "post_keys_sample": ["id","shortcode","caption","displayUrl","videoUrl","musicInfo","taggedUsers",...],
    "actor_version": "apify/instagram-scraper@2026-04-26",
    "captured_at": "2026-04-26T18:34:25Z"
  }
  ```
- Apenas **nomes** de chaves + meta da actor run; **nunca** valores ou URLs.
- Persistir só na primeira run de cada handle (ou 1 vez por dia) para não inflar a tabela.
- Esta coluna serve só para auditoria/diagnóstico — o normalize continua a ser a fonte de verdade.

---

## 4 · O que já é usável para Report v2 (sem nova run Apify)

Tudo isto **já está no snapshot real do `frederico.m.carvalho`** e só falta o adapter ligar:

1. **Avatar real** — `profile.avatar_url` está no payload, basta o `buildProfileSection` deixar de forçar `AVATAR_GRADIENT` e passar a URL ao componente, com fallback gradient quando `null`.
2. **Bio** — `profile.bio` está no payload. Falta adicionar `bio?: string | null` ao `ReportData["profile"]` e renderizar no header.
3. **Thumbnails reais nos top posts** — `posts[i].thumbnail_url` está no payload. Falta o `buildTopPosts` emitir `thumbnailUrl` em paralelo com o gradient (gradient fica como fallback quando expirar ou for null).
4. **Permalinks nos top posts** — `posts[i].permalink` está no payload. Falta adicionar `permalink?: string | null` ao item top-post e abrir num link externo.
5. **Mentions** — `posts[i].mentions` está no payload. Pode alimentar uma nova secção "Co-marketing detectado" ou aparecer no card de cada post.

**Nenhuma destas 5 melhorias requer chamar Apify ou alterar o normalize**. São puras alterações no adapter `snapshot-to-report-data.ts` e nos tipos do `ReportData`. **Não as estou a fazer agora** — apenas listo o que está pronto a ser ligado.

---

## 5 · O que está em falta / merece atenção

1. **`comments=0` em todos os 12 posts** do snapshot real. Pode ser:
   - Limitação do actor `apify/instagram-scraper` em modo `details` com `addParentData=false`.
   - Posts realmente sem comentários (improvável em 12/12).
   - Vale uma run controlada com `addParentData=true` para confirmar.
2. **`hour_local` é UTC, não local**. Sem timezone do perfil, "melhor hora para publicar" está deslocada. Solução pragmática: assumir Europe/Lisbon para os perfis allowlistados (todos pt) ou guardar UTC e converter no front com `Intl.DateTimeFormat`.
3. **CDN do Instagram expira** os URLs de avatar e thumbnail (param `oe=` é um Unix timestamp). Para reports persistentes (PDF, partilha), seria preciso re-proxy ou storage no Supabase. Para a UI live (cache 24h) o problema é negligenciável — os URLs duram dias.
4. **`shortcode` veio null** no post de exemplo. O `permalink` resolve, mas se o adapter quiser construir embeds ou deep-links, deve sempre derivar do `permalink` via `permalinkSlug()` (já existe em `normalize.ts`).
5. **Competitors[] está vazio** porque a smoke-test correu sem competitors. Não há dados para auditar essa via — precisa de outra run.

---

## 6 · É preciso outra run Apify mais tarde?

**Sim, mas só uma e controlada**, para responder a 3 perguntas concretas:

1. **Que chaves o raw Apify devolve realmente?** Para isto basta logar `Object.keys(rawProfile)` e `Object.keys(rawPost)` no `fetchProfileWithPosts` (ou popular o futuro `raw_field_inventory`). Sem persistir valores.
2. **`comments=0` é real ou perdido?** Comparar uma run com `addParentData=true` vs `false`.
3. **Como funciona com competitors?** Correr com 1 competitor (ex.: outro perfil pt da allowlist) para ver `competitors[]` populado.

**Custo estimado da run**: 1 perfil + 1 competitor × $0.10 cap = ≤$0.20. Não há urgência.

---

## 7 · Próximos passos recomendados (ordem de menor → maior risco)

1. ✅ **Esta auditoria fica como referência.** Sem alterações.
2. ⏭️ **Próximo prompt (read-only ou escrita pequena)**: ligar os 5 campos já disponíveis no adapter — avatar real, bio, thumbnail real, permalink, mentions. Apenas `snapshot-to-report-data.ts` + `ReportData` types + componentes que renderizam. Sem Apify, sem migrações.
3. ⏭️ **Mais tarde**: migração para `raw_field_inventory` + 1 run controlada para popular o inventário e tirar o `comments=0` a limpo.
4. ⏭️ **Último**: estratégia de re-proxy / storage para imagens do CDN se o report passar a ter PDF persistente.

---

## Resumo de validação

- ✅ Sem chamar Apify
- ✅ Sem escritas na DB (apenas `SELECT`)
- ✅ Sem alterações de código
- ✅ Sem mexer em landing, `/analyze/$username`, `/report/example`, PDF, email
- ✅ Sem migrações
- ✅ Sem mexer em secrets

**Aguardo aprovação para o próximo passo** (sugestão: ligar os 5 campos já persistidos ao adapter `snapshotToReportData`, no próximo prompt). Se aprovares apenas a auditoria sem implementação, isso também fica registado.
