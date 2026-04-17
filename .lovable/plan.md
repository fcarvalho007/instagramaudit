

## Auditoria — estado actual vs Workspace + Project Knowledge

Revisão focada na preocupação central: **evitar hardcoded para que tudo viva na cloud e sobreviva a updates da app**.

### O que já está bem alinhado

- Secrets todas em Supabase (`APIFY_TOKEN`, `LOVABLE_API_KEY`, service role) — nenhum token no código.
- `localStorage` apenas em `client.ts` (auto-gerado, sessão Supabase) — quota deixou de viver no browser.
- Provider Apify isolado em server routes (`/api/analyze-public-v1`, `/api/request-full-report`) com `supabaseAdmin`.
- RLS fechado em `leads`, `report_requests`, `analysis_snapshots` — escritas só via service role. Os 3 INFO do linter são intencionais.
- Snapshots persistidos com cache de 24h + stale-on-error 7d.
- Design tokens em `tokens.css`, sem cores/spacing hardcoded nos componentes.

### Achados — o que ainda está hardcoded ou disperso

**ALTA — duplicação `FREE_MONTHLY_LIMIT = 2`**
Existe em `src/lib/quota.ts` **e** `src/routes/api/request-full-report.ts:23` (constantes duplicadas). Pior: a mensagem `"limite de 2 relatórios gratuitos"` em `request-full-report.ts:189` tem o número escrito à mão. Se mudar o limite (ex: promoção de 3 free), tem de tocar em 3 sítios e arriscar inconsistência. Solução: backend importa de `quota.ts` + interpola na mensagem.

**ALTA — benchmark dataset hardcoded em código**
`src/lib/benchmark/reference-data.ts` define `ENGAGEMENT_REFERENCE` (15 valores nano/micro/mid/macro/mega × Reels/Carrosséis/Imagens) directamente no bundle. Cada ajuste editorial (que vai acontecer — comentário no ficheiro confirma *"Refinable in later prompts"*) força um deploy. Mover para tabela `benchmark_references` na cloud permite afinar valores sem rebuild.

**ALTA — tier thresholds hardcoded**
`src/lib/benchmark/tiers.ts` cola os limites (10K, 50K, 250K, 1M) no código. Mesmo problema: ajustar tiers obriga a deploy. Devem viver junto do dataset, na mesma tabela ou tabela companheira.

**MÉDIA — `BENCHMARK_DATASET_VERSION = "v1.0-2025-04"`**
String estática em código. Se o dataset migrar para a DB, esta versão deve vir da row consultada (cada update bumps version automaticamente).

**MÉDIA — copy do gate "limite de 2 relatórios"**
Em `request-full-report.ts:189` o `2` está hardcoded na string. Trocar por interpolação `${FREE_MONTHLY_LIMIT}`.

**BAIXA — actores Apify por nome no código**
`PROFILE_ACTOR = "apify/instagram-profile-scraper"` etc. em `analyze-public-v1.ts`. Aceitável manter no código (raramente muda, parte do contracto técnico), **não** mover para DB. Mencionar no plano só para dispensar.

**BAIXA — `POSTS_LIMIT = 12` e `MAX_COMPETITORS = 2`**
Constantes de produto. Aceitável no código por enquanto — só vale a pena mover se virem a tornar-se planos pagos (ex: Pro analisa 30 posts). Nada a fazer agora.

### Não-problemas (confirmados após verificação)

- `client.ts` usa `localStorage` para sessão Supabase — auto-gerado, não tocar.
- Copy hardcoded em pt-PT nos componentes de UI — está correcto (não é dado, é apresentação).
- Ano `© 2026` no footer — está correcto para 2026.

---

## Refinamentos propostos (single feature: **centralizar configuração crítica na cloud**)

### Migração — nova tabela `benchmark_references`

```sql
CREATE TABLE public.benchmark_references (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tier text NOT NULL,                    -- 'nano' | 'micro' | 'mid' | 'macro' | 'mega'
  format text NOT NULL,                  -- 'Reels' | 'Carrosséis' | 'Imagens'
  engagement_pct numeric(5,2) NOT NULL,  -- e.g. 5.60
  tier_min_followers bigint NOT NULL,
  tier_max_followers bigint,             -- NULL = +∞
  tier_label text NOT NULL,              -- 'Nano (até 10K)'
  dataset_version text NOT NULL,         -- 'v1.0-2025-04'
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tier, format, dataset_version)
);

CREATE INDEX idx_benchmark_active ON benchmark_references (is_active, dataset_version);
ALTER TABLE benchmark_references ENABLE ROW LEVEL SECURITY;
-- Server-only (service role) for writes; reads also via server route to keep contract stable.
```

Seed inicial = valores actuais de `reference-data.ts` + thresholds de `tiers.ts`. Idempotente.

### Ficheiros tocados

| Ficheiro | Acção | Locked? |
|---|---|---|
| `supabase/migrations/{ts}_benchmark_references.sql` | **Criar** — tabela + seed inicial + RLS | Não |
| `src/lib/benchmark/reference-data.ts` | Editar — passa a `loadBenchmarkReferences()` async, busca da DB com cache em memória do server runtime; mantém shape compatível | Não |
| `src/lib/benchmark/tiers.ts` | Editar — `getTierForFollowers()` + `TIER_LABELS` derivam da mesma carga | Não |
| `src/lib/benchmark/engine.ts` | Editar — `computeBenchmarkPositioning()` recebe referências como argumento (injecção, não import directo) | Não |
| `src/routes/api/analyze-public-v1.ts` | Editar — chama loader uma vez, passa ao engine, importa `FREE_MONTHLY_LIMIT` de `quota.ts` se necessário | Não |
| `src/routes/api/request-full-report.ts` | Editar — importa `FREE_MONTHLY_LIMIT` de `@/lib/quota`, interpola na mensagem (`${FREE_MONTHLY_LIMIT} relatórios`) | Não |

**Zero ficheiros locked tocados.**

### Estratégia de carregamento (cost-conscious)

- `loadBenchmarkReferences()` lê a tabela uma vez por request lifecycle do server route.
- Cache simples em módulo (`let cached: { data, ts } | null`) com TTL de 10 min — evita que cada análise seja +1 query SQL ao Postgres.
- Se a query falhar, fallback para snapshot de constantes em código (fail-safe), com `console.warn`. Garante que a app nunca quebra por causa do refinamento.

### Guardrails

| Item | Estado |
|---|---|
| Sem PDF / email / pagamentos / auth / IA | ✅ |
| Sem novas dependências | ✅ |
| Provider só server-side | ✅ |
| Secrets em Supabase | ✅ |
| RLS fechado | ✅ |
| pt-PT impessoal | ✅ |
| Comentários em inglês | ✅ |
| Locked files intactos | ✅ |
| Mensagem do gate sem número hardcoded | ✅ |
| Refinar valores de benchmark sem deploy | ✅ |

### Checkpoints

- ☐ Tabela `benchmark_references` criada + RLS + seed inicial idempotente
- ☐ `reference-data.ts` carrega da DB com cache 10min + fallback em código
- ☐ `tiers.ts` deriva thresholds e labels da mesma fonte
- ☐ `engine.ts` recebe referências por injecção
- ☐ `request-full-report.ts` importa `FREE_MONTHLY_LIMIT` de `quota.ts` e interpola na mensagem
- ☐ Sem regressões visuais no dashboard (mesmos números, mesmo layout)
- ☐ Linter Supabase: 3 INFO esperados (RLS no policy é intencional)

