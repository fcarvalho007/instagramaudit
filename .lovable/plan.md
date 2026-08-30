# Decisão do Provider Parity Test — ScrapeCreators primário, Apify fallback

Objetivo: tornar a ScrapeCreators o fornecedor principal de perfil, publicações e comentários, com a Apify como alternativa automática, sem alterar o aspeto visual da auditoria (exceto a correção da métrica de visualizações de vídeo).

## 1. Camada de fornecedores unificada

- `src/lib/analysis/providers/types.ts`: acrescentar `fetchComments` ao contrato, tipos `ProviderCommentRow`, `FetchCommentsOptions` e telemetria (`creditsConsumed`, `creditsRemaining`, `cached`, `endpoint`, `monetaryCostUsd`).
- Novo `src/lib/analysis/providers/apify.server.ts`: adapta o que já existe (`runActorWithMetadata`, `fetchCommentsForPosts`) ao mesmo contrato, incluindo os estados internos de orçamento (`BUDGET_EXCEEDED`, caps mensais) como erros classificáveis.
- Novo `src/lib/analysis/providers/router.server.ts`: `fetchProfile`, `fetchPosts`, `fetchComments` com escolha do primário por variável de ambiente e uma única tentativa por fornecedor e operação (máximo dois no total, sem ciclos).
- `index.server.ts` passa a expor apenas o router; a rota `analyze-public-v1.ts` deixa de chamar a ScrapeCreators diretamente e o bloco atual de fallback parcial é substituído pelo router.

Predefinições: perfil, publicações e comentários com ScrapeCreators primária e Apify secundária, invertíveis por `SOCIAL_PROVIDER_*` sem alterar código.

## 2. Matriz de fallback

Aciona o fornecedor alternativo em: HTTP 402, 403 de faturação/quota, 429, 5xx, timeout, créditos esgotados, faturação bloqueada, soft/hard cap mensal Apify, `BUDGET_EXCEEDED`, `WINDOW_90D_BUDGET_EXCEEDED`, `PRO_WINDOW_BUDGET_EXCEEDED`.

Nunca em erros de validação (perfil inexistente, privado, handle inválido). Orçamento esgotado num fornecedor não faz falhar a auditoria se o outro estiver disponível.

## 3. Vídeo, contagem de publicações e fixados

- Campo canónico `videoPlays`: ScrapeCreators `play_count`, Apify `videoPlayCount`. O `videoViewCount` da Apify deixa de alimentar este campo e passa a `videoViewCount` opcional separado. Esta é a única correção com efeito visível (evita apresentar um número enganador).
- Contagem de publicações: `totalPostsLifetime` (null quando indisponível), `postsAnalyzed`, `windowDays`, `observedFrom`, `observedTo`. Nunca inferir o histórico a partir da janela.
- Publicações fixadas: `isPinned` guardado como atributo analítico; filtragem temporal passa a usar exclusivamente o timestamp, sem exclusão por estar fixada.

## 4. Novos campos normalizados (sem UI)

`videoDurationSeconds`, `isPaidPartnership`, `carouselItemCount`, `coauthors`, `isPinned`, e opcionais `musicMetadata`, `location`, `userTags`, `genAiDetection` (interno/experimental, nunca apresentado como afirmação). Mapeados nos dois adaptadores; ausência mantém-se `null`, nunca zero.

## 5. Custos e créditos

- Migração: acrescentar a `provider_call_logs` as colunas `credits_charged`, `credits_remaining`, `cached`, `endpoint` (todas anuláveis, sem alterar a reconciliação existente).
- Cada chamada ScrapeCreators regista créditos cobrados, saldo, cache e endpoint, lidos da resposta/cabeçalhos.
- `creditsConsumed` separado de `monetaryCostUsd`. Enquanto `SCRAPECREATORS_COST_PER_CREDIT_USD` não estiver definido (créditos promocionais), o custo monetário é 0 e apenas os créditos são contados. A constante fixa por pedido é removida.

## 6. Cache

Usar `cache_max_age` da ScrapeCreators quando a idade aceite pela auditoria o permitir, respeitando primeiro a cache própria da aplicação. Registar `cached=true` e confirmar `credits_charged=0` nesses casos.

## 7. Comment Intelligence

Mantém amostra gratuita de 5 publicações × 4 comentários, sem respostas aninhadas. ScrapeCreators primária; falha numa publicação recorre à Apify apenas para essa publicação, sem duplicar comentários já obtidos (deduplicação por ID de comentário).

## 8. Testes (Vitest, com fetch simulado)

A. ScrapeCreators disponível → zero chamadas Apify.
B/C/D. Falha de perfil / publicações / comentários → Apify assume.
E. Apify primária bloqueada por cap mensal → ScrapeCreators é usada.
F. Nunca mais de dois fornecedores por operação.
G. Engagement numericamente idêntico entre fornecedores.
H. `play_count` e `videoPlayCount` produzem o mesmo `videoPlays`.
I. Publicações fixadas filtradas por data, não pelo estado.
J. Cache hit com `credits_charged=0` registado corretamente.

## Notas técnicas

Ficheiros previstos: `providers/types.ts`, `providers/apify.server.ts` (novo), `providers/router.server.ts` (novo), `providers/index.server.ts`, `providers/scrapecreators.server.ts`, `analysis/normalize.ts`, `analysis/types.ts`, `analysis/comment-scraper.server.ts`, `analysis/events.ts`, `routes/api/analyze-public-v1.ts`, `routes/api/public/unlock-comments.ts`, migração Supabase e novos testes.

Variáveis de ambiente: `SOCIAL_PROVIDER_PROFILE`, `SOCIAL_PROVIDER_POSTS`, `SOCIAL_PROVIDER_COMMENTS` (todas `scrapecreators`), `SOCIAL_PROVIDER_FALLBACK=true`, `SCRAPECREATORS_API_KEY`, `SCRAPECREATORS_COST_PER_CREDIT_USD` (vazio enquanto promocional), `SCRAPECREATORS_CACHE_MAX_AGE_SECONDS`, mantendo os caps Apify já existentes.

Riscos: dependência de um fornecedor externo menos maduro (mitigada pelo fallback), telemetria de créditos dependente do formato de resposta da ScrapeCreators, e alteração do valor de reproduções de vídeo em relatórios anteriores gerados via Apify.

Fora de âmbito: novos cartões visuais para os campos adicionais, `/report.example`, pagamentos e subscrições.
