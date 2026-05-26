## Fase 1 — Consolidar fonte Socialinsider em `knowledge_benchmarks`

Objectivo: deixar o DB como fonte única dos valores Socialinsider (frequência + engagement por formato), sem mexer ainda em UI nem em leitores. Fases 2-4 ficam para pedidos seguintes.

## Decisão de valores (precisa de confirmação)

Existem 3 conjuntos divergentes no projecto:

| Formato | A (knowledge_notes) | C (código `benchmark-context.ts`) | D (i18n report.json) |
|---|---|---|---|
| Reel — eng % | 0,50 | 0,52 | 0,50 |
| Carousel — eng % | 0,52 | 0,55 | 0,52 |
| Image — eng % | 0,35 | 0,37 | 0,35 |
| Reel — posts/mês | — | 8 | ≈10 |
| Carousel — posts/mês | 5 | 5 | 5 |
| Image — posts/mês | — | 7 | 8 |

Proposta: adoptar **A/D** (notas + i18n batem certo entre si: 0,50 / 0,52 / 0,35) e **frequência de C** ajustada (Reels 8, Carousels 5, Images 7 — é o que o estudo Socialinsider 2024 reporta). Confirma antes de fazer o seed ou indica os números corretos.

## Migração

```sql
ALTER TABLE public.knowledge_benchmarks
  ADD COLUMN platform text NOT NULL DEFAULT 'instagram',
  ADD COLUMN posts_per_month numeric;

ALTER TABLE public.knowledge_benchmarks
  ADD CONSTRAINT knowledge_benchmarks_platform_chk
  CHECK (platform IN ('instagram','facebook','linkedin','tiktok','youtube'));

CREATE INDEX IF NOT EXISTS knowledge_benchmarks_platform_format_tier_idx
  ON public.knowledge_benchmarks (platform, format, tier, valid_to);
```

Notas:
- `engagement_pct` continua `NOT NULL` na tabela. Para registos só de frequência, precisamos de relaxar para `NULL` (Socialinsider tem casos só-frequência). Adicionar `ALTER COLUMN engagement_pct DROP NOT NULL` na mesma migração.
- `tier` é `NOT NULL` hoje — manter, e seed usa `tier='overall'`.

## Seed Socialinsider (após confirmação dos valores)

9 linhas (3 plataformas × 3 formatos). Source: row já existente em `knowledge_sources` para Socialinsider — query do `id` no seed em vez de hardcoded.

Para Instagram (exemplo, valores a confirmar):

| platform | tier | format | engagement_pct | posts_per_month |
|---|---|---|---|---|
| instagram | overall | reel | 0.50 | 8 |
| instagram | overall | carousel | 0.52 | 5 |
| instagram | overall | image | 0.35 | 7 |

Facebook e LinkedIn replicados a partir das `knowledge_notes` actuais (precisam dos números — confirmar se os mantenho como estão na nota ou actualizo).

Campos obrigatórios: `valid_from='2025-10-01'`, `valid_to='2026-03-31'`, `origin='external_study'`, `sample_size` extraído das notas (Socialinsider IG: 394M posts; preencher por linha conforme nota original), `source_id = (SELECT id FROM knowledge_sources WHERE name ILIKE 'socialinsider%')`.

## Fora de scope (Fases 2-4, próximos pedidos)

- Helper `getFormatBenchmark()` no servidor.
- Props novas em `FormatCard` / `FrequencyCard`.
- Limpeza dos números embebidos em `pt/en report.json` e duplicação em `benchmark-context.ts`.
- Migração para derivar `BENCHMARK_DATASET_VERSION` do `MAX(valid_from)`.

## Checkpoint

- ☐ Confirmar tabela de valores (qual conjunto é "a verdade" para IG; e que números usar para FB/LinkedIn).
- ☐ Migração: `platform`, `posts_per_month`, `engagement_pct` nullable, índice, CHECK constraint.
- ☐ Seed das 9 linhas Socialinsider com `source_id` resolvido por query.
- ☐ DB linter verde; tabela continua a renderizar em `/admin/conhecimento` sem regressões.
- ☐ UI do relatório **não muda** nesta fase (Fase 3 trata disso).

## Pergunta para destrancar

Confirmas os valores propostos para Instagram (0,50 / 0,52 / 0,35 + 8 / 5 / 7) e indicas se mantenho Facebook/LinkedIn exactamente como estão nas `knowledge_notes` actuais? Sem isto não faço o seed para não fixar números errados no DB.
