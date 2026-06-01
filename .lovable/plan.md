## Situação

O log pedido **já existe** no working tree em `src/lib/analysis/cache.ts` (linhas 223-225), imediatamente antes do `persistThumbnailsInPayload`, com o formato pedido:

```
[thumbnails] start handle=... cache_key=... posts=... posts_with_thumb=... has_avatar=... deploy=...
```

- `posts_with_thumb` é contagem (não URLs) ✓
- `has_avatar` é boolean ✓
- Não loga URLs nem tokens ✓
- O sumário final em 230-232 mantém-se intacto ✓

Conclusão: não é preciso alterar código. O que falta é confirmar que o deployment publicado inclui esta linha e correr a validação.

## Plano (Build Mode)

1. **Sem alterações de código.** Confirmar via `rg` que o log `start` está em `cache.ts` e não há drift.
2. `bunx tsc --noEmit` (baseline).
3. Verificar logs publicados (`[thumbnails]`) — se ausentes, deployment está stale.
4. **Publicar** (acção do utilizador no botão Publish — não posso publicar autonomamente).
5. Após publish confirmado: correr um refresh controlado para `frederico.m.carvalho` via `/api/admin/...` ou refresh manual no preview publicado.
6. Recolher logs filtrados por `[thumbnails]` (worker logs, deployment=published).
7. Consultar BD:
   - count de objects em `post-thumbnails` (via `read_query` em `storage.objects`)
   - count de posts com `thumbnail_storage_url` no snapshot mais recente
8. Aplicar árvore de decisão:
   - sem `start` → persistência não invocada no caminho publicado
   - só `start`, sem sumário → função hangs/exits
   - sumário com `stored=0` → diagnosticar contadores de falhas
   - sumário com `stored>0` → pipeline OK

## Ficheiros

Nenhum a alterar. Apenas leitura + invocação de tools de diagnóstico.

## Checkpoint

☐ Confirmas que posso avançar com este diagnóstico (sem alterar código), e confirmas que vais carregar em **Publish** quando eu indicar, antes do passo 5?
