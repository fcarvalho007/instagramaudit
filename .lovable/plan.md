# Plan — Apify Lab: posts mode + temporal windows

Scope estrito: só `/admin/apify-lab` (server route + página). Produção (`analyze-public-v1`, free report, OpenAI, thumbnails, preços) não é tocada.

## 1. Causa raiz (recap)
`buildActorInput` força `resultsType: "details"` em todas as janelas. Nesse modo o `apify/instagram-scraper` devolve 1 item de perfil com `latestPosts` limitado (~12) e ignora `resultsLimit` + `onlyPostsNewerThan`. Por isso baseline/30d/60d/90d/365d devolveram sempre 12 posts e o mesmo intervalo.

## 2. Dois modos no Lab

| window_kind | mode | resultsType | resultsLimit | onlyPostsNewerThan | maxItems guardrail |
|---|---|---|---|---|---|
| baseline | details | details | 12 | — | 1 |
| 30d | posts | posts | 100 | 30 days | 100 |
| 60d | posts | posts | 200 | 60 days | 200 |
| 90d | posts | posts | 300 | 90 days | 300 |
| 365d | posts | posts | 1000 | 365 days | 1000 |

- Baseline mantém-se em details e é rotulada `purpose = current_free_report_baseline`.
- Em posts mode, o actor devolve uma lista plana de posts (sem objecto de perfil); `profile_metadata_present = false`.
- `maxItems` no guardrail acompanha `resultsLimit` para não bloquear artificialmente a janela. `maxTotalChargeUsd` mantém-se conservador por janela.

## 3. Migração mínima

Nova migração: adicionar colunas nullable a `public.apify_lab_runs`:

- `mode text` ('details' | 'posts')
- `purpose text` (ex.: 'current_free_report_baseline' | 'window_test')
- `results_type text`
- `results_limit integer`
- `only_posts_newer_than text`
- `raw_items_returned integer`
- `posts_extracted integer`
- `profile_metadata_present boolean`

Sem alterar grants/RLS existentes (tabela é admin-only via service role). Tipos Supabase regeneram automaticamente.

## 4. Server route (`src/routes/api/admin/apify-lab.ts`)

- Estender `WindowConfig` com `mode: 'details' | 'posts'` e `purpose`.
- `buildActorInput`: aplicar `resultsType` conforme `cfg.mode`. Em posts mode, omitir `latestPosts` cap e enviar `resultsLimit` + `onlyPostsNewerThan`.
- Extracção:
  - details → `extractLatestPosts(items[0])`, `profile_metadata_present = !!items[0]`.
  - posts → `posts = items` (lista plana), `profile_metadata_present = false`, `followers = 0` para `enrichPosts`.
  - Não coagir um modo para o outro; se `items` vazio em posts mode, `posts = []` e `normalize_ok = true` (lista vazia válida) — não inventar shape.
- Persistir os novos campos (mode, purpose, results_type, results_limit, only_posts_newer_than, raw_items_returned = items.length, posts_extracted = posts.length, profile_metadata_present).
- Falhas (timeout/upstream/network): persistir uma única linha com status + semantic_code + error_excerpt já sanitizado (já existe), garantindo `raw_items_returned = 0`, `posts_extracted = 0`.

## 5. Página (`src/routes/admin.apify-lab.tsx`)

- Banner novo (acima dos existentes):
  > "O relatório gratuito de produção usa `details` mode com os ~12 posts mais recentes. As janelas temporais (30/60/90/365d) usam `posts` mode e são experimentais."
- Novas colunas na tabela: `Mode`, `resultsType`, `resultsLimit`, `onlyPostsNewerThan`, `Raw items`, `Posts extraídos`, `Perfil meta?`.
- Aviso por handle: agrupar runs por `profile_handle` e, se todas as janelas (excluindo baseline) tiverem o mesmo `posts_returned`, `oldest_post_at` e `newest_post_at`, mostrar badge vermelho:
  > "Aviso: parâmetros de janela podem não estar a ter efeito para @handle."
- CSV hardening:
  - Novo `csvEscape(v)`: converte `null/undefined` → `""`; números/booleans → string; strings → recorta a 500 chars, remove `\r\n\t`, e envolve em aspas se contiver `,`, `"` ou whitespace, escapando `"` → `""`.
  - Header inclui as novas colunas (mode, purpose, results_type, results_limit, only_posts_newer_than, raw_items_returned, posts_extracted, profile_metadata_present, error_excerpt).
  - Garantir exactamente 1 linha por run, sem multilinha HTML (sanitize já corre no servidor, mas reforçamos no cliente via `csvEscape`).

## 6. Validação

- `bunx tsc --noEmit`.
- Smoke manual no Lab: 1 run baseline (details, espera ~12) + 1 run 30d (posts, esperar `raw_items_returned > 12` se o perfil tiver posts >30d) num handle do allowlist.
- Sem alterações em: `analyze-public-v1`, `report.example`, `unlock-modal`, pricing, OpenAI, thumbnails, normalize de produção (`enrichPosts` continua a ser chamado tal como hoje, só para verificar `normalize_ok`).

## 7. Ficheiros tocados

- `supabase/migrations/<timestamp>_apify_lab_modes.sql` (novo)
- `src/routes/api/admin/apify-lab.ts` (modos, extracção, persistência)
- `src/routes/admin.apify-lab.tsx` (banner, colunas, aviso por handle, CSV escaping)

## 8. Riscos / notas

- Posts mode pode custar mais por run; `maxTotalChargeUsd` por janela mantém-se como travão (0.1 / 0.2 / 0.3 / 1.0 USD) e o cap diário continua activo.
- Se o actor devolver shape inesperado em posts mode (ex.: objecto único), `raw_items_returned` reflecte-o e `posts_extracted = 0` — não há fallback silencioso.
- Migração só adiciona colunas nullable; runs antigas continuam a abrir (campos novos = NULL, UI mostra "—").
