/**
 * Visual Cover Analysis — OpenAI vision prompt and JSON schema.
 *
 * Pure module. No I/O, no secrets. Safe to import anywhere.
 * The JSON schema uses `strict: true` so the model is forced to respect
 * the structure exactly. All copy in Portuguese from Portugal (pt-PT),
 * neutral consultant register — no "tu/teu/deves".
 */

// ─── System prompt ──────────────────────────────────────────────────

export const VISUAL_COVER_SYSTEM_PROMPT = `És um diretor de arte sénior e estratega visual especializado em feeds de Instagram. Recebes até 12 thumbnails (capas) dos posts mais recentes de uma conta de Instagram.

A tua tarefa é avaliar exclusivamente aquilo que é visível nas imagens — composição, presença humana, texto sobreposto, cor, luz, reconhecibilidade da grelha e variedade visual.

Regras obrigatórias:
- NÃO identificar pessoas reais. Referir apenas "presença humana" / "rosto visível".
- NÃO inferir resultados de negócio a partir dos visuais.
- NÃO fazer afirmações sobre dados privados ou métricas de desempenho.
- NÃO usar formas de tratamento direto: nada de "tu", "teu", "tua", "deves", "apostas", "o teu".
- Usar linguagem neutra de consultor: "o perfil apresenta", "observa-se que", "recomenda-se".
- Todo o texto devolvido DEVE ser em Português de Portugal (pt-PT, acordo ortográfico pós-1990).

Sistema de pontuação (0–100 por eixo):
- recognizability (25%): Quando se olha para os 12 thumbnails juntos, existe uma identidade visual reconhecível? Consistência de estilo, cores recorrentes, padrão de marca.
- colorCoherence (20%): A paleta é harmoniosa entre posts? Há coerência cromática ou cada post parece de uma conta diferente?
- composition (25%): Enquadramento, regra dos terços, espaço negativo, hierarquia visual dentro de cada thumbnail.
- visualVariety (15%): Existe variedade suficiente para manter o feed interessante sem perder coerência?
- textDensity (15%): Avaliação inversa — pouco texto legível = pontuação alta. Texto excessivo ou ilegível = pontuação baixa.

overallScore = (recognizability×0.25 + colorCoherence×0.20 + composition×0.25 + visualVariety×0.15 + textDensity×0.15)

status:
- "strong" se overallScore >= 70
- "needs_improvement" se overallScore >= 40
- "critical" se overallScore < 40

Para cada thumbnail individual, atribuir:
- visualScore 0–100
- status: "good" (>=70), "medium" (>=40), "weak" (<40)
- hasHumanPresence: true se rosto ou pessoa visível
- hasReadableText: true se texto detetado na imagem
- dominantColors: até 3 cores hexadecimais dominantes
- notes: uma frase curta em pt-PT sobre o ponto mais relevante desse thumbnail

Aggregate:
- humanPresencePct: % de thumbnails com presença humana
- textInImagePct: % de thumbnails com texto
- dominantPalette: top 5 cores hex do feed inteiro
- repeatedTemplateCount: número de thumbnails com layout/template repetido
- repeatedTemplateNote: frase curta se houver repetição, null se não

Diagnostic:
- main: parágrafo de 2-3 frases com diagnóstico geral (pt-PT, tom editorial)
- works: uma frase sobre o que funciona bem
- critical: uma frase sobre o ponto mais crítico
- watch: uma frase sobre o que observar / melhorar a médio prazo`;

// ─── JSON schema for structured output ──────────────────────────────

export const VISUAL_COVER_JSON_SCHEMA = {
  name: "visual_cover_analysis",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    required: [
      "analyzedCount",
      "overallScore",
      "status",
      "summary",
      "subScores",
      "thumbnails",
      "aggregate",
      "diagnostic",
    ],
    properties: {
      analyzedCount: { type: "integer", minimum: 1, maximum: 12 },
      overallScore: { type: "number", minimum: 0, maximum: 100 },
      status: {
        type: "string",
        enum: ["strong", "needs_improvement", "critical"],
      },
      summary: { type: "string" },
      subScores: {
        type: "object",
        additionalProperties: false,
        required: [
          "recognizability",
          "colorCoherence",
          "composition",
          "visualVariety",
          "textDensity",
        ],
        properties: {
          recognizability: { type: "number", minimum: 0, maximum: 100 },
          colorCoherence: { type: "number", minimum: 0, maximum: 100 },
          composition: { type: "number", minimum: 0, maximum: 100 },
          visualVariety: { type: "number", minimum: 0, maximum: 100 },
          textDensity: { type: "number", minimum: 0, maximum: 100 },
        },
      },
      thumbnails: {
        type: "array",
        minItems: 1,
        maxItems: 12,
        items: {
          type: "object",
          additionalProperties: false,
          required: [
            "postIndex",
            "visualScore",
            "status",
            "hasHumanPresence",
            "hasReadableText",
            "dominantColors",
            "notes",
          ],
          properties: {
            postIndex: { type: "integer", minimum: 0, maximum: 11 },
            visualScore: { type: "number", minimum: 0, maximum: 100 },
            status: {
              type: "string",
              enum: ["good", "medium", "weak"],
            },
            hasHumanPresence: { type: "boolean" },
            hasReadableText: { type: "boolean" },
            dominantColors: {
              type: "array",
              minItems: 1,
              maxItems: 3,
              items: { type: "string" },
            },
            notes: { type: "string" },
          },
        },
      },
      aggregate: {
        type: "object",
        additionalProperties: false,
        required: [
          "humanPresencePct",
          "textInImagePct",
          "dominantPalette",
          "repeatedTemplateCount",
          "repeatedTemplateNote",
        ],
        properties: {
          humanPresencePct: { type: "number", minimum: 0, maximum: 100 },
          textInImagePct: { type: "number", minimum: 0, maximum: 100 },
          dominantPalette: {
            type: "array",
            minItems: 1,
            maxItems: 5,
            items: { type: "string" },
          },
          repeatedTemplateCount: { type: "integer", minimum: 0 },
          repeatedTemplateNote: { type: ["string", "null"] },
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