
# P05 — Refinamentos incrementais

## Avaliação do prompt

A maioria das funcionalidades pedidas **já está implementada**:

| Pedido | Estado |
|--------|--------|
| Categorias expandíveis com excertos | ✅ Feito — chevron + `classifiedExcerpts` |
| Remover "Sinais dominantes" | ✅ Já removido |
| Top 2 posts por comentários | ✅ Feito — thumbnails, formato, data, legenda, permalink |
| Rodapé de metodologia completo | ✅ Feito — posts, comentários, amostra parcial, DMs |
| Robustez / fallback | ✅ Feito — handles missing data gracefully |

Restam **3 refinamentos úteis** que melhoram clareza sem alterar estrutura:

---

## Plano (apenas o que falta)

### 1. Feedback quando excertos não existem (cache antigo)

Quando `classifiedExcerpts` é `undefined` mas existem contagens > 0, mostrar uma nota muted abaixo da lista de categorias:

`Exemplos de comentários disponíveis apenas em novas análises.`

Isto explica ao utilizador porque não há chevron de expansão.

### 2. Renomear "Comentários que pedem ação" → "Comentários com oportunidade"

Alterações:
- Título: `Comentários com oportunidade`
- Adicionar contagem total e percentagem: `11 de 73 comentários (15%)`
- Subtítulo breakdown: `perguntas + intenção de compra + problemas`
- Manter o insight dominante existente
- Substituir copy "acionáveis" no insight por linguagem mais clara

### 3. Secção top posts — título e subtítulo

- Título: `Posts que geraram mais conversa`
- Subtítulo: `Ordenado por comentários públicos — não por gostos ou performance geral.`

---

## Ficheiros a editar

| Ficheiro | Alteração |
|----------|-----------|
| `src/components/report-redesign/v2/report-diagnostic-card.tsx` | 3 mudanças de copy + nota de cache |

Nenhum outro ficheiro é tocado.

## Validação

- `bunx tsc --noEmit`
- `bunx vitest run`
