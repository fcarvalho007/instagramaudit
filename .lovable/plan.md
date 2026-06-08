# Auditoria — Completude de Dados do Concorrente em `nunomarkl`

> Plan mode. Nenhum ficheiro alterado. Nenhum provider chamado. Nenhuma escrita em DB.

## TL;DR

O snapshot atual de `nunomarkl` (`8a9b80ff…`, 2026-05-27) tem 2 concorrentes (`manzarra`, `corpodormente`) mas **cada entrada de concorrente só persistiu 3 chaves**: `success`, `profile`, `content_summary`. Faltam totalmente: `posts[]`, `format_stats`, `weekday_counts`, `top_hashtags`. É um **snapshot velho, anterior ao Phase 2B** — o pipeline atual em `analyze-public-v1.ts:1151–1186` produz esses campos.

Adicionalmente, o `report_snapshot` correspondente (`9d74e329…`) foi gravado com `competitor_usernames: []` — está órfão do bloco de concorrentes, provavelmente baked antes da etapa de competidores concluir.

**Re-correr "Add Competitor"** repara: format_stats, weekday_counts, top_hashtags, posts[], hashtags, e regenera o report_snapshot.

**NÃO repara via re-run** (são gaps de pipeline, não de snapshot velho):
- `thumbnail_storage_url` em posts de concorrente — é **explicitamente removido** em `analyze-public-v1.ts:1174`.
- `avatar_storage_url` de concorrente — pipeline não faz upload de avatars de concorrente para o bucket.

A boa notícia: as componentes de UI já tratam estes casos como "Dados indisponíveis" (não como zero) graças ao trabalho da auditoria anterior — `hasFormatStats`, `hasWeekdayData`, `isPositive(...)` gates, `MissingSide`, fallback de iniciais no avatar.

---

## Identidade do snapshot

| Campo | Valor |
|---|---|
| `analysis_snapshots.id` | `8a9b80ff-15dc-45d4-b40d-b22e588c488b` |
| `created_at` | 2026-05-27 10:55 UTC |
| `competitor_usernames` | `["manzarra", "corpodormente"]` |
| Posts primários | 12 (com caption, hashtags, engagement, mas **sem `thumbnail_storage_url`**) |
| Concorrentes | 2 (ambos `success: true`) |
| `report_snapshot.id` | `9d74e329-627b-4fb3-b2c8-85ddf2dde6dd` |
| `report_snapshot.competitor_usernames` | `[]` (órfão) |

---

## Tabela de completude — Competitor #1 (`manzarra`)

| Campo | Raw payload | Mapeado em breakdown | Card que usa | Razão de falha |
|---|---|---|---|---|
| `username` | ✓ | ✓ | Headers | — |
| `display_name` | ✓ | ✓ | Headers | — |
| `avatar_url` (CDN assinado) | ✓ | ✓ | Avatares | Vai expirar → fallback de iniciais |
| `avatar_storage_url` | ✗ | n/a | — | **Pipeline não persiste avatar de concorrente** |
| `followers_count` | ✓ | ✓ | Hero, overview | — |
| `posts_analyzed` | ✓ (via content_summary) | ✓ | Cadence, engagement | — |
| `average_engagement_rate` | ✓ | ✓ | Engagement | — |
| `average_likes` / `comments` | ✓ | ✓ | Engagement | — |
| `dominant_format` | ✓ | ✓ | Overview | — |
| `estimated_posts_per_week` | ✓ | ✓ | Cadence (stat) | — |
| `posts[]` | ✗ | `hasPosts: false`, `[]` | Cadence strip, Format derive | **Snapshot velho** (pré Phase 2B) |
| `format_stats` | ✗ | `hasFormatStats: false`, `null` | Mix de formatos | **Snapshot velho** |
| `weekday_counts` | ✗ | `hasWeekdayData: false`, zeros | Ritmo por dia | **Snapshot velho** |
| `top_hashtags` | ✗ | `[]` | Hashtags compare | **Snapshot velho** |
| `thumbnail_storage_url` (posts concorrente) | ✗ | n/a | Cadence thumbs | **Stripped por design** em `analyze-public-v1.ts:1174` |

---

## Causa raiz por card

| Card | Estado visível | Causa raiz | Re-run resolve? |
|---|---|---|---|
| Taxa de engagement | ✅ Renderiza dados reais | `content_summary` presente | n/a |
| Cadência semanal (stat) | ✅ Renderiza | `estimated_posts_per_week` presente | n/a |
| Cadência semanal (thumbnails) | ⚠️ Tira-só-iniciais / "Miniaturas indisponíveis" | `posts[]` ausente (snapshot velho) **+** `thumbnail_storage_url` strip (design) | **Parcial**: re-run traz posts e captions, mas thumbs continuam a expirar porque pipeline não guarda storage URL para concorrente |
| Mix de formatos | ⚠️ `MissingSide` "Sem dados de formatos" | `format_stats` ausente + `posts[]` ausente | ✅ Sim |
| Ritmo por dia | ⚠️ Aside "Sem dados suficientes do concorrente" | `weekday_counts` ausente + `posts[]` ausente | ✅ Sim |
| Hashtags concorrente | ⚠️ Vazio | `top_hashtags` ausente | ✅ Sim |
| Avatares concorrente | ⚠️ Iniciais coloridas após expiry | Só CDN assinado, sem `avatar_storage_url` | ❌ Não — gap de pipeline |
| Bloco competidores no report_snapshot | ✗ Inexistente (`competitor_usernames: []`) | Report baked antes de competitor scrape concluir / via flow antigo | ✅ Sim (re-run completo) |

---

## Zero vs Missing — comportamento atual

| Caso | Render | Verdict |
|---|---|---|
| `averageEngagementRate === 0` (zero real) | Card `null` (oculto) | ✅ Correto |
| `estimatedPostsPerWeek === 0` (zero real) | Card `null` (oculto) | ✅ Correto |
| `weekdayCounts = [0…0]` derivado de posts ausentes | Aside "Sem dados" | ✅ Correto (graças à flag `hasWeekdayData`) |
| `formatStats === null` ausente | `MissingSide` panel | ✅ Correto (graças à flag `hasFormatStats`) |
| `posts_analyzed` divergente entre lados | Usa o valor de cada lado, sufixo "Dados do concorrente indisponíveis" quando assimétrico | ✅ Correto (post-auditoria anterior) |

**Conclusão:** o tratamento "zero vs missing" já foi corrigido na pass anterior. Não há regressão — o que vê na rota é o estado *correto* perante um snapshot velho.

---

## Cards seguros para MVP

Todos os cards de comparação são seguros para MVP — degradam-se com mensagens explícitas. O que precisa de ação **operacional** (não de código):

1. **Re-correr análise completa de `nunomarkl` com os mesmos concorrentes** para gerar snapshot novo com `posts[]`, `format_stats`, `weekday_counts`, `top_hashtags` e regenerar o `report_snapshot` com `competitor_usernames` populado.

E precisa de ação **de pipeline** (separada, plano próprio):

2. Persistir `avatar_storage_url` para concorrentes (igual ao perfil principal).
3. Persistir `thumbnail_storage_url` para posts de concorrente (remover o strip em `analyze-public-v1.ts:1174` para este campo apenas, ou fazer upload deliberado).

---

## Prompt exato para corrigir tratamento de dados em falta (futuro)

> Já implementado na auditoria anterior. Não há novo trabalho de UI necessário.
> Se quiseres reforçar, eis o prompt-tipo para uma próxima ronda:

```
Goal: persistir storage para avatars e thumbnails de concorrente.

Tasks:
1. Em analyze-public-v1.ts, após buscar cada concorrente, fazer upload do
   avatar e dos thumbnails dos posts para o bucket `post-thumbnails`
   (mesmo helper usado para o perfil primário).
2. Remover ou condicionar o strip de `thumbnail_storage_url` na linha 1174
   para manter o campo nos posts de concorrente.
3. Adicionar `avatar_storage_url` no profile do concorrente e mapear em
   snapshot-to-report-data.ts.
4. Manter compatibilidade com snapshots velhos: `pickAvatarUrl()` continua
   a fazer fallback para `avatar_url` (CDN) se storage estiver vazio.
5. Não alterar UI: as componentes já consomem o campo se existir.
6. Sem novos providers, sem novos actors Apify, sem alterar schema.

Validation:
- Novo snapshot de nunomarkl tem `competitors[0].profile.avatar_storage_url`
  populado e `posts[].thumbnail_storage_url` populado.
- Re-render do report após 24h continua a mostrar avatares e thumbnails
  (CDN URLs já expiraram, storage URLs persistem).
- Typecheck passa, snapshots velhos continuam a renderizar com fallback.
```

---

## Ação imediata recomendada

1. **Re-correr** o "Add Competitor" / análise completa de `nunomarkl` com `manzarra` e `corpodormente` — repara 6 dos 8 cards afetados sem qualquer código.
2. Verificar visualmente em `/admin/report-preview/nunomarkl?variant=pro_preview&draft=false` que após o novo snapshot:
   - Mix de formatos mostra donut do concorrente,
   - Ritmo por dia tem 7 barras do concorrente,
   - Hashtags comparativas aparecem,
   - report_snapshot.competitor_usernames está populado.
3. Avatares e thumbnails de concorrente continuarão a expirar — abrir plano separado para o ponto 2/3 acima quando for prioritário.

> Aguardar aprovação ou pedido específico para avançar com qualquer alteração de código.
