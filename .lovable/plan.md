# Auditoria: LinkedIn personal profiles como 2ª rede no AuditProfiles

Apenas perfis pessoais. Company pages ficam fora do MVP. Sem código, sem chamadas a Apify/OpenAI — esta é uma auditoria de arquitetura.

## 1. Classificação dos actores

| Actor | Categoria | Cookies | Audit direto | Comparação | Company | Notas |
|---|---|---|---|---|---|---|
| `harvestapi/linkedin-profile-scraper` (`LpVuK3Zozwuipa5bp`) | Profile detail | Não | **Sim** | Sim | Não | Cobertura rica: experiência, educação, skills, certificações, links destacados. Output estável. **Candidato primário para identidade.** |
| `dev_fusion/linkedin-profile-scraper` (`2SyF0bVxmgGr8IVCZ`) | Profile detail + contact enrichment | Não | Sim | Parcial | Não | Foco em email/contacto — útil para B2B mas levanta risco legal/GDPR. **Evitar no MVP.** |
| `apimaestro/linkedin-profile-posts` (`LQQIXN9Othf8f7R5n`) | Posts | Não | **Sim** | Sim | Não | Lista de posts com reações por tipo, comentários, partilhas, media, tipo (texto/imagem/vídeo/documento/poll/artigo). **Candidato primário para posts.** |
| `harvestapi/linkedin-profile-posts` | Posts | Não | Sim | Sim | Não | Alternativa mais barata, output frequentemente menos granular nas reações por tipo. **Backup.** |
| `harvestapi/linkedin-profile-search` (`M2FMdjRVeF1HPGFcc`) | Search/discovery | Não | Não | Não (descoberta) | Não | Útil para resolver "nome → slug" quando o user não cola URL completo. Opcional. |
| `apimaestro/linkedin-profile-detail` | Profile detail | Não | Sim | Sim | Não | Alternativa ao harvestapi. **Backup de identidade.** |

Conclusão: a stack mínima viável é **`harvestapi/linkedin-profile-scraper` + `apimaestro/linkedin-profile-posts`** (identidade + posts). Backup espelho: `apimaestro/linkedin-profile-detail` + `harvestapi/linkedin-profile-posts`.

## 2. Custo estimado por relatório

Pricing pay-per-result destes actores varia entre ~$2–$5 por 1k resultados; preços exatos têm de ser confirmados na Apify Store no momento da subscrição (**marca: precisa verificação ao vivo**). Estimativa indicativa por relatório LinkedIn (actor cost apenas — OpenAI à parte):

| Cenário | Resultados Apify | Custo actor (estimado) |
|---|---|---|
| Profile only | 1 profile | ~$0,003 – $0,005 |
| Profile + 12 posts | 1 + 12 | ~$0,04 – $0,07 |
| Profile + 30 posts | 1 + 30 | ~$0,09 – $0,16 |
| Profile + 90 posts | 1 + 90 | ~$0,27 – $0,47 |
| Profile + 1 concorrente · 30 posts cada | 2 + 60 | ~$0,18 – $0,32 |
| Profile + 2 concorrentes · 30 posts cada | 3 + 90 | ~$0,27 – $0,47 |

Custo OpenAI (separado, opcional): com modelo eficiente (~$0,15/M input · $0,60/M output) e prompts compactos (≤4k tokens contexto + ≤1k output), uma leitura editorial por relatório custa ~$0,001–$0,003. **MVP-alvo razoável: ≤$0,50 por relatório paid com concorrente, incluindo IA.**

Cache strategy recomendada (igual à do IG):
- TTL 24h para profile detail.
- TTL 12h para post lists.
- Reanálise forçada só via "Refresh" admin ou novo competitor.
- Allowlist `LINKEDIN_APIFY_ALLOWLIST` + kill-switch `LINKEDIN_APIFY_ENABLED`.
- Limite duro: 90 posts por perfil; default MVP 30.

## 3. Campos esperados por actor

### Profile (`harvestapi/linkedin-profile-scraper` ou `apimaestro/linkedin-profile-detail`)
- URL pública, slug/public_id, name, headline, about/summary, location (cidade/país).
- Followers count (quase sempre), connections (≤500 ou número, depende do perfil).
- Current role (título + empresa), experiência (lista cronológica), educação, skills (top N), certificações, languages.
- Profile picture, background picture.
- Featured links / website URLs (mais raro — depende do perfil ter "featured" público).
- Open-to-work / hiring flags (quando expostos).
- **Não disponível publicamente**: email, telefone (legítimo só via `dev_fusion` e mesmo assim incerto — evitar).

### Posts (`apimaestro/linkedin-profile-posts`)
- Post URL, post ID, timestamp (ISO).
- Texto (post body, sem limite hard mas truncado pela UI ≥3k chars).
- Reactions total + breakdown por tipo (like, celebrate, support, love, insightful, funny).
- Comments count, reposts/shares count.
- Media attachments: image[], video, document (PDF/slides), poll, article (link partilhado), event.
- Document/carousel indicator (`document` ou `image[]` com múltiplos).
- External link preview (title, description, thumbnail, URL).
- Hashtags (extraídas do texto), mentions (`@person`/`@company`).
- Tipo de post: `text` | `image` | `video` | `document` | `poll` | `article` | `repost`.
- Thumbnail / preview image (CDN LinkedIn — expira, requer persistência igual à do IG).
- Author info (consistência com o profile pedido).

## 4. Matriz de reutilização dos cards atuais

Cards existentes em `src/components/report-redesign/v2`:

| Card atual | Estado para LinkedIn |
|---|---|
| Hero / Editorial Identity | **Reutilizável com adaptador** — handle, avatar, followers, verified → slug, picture, followers, premium badge. Copy ajustada. |
| Engagement card / `competitor-engagement-compare` | **Reutilizável com nova fórmula** — ER = (reactions + comments + reposts) / followers. Substituir benchmark IG por benchmark LI por tier. |
| Cadence / `competitor-cadence-compare` | **Reutilizável as-is** — posts/semana é universal. |
| Weekday rhythm / `competitor-weekday-compare` | **Reutilizável as-is** — distribuição por dia da semana é universal. |
| Format mix / `competitor-format-compare` | **Substituir** — taxonomia LinkedIn (Texto, Imagem, Vídeo, Documento, Poll, Artigo, Repost) é diferente de Reels/Carrossel/Imagem. Card novo `linkedin-format-mix` com 6–7 categorias. |
| Best posts / `report-post-comparison` + `competitor-top-post-compare` | **Reutilizável com adaptador** — thumbnail, texto, reactions/comments, ER. Adicionar breakdown de reações por tipo no detalhe. |
| Bio and outbound path / `competitor-bio-compare` | **Reutilizável com copy nova** — "bio" vira "about + headline"; "link na bio" vira "featured links / website". |
| Hashtags / `hashtag-diagnostics-card` | **Reutilizável com peso reduzido** — hashtags existem em LI mas são sinal mais fraco. Manter como secundário, não central. |
| Caption diagnostics / `caption-diagnostics-card` | **Reutilizável com copy nova** — em LI o post body é o equivalente à caption; analisar comprimento, hooks, CTA. |
| Editorial diagnostic / `competitor-editorial-diagnostic` | **Reutilizável com novas dimensões** — cadência, engagement, mix, about/featured continuam; adicionar "tom thought-leadership" como dimensão LI-específica. |
| Content themes / `report-themes-feature` | **Reutilizável** — clustering temático sobre o post body funciona melhor em LI (textos mais longos). |
| Recommendations / `report-diagnostic-priorities` | **Reutilizável com regras LI** — playbook diferente (frequência típica 2–3/sem em LI vs 4–5/sem IG). |
| 30d/90d windows | **Reutilizável as-is** — `analysis_window` é agnóstico. |
| Comment intelligence / `report-comment-intelligence` | **Adiar** — comentários em LI precisam fetch extra (não vêm sempre no posts actor). Não-MVP. |
| Posting heatmap | **Reutilizável as-is**. |
| Top hashtags | **Reutilizável as-is, peso secundário**. |

Resumo numérico: ~60% dos cards reutilizáveis (as-is ou com adaptador), ~25% precisam copy nova, ~10% substituídos, ~5% adiados.

## 5. Assunções Instagram-only a quebrar

Auditoria de assunções em `src/lib/report/snapshot-to-report-data.ts`, `format-keys.ts`, `report-mock-data.ts`:

| Assunção IG | Realidade LinkedIn | Ação |
|---|---|---|
| Format taxonomy: Reels / Carrosséis / Imagens | Texto / Imagem / Vídeo / Documento / Poll / Artigo / Repost | Generalizar `CanonicalFormatKey` por rede. |
| `engagement_pct = (likes+comments)/followers` | `(reactions+comments+reposts)/followers` | Fórmula injetada por rede. |
| "link na bio" único | múltiplos featured + website | Generalizar `externalUrls`. |
| Hashtags como sinal central | Hashtags fracas, texto longo dominante | Repesar diagnostics. |
| Captions ≤2200 chars | Post body até ~3000 chars + artigos | Ajustar truncation. |
| Verified blue badge | LinkedIn Premium / Top Voice / verified | Mapear flags equivalentes. |
| Public vs private account | Tudo público (mas `connections-only` posts não aparecem) | Documentar limitação. |
| Comments/likes semantics | Reactions multitipo | Persistir breakdown e mostrá-lo opcionalmente. |
| Thumbnails CDN IG expiráveis | CDN LinkedIn idem (expira) | Reutilizar `persist-thumbnails.server.ts`. |
| Benchmarks IG por tier de followers | Tiers LI diferentes (Nano <1k, Micro 1k–10k, Mid 10k–50k, Macro 50k+) | Tabela de benchmarks LI separada (precisa investigação). |
| `is_pinned` | LI não tem pinned posts equivalente | Ignorar no adaptador LI. |
| `is_video` boolean | Tipo enum richer | Mapear no normalizer. |

## 6. Modelo de dados platform-agnostic (proposta)

Tipos TypeScript de referência (não criar agora):

```ts
type Network = "instagram" | "linkedin";

interface NormalizedProfile {
  network: Network;
  handle: string;          // IG: username, LI: public_id/slug
  profileUrl: string;
  displayName: string;
  avatarUrl: string | null;
  about: string | null;    // IG: bio, LI: about
  headline: string | null; // LI-only
  followers: number;
  connections: number | null; // LI-only
  outboundLinks: string[]; // bio links + featured
  metadata: {
    location?: string;
    verified?: boolean;
    topVoice?: boolean;     // LI-only
    currentRole?: string;   // LI-only
  };
}

interface NormalizedContentItem {
  network: Network;
  postUrl: string;
  text: string;
  takenAtIso: string;
  format: string;          // canonical per-network enum
  mediaUrls: string[];
  thumbnailUrl: string | null;
  reactions: { total: number; byType?: Record<string, number> };
  comments: number;
  shares: number;          // IG: 0/null, LI: reposts
  hashtags: string[];
  mentions: string[];
  externalLinks: string[];
}

interface EngagementMetrics {
  engagementRate: number;
  averageReactions: number;
  averageComments: number;
  averageShares: number;
  topContent: NormalizedContentItem[];
  benchmarkTier: string;   // per-network table
}

interface CadenceMetrics {
  postsPerWeek: number;
  weekdayDistribution: number[];
  hourDistribution: number[];
  consistencyScore: number;
}

interface NarrativeInsights {
  topics: Array<{ label: string; share: number }>;
  ctaPatterns: string[];
  authoritySignals: string[];        // LI: credentials, accolades
  educationalVsPromotional: { educational: number; promotional: number };
  storytellingStyle: "expert" | "personal" | "promotional" | "mixed";
  thoughtLeadershipScore?: number;    // LI-only
}
```

`AdapterResult` ganha `network: Network` no topo; `formatBreakdown` e `benchmark` consultam tabelas por rede.

## 7. Proposta MVP LinkedIn (3 tiers)

### Free
- Identidade (avatar, headline, about, followers/connections, current role).
- Qualidade de about/headline (length, presença de CTA, palavras-chave).
- Contagem de atividade recente (últimos 12 posts).
- Sample dos 3 últimos posts com texto truncado e reactions/comments.
- 1 leitura editorial curta (determinística).
- Sem comparação, sem cadência detalhada.

### Paid
- Tudo o do Free +
- Análise de 30 posts: engagement médio, reactions por tipo, posts/semana, weekday rhythm.
- Top posts (3 melhores) com breakdown de reações.
- Mix de formatos (Texto/Imagem/Vídeo/Documento/Poll/Artigo).
- Themes (clustering temático sobre post body).
- Diagnóstico editorial determinístico (5 dimensões).
- Recommendations (playbook LI).
- Leitura IA narrativa por bloco (cached, ver §8).

### Paid + Competitor
- Tudo o do Paid +
- Side-by-side: engagement, cadência, mix, weekday rhythm, top posts, about/featured, themes.
- Positioning gap (determinístico + leitura IA global).

## 8. Camada de IA — necessária desde dia 1?

**Sim**, mas controlada. LinkedIn tem post body rico (texto longo, frequente storytelling) — o sinal narrativo é muito mais forte que em IG. Sem leitura IA, o paid LI fica abaixo do paid IG.

Decisão por card:

| Card | Modo |
|---|---|
| Identidade, cadência, weekday, format mix, top posts, hashtags | **Determinístico** |
| About/headline quality | **Determinístico** (regras: length, CTA regex, palavras de autoridade) |
| Themes / topics | **Determinístico** (clustering local) + 1 frase IA opcional |
| Editorial diagnostic comparativo | **Determinístico** (mesmo padrão do IG card 2) |
| Narrative reading per block | **IA** |
| Authority/thought-leadership signal | **IA** |
| Global comparison reading | **IA** |
| Recommendations | **Híbrido** (heurística + IA refina copy) |

Campos passados ao LLM:
- Profile: about, headline, current role, top 3 skills.
- Posts: text body (truncado a 800 chars), format, reactions total + top type, comments, hashtags, mentions count.
- Comparação: o mesmo para ambos os perfis + deltas pré-computados.

Schema JSON de retorno (cached):

```json
{
  "card": "narrative_reading",
  "version": 1,
  "summary": "string ≤180 chars",
  "highlights": ["string ≤120 chars", "..."],
  "tone": "expert|personal|promotional|mixed",
  "authoritySignals": ["string"],
  "recommendations": ["string ≤140 chars"]
}
```

Cache: `(platform, profile_slug, window, card_key, snapshot_hash) → json`. Invalidar quando `snapshot_hash` muda. Mesma tabela `comparison_readings` que o IG, com coluna `network`.

Cost control:
- Allowlist `LINKEDIN_AI_ENABLED`.
- Hard cap de tokens por relatório (~6k input + 1.5k output).
- 1 chamada por card por snapshot. Comparação = 1 chamada global + 1 por card crítico (overview, narrative, recommendations).
- Fallback determinístico se IA falha ou desativa.

## 9. Recomendação final

- **Stack MVP**: `harvestapi/linkedin-profile-scraper` (identidade) + `apimaestro/linkedin-profile-posts` (posts).
- **Backup**: `apimaestro/linkedin-profile-detail` + `harvestapi/linkedin-profile-posts`.
- **Evitar no MVP**: `dev_fusion/linkedin-profile-scraper` (risco legal contact enrichment), `linkedin-profile-search` (só descoberta — adiar até houver fluxo de auto-complete).
- **Custo médio por relatório paid + 1 concorrente**: ~$0,18–$0,32 actor + ~$0,003 IA = **~$0,20–$0,33**.
- **Cards reutilizados as-is ou com adaptador**: ~60% (hero, cadência, weekday, top posts, themes, recommendations, windows).
- **Cards novos LI-específicos**: `linkedin-format-mix` (6–7 categorias), `linkedin-authority-signal` (IA), `linkedin-about-quality`. Possível variante `linkedin-reactions-breakdown`.
- **Cards a adiar**: `report-comment-intelligence`.
- **Complexidade**: **Média**. A maior parte da estrutura visual e do pipeline é reutilizável; o trabalho concentra-se em (a) discriminador `network` no modelo, (b) novos normalizers, (c) tabela de benchmarks LI, (d) 3 cards novos.

### Risco

| Risco | Severidade | Mitigação |
|---|---|---|
| LinkedIn ToS / bloqueio de scraping | **Alto** | Manter via Apify (responsabilidade do actor), kill-switch, allowlist, sem revenda de dados pessoais. |
| Benchmarks LI inexistentes / pouco públicos | Médio | Construir tabela interna a partir das primeiras 50–100 análises; mostrar "amostra interna" enquanto não houver fonte externa credível. |
| Reliability dos actors (rate limits, mudanças LI) | Médio | 2 actors backup configurados, fallback automático em erro. |
| Image expiry (LI CDN) | Médio | Reutilizar `persist-thumbnails.server.ts`. |
| Cost overrun | Baixo | Caps, cache, allowlist, default 30 posts. |
| GDPR / dados pessoais | Médio | Não persistir email/telefone; apenas dados profissionais públicos; ToS claro. |
| Posts "connections-only" não visíveis | Baixo | Documentar transparentemente na metodologia. |

### Roadmap faseado

**Fase 0 — Foundation (3–5 dias)**: discriminador `network` no `ReportData`, `AdapterResult`, tabelas; migration adiada (snapshot já é JSONB, basta novo campo). Abstração `provider` no pipeline analyze.

**Fase 1 — Spike Apify (2–3 dias)**: ligar `harvestapi/linkedin-profile-scraper` e `apimaestro/linkedin-profile-posts` em allowlist, validar shape real dos campos vs §3, medir custo real.

**Fase 2 — MVP Free + Paid sem comparação (1 semana)**: normalizer LI, cards reutilizados com adaptador, 3 cards novos, benchmarks tier-based v1.

**Fase 3 — Comparison + IA narrativa (1 semana)**: cards `linkedin-*-compare`, cache de leituras IA, leitura global.

**Fase 4 — Polish + admin diagnostics (3 dias)**: cost dashboard por rede, cache hit rate, error rate por actor, refresh manual.

Total estimado: **3–4 semanas** até MVP credível com comparação.

## 10. Gate de decisão

Esta auditoria é o entregável. Próximo passo requer aprovação:

- **Opção A** — Spike técnico de 2–3 dias: ligar os 2 actors em allowlist, validar shape e custo real, sem UI.
- **Opção B** — Avançar Fase 0 (foundation) se a prioridade de negócio para LinkedIn já está confirmada.
- **Opção C** — Parar aqui e manter Instagram-only até o paid IG estar monetizado.

Sem decisão, não há implementação.
