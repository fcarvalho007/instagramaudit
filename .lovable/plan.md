## Diagnóstico atual

**Dados disponíveis em `CommentIntelligence` (`src/lib/analysis/types.ts`):**

| Campo | Presente | Útil para Pro UI? |
|---|---|---|
| `samplePosts`, `sampleComments`, `sampleReplies` | ✅ | métricas |
| `ownerRepliesCount`, `ownerReplyRatePct`, `postsWithOwnerReplyPct` | ✅ | métricas |
| `questionsFromAudienceCount`, `praiseCount`, `complaintOrIssueCount`, `buyingIntentCount`, `spamOrLowQualityCount` | ✅ | sinais |
| `dominantConversationSignals: string[]` | ✅ | pouco usado |
| `classifiedExcerpts.{questions,praise,complaints,buyingIntent}` (até 5 por categoria, c/ username+texto) | ✅ | base para "Voz da audiência" |
| `topConversationPost` (1 item: `postUrl`, `commentsCount`, `ownerRepliesCount`) | ✅ | URL apenas, **sem postId nem thumbnail** |
| `topCommentPosts` (até 2: `postUrl`, `commentsCount`) | ✅ | URL apenas, **sem thumbnail nem ownerReplies** |
| `postId`/`shortcode` por post de conversa | ❌ ausente | necessário p/ thumbnail join |
| `thumbnailUrl` por post de conversa | ❌ ausente | necessário p/ cards visuais |
| `topAudienceComment` por post | ❌ ausente | necessário p/ 1-line summary |
| `summary` deterministico por post | ❌ ausente | necessário p/ 1-line summary |
| `audienceVoiceInsights` derivados | ❌ ausente | necessário p/ "Voz da audiência" rica |

**Snapshot atual `@frederico.m.carvalho`:** Free-origin, `enrichment_status.comments = disabled` — comment intelligence ausente. Sem auto-enqueue ainda (depende do plano de "enrichments Pro" anterior). Para esta tarefa: assumir que, quando o enrichment chegar, vamos ter o payload completo do aggregator; a melhoria de UI tem de funcionar com **dados presentes** e estado vazio honesto.

**UI actual (`report-comment-intelligence.tsx`):**
- Título `<h4>` 13px, hierarquia fraca face a outros blocos Pro.
- "Top conversation post" é uma linha de texto só, sem thumbnail.
- "Voz da audiência" lista até 2 excertos por categoria, em grelha plana — sem leads/insights.
- `topCommentPosts` não está a ser renderizado.
- Pro-teaser dourado aparece em estado `unavailable` mesmo num viewer Pro real.

---

## Plano de implementação

### 1. Extender a shape de dados (`src/lib/analysis/types.ts`)
Adicionar (opcionais, retrocompatíveis):
```ts
topConversationPosts?: Array<{
  postId?: string;
  shortcode?: string;
  postUrl: string;
  thumbnailUrl?: string;
  commentsCount: number;
  ownerRepliesCount: number;
  audienceCommentsCount: number;
  dominantSignal: "questions" | "praise" | "complaints" | "buying_intent" | "mixed";
  topAudienceComment?: { username: string; text: string };
  summary: string; // determinística, 1 frase
}>;
audienceVoiceInsights?: Array<{
  kind: "theme" | "question" | "praise" | "friction" | "buying_intent";
  title: string;
  text: string;
  evidenceCount?: number;
  excerpt?: { username: string; text: string };
}>;
```
Manter `topConversationPost` e `topCommentPosts` para retrocompat.

### 2. Aggregator (`src/lib/analysis/comment-intelligence.ts`)
- Ranquear posts por `ownerRepliesCount + audienceCommentsCount`; top 3 → `topConversationPosts`.
- Para cada post: extrair `shortcode` do URL, calcular contagem por categoria, determinar `dominantSignal` (categoria com mais peso, ou `mixed`).
- `topAudienceComment` = excerto não-spam mais longo do post (cap 140 chars).
- `summary` determinístico (template grounded em counts): ex. `"5 perguntas e 2 comentários de compra; nenhuma resposta da marca."` — em PT.
- `audienceVoiceInsights`: 2–3 entradas derivadas de `classifiedExcerpts` + counts:
  - Tema dominante de perguntas (se ≥3).
  - Padrão de elogio (se ≥3).
  - Padrão de fricção (se ≥2) ou intenção de compra (se ≥2).
- `postId`/`thumbnailUrl` ficam undefined no aggregator; são preenchidos no passo 3 (precisa do array de posts).

### 3. Join de thumbnails (`src/lib/report/snapshot-to-report-data.ts`)
- Após sanitização, fazer lookup `shortcode → thumbnailUrl` a partir do array principal `topPosts`/posts do snapshot e injectar `thumbnailUrl`+`postId` em cada `topConversationPosts[i]`. Mesmo lookup aplicado a `topCommentPosts` legacy quando renderizados.
- `sanitize-snapshot.ts`: passar pelos novos campos.

### 4. UI (`report-comment-intelligence.tsx`)
- **Título**: trocar `<h4 text-[13px]>` por header alinhado com outros Pro blocks (display heading + eyebrow), igual a `VisualCoverAnalysisCard`.
- **"Posts que geraram mais conversa"**: nova grid 3 colunas (responsiva 1→3) de cards compactos:
  - Thumbnail 80–96px (rounded, fallback placeholder neutro com ícone `MessageCircle` quando ausente).
  - Chip de `dominantSignal` (reutilizar paleta de `buildSignalChips`).
  - Linha de métrica: `12 com.` · `3 resp.`.
  - 1 linha: `summary` ou `topAudienceComment.text` truncado.
  - Link sutil para o post.
- **"Voz da audiência"**: lista 2–3 `audienceVoiceInsights` (ícone por kind + lead bold + 1 linha de suporte + chip opcional de evidência). Por baixo, grid compacta de excertos (cap 3 por categoria, máx 4 cards) — apenas se houver insights.
- Fallback: se `topConversationPosts` ausente mas `topConversationPost` legacy presente, mapear 1 card. Se `topCommentPosts` legacy presente, mapear até 2 cards (sem `ownerRepliesCount`/summary). Se nada → não renderizar a secção.
- Remover render directo de `dominantConversationSignals` (já refletido em chips).

### 5. Estados vazios e processing
- Mantém `CommentIntelligenceUnavailable` para `available=false`.
- Para viewer Pro com `reason="processing"` mostrar o estado "A gerar…" actual (não o teaser dourado). Detectar Pro via `useVariantFeatures` (já há `debugLabels==="hidden"` p/ public; condicionar teaser à ausência de entitlement Pro, não a `isPublic`).
- Quando `available=true` mas sem `topConversationPosts` nem excertos: ocultar essas duas subsecções (não deixar caixas vazias); restantes métricas + transparency strip continuam.

### 6. Testes
- Estender `src/lib/analysis/__tests__/comment-intelligence.test.ts`: `topConversationPosts` length, `dominantSignal` classification, `audienceVoiceInsights` deterministic output, retrocompat com payloads antigos.
- Snapshot do componente: 3 estados (rico, legacy-only, vazio).

### 7. Out of scope
- Pipeline de enrichment (auto-enqueue) — coberto pelo plano "enrichments Pro" anterior.
- LLM para summaries — deterministico é a verdade.
- Visual cover, prioridades, free tier, payments.

---

## Validação esperada

| Cenário | Resultado |
|---|---|
| Payload novo, completo | 3 cards com thumbnail + chip + summary; 2–3 voice insights |
| Payload só legacy (`topConversationPost` + `topCommentPosts`) | Mapeamento → até 3 cards, sem summary; voice cai para excertos brutos |
| `available=false`, viewer Pro, `processing` | Estado "A gerar…", sem teaser dourado |
| `available=false`, viewer Free/public | Pro teaser actual |
| Sem dados nenhuns | Secções de posts/voz omitidas, métricas + transparency permanecem |
| `frederico.m.carvalho` após enrichment | 3 thumbnails + insights, sem hierarquia fraca |

Typecheck + `bun test src/lib/analysis` + `bun test src/lib/report` devem passar.
