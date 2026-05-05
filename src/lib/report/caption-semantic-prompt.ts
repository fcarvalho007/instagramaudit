/**
 * Caption Semantic Analysis — OpenAI prompt and JSON schema.
 *
 * Pure module. No I/O, no secrets. Safe to import anywhere.
 * All copy in Portuguese from Portugal (pt-PT).
 */

export const CAPTION_SEMANTIC_SYSTEM_PROMPT = `És um estratega de conteúdo sénior especializado em Instagram. Recebes até 12 legendas de posts de uma conta pública.

A tua tarefa é interpretar EXCLUSIVAMENTE o texto das legendas — sem dados de imagem, áudio, vídeo, comentários, seguidores ou métricas privadas.

Regras obrigatórias:
- NÃO usar formas de tratamento direto: nada de "tu", "teu", "tua", "deves", "apostas", "o teu".
- Usar linguagem neutra de consultor: "o perfil apresenta", "observa-se que", "recomenda-se".
- Todo o texto devolvido DEVE ser em Português de Portugal (pt-PT, acordo ortográfico pós-1990).
- NÃO inventar factos nem métricas — apenas interpretar o texto fornecido.
- Cada tema DEVE incluir evidência real (excertos das legendas).
- Evitar temas de uma palavra isolada como "Melhores", "Dicas", "Ferramentas", "Posts".
- Bons exemplos de temas: "Ferramentas de IA para produtividade", "Automação de tarefas digitais".
- Se a evidência for fraca, indicar confidence "low".

dominantThemes: até 5 temas dominantes, cada um com:
- label: etiqueta descritiva com contexto (≥ 3 palavras)
- explanation: frase curta a explicar o tema
- postsCount: em quantas legendas aparece
- evidence: até 2 excertos curtos (≤ 80 chars) das legendas
- confidence: "high" (≥40% posts), "medium" (≥20%), "low" (<20%)

contentIntent: intenção editorial global
- primary: intenção principal (ex.: "Educar sobre IA aplicada")
- secondary: intenção secundária (opcional)
- explanation: frase a explicar a lógica

commentEngagement: avaliação de pedidos de interação
- asksForCommentsCount: legendas que pedem comentário/resposta
- asksForCommentsPct: percentagem (0–100)
- strategyLabel: "active" (≥50%), "occasional" (25–49%), "passive" (<25%)
- examples: até 3 frases encontradas que pedem interação
- explanation: uma frase de contexto

recurringExpressionsInterpretation: até 6 expressões recorrentes
- expression: a expressão encontrada
- count: vezes que aparece
- meaning: interpretação do papel editorial
- risk: risco se há repetição excessiva (opcional, null se não aplicável)

diagnostic:
- main: parágrafo de 2-3 frases com diagnóstico editorial geral
- works: uma frase sobre o que funciona bem
- critical: uma frase sobre o ponto mais crítico
- watch: uma frase sobre o que observar a médio prazo`;

export const CAPTION_SEMANTIC_JSON_SCHEMA = {
  name: "caption_semantic_analysis",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    required: [
      "analyzedCaptions",
      "dominantThemes",
      "contentIntent",
      "commentEngagement",
      "recurringExpressionsInterpretation",
      "diagnostic",
    ],
    properties: {
      analyzedCaptions: { type: "integer", minimum: 1, maximum: 12 },
      dominantThemes: {
        type: "array",
        minItems: 1,
        maxItems: 5,
        items: {
          type: "object",
          additionalProperties: false,
          required: ["label", "explanation", "postsCount", "evidence", "confidence"],
          properties: {
            label: { type: "string" },
            explanation: { type: "string" },
            postsCount: { type: "integer", minimum: 1 },
            evidence: {
              type: "array",
              minItems: 0,
              maxItems: 2,
              items: { type: "string" },
            },
            confidence: {
              type: "string",
              enum: ["high", "medium", "low"],
            },
          },
        },
      },
      contentIntent: {
        type: "object",
        additionalProperties: false,
        required: ["primary", "explanation"],
        properties: {
          primary: { type: "string" },
          secondary: { type: ["string", "null"] },
          explanation: { type: "string" },
        },
      },
      commentEngagement: {
        type: "object",
        additionalProperties: false,
        required: [
          "asksForCommentsCount",
          "asksForCommentsPct",
          "strategyLabel",
          "examples",
          "explanation",
        ],
        properties: {
          asksForCommentsCount: { type: "integer", minimum: 0 },
          asksForCommentsPct: { type: "integer", minimum: 0, maximum: 100 },
          strategyLabel: {
            type: "string",
            enum: ["active", "occasional", "passive"],
          },
          examples: {
            type: "array",
            minItems: 0,
            maxItems: 3,
            items: { type: "string" },
          },
          explanation: { type: "string" },
        },
      },
      recurringExpressionsInterpretation: {
        type: "array",
        minItems: 0,
        maxItems: 6,
        items: {
          type: "object",
          additionalProperties: false,
          required: ["expression", "count", "meaning"],
          properties: {
            expression: { type: "string" },
            count: { type: "integer", minimum: 1 },
            meaning: { type: "string" },
            risk: { type: ["string", "null"] },
          },
        },
      },
      diagnostic: {
        type: "object",
        additionalProperties: false,
        required: ["main", "works", "critical", "watch"],
        properties: {
          main: { type: "string" },
          works: { type: "string" },
          critical: { type: "string" },
          watch: { type: "string" },
        },
      },
    },
  },
} as const;
