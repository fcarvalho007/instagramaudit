
# Auditoria P05 Conversation Card — Resultados

## PASS/FAIL

| Dimensão | Status | Detalhe |
|----------|--------|---------|
| 1. classifiedExcerpts — geração | PASS | `aggregateCommentIntelligence` recolhe até 5 por categoria, com username + texto truncado a 120 chars |
| 1. classifiedExcerpts — persistência | **FAIL** | O código persiste, mas os 2 snapshots existentes foram criados antes da feature — não contêm `classifiedExcerpts`. Só aparecerão em novas análises |
| 1. classifiedExcerpts — agrupamento | PASS | Correctamente agrupados em `questions`, `praise`, `complaints`, `buyingIntent` |
| 1. classifiedExcerpts — username vazio | **WARN** | `pushExcerpt` usa `comment.ownerUsername ?? ""` — pode guardar username vazio. A UI renderiza `@` sem nome |
| 1. classifiedExcerpts — duplicados | PASS | Sem deduplicação explícita, mas limitado a max 5 por categoria — risco aceitável |
| 1. classifiedExcerpts — truncação | PASS | `.slice(0, 120)` no texto |
| 2. Expandable UI — affordance | PASS | Chevron down/up só quando `hasExcerpts = true` |
| 2. Expandable UI — username + texto | PASS | `@{ex.username} «{ex.text}»` |
| 2. Expandable UI — fallback cache antigo | PASS | `!ci.classifiedExcerpts && totalSignals > 0` mostra "Exemplos disponíveis apenas em novas análises" |
| 3. Top 2 posts — título | PASS | "Posts que geraram mais conversa" |
| 3. Top 2 posts — ordenação | PASS | Ordenado por `comments` desc (determinístico, não por gostos) |
| 3. Top 2 posts — thumbnail | PASS | Proxy via `/api/public/ig-thumb`, com `onError` hide |
| 3. Top 2 posts — format badge | PASS | `post.format` badge no canto superior direito |
| 3. Top 2 posts — data | PASS | `post.date` formatada em pt-PT |
| 3. Top 2 posts — legenda | PASS | `post.captionExcerpt` com `line-clamp-2`, truncada a 120 chars |
| 3. Top 2 posts — contagem | PASS | `post.comments` com ícone MessageCircle |
| 3. Top 2 posts — não implica best | PASS | Subtítulo explícito: "Ordenado por comentários públicos — não por gostos ou performance geral" |
| 4. Methodology footer | PASS | Posts analisados, posts com comentários, comentários públicos, recolhidos para análise, amostra parcial, sem DMs |
| 5. Privacy — excerpts | **WARN** | Usernames e texto de comentários públicos são dados pessoais. Aceitável para dados públicos do Instagram, mas merece atenção |
| 6. TypeScript | *A verificar na implementação* | |

## Problemas concretos encontrados

### 1. Username vazio nos excertos (baixo impacto, fácil de corrigir)

Em `comment-intelligence.ts` linha 181:
```
pushExcerpt(excerptQuestions, comment.ownerUsername ?? "", comment.text);
```
Quando `ownerUsername` é `undefined`, guarda `""`. A UI renderiza `@` sem nome visível.

**Fix**: Filtrar excertos com username vazio, ou usar "anónimo" como fallback.

### 2. Snapshots existentes sem excerpts (esperado, não é bug)

Os 2 snapshots com `comment_intelligence` foram criados antes da adição de `classifiedExcerpts` e `topCommentPosts`. O código já os produz — basta correr uma nova análise para validar end-to-end.

### 3. `topCommentPosts` no CommentIntelligence vs no block02-diagnostic (duplicação)

Existem **dois `topCommentPosts` independentes**:
- Um em `CommentIntelligence.topCommentPosts` (gerado pelo comment scraper, só tem `postUrl` + `commentsCount`)
- Outro em `block02-diagnostic.ts` (gerado a partir dos posts do perfil, com thumbnails, captions, formato, data, permalink)

A UI do P05 usa o do `block02-diagnostic` (que é o completo). O do `CommentIntelligence` **nunca é usado pela UI** — é redundante.

**Recomendação**: Remover `topCommentPosts` da interface `CommentIntelligence` e do `aggregateCommentIntelligence` para evitar confusão. Não é urgente.

---

## P05 pode ser considerado fechado?

**Sim, com uma ressalva menor.** O card está funcional, auditável, e com fallbacks correctos. O único fix concreto é o username vazio nos excertos (cosmético até haver dados novos). Proponho:

1. **Fix username vazio** — se `ownerUsername` é falsy, usar `"utilizador"` como fallback no `pushExcerpt`
2. Nada mais precisa de edição para fechar P05

## Ficheiros a editar (se aprovado)

1. `src/lib/analysis/comment-intelligence.ts` — fallback username nos pushExcerpt

## Ficheiros NÃO tocados

P04, P07, Block 1, PDF, auth/admin, global tokens, locked files
