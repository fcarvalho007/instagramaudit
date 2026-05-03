
## Situação atual

A análise de `frederico.m.carvalho` foi disparada mas retornou de **cache** (snapshot `683e4c21` expira às `2026-05-03 09:07 UTC`). O bloco do comment scraper (linha 1048 de `analyze-public-v1.ts`) só corre em análises **fresh** — quando não existe snapshot em cache.

O endpoint suporta `?refresh=1` com `Authorization: Bearer $INTERNAL_API_TOKEN`, mas a ferramenta de invocação não consegue incluir o token interno.

## Opções

### Opção A — Esperar ~30 minutos
O cache expira automaticamente às ~09:07 UTC. Depois disso, a próxima chamada a `/analyze/frederico.m.carvalho` (mesmo pelo browser) será fresh e o comment scraper correrá. Sem alterações de código.

### Opção B — Criar rota admin de force-refresh (recomendado)
Criar um endpoint `/api/admin/force-refresh` que:
1. Aceita `POST { instagram_username }` protegido por `requireAdminSession`
2. Deleta ou expira o snapshot atual via `supabaseAdmin`
3. Chama internamente a lógica de análise fresh (ou simplesmente expira o cache e retorna, deixando a próxima visita correr fresh)

Isto permite validar o comment scraper imediatamente e serve como ferramenta operacional futura.

## Plano técnico (Opção B)

1. **Criar `/api/admin/force-refresh.ts`** — endpoint admin que atualiza `expires_at` do snapshot para o passado, forçando a próxima análise a ser fresh.
2. **Invocar via ferramenta** — chamar o endpoint admin, depois disparar a análise novamente.
3. **Verificar `provider_call_logs`** — confirmar que aparece um registo com `actor = 'apify/instagram-comment-scraper'` e o custo real.

Estimativa: ~15 minutos de implementação.
