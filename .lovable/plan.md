# Avaliação — Suporte a LinkedIn como segunda rede e reutilização de cards

> Plan mode. Sem alterações de código, sem chamadas a providers.

## TL;DR

LinkedIn é tecnicamente viável com a combinação dos actores Apify recomendados, mas o **codebase atual é Instagram-only end-to-end** — não existe campo `platform`/`network` no data model, e formato (Reels/Carrosséis/Imagens), fórmula de engagement, tiers de benchmark, vocabulário de CTA, "link na bio" e construção de permalink estão *hardcoded*. Reutilizar os cards atuais sem refactor é impossível; reutilizar via **uma camada de adaptador + variantes de card LinkedIn-específicas** é realista.

**Complexidade estimada:** **Alta** para um MVP credível (3–5 semanas de trabalho). Não é "swap de actor".

**Recomendação:** adoptar os dois actores `apimaestro` (detail + posts) — sem cookies, baratos (~$5/1000) e cobrem perfil + posts. Adiar `harvestapi/linkedin-profile-search` para fase 2 (lead-gen) porque é caso de uso diferente.

---

## 1. Recomendação de actores

| Actor | Categoria | Usar para MVP? | Custo | Risco |
|---|---|---|---|---|
| `apimaestro/linkedin-profile-detail` | Profile details (identidade, about, experiência, educação, followers, picture) | ✅ **Sim** — substituto natural do "profile" do IG actor | $5 / 1k perfis | Baixo — no-cookies |
| `apimaestro/linkedin-profile-posts` | Lista de posts com texto, reactions (multi-tipo), comments, reposts, media, articles, documents | ✅ **Sim** — equivalente a `latestPosts[]` do IG | $5 / 1k posts (~$0.06 por análise de 12 posts) | Baixo — no-cookies |
| `harvestapi/linkedin-profile-search` | Search massivo / lead-gen com filtros (cargo, empresa, localização) | ❌ **Não** para MVP — caso de uso diferente (descoberta, não auditoria) | $0.10/page + $0.004–0.01/perfil | Baixo |
| `apify/linkedin-comments-scraper` ou similar | Comentários raw por post | ⏸ **Fase 2** — só se quisermos `comment_intelligence` em LI | Por confirmar | Médio |

**Razão da escolha:** ambos os actores `apimaestro` são **no-cookies** (sem risco de ban de conta), schema documentado, pricing transparente, e juntos cobrem o equivalente ao output unificado do actor `apify/instagram-scraper` que usamos hoje.

> Comparado com o IG (que faz 1 actor → tudo num call), LinkedIn precisa **2 calls por perfil** (`detail` + `posts`). Custo por análise (perfil + 12 posts) é ~$0.06–0.07, na mesma ordem de grandeza do IG.

---

## 2. Mapa de campos: LinkedIn vs Instagram

| Conceito | Instagram (actual) | LinkedIn (apimaestro) | Mapeável? |
|---|---|---|---|
| Identity | username, full_name, profile_pic_url, is_verified | publicIdentifier, firstName+lastName, profile_picture, premium/verified | ✅ |
| Bio / About | biography (string) | summary (string) | ✅ |
| Followers | followers_count | followerCount + connectionsCount (dois números) | ⚠️ Decidir qual usar (followers é o análogo) |
| Posts list | latestPosts[] | posts[] (paginado) | ✅ |
| Post text | caption | text | ✅ |
| Engagement reactions | likes (1 contagem) | total_reactions + breakdown (like, support, love, insight, celebrate, funny, curious) | ⚠️ Adapter — somar ou expor breakdown |
| Comments count | comments_count | comments | ✅ |
| Reposts | n/a | reposts | ➕ Novo sinal LinkedIn |
| Media | thumbnail_url, video_views | media[] (type, url, thumbnail) | ✅ |
| Post types | Reels / Carrossel / Imagem | regular text / image / video / document (PDF) / article / quote / reshared / poll / newsletter | ❌ Taxonomia nova |
| Permalink | `instagram.com/p/{shortcode}` | `linkedin.com/posts/{urn}` | ⚠️ Construtor novo |
| Hashtags | derivado da caption | derivado do text — mesma extração regex | ✅ (convenção diferente: 3 max vs 3–5) |
| External link | external_urls[] / "link na bio" | website (campo único) | ⚠️ Conceito diferente — "link na bio" não existe |
| Cadence | data dos posts → posts/week | igual | ✅ |
| Bio link | obrigatório no IG (único link) | LinkedIn tem multi-secções de contacto | ❌ Card "integração" precisa variante |
| Industry/Category | category (string IG) | industryName (taxonomia LinkedIn) | ⚠️ Relabel |
| Experience/Education | n/a | experience[], education[] | ➕ Novo bloco LinkedIn |

---

## 3. Matriz de reutilização de cards

| Card actual | Verdict | Razão |
|---|---|---|
| FormatCard (Mix de formatos) | 🆕 **Nova variante** | Taxonomia (Reels/Carrossel/Imagem) hardcoded em 7+ ficheiros + benchmarks IG-calibrados |
| FrequencyCard (cadência) | 🔁 **Relabel** + recalibrar benchmark | Engine `cadence.ts` é date math puro; números de referência (postsPerMonth) são IG |
| EngagementCardRefined | 🆕 **Nova variante** | Fórmula `(likes+comments)/followers` é IG; LinkedIn precisa somar reactions multi-tipo + reposts |
| HashtagDiagnosticsCard | 🔁 **Relabel** | Extração reusa; range 3–5 → ~3 para LinkedIn |
| CaptionDiagnosticsCard | 🆕 **Nova variante** | CTAs e vocabulário IG ("link na bio", "guarda") não existem em LinkedIn |
| ComparisonHero | 🔁 **Relabel** | Labels mudam; estrutura intacta |
| ReportHeroV2 | 🔁 **Relabel** + recalibrar tiers | Conceito de tiers OK; thresholds IG-calibrados |
| OverviewBlock | 🆕 **Nova variante** | Orquestra sub-cards IG-específicos |
| Block02 Q07 Integração (link na bio) | 🆕 **Nova variante** ou **drop** | "Link na bio" não é conceito LinkedIn |
| Block02 Q05 Caption / Funil | 🆕 **Nova variante** | Termos de funnel IG ≠ LinkedIn |
| Top Posts / Post Comparison | 🔁 **Adapter** | Conceito reusa; permalink + `video_views` precisam adapter |
| LeituraIaBox | ✅ **As-is** | Wrapper de texto IA puro |
| VisualCoverAnalysisCard | ✅ **As-is** (se thumbs existirem) | Funciona com qualquer imagem |
| CommentIntelligence | 🔁 **Adapter** | Estrutura semelhante; precisa novo scraper |
| StrategicContextCard | 🆕 **Nova variante** | `INSTAGRAM_BENCHMARK_CONTEXT` precisa par `LINKEDIN_*` |
| BenchmarkEvidenceCard | 🆕 **Nova variante** | Fontes diferentes (LinkedIn Business, etc.) |
| Competitor compare cards (todos) | 🔁 **Semi-coupled** | Mesma lógica, dados diferentes |
| ScoreCard / ScoreGrid | 🔁 **Recalibrar pesos** | Pesos IG-calibrados |
| EditorialIdentityCard | 🔁 **Relabel** + adapter | Category → industryName |

**Reusáveis as-is:** 2 cards (LeituraIA, VisualCover).
**Relabel/adapter:** ~8 cards.
**Nova variante:** ~9 cards.

---

## 4. Data model agnóstico proposto

Adicionar campo `network: "instagram" | "linkedin"` no topo de `PublicAnalysisProfile` e `SnapshotPayload`, e introduzir tipos plataforma-agnósticos:

```ts
type Network = "instagram" | "linkedin";

interface Profile {
  network: Network;
  handle: string;          // username (IG) | publicIdentifier (LI)
  displayName: string;
  avatarUrl: string;
  bio: string;             // biography | summary
  followers: number;       // IG followers | LI followerCount
  connections?: number;    // LI only
  industry?: string;       // category (IG) | industryName (LI)
  isVerified?: boolean;
  externalUrls: string[];  // IG external_urls | LI [website]
  experience?: Experience[]; // LI only
  education?: Education[];   // LI only
}

interface ContentItem {
  network: Network;
  id: string;
  permalink: string;       // built per-network
  text: string;            // caption | text
  format: FormatKey;       // network-specific union
  takenAt: string;
  thumbnail?: string;
  engagement: EngagementMetrics;
  hashtags: string[];
  mentions: string[];
  links: string[];
  reposts?: number;        // LI
  articleRef?: { title: string; url: string }; // LI
  documentRef?: { url: string; pages: number }; // LI
  videoViews?: number;     // IG Reels | LI video
  videoDuration?: number;
}

interface EngagementMetrics {
  network: Network;
  reactionsTotal: number;        // likes (IG) | sum(reactions) (LI)
  reactionsBreakdown?: Record<string, number>; // LI multi-type
  commentsTotal: number;
  reposts?: number;              // LI
  engagementRate: number;        // network-specific formula
}

interface FormatDistribution {
  network: Network;
  counts: Record<string, number>; // keys depend on network
  dominant: string;
}

interface Cadence { /* date-math, agnostic */ }

interface BioOutboundLinks { /* multi-link list, agnostic */ }

interface NarrativeInsights { /* IA output, agnostic */ }
```

Format taxonomy por rede:

```ts
type InstagramFormat = "Reels" | "Carrosséis" | "Imagens";
type LinkedInFormat = "Text" | "Image" | "Video" | "Document" | "Article" | "Poll" | "Newsletter" | "Repost";
type FormatKey = InstagramFormat | LinkedInFormat;
```

---

## 5. Premissas Instagram-only confirmadas

(file:line condensado — relatório completo no audit)

1. **Format taxonomy** — `Reels/Carrosséis/Imagens` em `benchmark/types.ts:8`, `format-keys.ts`, `format-card.tsx`, `reference-data.ts`, `snapshot-to-report-data.ts`.
2. **Bio link** — `external_urls` e `instagram.com/{user}` em `snapshot-to-report-data.ts:1706`, `block02-diagnostic.ts:895–911`.
3. **Hashtag range 3–5** — `instagram-caption-context.ts` (IG-sourced).
4. **Tiers** — nano/micro/mid/macro/mega calibrados com ER IG (5.6%→0.35%) em `reference-data.ts:38–42`.
5. **Permalinks** — `instagram.com/p/{shortcode}` hardcoded em `snapshot-to-report-data.ts:874, 1746, 1818`.
6. **Engagement formula** — `(likes+comments)/followers` em `normalize.ts computeContentSummary()`.
7. **video_views** — só Reels; copy "Reels ajudam descoberta" em `benchmark-context.ts:265`.
8. **CTA vocabulary** — "link na bio", "guarda", "partilha" em `block02-diagnostic.ts:300, 402`.
9. **Network label** — string `"instagram"` em 10+ sítios; **não existe** campo `platform/network`.

---

## 6. MVP LinkedIn proposto

### Fase 0 — Foundation (1 semana)
- Adicionar `network: Network` em todos os snapshots / payloads / DB rows.
- Migration: `analysis_snapshots` já tem `network`; verificar e backfill se necessário.
- Criar `LinkedInFormatKey` + variant types.
- Provider abstraction: `providers/linkedin-apimaestro.ts` ao lado de `apify-client.ts`.

### Fase 1 — Free LinkedIn report (1.5 semana)
- Apify integration: `apimaestro/linkedin-profile-detail` + `apimaestro/linkedin-profile-posts`.
- Normalizer LinkedIn → `Profile` + `ContentItem[]`.
- Cards: **ReportHeroV2 (relabel)**, **FrequencyCard (relabel + LI benchmark)**, **EngagementCardRefined (nova variante)**, **FormatCard (nova variante, LI taxonomy)**, **HashtagDiagnosticsCard (relabel, max 3)**.
- Sem competitor.

### Fase 2 — Paid LinkedIn report (1.5 semana)
- Editorial diagnostic block (nova variante LinkedIn — sem "link na bio", com "repost rate" e "comment-to-impression" signals).
- Strategic context card (novo `LINKEDIN_BENCHMARK_CONTEXT`).
- `caption_semantic` AI enrichment com prompt LinkedIn-aware.
- `insights_v2` com namespace LI.
- Top Posts com permalink LinkedIn.

### Fase 3 — Competitor comparison (1 semana)
- Compare cards (semi-coupled) com dados LinkedIn.
- `comparison_readings` AI com prompt LinkedIn.

### Fase 4 — Opcional
- `harvestapi/linkedin-profile-search` para descoberta de concorrentes ("competitors at same industry/seniority").
- LinkedIn comment scraper para `comment_intelligence`.

---

## 7. Complexidade & esforço

| Tipo de trabalho | Esforço |
|---|---|
| Adicionar `network` discriminator em toda a stack | **Alto** — toca em 20+ ficheiros tipados |
| Novo provider (Apify LI x2 actors) | **Médio** — pipeline já existe para Apify |
| Novo normalizer LinkedIn | **Médio** — schema bem documentado |
| Novas variantes de card (~9) | **Alto** — duplicação ou abstração por `network` |
| Nova reference data + benchmarks | **Médio** — precisa de fontes (Hootsuite, Socialinsider LinkedIn) |
| Novo prompt AI por rede | **Médio** — duplicar `INSTAGRAM_CAPTION_CONTEXT` |
| UI router/picker (escolher rede no analyze flow) | **Baixo** |
| **Total MVP credível** | **~3–5 semanas** |

---

## 8. Riscos

| Risco | Severidade | Notas |
|---|---|---|
| **Volatilidade do actor LinkedIn** | Médio | LinkedIn é mais hostil a scraping que Instagram; actors no-cookies têm risco de quebra periódica |
| **Custo por análise** | Baixo | 2 calls × $0.005 = $0.01–0.07 por perfil + posts. Similar ao IG |
| **Reference data LinkedIn** | Médio | Benchmarks públicos LinkedIn são menos abundantes que IG (Socialinsider tem dados, Hootsuite, Hootsuite/Sprout). Precisamos seed novo |
| **Falta de "link na bio"** | Médio | Q07 (integração) tem que ser repensado para LinkedIn ou removido |
| **Reactions multi-tipo** | Baixo | Mais sinal disponível que IG; oportunidade editorial |
| **Connections cap (30k)** | Baixo | Para perfis pessoais; company pages não têm cap |
| **Legal/ToS** | Médio | LinkedIn ToS proíbe scraping; actors comerciais Apify operam em zona cinzenta. Risco reputacional se publicado |
| **AI prompt drift** | Baixo | Mitigável com `INSTAGRAM_*` vs `LINKEDIN_*` context modules |
| **Tier benchmarks** | Médio | Followers ≠ connections; tiers precisam recalibrar |

---

## 9. Próximas fases de implementação

1. **Decision gate** (não-código): confirmar viabilidade de negócio + apetite para legal/ToS.
2. **Spike técnico (3 dias)**: corrida real dos 2 actors com 3 perfis de teste, mapear schema vs assumido, validar custo real.
3. **Fase 0 — Foundation** (1 semana): `network` discriminator + types + DB.
4. **Fase 1 — Free LI report** (1.5 semana).
5. **Fase 2 — Paid LI report** (1.5 semana).
6. **Fase 3 — Competitor comparison LI** (1 semana).
7. **Fase 4 — Discovery/lead-gen** (opcional, separado).

---

## Resposta resumida às perguntas

- **Pode AuditProfiles suportar LinkedIn?** Tecnicamente sim, com 2 actores no-cookies da `apimaestro`.
- **Cards atuais reutilizam-se?** Apenas ~2 as-is (LeituraIA, VisualCover). ~8 relabel/adapter, ~9 precisam variante nova.
- **Bloqueio principal:** ausência de discriminator `network` no data model + acoplamento profundo a taxonomia, benchmarks e vocabulário Instagram.
- **MVP realista:** 3–5 semanas de trabalho dedicado para um free + paid LinkedIn report com competitor comparison.
- **Recomendação imediata:** se for prioridade estratégica, começar pela Fase 0 (foundation). Se for "exploração", fazer só o spike técnico primeiro.

> Sem código alterado. Aguardo decisão antes de qualquer implementação.
