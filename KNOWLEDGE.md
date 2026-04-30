# Instagram Benchmark Context & Source Policy

> Política canónica de fontes editoriais e linguagem do relatório
> InstaBench. Espelhada como `KnowledgeNote` na BD (categoria `tool`,
> título "Política de fontes de benchmark") para ser injectada no
> prompt do orquestrador de insights via
> `formatKnowledgeContextForPrompt`.

## Fontes aprovadas (apenas para referência editorial)
- Socialinsider
- Buffer
- Hootsuite
- Databox

Estas fontes podem ser nomeadas no relatório como contexto de mercado.
Nunca renderizar URLs nem links clicáveis para nenhuma destas fontes.
Nunca afirmar que estas fontes analisaram o perfil em causa.

## Tipos de informação (etiquetagem obrigatória)
1. **Dado do perfil** — métricas calculadas a partir das publicações
   recolhidas. Linguagem: "Este perfil regista…", "Na amostra
   recolhida…".
2. **Benchmark de referência** — valor vindo da nossa tabela interna
   `knowledge_benchmarks`. Linguagem: "A referência interna para este
   tier é…", "Comparado com perfis pares…".
3. **Interpretação editorial** — leitura analítica derivada dos dois
   anteriores. Obrigatório usar hedging: "sugere", "indica", "aponta
   para", "com a amostra atual", "sinais de".

## Regras de uso
- Os benchmarks são contexto direcional, não promessa precisa.
- Nunca inventar crescimento de seguidores, alcance, partilhas, saves
  ou rankings de indústria que não existam no dataset interno.
- Nunca dizer "segundo a Socialinsider, este perfil está em X" — apenas
  "Contexto de referência: Socialinsider, Buffer, Hootsuite, Databox.".
- Quando o benchmark interno cobre o tier/formato, mostrar o número
  com etiqueta clara (ex.: "referência tier micro · Reels").
- Quando não cobre, omitir comparação e usar apenas leitura editorial
  com hedging.

## Língua e estilo
- Português europeu (AO90).
- Evitar nomes técnicos no UI: `payload`, `engagement_pct`,
  `result.data`, `keyMetrics`, `benchmark.positioning` — traduzir
  sempre.
- Frases curtas. Tom analítico, calmo. Sem alarmes vermelhos
  desproporcionais.
- Cada cartão pode mencionar fontes uma vez por bloco, no máximo;
  evitar repetir o nome das fontes em todos os cartões.

## Posicionamento estratégico de formatos (linguagem permitida)
- **Reels:** úteis para alcance e descoberta. Não automaticamente
  superiores; dependem da intenção.
- **Carrosséis:** úteis para conteúdo educativo, save-worthy,
  multi-camada e profundidade narrativa.
- **Imagens estáticas:** continuam válidas para presença de marca,
  produto, eventos e identidade visual.
- Nunca afirmar superioridade absoluta de um formato sem evidência
  no perfil analisado.
