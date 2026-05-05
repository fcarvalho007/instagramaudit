
# OpenAI Actor Breakdown na secção Despesa

## Contexto

A secção Despesa já mostra um breakdown detalhado por ator para o Apify (Perfil, Comentários, Scraper), mas o OpenAI aparece como valor único. O campo `actor` no `provider_call_logs` já distingue:

- `insights:gpt-5.4-mini`, `insights:gpt-5.4-nano` — chamadas de texto (insights editoriais)
- `visual-cover-analysis` — chamadas de visão (thumbnails)

O plano replica o padrão Apify actor breakdown para o OpenAI.

## Alterações

### 1. Backend: `src/lib/admin/system-queries.server.ts`

- Criar tipo `OpenAiActorBreakdown` (semelhante a `ApifyActorBreakdown` mas com campos relevantes: actor, label, total_cost_usd, call_count, total_prompt_tokens, total_completion_tokens, avg_cost_per_call, last_call_at, model).
- Criar função `aggregateOpenAiActorBreakdown(sinceIso)` que agrupa por `actor` no `provider_call_logs` onde `provider='openai'`.
- Adicionar campo `openai_actors: OpenAiActorBreakdown[]` ao tipo `Expense30d` e `Cost24hMetrics`.
- Adicionar `openai_by_actor?: Record<string, number>` ao `ExpenseDailyPoint` (para sub-barras no gráfico diário).
- Na função `aggregateCostsFromLogs`, popular `openai_by_actor` da mesma forma que `apify_by_actor`.
- Nas funções `fetchExpense30d` e `fetchCostMetrics24h`, chamar `aggregateOpenAiActorBreakdown`.

### 2. Frontend: `src/components/admin/v2/visao-geral/expense-section.tsx`

- Adicionar mapeamento de cores e labels para atores OpenAI:
  - `insights:*` → "Insights (texto)" — cor info variante
  - `visual-cover-analysis` → "Análise visual (covers)" — cor info mais escura
- Após o bloco "Breakdown por ator Apify", adicionar bloco idêntico "Breakdown por ator OpenAI" com tabela: Ator, Custo, Chamadas, Tokens (prompt+completion), Média/chamada, Modelo.
- No gráfico de barras diário, substituir a barra única `openai` por sub-barras `openai_{actor}` (mesmo padrão das sub-barras Apify).
- Atualizar o tooltip do gráfico para mostrar os sub-atores OpenAI.

### 3. Ficheiros tocados

| Ficheiro | Ação |
|----------|------|
| `src/lib/admin/system-queries.server.ts` | Novo tipo + função + campos |
| `src/components/admin/v2/visao-geral/expense-section.tsx` | Tabela + sub-barras gráfico |

### 4. Ficheiros intocados

Nenhum ficheiro locked é alterado. Não se toca em auth, report, PDF, tokens globais, backend de análise, nem nos endpoints de sync existentes.

### 5. Riscos

- Nenhum risco funcional — é extensão read-only de dados já existentes no `provider_call_logs`.
- Se não houver chamadas `visual-cover-analysis` ainda, a tabela simplesmente mostra apenas os atores de insights.
