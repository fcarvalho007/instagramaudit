# Data lineage: custos, janelas 30d/90d e camada de provider

Plano faseado a partir da auditoria. Cada fase é autónoma e testável; nenhuma fase depende da seguinte para ficar correcta.

## Contexto confirmado

- A rota pública usa sempre `resultsType:"details"` e o actor **ignora `onlyPostsNewerThan` nesse modo**. Os registos reais do Lab confirmam: `details` devolve **12 posts em todas as janelas** (baseline, 30d, 60d, 90d, 365d), enquanto o modo `posts` devolve 18 (30d), 34 (60d) e 54 (90d).
- Consequência: hoje um relatório "90 dias" analisa 12 posts — e menos ainda depois do filtro por data aplicado no nosso lado.
- As estimativas de custo usam `$0.005/perfil + $0.0005/post` e `$0.0023/comentário`; os preços reais são `$0.0027/result` e `$0.0026/comentário`. Os tectos diário e mensal criados ontem estão calibrados sobre números subestimados.
- ScrapeCreators tem conta activa e oferece paginação real por cursor em `/v2/instagram/user/posts`, mais `/v1/instagram/profile` e `/v2/instagram/post/comments`.

---

## Fase 1 — Verdade de custos e rótulos honestos (baixo risco)

Objectivo: parar de subestimar custo e parar de prometer janelas que não são entregues.

1. Actualizar as constantes de custo para `$0.0027` por result do scraper e `$0.0026` por comentário, mantendo a possibilidade de configuração por variável de ambiente.
2. Recalcular o custo estimado a partir do número real de items devolvidos (perfil + posts), substituindo a fórmula de duas parcelas por um único preço por result.
3. Revalidar os tectos: diário, mensal soft (4.25) e hard (4.75) passam a operar sobre valores realistas; confirmar em teste que um 90d correcto (~$0.15) não esgota o ciclo inesperadamente.
4. Enquanto a Fase 2 não estiver concluída, a interface deixa de dizer "30 dias" / "90 dias" e passa a declarar sempre o que foi realmente observado: número de publicações analisadas e período coberto.
5. Corrigir a hora do heatmap: converter o `taken_at` para o fuso de Lisboa em vez de usar UTC directamente, e declarar o fuso na legenda.

Entregável: custos fiáveis e nenhuma afirmação enganadora na interface.

---

## Fase 2 — Janelas 30d/90d correctas no Apify

Objectivo: um relatório de 30 ou 90 dias analisar mesmo todas as publicações da janela.

Arquitectura de duas chamadas:

```text
Chamada A  details  resultsLimit 1   -> perfil (followers, posts_count, bio, verificação)
Chamada B  posts    onlyPostsNewerThan + limite dimensionado -> lista plana de publicações
                    |
                    v
        recombinação num único snapshot
        perfil da A  +  publicações da B
```

1. Separar a construção do input do actor por operação (perfil / publicações) em vez de um único objecto partilhado.
2. Baseline mantém-se numa só chamada em modo `details` (custo inalterado). Só as janelas 30d e 90d passam a duas chamadas.
3. Detecção de truncagem: comparar a publicação mais antiga devolvida com o limite da janela; quando a janela não foi coberta na totalidade, marcar o snapshot como parcial e a interface declarar o período realmente observado.
4. Guardar no snapshot o número de publicações analisadas e os dias observados, e usar esses valores em todos os blocos derivados (cadência, heatmap, melhores dias, série temporal, formatos).
5. Impacto operacional: uma análise com janela passa a consumir 2 execuções; com dois concorrentes e Comment Intelligence chega a 5. Como o limite global é 4, a ordem de execução tem de ser sequencial por análise — validar que o mecanismo de espera não provoca falhas por tempo limite.

Entregável: 30d e 90d passam a ser verdadeiros; cadência e frequência deixam de estar enviesadas.

---

## Fase 3 — Camada de provider e ScrapeCreators

Objectivo: deixar de depender de um único fornecedor e obter paginação determinística.

Interface única com três operações, devolvendo sempre os tipos de perfil e publicação já existentes, para que a normalização actual não mude:

```text
fetchProfile(handle)
fetchPosts(handle, { since, maxPosts })
fetchComments(postUrls, { perPost, includeReplies })
```

1. Duas implementações: Apify (adaptador do código actual) e ScrapeCreators.
2. Selecção por operação através de variáveis de ambiente, com recomendação inicial: perfil e comentários no Apify, publicações no ScrapeCreators (é onde a paginação por cursor traz vantagem real).
3. Paginação no ScrapeCreators: seguir o cursor até a publicação mais antiga da página ultrapassar o limite temporal ou não haver mais páginas; respeitar o limite máximo de publicações por janela.
4. Recuo automático: perante bloqueio de faturação ou quota do Apify (erro já classificado no código), tentar o outro fornecedor uma vez e registar qual foi usado, mantendo a reconciliação de custo por fornecedor.
5. Campos que só existem num fornecedor — colaborações, utilizadores etiquetados, localização, música, estrutura de carrossel — passam a opcionais com indicador de mensurabilidade, no mesmo padrão já usado para as respostas do Comment Intelligence. Nada é inventado nem preenchido a zero.
6. A chave da API do ScrapeCreators é guardada como segredo do projecto, lida apenas no servidor.

Entregável: independência de fornecedor, janelas fiáveis e blocos que degradam de forma honesta quando um campo não existe.

---

## Testes

- Custo estimado de uma análise corresponde ao preço por result multiplicado pelos items realmente devolvidos.
- Baseline continua a fazer uma única execução.
- Uma janela de 90 dias devolve mais de 12 publicações e o período observado aproxima-se de 90 dias.
- Janela não coberta na totalidade é marcada como parcial e a interface declara-o.
- Recuo de fornecedor: bloqueio de faturação do Apify resulta em análise concluída pelo outro fornecedor.
- Paginação do ScrapeCreators pára no limite temporal correcto e não excede o número máximo de publicações.
- Tecto mensal continua a impedir novas execuções, agora com custos realistas.
- Campos indisponíveis num fornecedor são apresentados como não mensuráveis, nunca como zero.

## Fora de âmbito

- Interface do Level 2 do Comment Intelligence.
- Alterações a `/report.example`.
- Métricas privadas do Instagram (alcance, impressões, guardados, partilhas), que continuam deliberadamente ausentes.
