# Provider Parity Test: Apify vs ScrapeCreators

Teste real de paridade de dados entre os dois fornecedores, sem alterar UI nem arquitectura. Todo o trabalho é feito num script temporário fora do código da aplicação (`/tmp/parity/`), com os payloads raw guardados apenas em `/tmp` para análise e destruídos no fim. Nenhum ficheiro de `src/` é alterado nesta fase.

## Perfil de teste e limites de gasto

- Perfil: `frederico.m.carvalho` (perfil público de teste do projecto).
- Uma única chamada por endpoint. Sem repetições, sem concorrentes, sem janelas 30d/90d reais.
- Comentários: uma só publicação, sem replies, máximo 10 comentários por fornecedor.
- Tecto de gasto do teste: aproximadamente $0.06 no total (detalhe na secção de custos).

## Passos

### 1. Paridade de perfil
Apify `instagram-scraper` em modo `details` (1 resultado) e ScrapeCreators `/v1/instagram/profile`. Comparação campo a campo: followers, following, posts count, nome, bio, verificado, business/professional, categoria, external URLs, avatar, privado.

### 2. Paridade de publicações
As 12 publicações mais recentes de cada fornecedor (`latestPosts[]` do Apify vs `/v2/instagram/user/posts`), com matching exclusivamente por `shortcode`/`code`. Por publicação: shortcode, URL, timestamp, tipo/media_type, product type, likes, comentários, video views, play count, duração de vídeo, caption, hashtags, mentions, carrossel/children, tagged users, coauthors, música/áudio, localização, pinned, paid partnership, e qualquer campo adicional presente no payload real.

### 3. Lineage AuditProfiles
Tabela por métrica: métrica → campo normalizado → origem Apify → origem ScrapeCreators → valores coincidem? → diferença → impacto. O mesmo cálculo local de engagement (`((avgLikes + avgComments) / followers) * 100` para a conta, `((likes + comments) / followers) * 100` por post) é aplicado aos dois datasets e os resultados comparados numericamente. Prioridade: followers, engagement da conta, engagement por post, médias de likes/comentários, rankings top/bottom, formatos, Reels, views/plays, cadência, heatmap, captions, hashtags, mentions, concorrentes, 30d/90d.

### 4. Paridade de comentários
Uma publicação com comentários: Apify Comment Scraper (limite 10, sem nested) vs ScrapeCreators `/v2/instagram/post/comments`. Comparação de id, texto, autor, timestamp, likes, replies count e restantes campos.

### 5. Dados desperdiçados
Classificação de cada campo útil em: (A) ambos devolvem e a AuditProfiles não usa, (B) só Apify, (C) só ScrapeCreators — cada um marcado como `usar agora`, `interessante futuro` ou `não fiável/não usar`, com o benefício concreto para a auditoria.

### 6. Custos reais
- ScrapeCreators: lidos directamente das respostas (`credits_charged`, `credits_remaining`, `cached`), custo = créditos × $0.00188 (shadow price $47/25000). `SCRAPECREATORS_COST_PER_REQUEST_USD` não é usado.
- Apify: $0.0027 por resultado de dataset e $0.0023 por comentário.
- Apresentação do custo real deste teste e das estimativas de baseline, 30d, 90d e Comment Intelligence 5×4 para os dois fornecedores.

### 7. Fallback
Verificação já feita na leitura de código, a confirmar no relatório: o router (`src/lib/analysis/providers/index.server.ts`) só faz fallback para falhas do fornecedor (HTTP 402/403/429/5xx e mensagens com billing/quota/insufficient/timeout). Os estados internos de orçamento (`BUDGET_EXCEEDED`, `WINDOW_90D_BUDGET_EXCEEDED`, `PRO_WINDOW_BUDGET_EXCEEDED` em `src/routes/api/analyze-public-v1.ts`) devolvem erro 503 antes de qualquer chamada ao fornecedor, pelo que **não** accionam fallback para ScrapeCreators. Isto fica assinalado como correcção necessária, sem ser implementado agora.

## Resultado entregue

Relatório em chat com: paridade total, diferenças reais, métricas AuditProfiles afectadas, dados novos aproveitáveis, custo real Apify vs ScrapeCreators e recomendação objectiva (Apify primário, ScrapeCreators primário, ou fornecedor diferente por operação).

## Notas técnicas

- Chaves lidas do ambiente do sandbox; nunca impressas, registadas nem incluídas no relatório.
- Payloads raw só em `/tmp/parity/`, apagados no fim; nada é commitado.
- Nenhuma alteração a `src/`, migrações, variáveis de ambiente ou UI.
