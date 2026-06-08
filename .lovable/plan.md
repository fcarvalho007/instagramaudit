# TikTok como terceira rede — auditoria de viabilidade e mapeamento de cards

Pricing público verificado em apify.com em 2026-06-08. Sem código. Sem chamadas a APIs.

## 0. Correções nos actor IDs do brief

| Brief disse | Real |
|---|---|
| `clockworks/tiktok-hashtag-scraper` = `GdWCkxBtKWOsKjdch` | **Errado.** `GdWCkxBtKWOsKjdch` é `clockworks/tiktok-scraper` (scraper genérico). O hashtag scraper é `clockworks/tiktok-hashtag-scraper` = `f1ZeP0K58iwlqG2pY`. |
| `clockworks/free-tiktok-scraper` = `OtzYfK1ndEGdwWFKQ` | Correto. |
| `clockworks/tiktok-profile-scraper` = `0FXVyOXXEmdGcV88a` | Correto. |
| `apidojo/tiktok-scraper` = `5K30i8aFccKNF5ICs` | Correto. |

---

## 1. Classificação de actors

| Actor | ID | Profile | Vídeos | Vídeo detalhe | Comments | Hashtag | Trend | Sound | Search | Cookies | MVP profile audit | Competitor comp. | Hashtag module | MVP fit |
|---|---|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|---|
| `clockworks/tiktok-profile-scraper` | 0FXVyOXXEmdGcV88a | ✓ | ✓ | parc. | – | – | – | meta | – | No | **Sim** | **Sim** | – | **Primário** |
| `clockworks/tiktok-scraper` | GdWCkxBtKWOsKjdch | ✓ | ✓ | ✓ | – | ✓ | parc. | meta | ✓ | No | Sim | Sim | Sim | **Backup amplo** |
| `clockworks/free-tiktok-scraper` | OtzYfK1ndEGdwWFKQ | ✓ | ✓ | parc. | – | ✓ | – | meta | – | No | Sim | Sim | Sim | Backup legacy |
| `apidojo/tiktok-scraper` | 5K30i8aFccKNF5ICs | ✓ | ✓ | ✓ | ✓ | ✓ | – | meta | ✓ | No | Sim (low-cost) | Sim | Sim | **Low-cost primário** |
| `clockworks/tiktok-comments-scraper` | BDec00yAmCm1QbMEI | – | – | – | ✓ | – | – | – | – | No | Add-on | Add-on | – | Opcional comments |
| `clockworks/tiktok-hashtag-scraper` | f1ZeP0K58iwlqG2pY | – | – | – | – | ✓ | parc. | – | – | No | Não | Não | Sim | Fora MVP |
| `clockworks/tiktok-video-scraper` | – | – | – | ✓ | – | – | – | meta | – | No | Não | Não | – | Apenas vídeos específicos |

Todos os actors acima funcionam **sem cookies**. Nenhum exige login pessoal de TikTok — vantagem clara face ao LinkedIn.

---

## 2. Custo por relatório (pricing público)

Tabela base (1 result = 1 vídeo retornado; o profile detail conta como 1 result):

| Actor | Preço público | Notas |
|---|---|---|
| `clockworks/tiktok-profile-scraper` | **from $2,50 / 1k results** | Profile + N vídeos = N+1 results. |
| `clockworks/tiktok-scraper` | from $1,70 / 1k results | Pricing variável por modo (search, hashtag, profile). |
| `clockworks/free-tiktok-scraper` | from $2,00 / 1k results | Mesma família. |
| `apidojo/tiktok-scraper` | **$0,30 / 1k posts** | Muito barato; usar com cuidado por estabilidade. |
| `clockworks/tiktok-comments-scraper` | from $0,50 / 1k comments | Para comments enrichment. |
| `clockworks/tiktok-hashtag-scraper` | from $2,00 / 1k videos | Fora MVP. |

### Cenários (first run, sem cache)

**Stack primária = `clockworks/tiktok-profile-scraper` ($2,50/1k):**

| Cenário | Results | Custo USD | EUR* |
|---|---|---|---|
| Profile only | 1 | $0,0025 | €0,002 |
| Profile + 12 vídeos | 13 | $0,033 | €0,031 |
| Profile + 30 vídeos | 31 | $0,078 | €0,073 |
| Profile + 90 vídeos | 91 | $0,228 | €0,213 |
| Profile + 1 comp · 30 vídeos | 62 | $0,155 | €0,145 |
| Profile + 2 comp · 30 vídeos | 93 | $0,233 | €0,218 |

**Stack low-cost = `apidojo/tiktok-scraper` ($0,30/1k):**

| Cenário | Custo USD | EUR* |
|---|---|---|
| Profile + 30 vídeos | $0,009 | €0,008 |
| Profile + 90 vídeos | $0,027 | €0,025 |
| Profile + 1 comp · 30 | $0,019 | €0,017 |
| Profile + 2 comp · 30 | $0,028 | €0,026 |

**Comments enrichment** (top 3 vídeos, ~100 comments cada = 300 comments):
- $0,50 / 1k → ~$0,00015 → **desprezável**.

### Cache scenarios

| Cenário | Custo |
|---|---|
| First run | 100% tabela acima |
| Repeat <24h, mesma janela | **$0** (snapshot hit) |
| Repeat <7d, mesma janela | $0 se TTL=7d; refresh manual = 100% |
| Repeat <7d, janela maior (30→90) | delta ~60% |
| Refresh admin / hard refresh | 100% |

TTL recomendado (alinha com IG): profile 24h, video list 12h, comments 24h.

### Risco de media URLs expirando

TikTok CDN URLs (vídeo MP4 e thumbnails `.webp`/`.jpeg`) **expiram em horas a dias** (assinatura curta). Implicações:
- **Não dependa de** vídeo MP4 para o relatório — usar **embed oficial** (`/embed/v2/{videoId}`) ou link público.
- **Thumbnails:** persistir cópia local em Lovable Cloud Storage no momento do snapshot, OU mostrar `<img onerror>` fallback. Mesmo padrão do IG já aplicado.
- **Avatar:** mesmo problema; cache local.

*USD→EUR 0,935.

---

## 3. Campos esperados por actor

### Profile (todos os clockworks + apidojo)

Confirmados públicos:
- username, nickname, signature/bio, avatar (vários sizes), verified
- followerCount, followingCount, **heart/diggCount (total likes acumulados)**, videoCount
- bioLink (se houver), region/cc
- profileUrl
- privateAccount flag

Variações: `apidojo` retorna campos um pouco diferentes (mais cruas/flat).

### Vídeo (todos)

Confirmados:
- id, webVideoUrl (link público), createTimeISO/timestamp
- text (caption), hashtags[] (objetos com name+id), mentions[]
- videoMeta: duration (s), height, width, **downloadAddr** (expira), cover (expira)
- musicMeta: musicId, musicName, musicAuthor, musicOriginal (boolean), playUrl (expira)
- playCount, diggCount (likes), commentCount, shareCount, **collectCount/saveCount**
- isAd, **isPinnedItem**, **isSlideshow**, isStitch/isDuet (em alguns actors)
- authorMeta (subset do profile)

Campos não confiáveis ou ausentes:
- **Transcript/audio**: nenhum actor entrega transcript. Tem de vir de Whisper sobre o MP4 (fora MVP).
- **Watch time / completion rate**: só TikTok Analytics oficial (auth-only do dono). Não disponível por scraping.
- **Demographics**: idem.

---

## 4. Reuso dos cards Instagram existentes

| Card | TikTok status | Ação |
|---|---|---|
| Overview / identity | **Reusable c/ adapter** | Trocar "posts" por "vídeos"; adicionar "total likes (hearts)" KPI; cópia pt-PT. |
| Engagement | **Adapter** | Fórmula muda: ER = (likes+comments+shares) / **views** (não followers). Manter variante /followers como secundária. |
| Cadence | **Reusable as-is** | Apenas trocar label "posts" → "vídeos". |
| Format mix | **TikTok-specific version** | Reels/Carrossel/Imagens → Vídeo curto (<15s) / Vídeo médio (15–60s) / Vídeo longo (>60s) / **Slideshow (carrossel de imagens)** / Pinned. |
| Best posts / key publications | **Reusable c/ adapter** | Ranquear por **views** em vez de ER; mostrar duration + sound; thumbnail = cover. CompareCardShell já suporta. |
| Bio e outbound path | **Reusable c/ copy change** | TikTok bio link existe (≥1k followers); menos relevante. |
| Editorial diagnosis (vs concorrente) | **Reusable c/ adapter** | Dimensões: views, cadência, format diversity, hook+sound. Componente acabado de criar serve. |
| Hashtags | **Reusable as-is** | TikTok ainda é hashtag-driven; estrutura idêntica. |
| Content themes | **Reusable** | LLM clusters de captions. |
| Recommendations | **Reusable c/ copy** | Adicionar bullets TikTok-native (hooks 3s, sound usage, slideshow). |
| Profile vs Competitor | **Reusable as-is** | Toda a infra de comparison serve. |
| 30d/90d windows | **Reusable as-is** | Mesma lógica de janela. |
| **Sound/Music** (novo) | **TikTok-only card** | Top sounds usados, % som original vs trending, reuse rate. |
| **Viral outliers** (novo) | **TikTok-only card** | Vídeos com views >> baseline (z-score >2). |
| **Pinned content quality** (novo) | **TikTok-only card** | Os 3 pinned representam a marca? Métrica vs média. |

Resultado: **~70% dos cards reaproveitáveis com pequenos adapters**, ~10% adapter pesado (engagement, format mix), ~20% novo (sound, viral outliers, pinned).

---

## 5. Assunções IG que NÃO transferem

| Assunção IG | TikTok | Acção |
|---|---|---|
| Reels/Carrosséis/Imagens | Slideshow + vídeos curtos/médios/longos | Nova taxonomia. |
| Bio link único | Igual mas limitado a ≥1k followers | OK c/ guard. |
| Followers benchmark tiers | Tiers TikTok muito diferentes (nano ≤10k, micro 10–100k, mid 100k–1M, macro 1M+) | Recalibrar tiers. |
| ER = eng/followers | **TikTok = eng/views é a métrica de facto** | Mudar fórmula primária. |
| Comments dominam | TikTok: **views > shares > saves > likes > comments** | Reordenar pesos. |
| Thumbnail estático | Cover expira; <video> embed preferível | Persistir cover. |
| Caption longa | TikTok caption ≤2.2k chars mas curta na prática (≤150 dominante) | Re-ranges. |
| Hashtags discovery | Ainda relevante mas **menos que IG** (FYP é principal) | Manter, peso menor. |
| Sound = irrelevante | **Sound é sinal central de TikTok** | Card novo obrigatório. |
| Duração irrelevante | **Duration é variável-chave** | Adicionar a top-posts e themes. |
| Virality velocity | TikTok pode explodir em 48h | Janela "últimas 48h" extra. |
| Pinned (até 3) | Igual ao IG (até 3) | Reaproveitar. |
| Conta privada | Existe; bloqueia tudo | Mesmo guard. |
| Media URL expira | **Mais agressivo que IG** | Cache obrigatório. |

---

## 6. Métricas TikTok-native (modelo)

Primárias:
- **Views/vídeo (mediana + p75 + p95)** — captura outliers virais
- **ER por view** = (likes+comments+shares+saves) / views
- **View-to-like ratio**, **view-to-share ratio**, **view-to-save ratio (proxy de retenção)**
- **Posting frequency** (vídeos/semana)
- **Avg duration** + duration mix
- **Sound reuse / original** ratio
- **Hashtag estratégia** (volume, repetição, mix mainstream vs nicho)
- **Pinned quality** (média pinned vs média geral)
- **Top-3 concentration** (% views nos 3 melhores vs total)
- **Consistência temática** (LLM)
- **Viral outliers count** (z-score views > 2)
- **Recent window vs baseline** (últimos 14d vs 90d)

Secundárias:
- ER por follower (comparabilidade cross-platform)
- Tempo médio entre vídeos
- Distribuição weekday/hour

---

## 7. Modelo de dados platform-agnostic (alinha com auditoria LinkedIn)

```
Network = 'instagram' | 'linkedin' | 'tiktok'

NormalizedProfile {
  network, handle, profileUrl, displayName, avatarUrl,
  bio,                    // signature/about
  followers, following,
  totals: { posts?, videos?, hearts? },   // TikTok-only: hearts (total likes acumulados)
  verified, private,
  region?, language?,
  outboundLinks: string[],
  metadata: Record<string, unknown>       // platform-specific raw
}

NormalizedContentItem {
  network, postUrl, externalId,
  text, takenAtIso,
  format: 'image' | 'carousel' | 'reel' | 'video_short' | 'video_mid' | 'video_long' | 'slideshow' | 'text' | 'document' | 'article' | 'poll' | 'repost',
  mediaUrls: string[],
  thumbnailUrl: string,
  durationSec?: number,
  metrics: { views?, likes/reactions, comments, shares?, saves? },
  hashtags, mentions, externalLinks,
  sound?: { id, name, author, isOriginal },   // TikTok / Reels
  isPinned, isAd, isSponsored?
}

EngagementMetrics {
  erByFollowers?, erByViews?, avgViews?, avgLikes, avgComments, avgShares?, avgSaves?,
  topByMetric: ContentItem[], benchmarkTier
}

Cadence { perWeek, weekdayDist, hourDist, consistencyScore, lastPostedIso }

NarrativeInsights {
  themes, hooks, ctaPatterns,
  contentMix: { educational, entertainment, promotional, story },
  toneOfVoice, positioning, repeatability,
  // TikTok-only
  soundStrategy?, trendUsage?
}
```

Este shape **cobre os três networks**. O IG existente migra com adapter.

---

## 8. MVP TikTok — 3 tiers

### Free
- Identity (avatar, nickname, bio, verified)
- Followers / following / total hearts / videoCount
- Sample dos 6 vídeos mais recentes (cover + views + likes)
- Cadência mínima (vídeos/semana)
- 1 leitura editorial curta (determinística)

### Paid single
- Tudo do Free
- 30 vídeos analisados (default; opção 90)
- Engagement por view + por follower
- Cadence completa (weekday/hour, consistency)
- Top 5 vídeos
- **Hook/sound/hashtag analysis**
- Viral outliers
- Pinned quality
- AI narrative reading (per-card)
- Recomendações pt-PT

### Paid + Competitor
- Tudo do Paid
- 1 concorrente · 30 vídeos
- Comparações side-by-side (views, ER, cadence, format, duration, sound, hashtag)
- Best video vs best video (CompareCardShell existente)
- Editorial diagnostic comparativo (componente já criado)
- Positioning gap (LLM)

---

## 9. Camada de IA

| Card | Determinístico | Precisa LLM |
|---|:-:|:-:|
| Identity, totals, cadence, engagement, format mix, top videos, viral outliers, pinned quality | ✓ | – |
| Hashtags / sound listing | ✓ | – |
| **Themes, hooks, tone, positioning, repeatability** | – | ✓ |
| Recommendations | parc. | ✓ |
| Editorial diagnostic (comparison) | ✓ (já existe) | opcional |
| Global comparison reading | – | ✓ |

**Campos passados ao LLM**: caption (trunc 500), hashtags, mentions, duration, format, sound name, views, ER, isPinned. **Não enviar** thumbnail nem MP4 no MVP.

**Transcript/audio**: **fora MVP**. Whisper-on-MP4 custaria ~$0.006/min × 30 vídeos × 30s = $0,09/relatório → viável mas adicionar só na v2.

**JSON schema** (igual ao LinkedIn audit):
```json
{
  "summary": "string",
  "highlights": ["string"],
  "tone": "string",
  "viralSignals": ["string"],
  "soundStrategy": "string",
  "hookPatterns": ["string"],
  "recommendations": [{ "title": "string", "rationale": "string" }]
}
```

**Cache key**: `(network, handle, window, card, snapshot_hash)`. Já é o padrão IG/LinkedIn.

**Controlo de custo**: Gemini 2.5 Flash / GPT-5-mini, hard cap 12k input tokens, fallback determinístico em erro/timeout.

Estimativa IA por relatório paid+competitor: **~€0,004** (idêntico ao LinkedIn).

---

## 10. Recomendação

**Stack MVP recomendada**: `clockworks/tiktok-profile-scraper` (0FXVyOXXEmdGcV88a).
**Stack backup low-cost**: `apidojo/tiktok-scraper` (5K30i8aFccKNF5ICs) — ~8× mais barato mas community-maintained, validar estabilidade no spike.
**Avoid MVP**:
- `clockworks/tiktok-hashtag-scraper` (f1ZeP0K58iwlqG2pY) — fora de escopo
- `clockworks/free-tiktok-scraper` — funcionalmente igual mas legacy, sem vantagem clara
- `clockworks/tiktok-comments-scraper` — só justificável quando for criar análise de audiência (v2)

**Custo por relatório (stack primária)**:
- Single audit (30 vídeos): **€0,07**
- Paid + 1 competitor (30+30): **€0,15**
- COGS total c/ IA + overhead: **~€0,17**

**Margens** (mesmo modelo do LinkedIn):

| Preço c/ IVA | Net VAT | -Payments | COGS | Margem % |
|---|---|---|---|---|
| €9 | €7,32 | €6,85 | €0,17 | **97%** |
| €19 | €15,45 | €14,74 | €0,17 | **99%** |
| €29 | €23,58 | €22,62 | €0,17 | **99%** |
| €49 | €39,84 | €38,40 | €0,17 | **99%** |

**Cards reaproveitados**: ~70% as-is/c-adapter. **Novos cards**: Sound strategy, Viral outliers, Pinned quality.
**Complexidade**: **Medium** — comparável ao LinkedIn; vantagem é não precisar de cookies/login.

### Riscos

| Risco | Severidade | Mitigação |
|---|---|---|
| Media URLs expiram em horas | **Alto** | Persistir thumbnails em Cloud Storage no snapshot. |
| Actor breakage por mudança TikTok | Médio | 2 actors alternativos validados (`apidojo`, `free-tiktok-scraper`). |
| Pricing por result vs por compute | Baixo | Todos os candidatos primários são pay-per-result. |
| Compliance (TikTok ToS) | Médio | Apenas dados públicos; sem login; cumprir takedown requests; data retention policy. |
| Viral outliers distorcem médias | Baixo | Usar mediana como primária, mean como secundária. |
| Transcript ausente limita análise | Baixo MVP | Caption + metadata bastam. Whisper opcional v2. |
| Sem watch-time / completion | Médio (estrutural) | Comunicar limite na cópia; usar saves como proxy de retenção. |

### Roadmap recomendado

| Fase | Duração | Conteúdo |
|---|---|---|
| **0 — Foundation** | 3–5 dias | Adapter platform-agnostic (Network enum, NormalizedProfile/ContentItem). Migrar IG. |
| **1 — Spike TikTok** | 2–3 dias | Rodar `clockworks/tiktok-profile-scraper` em 20 perfis teste. Validar campos, custo (±25%), thumbnails. |
| **2 — MVP Free + Paid** | 1 semana | Identity, cadence, engagement, top videos, hashtags, sound, viral outliers, pinned. |
| **3 — Comparison + IA** | 1 semana | CompareCardShell, editorial diagnostic, narrative LLM. |
| **4 — Polish** | 3 dias | Cache thumbnails, telemetry, kill-switch, allowlist admin. |
| **Total** | **3–4 semanas** | Igual ao LinkedIn — pode correr em paralelo se cada rede tiver dono. |

### Decisão go/no-go

**Recomendação: Proceed with spike-first** (mesmo padrão do LinkedIn).

Três opções para o utilizador:
- **A** — Spike 2–3 dias (`clockworks/tiktok-profile-scraper` em 20 perfis; orçamento <€2)
- **B** — Avançar Fase 0 (adapter agnostic IG→multi) se TikTok for prioridade confirmada
- **C** — Adiar TikTok; consolidar primeiro IG paid + LinkedIn

Vantagem TikTok vs LinkedIn: **sem cookies**, **muito mais barato**, **maior volume de utilizadores potenciais em PT/BR**, **dados mais ricos** (views, sound, viral). Desvantagem: **media URL expiry** mais agressivo e **ausência de watch-time** estrutural.
