## Pergunta 04 · Temas — refinamento de credibilidade

### Diagnóstico do problema actual

Olhei ao payload e ao código que alimenta o cartão:

1. **Pipeline cego** — `snapshot-to-report-data.ts` chama `extractTopKeywords(postsForText, 5)`, devolvendo apenas 5 palavras soltas. Depois `inferThemesFromCaptions` filtra stop-words e fica frequentemente com 2-3 palavras genéricas. Isto não dá para "perceber sobre o que o perfil fala".
2. **Sem agrupamento semântico** — palavras como `marketing` / `marketingdigital` / `estrategia` aparecem como itens separados, em vez de um tema com força acumulada.
3. **Sem evidência ligada** — o cartão mostra `palavra · 4×` mas nunca diz **em que post** apareceu. Isso é o que mais quebra a confiança ("será que leu mesmo?").
4. **Quando há texto IA, a lista determinística desaparece** — perde-se a prova "concreta" e fica só a interpretação narrativa.

### Objectivo

Mostrar **3 temas dominantes** (não 6, não 8 — três), cada um com:
- nome do tema (palavra-âncora ou cluster legível);
- contagem de menções e nº de posts onde aparece;
- 1-2 **excertos curtos de legenda** como evidência ("…transformar a estratégia em…");
- barra proporcional para hierarquia visual.

A lista determinística passa a ser **sempre visível**, mesmo quando há leitura IA — a IA fica como interpretação ao lado, não como substituta.

### Mudanças propostas

#### 1. `src/lib/report/text-extract.ts` — extractor mais robusto

- Subir o limite mínimo de tokens de 4 para 4 chars (mantém) mas **passar a contar bigramas** opcionais (`marketing digital`, `inteligencia artificial`) quando ambos os tokens são não-stop-word e co-ocorrem no mesmo post.
- Nova função `extractTopThemes(posts, limit)` que devolve, por tema:
  ```ts
  { word: string; count: number; postIndices: number[]; sampleSnippets: string[] }
  ```
  com até 2 snippets curtos (≤ 90 chars) extraídos da legenda original (preservando acentos e maiúsculas), centrados na ocorrência da palavra.
- Manter `extractTopKeywords` intacto (é usado também em `derive-keywords.ts` para DataForSEO).

#### 2. `src/lib/report/snapshot-to-report-data.ts`

- Adicionar `topThemes = extractTopThemes(postsForText, 8)` ao lado de `topKeywords` (continua a alimentar DFS).
- Propagar `topThemes` no `ReportData` (campo novo, opcional, retro-compatível).

#### 3. `src/lib/report/block02-diagnostic.ts` — `inferThemesFromCaptions`

- Aceitar `topThemes` em vez de `topKeywords`.
- Devolver **sempre os 3 temas com mais peso** (não 6 ou 8) e enriquecer cada item com:
  ```ts
  { text, weight, postsCount, snippets: string[] }
  ```
- Quando há texto IA válido, manter `source: "ai"` mas **continuar a preencher `items`** com os 3 temas determinísticos (passa a ser layout split sempre que houver dados — não condicional).
- Reforçar stop-words com termos genéricos do nicho criativo (`conteudo`, `pessoas`, `coisa`, `forma`, `tipo`).

#### 4. `src/components/report-redesign/v2/report-themes-feature.tsx` — UI

Redesenhar para 3 cartões verticais empilhados (não grid 2-col de 6 itens):

```text
┌─────────────────────────────────────────────────────────────┐
│ ⚡ Pergunta 04 · Temas das legendas      [Baseado em 12 posts]│
│ Sobre que assuntos o perfil fala mais?                       │
├─────────────────────────────────────────────────────────────┤
│ 01 · Marketing digital            ████████████  9× · 6 posts │
│   "…como transformar a estratégia de marketing digital…"     │
│   "…ferramentas de marketing que recomendo…"                 │
├─────────────────────────────────────────────────────────────┤
│ 02 · Inteligência artificial      ████████      6× · 4 posts │
│   "…IA aplicada ao dia-a-dia de quem cria…"                  │
├─────────────────────────────────────────────────────────────┤
│ 03 · Comunidade                   █████         4× · 3 posts │
│   "…a comunidade que se forma à volta deste projecto…"       │
└─────────────────────────────────────────────────────────────┘
[Leitura IA · interpretação] (caixa azul lateral, opcional)
```

Detalhes:
- Numeração `01 · 02 · 03` em mono — assina ranking explícito.
- Snippets em itálico cinza-700, com `…` antes/depois, sem aspas duplas.
- `nº × · n posts` em mono tabular.
- Empty state inalterado.
- Manter o disclaimer final ("Estes temas resultam da análise…").

#### 5. Tipos

`AiInsightV2` não muda. `ReportData` ganha `topThemes?: ThemeRow[]`.

### Sem alterações

- Prompt da IA — continua igual.
- `extractTopKeywords` — preservado (DFS depende).
- `report-diagnostic-block.tsx` — só passa o novo `topThemes` ao `ThemesFeature`.

### Validação

- Adicionar testes a `text-extract` (bigramas, snippets, stop-words).
- Estender testes de `block02-diagnostic` para o novo shape.
- `tsc --noEmit` + `vitest run`.

### Checklist

- ☐ `extractTopThemes` com snippets implementado e testado
- ☐ `topThemes` propagado em `snapshot-to-report-data`
- ☐ `inferThemesFromCaptions` devolve 3 temas + evidência sempre
- ☐ `report-themes-feature.tsx` redesenhado para 3 cartões com snippets
- ☐ Lista determinística visível também quando há leitura IA
- ☐ Testes verdes (tsc + vitest)
