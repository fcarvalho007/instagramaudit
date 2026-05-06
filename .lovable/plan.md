
# Refinamento da Secção Despesa — Clareza e Auditabilidade

## Diagnóstico actual

### Apify — 3 linhas em vez de 2

O `KNOWN_APIFY_ACTORS` lista `apify/instagram-profile-scraper` e `apify/instagram-comment-scraper`, mas na prática:

- **`apify/instagram-profile-scraper`** — 0 execuções (nunca foi chamado). Aparece porque está hardcoded como "known".
- **`apify/instagram-scraper`** — 30 execuções. Este é o ator unificado (posts + perfil) realmente usado, registado como `UNIFIED_ACTOR` em `analyze-public-v1.ts`.
- **`apify/instagram-comment-scraper`** — 2 execuções. Funcional.

**Solução**: Actualizar `KNOWN_APIFY_ACTORS` para incluir `apify/instagram-scraper` em vez de `apify/instagram-profile-scraper`. Melhorar labels na tabela.

### OpenAI — gpt-5.4-nano aparece sem autorização

Os 8 registos de `insights:gpt-5.4-nano` datam de 28-29 de abril (fase inicial). Provável causa: a variável `OPENAI_INSIGHTS_MODEL` esteve temporariamente a `gpt-5.4-nano`, ou alguém a testou. O fallback actual é `gpt-5.4-mini` (hardcoded em `cost.ts`). **7 dos 8 foram erros (`http_error`), apenas 1 sucesso**.

**Solução**: Manter a transparência — mostrar o que foi gasto. Mas:
1. Adicionar uma coluna/indicador de "tipo de análise" (texto vs imagem) no breakdown OpenAI
2. Tornar labels mais descritivos

### OpenAI — análise visual vs texto

Actualmente existem 3 atores OpenAI (2 ativos, 1 futuro):
- `insights:gpt-5.4-mini` — **Insights textuais** (recomendações estratégicas baseadas em métricas). 28 chamadas + 1 erro.
- `insights:gpt-5.4-nano` — Mesmo tipo, modelo diferente (fase de teste). 1 sucesso + 7 erros.
- `visual-cover-analysis` — **Análise visual** dos 12 thumbnails (ainda sem execuções).
- `caption-semantic-analysis` — **Análise semântica** das legendas (texto, sem imagens; ainda sem execuções).

**Recomendação de modelo para a análise visual (P07)**: `gpt-5.4-mini` é o modelo correcto. A análise visual envolve interpretar composição, cores, padrões editoriais — requer capacidade multimodal robusta. O `nano` é demasiado fraco para image understanding com nuance.

---

## Alterações propostas

### 1. Corrigir labels e actors Apify

**Ficheiro**: `src/lib/admin/system-queries.server.ts`

- Actualizar `KNOWN_APIFY_ACTORS` para: `["apify/instagram-scraper", "apify/instagram-comment-scraper"]`
- Actualizar `APIFY_ACTOR_LABELS`:
  - `"apify/instagram-scraper"` → `"Scraper Instagram (perfil + posts)"`
  - `"apify/instagram-comment-scraper"` → `"Scraper de comentários"`
  - Remover `"apify/instagram-profile-scraper"` (nunca executado, confuso)

**Ficheiro**: `src/components/admin/v2/visao-geral/expense-section.tsx`

- Actualizar `ACTOR_COLOR` e `ACTOR_SHORT_LABEL` para remover `profile-scraper` e ajustar labels:
  - `"apify/instagram-scraper"` → short label "Posts + perfil"
  - `"apify/instagram-comment-scraper"` → short label "Comentários"

### 2. Clarificar breakdown OpenAI — distinguir texto vs imagem

**Ficheiro**: `src/lib/admin/system-queries.server.ts`

- Actualizar `openaiActorLabel()` para:
  - `insights:*` → `"Insights — texto (modelo)"`
  - `visual-cover-analysis` → `"Análise visual — imagens (gpt-5.4-mini)"`
  - `caption-semantic-analysis` → `"Legendas — texto (gpt-5.4-mini)"`

**Ficheiro**: `src/components/admin/v2/visao-geral/expense-section.tsx`

- Actualizar `openaiActorShortLabel()`:
  - `insights:*` → `"Insights (texto)"`  *(já está)*
  - `visual-cover-analysis` → `"Visual (imagens)"`
  - `caption-semantic-analysis` → `"Legendas (texto)"`
- Adicionar cores distintas para diferenciar visualmente texto vs imagem
- Adicionar uma coluna "Tipo" na tabela OpenAI com badges `Texto` / `Imagens` para tornar a distinção imediata

### 3. Melhorias UX menores

- Na tabela OpenAI, quando há erros dominantes (como o nano com 7/8 erros), realçar visualmente que esse actor foi essencialmente falhado — evita confusão sobre "por que gastou dinheiro em nano?"
- Adicionar tooltip na label do ator nano a explicar: "Modelo usado em testes iniciais. 7 de 8 chamadas falharam."

---

## Ficheiros a editar

1. `src/lib/admin/system-queries.server.ts` — labels, KNOWN_APIFY_ACTORS, openaiActorLabel
2. `src/components/admin/v2/visao-geral/expense-section.tsx` — labels, cores, coluna Tipo, tooltips

## Ficheiros que NÃO serão tocados

- Pipeline de análise (`caption-semantic-analysis.server.ts`, `visual-cover-analysis.server.ts`, `openai-insights.server.ts`)
- Apify client, comment scraper
- Report cards (P03-P07)
- Auth, admin, PDF, tokens globais, locked files

## Resposta à pergunta sobre modelos

| Análise | Input | Modelo recomendado | Justificação |
|---|---|---|---|
| Insights estratégicos | Métricas numéricas (texto) | gpt-5.4-mini | Bom raciocínio, custo moderado |
| Legendas semânticas (P04) | Texto das legendas | gpt-5.4-mini | Análise temática requer nuance |
| Visual covers (P07) | 12 thumbnails (imagens) | gpt-5.4-mini | Multimodal robusto necessário |
| Nenhum destes | — | gpt-5.4-nano | Demasiado fraco para estas tarefas |
