# Corrigir imagens em "Melhores e piores publicações"

## O que se passa

As publicações reais existem no relatório (legenda, gostos, data, formato), mas a imagem nunca chega. A causa está confirmada nos dados:

- Nas análises recentes (pingodoce, frederico.m.carvalho, augusttojesus, entre outras), o registo de persistência de imagens mostra `attempted = 0`: nenhuma publicação chegou sequer com URL de imagem. O avatar do perfil, esse, é guardado com sucesso — logo o problema é específico das publicações.
- Nas análises antigas (maio, via Apify) as publicações tinham imagem. A mudança de fornecedor para ScrapeCreators é o ponto de quebra.
- No adaptador do ScrapeCreators, a leitura do URL da imagem trata uma lista como se fosse um objecto, pelo que devolve sempre vazio. Sem URL, não há cópia para o nosso armazenamento e o cartão fica sem imagem.

Efeito secundário: como os URLs originais do Instagram expiram, mesmo relatórios antigos podem ficar com imagens partidas quando a cópia permanente não foi feita.

## O que vai ser feito

1. **Extracção robusta da imagem** no adaptador do ScrapeCreators, cobrindo todas as formas que a API devolve: imagem directa, lista de candidatos por resolução (escolhendo a melhor), primeira imagem de um carrossel e capa de vídeo/Reel.
2. **Cópia permanente**: com o URL recuperado, o mecanismo já existente passa a guardar a imagem no nosso armazenamento, deixando o relatório imune à expiração dos links do Instagram.
3. **Estado vazio honesto**: quando mesmo assim não houver imagem, o cartão mostra o marcador de formato já existente em vez de um espaço partido — verificação e afinação visual, sem inventar imagens.
4. **Testes de regressão** com respostas reais simuladas do fornecedor (imagem única, carrossel, Reel, resposta sem imagem), garantindo que a falha não volta silenciosamente.
5. **Validação end-to-end**: correr uma análise nova e confirmar nos registos que `attempted` e `stored` deixam de ser zero, e que as imagens aparecem no relatório.

## Notas técnicas

- Ficheiro principal: `src/lib/analysis/providers/scrapecreators.server.ts`, função `mapPost` (campo `displayUrl`). Introduz-se um helper `pickImageUrl` com fallbacks em cascata, incluindo `image_versions2.candidates[]` (array), `carousel_media[0]` e `thumbnail_resources`.
- A cadeia a jusante (`normalize.ts` → `persist-thumbnails.server.ts` → `pick-thumbnail.ts`) já está correcta e não precisa de alterações.
- Relatórios já em cache continuam sem imagem até serem regenerados; a análise seguinte de cada perfil corrige-se sozinha.

## Fora de âmbito

- Alterar o desenho do cartão "Melhores e piores publicações".
- Guardar imagens de forma retroactiva para relatórios antigos já em cache.
