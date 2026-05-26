## Objetivo
Inserir 15 linhas Socialinsider em `knowledge_benchmarks` (3 IG + 5 FB + 7 LI) com `valid_from=2025-10-01`, `valid_to=2026-03-31`, `source_id` único Socialinsider já existente.

**Fonte Socialinsider já confirmada (sem duplicados):**
- id: `64796f2c-30cc-41eb-b95f-0b3a80251728`
- name: "Socialinsider — Social Media Posting Frequency vs Engagement (Mai 2026)"

## Bloqueios encontrados no schema actual

A migration anterior adicionou `platform` e `posts_per_month`, mas deixou intactos três constraints que impedem o seed pedido:

1. `knowledge_benchmarks_tier_check` → só aceita `nano|micro|mid|macro`. Pedido usa `tier='overall'`.
2. `knowledge_benchmarks_format_check` → só aceita `reels|carousels|images`. FB e LI precisam de `albums, statuses, links, native_documents, multi_image, videos, texts, polls`.
3. `sample_size` é `NOT NULL`. O estudo Socialinsider não fornece N por formato/plataforma de forma consistente.

## Fase 1 — Migração (relaxar constraints)

```sql
ALTER TABLE public.knowledge_benchmarks
  DROP CONSTRAINT knowledge_benchmarks_tier_check,
  ADD  CONSTRAINT knowledge_benchmarks_tier_check
       CHECK (tier IN ('nano','micro','mid','macro','overall'));

ALTER TABLE public.knowledge_benchmarks
  DROP CONSTRAINT knowledge_benchmarks_format_check,
  ADD  CONSTRAINT knowledge_benchmarks_format_check
       CHECK (format IN (
         'reels','carousels','images',           -- IG legado
         'albums','statuses','links',            -- FB
         'native_documents','multi_image',
         'videos','texts','polls'                -- LI
       ));

ALTER TABLE public.knowledge_benchmarks
  ALTER COLUMN sample_size DROP NOT NULL;
```

Sem alterações ao código TypeScript nesta fase — os helpers existentes (`listBenchmarks`, `upsertBenchmark`, `get_knowledge_context`) continuam a funcionar porque já usam `text` para tier/format.

Nota: as Zod schemas em `src/routes/api/admin/knowledge.benchmarks.ts` continuam a aceitar apenas o enum antigo (nano/micro/mid/macro × reels/carousels/images). Isto é intencional — o admin UI continua a só editar IG por agora. O seed é feito via SQL directo, não passa pelo endpoint.

## Fase 2 — Seed (via insert tool)

15 linhas, `origin='manual'`, `tier='overall'`, `source_id=64796f2c-…`, `valid_from='2025-10-01'`, `valid_to='2026-03-31'`, `sample_size=NULL`, `created_by_email='socialinsider-seed@system'`, `notes='Socialinsider 2025/2026 study'`.

Usar `WHERE NOT EXISTS (SELECT 1 FROM knowledge_benchmarks WHERE platform=? AND format=? AND source_id=? AND valid_from='2025-10-01')` por linha para garantir idempotência.

| Platform | Format | posts/month | eng % |
|---|---|---|---|
| instagram | reels | 10 | 0.50 |
| instagram | carousels | 5 | 0.52 |
| instagram | images | 8 | 0.35 |
| facebook | reels | 7 | 0.20 |
| facebook | albums | 6 | 0.17 |
| facebook | images | 10 | 0.15 |
| facebook | statuses | 6 | 0.13 |
| facebook | links | 10 | 0.05 |
| linkedin | native_documents | 2 | 6.90 |
| linkedin | multi_image | 1 | 6.80 |
| linkedin | videos | 4 | 5.90 |
| linkedin | images | 7 | 5.00 |
| linkedin | texts | 2 | 4.35 |
| linkedin | links | 4 | 3.55 |
| linkedin | polls | 1 | 2.90 |

## Fase 3 — Validação

```sql
SELECT platform, format, posts_per_month, engagement_pct, valid_from, valid_to, source_id
FROM knowledge_benchmarks
WHERE source_id='64796f2c-30cc-41eb-b95f-0b3a80251728'
  AND valid_from='2025-10-01'
ORDER BY platform, engagement_pct DESC;

SELECT platform, COUNT(*) FROM knowledge_benchmarks
WHERE source_id='64796f2c-30cc-41eb-b95f-0b3a80251728'
  AND valid_from='2025-10-01' GROUP BY platform;
-- esperado: instagram=3, facebook=5, linkedin=7
```

Linter Supabase depois da migration.

## Fora de scope (confirmado)
- UI do relatório, prompts OpenAI, Apify, DataForSEO, pricing, gates, admin CRM.
- `bunx tsc --noEmit` / testes: não há alterações a código TS nesta entrega.

## Checkpoint
- ☐ Migration aprovada e aplicada (3 ALTERs)
- ☐ 15 linhas inseridas (IG 3 / FB 5 / LI 7)
- ☐ Sem duplicados, todas com `source_id` Socialinsider
- ☐ Linter verde
