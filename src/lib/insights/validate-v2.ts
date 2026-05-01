/**
 * Validador editorial + estrutural para a resposta v2 da OpenAI.
 *
 * Reutiliza:
 *  - `detectTechnicalLeak` do v1 (caminhos snake_case, índices,
 *    rótulos crus em inglês)
 *  - lista PT-BR
 *
 * Acrescenta a regra de "deve haver pelo menos um número" em cada texto
 * (análoga ao `hasQuantitativeMarker` do v1) — excepção: secções que o
 * payload não suporta (ex.: marketSignals quando `has_free=false`)
 * podem omitir número se a "emphasis" for "neutral".
 */

import { z } from "zod";

import { detectTechnicalLeak } from "./validate";
import {
  AI_INSIGHT_V2_SECTIONS,
  type AiInsightV2Item,
  type AiInsightV2Section,
  type AiPriorityItem,
} from "./types";
import { INSIGHT_V2_TEXT_MAX } from "./prompt-v2";

const PTBR_TOKENS: RegExp[] = [
  /\bvocê\b/i,
  /\btela\b/i,
  /\bcelular(es)?\b/i,
  /\busuári[oa]s?\b/i,
  /\barquivos?\b/i,
  /\bengajamento\b/i,
  /\baplicativo\b/i,
  /\bmídia\b/i,
];

const itemSchema = z.object({
  emphasis: z.enum(["positive", "negative", "default", "neutral"]),
  text: z.string().min(1).max(INSIGHT_V2_TEXT_MAX + 40), // tolerância para trim posterior
});

const priorityItemSchema = z.object({
  level: z.enum(["alta", "media", "oportunidade"]),
  title: z.string().min(1).max(80),
  body: z.string().min(1).max(220),
  resolves: z.string().min(1).max(120),
});

export const aiInsightsV2ResponseSchema = z.object({
  sections: z.object(
    AI_INSIGHT_V2_SECTIONS.reduce<Record<AiInsightV2Section, typeof itemSchema>>(
      (acc, key) => {
        acc[key] = itemSchema;
        return acc;
      },
      {} as Record<AiInsightV2Section, typeof itemSchema>,
    ),
  ),
  priorities: z.array(priorityItemSchema).length(3).optional(),
});

export type ValidateV2Result =
  | {
      ok: true;
      sections: Record<AiInsightV2Section, AiInsightV2Item>;
      priorities: ReadonlyArray<AiPriorityItem> | null;
    }
  | { ok: false; reason: string; detail: string };

function fail(reason: string, detail: string): ValidateV2Result {
  return { ok: false, reason, detail };
}

function detectPtBrLeak(text: string): string | null {
  for (const re of PTBR_TOKENS) {
    const m = re.exec(text);
    if (m) return m[0];
  }
  return null;
}

/**
 * `marketSignals` pode ser legitimamente neutral sem número quando o
 * payload não tem sinais de pesquisa. Para outras secções, exigimos
 * marca quantitativa (dígito) para garantir grounding.
 */
const SECTIONS_NUMBER_OPTIONAL: ReadonlySet<AiInsightV2Section> = new Set([
  "marketSignals",
  "heatmap",
  "daysOfWeek",
  "language",
]);

export function validateInsightsV2(raw: unknown): ValidateV2Result {
  const parsed = aiInsightsV2ResponseSchema.safeParse(raw);
  if (!parsed.success) {
    return fail("SCHEMA_INVALID", parsed.error.issues[0]?.message ?? "zod");
  }

  const sections = parsed.data.sections;
  const out = {} as Record<AiInsightV2Section, AiInsightV2Item>;

  for (const key of AI_INSIGHT_V2_SECTIONS) {
    const item = sections[key];
    const text = item.text.trim();
    if (!text) return fail("EMPTY_FIELD", `section=${key}`);
    if (text.length > INSIGHT_V2_TEXT_MAX) {
      return fail(
        "TEXT_TOO_LONG",
        `section=${key} len=${text.length} max=${INSIGHT_V2_TEXT_MAX}`,
      );
    }
    const tech = detectTechnicalLeak(text);
    if (tech) return fail("TECHNICAL_LEAK", `section=${key} token=${tech}`);
    const ptbr = detectPtBrLeak(text);
    if (ptbr) return fail("PTBR_LEAK", `section=${key} token=${ptbr}`);

    const requiresNumber =
      !SECTIONS_NUMBER_OPTIONAL.has(key) || item.emphasis !== "neutral";
    if (requiresNumber && !/\d/.test(text)) {
      return fail("GENERIC_OUTPUT", `section=${key} (missing number)`);
    }

    out[key] = { emphasis: item.emphasis, text };
  }

  // Prioridades opcionais — quando ausentes a UI cai para o derivador
  // determinístico em `block02-diagnostic.ts`. Quando presentes,
  // validamos PT-BR / leak técnico em cada texto.
  let priorities: ReadonlyArray<AiPriorityItem> | null = null;
  if (parsed.data.priorities) {
    const arr: AiPriorityItem[] = [];
    for (const [i, p] of parsed.data.priorities.entries()) {
      const title = p.title.trim();
      const body = p.body.trim();
      const resolves = p.resolves.trim();
      if (!title || !body || !resolves) {
        return fail("EMPTY_FIELD", `priority=${i}`);
      }
      for (const [field, txt] of [
        ["title", title],
        ["body", body],
        ["resolves", resolves],
      ] as const) {
        const tech = detectTechnicalLeak(txt);
        if (tech) {
          return fail(
            "TECHNICAL_LEAK",
            `priority=${i} field=${field} token=${tech}`,
          );
        }
        const ptbr = detectPtBrLeak(txt);
        if (ptbr) {
          return fail(
            "PTBR_LEAK",
            `priority=${i} field=${field} token=${ptbr}`,
          );
        }
      }
      // body deve conter pelo menos um número (grounding).
      if (!/\d/.test(body)) {
        return fail("GENERIC_OUTPUT", `priority=${i} (missing number)`);
      }
      // `resolves` referencia perguntas — apenas 1..8 existem no Bloco 02.
      // Rejeitar números fora desse range para evitar a IA inventar
      // "Pergunta 09" / "Pergunta 12".
      const refs = resolves.match(/\b(\d{1,2})\b/g) ?? [];
      for (const ref of refs) {
        const n = Number.parseInt(ref, 10);
        if (!Number.isFinite(n) || n < 1 || n > 8) {
          return fail(
            "INVALID_QUESTION_REF",
            `priority=${i} resolves="${resolves}" ref=${n}`,
          );
        }
      }
      arr.push({ level: p.level, title, body, resolves });
    }
    priorities = arr;
  }

  return { ok: true, sections: out, priorities };
}