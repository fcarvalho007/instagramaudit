# Instagram Benchmark Context & Source Policy

> Política canónica de fontes editoriais e linguagem do relatório
> InstaBench. Espelhada como `KnowledgeNote` na BD (categoria `tool`,
> título "Política de fontes de benchmark") e injectada no prompt do
> orquestrador de insights via `formatKnowledgeContextForPrompt`.

InstaBench usa contexto de benchmark do Instagram para tornar os
relatórios mais úteis, mas o benchmark é sempre **contexto direcional**,
nunca verdade absoluta.

---

## 1. Fontes editoriais

### 1.1 Activas no relatório público

- **Socialinsider** · contexto orgânico e por formato
- **Buffer** · contexto por escalão de seguidores
- **Hootsuite** · contexto de indústria

Estas fontes podem ser **nomeadas** no relatório como referência
editorial, sem URLs no corpo dos cartões. Nunca afirmar que estas
fontes analisaram o perfil em causa — servem apenas como contexto
silencioso de mercado.

Exemplo visível (linha de proveniência):
> "Fontes de enquadramento: Socialinsider, Buffer e Hootsuite."

Marcadores compactos `[1] [2] [3]` são permitidos quando claramente
apresentados como referências externas e sempre com
`target="_blank" rel="noopener noreferrer"`. Hoje não estão em uso —
ficam disponíveis como opção futura.

### 1.2 Reservada para futuro autenticado

- **Databox** · métricas privadas (alcance, visitas, cliques, saves)

Não citar no relatório público actual nem incluir na linha de fontes
visível. Só pode passar a fonte activa quando o perfil analisado
contiver dados autenticados (alcance, visitas, cliques no website,
saves) — nessa altura, a `visibility` do registo passa a `active` em
`benchmark-context.ts`.

---

## 2. Regras de uso

### 2.1 Etiquetagem de informação

| Tipo | Linguagem |
|---|---|
| **Dado do perfil** | "Este perfil regista…", "Na amostra recolhida…" |
| **Benchmark de referência** | "A referência interna para este tier é…", "Comparado com perfis pares…" |
| **Interpretação editorial** | "sugere", "indica", "aponta para", "com base na amostra analisada", "em termos comparativos", "como referência direcional" |

### 2.2 Métricas que NUNCA podem ser inventadas

A não ser que existam no dataset da app:
- crescimento de seguidores
- alcance / reach
- impressões
- saves
- partilhas
- visitas ao perfil
- cliques no website
- dados demográficos
- separação pago vs orgânico

### 2.3 Taxa de envolvimento — explicação canónica

A taxa varia por fonte, dimensão da conta, sector, janela temporal e
método de cálculo. No InstaBench é apresentada como **referência
direcional**.

Copy preferido (pt-PT):
> "A taxa de envolvimento compara gostos e comentários com a dimensão
> da audiência. É uma métrica útil para leitura rápida, mas deve ser
> interpretada como referência direcional, porque varia por setor,
> dimensão da conta e método de cálculo."

---

## 3. Uso por fonte

### 3.1 Socialinsider — contexto orgânico e estratégia de formato

- Envolvimento orgânico médio do Instagram: ~0,48%
- Reels: ~0,52%
- Carrosséis: ~0,55%
- Imagens: ~0,37%
- Cadência média: ~20 posts/mês (~4,6/semana)
- Carrosséis: úteis para conteúdo educativo, em camadas, save-worthy
- Reels: descoberta e alcance; não automaticamente superiores
- Imagens estáticas: produto, eventos, identidade visual, consistência

### 3.2 Buffer — contexto por escalão de seguidores

| Tier seguidores | Crescimento mensal | Posts/mês | Envolvimento mediano | Alcance mediano/post |
|---|---|---|---|---|
| 0–1K | 5,9% | 14 | 4,7% | 34 |
| 1–5K | 3,1% | 16 | 4,4% | 187 |
| 5–10K | 5,7% | 20 | 3,9% | 469 |
| 10–50K | 2,0% | 23 | 3,7% | 1 172 |
| 50–100K | 1,4% | 34 | 3,2% | 2 803 |
| 100–500K | 2,7% | 51 | 3,5% | 6 480 |
| 500K–1M | 1,0% | 165 | 2,6% | 20 737 |

> **Importante:** "alcance mediano/post" só pode ser apresentado se o
> perfil analisado tiver dados reais de alcance. Caso contrário, fica
> como contexto interno (futuro acesso autenticado).

### 3.3 Hootsuite — contexto de indústria

- Carrosséis são frequentemente identificados como formato forte.
- Benchmarks variam significativamente por indústria.
- **Não** usar benchmarks de indústria a menos que exista indústria
  conhecida ou seleccionada pelo utilizador.
- Sem indústria conhecida, usar Hootsuite apenas para copy genérico:
  > "Os benchmarks variam por indústria e devem ser interpretados como
  > contexto direcional."

Para uso futuro (carrosséis por indústria):

| Indústria | ER carrosséis |
|---|---|
| Educação | ~5,4% |
| Entretenimento e media | ~3,2% |
| Serviços financeiros | ~4,1% |
| Restauração, hospitalidade e turismo | ~3,7% |
| Governo | ~5,0% |
| Saúde | ~4,5% |
| Imobiliário, jurídico e serviços profissionais | ~4,1% |
| Retalho | ~3,6% |
| Construção, indústria e manufactura | ~5,2% |
| Agências de marketing | ~3,7% |
| Sem fins lucrativos | ~5,5% |
| Tecnologia | ~4,2% |
| Utilities e energia | ~5,5% |

### 3.4 Databox — futuro autenticado

Não usar Databox no relatório público actual. Métricas como visitas ao
perfil, alcance, cliques no website e novos seguidores requerem dados
autenticados ou históricos e não podem ser inferidas de scraping
público.

---

## 4. Princípios de copy

- Português europeu (AO90).
- Evitar nomes técnicos no UI: `payload`, `engagement_pct`,
  `result.data`, `keyMetrics`, `benchmark.positioning`, "API response",
  "scraper output".
- Frases curtas, tom analítico e calmo.
- Cada cartão menciona fontes uma vez por bloco, no máximo.

### Bons exemplos

- "O perfil publica acima da cadência de referência para contas desta
  dimensão, mas o volume não está a transformar-se em conversa."
- "O formato dominante é coerente com uma estratégia educativa, mas
  pode estar a limitar descoberta se quase não houver Reels."
- "A audiência reage com gostos, mas comenta pouco — sinal de consumo
  passivo."
- "Os carrosséis parecem cumprir uma função de autoridade e educação,
  especialmente quando organizam ideias em sequência."

### Maus exemplos (banidos)

- "Your engagement_pct is below benchmark_reference."
- "Segundo a Hootsuite, este perfil está em underperforming."
- "O perfil tem baixo alcance" — quando alcance não existe no dataset.
- "Crescimento de seguidores fraco" — quando não há histórico.

---

## 5. Uso recomendado por bloco do relatório

### Bloco 01 · Overview
- Contexto de benchmark para envolvimento e cadência.
- Nota concisa de que comparações são direcionais.
- Não sobrecarregar a primeira dobra com demasiadas fontes.

### Bloco 02 · Diagnóstico Editorial
- Usar benchmark para **explicar porque** o mix de formato, tipo de
  conteúdo, captions e resposta da audiência importam.
- Não repetir KPIs do Bloco 01. Traduzir dados em perguntas humanas e
  interpretação editorial.

### Bloco 03 · Performance
- Onde o benchmark é usado mais directamente — comparar formatos e
  resultados ao nível do post.
- Melhor lugar para explicar o que está acima ou abaixo do esperado.

### Bloco 04 · Conteúdo
- Princípios de formato estilo Socialinsider:
  - **Carrosséis:** educação, profundidade, saves, autoridade.
  - **Reels:** descoberta, alcance, conversa, participação em
    tendências.
  - **Imagens:** identidade, produto, eventos, consistência de marca.

### Tiers pagos futuros
- Se for adicionada **indústria seleccionada pelo utilizador**, os
  benchmarks Hootsuite por indústria passam a ser contexto direcional
  válido.
- Se for adicionado **acesso autenticado ao Instagram**, métricas
  estilo Databox (alcance, cliques no website, visitas ao perfil)
  tornam-se utilizáveis.
