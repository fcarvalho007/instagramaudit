
# Refinamento UX do Controlo Operacional (Sistema)

A estrutura base já está correcta: os 3 cards vivem em `/admin/sistema`, a Visão Geral tem apenas um strip compacto e o badge global existe no header. O que falta é polish visual e de copy.

**Ficheiros a editar:**
- `src/components/admin/v2/visao-geral/execution-mode-card.tsx`
- `src/components/admin/v2/visao-geral/test-profiles-card.tsx`
- `src/components/admin/v2/visao-geral/cache-maintenance-card.tsx`
- `src/routes/admin.sistema.tsx` (layout do grid)

**Ficheiros que NÃO mudam:** Visão Geral, admin.tsx (badge global), backend, tokens, locked files.

---

## Task 1 — Layout do painel no Sistema

Alterar o grid em `admin.sistema.tsx`:
- Linha superior: 2 colunas — ExecutionModeCard (col-span-1) + TestProfilesCard (col-span-1)
- Linha inferior: CacheMaintenanceCard ocupa 2 colunas, mas com altura reduzida e aspecto secundário
- Em mobile: stack vertical normal

## Task 2 — Redesenhar o switcher (ExecutionModeCard)

- Segmented control maior com estados mais distintos:
  - Cache-only activo: fundo verde suave, texto "CACHE-ONLY", copy "Não chama APIs externas", secondary "Usa apenas snapshots e dados já guardados."
  - Fresh activo: fundo amber, texto "FRESH", copy "Pode gerar custos reais", secondary "Pode chamar Apify, OpenAI e DataForSEO."
- Badge de estado:
  - `MODO SEGURO · SEM CUSTOS` (verde)
  - `MODO FRESH · CUSTOS ATIVOS` (amber)

## Task 3 — Copy do diálogo de confirmação

- Título: "Ativar modo Fresh?"
- Body: "Este modo pode gerar chamadas pagas a APIs externas. Deve ser usado apenas quando for necessário atualizar dados reais."
- Confirmar: "Ativar Fresh"
- Cancelar: "Manter Cache-only"

## Task 4 — Perfis de teste compactos

Substituir os cards verticais por linhas horizontais compactas:
- Uma linha por perfil: `@handle` + 4 status dots inline (Report cache, Legendas IA, Comentários, Capas) + data + acções
- Remover os borders/cards individuais; usar linhas separadas por border-bottom
- Manter "Abrir cache" e "Reanalisar fresh" como links inline

## Task 5 — Cache maintenance secundário

- Reduzir padding e tornar visualmente mais leve (border mais subtil, sem header grande)
- Inline: input + botão na mesma linha, label acima em eyebrow

## Task 6 — Validação

- `bunx tsc --noEmit`
- `bunx vitest run`
- Confirmar que lógica de execução não mudou
- Confirmar que Visão Geral não foi tocada
