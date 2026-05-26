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
  EDITORIAL_VERDICT_EVIDENCE_ALLOWLIST,
  type AiInsightV2Item,
  type AiInsightV2Section,
  type AiPriorityItem,
  type EditorialVerdict,
  type EditorialVerdictEvidence,
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

/**
 * Lista negra de verbos prescritivos (imperativos e perifrásticos) no
 * `paragraph` do veredicto. O primeiro cartão é uma camada diagnóstica;
 * recomendações vivem no Bloco 02. Cobre as formas mais comuns em pt-PT.
 */
const RECOMMENDATION_VERBS =
  /\b(deve(s|m)?|deveria(m|s)?|recomenda[- ]se|a\s+prioridade\s+é|publique(m)?|teste(m)?|use(m)?\s+mais|aposte(m)?|publicar\s+mais|cria(r)?\s+mais|apostar\s+em|focar\s+em\s+publicar)\b/i;

/** Any digit followed by an optional decimal and a `%` sign — the verdict
 *  must NOT print engagement / share percentages in the paragraph. */
const PERCENT_LEAK = /\d+([.,]\d+)?\s*%/;

/** Private Instagram metrics the public scrape never sees. Mentioning them
 *  is hallucination by construction. */
const PRIVATE_METRICS =
  /\b(alcance|reach|impress(ões|oes|ions)|saves?|partilhas|shares|visitas\s+ao\s+perfil|profile\s+visits|visualiza(ções|coes)\s+de\s+stories|story\s+views)\b/i;

/** Sentence-counter used by the verdict paragraph cap (max 4). Splits on
 *  `.`, `!`, `?` and keeps non-empty fragments. */
function countSentences(paragraph: string): number {
  return paragraph
    .split(/[.!?]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0).length;
}

/** Hashtag handling: the paragraph either quotes a `#tag` OR explicitly
 *  acknowledges the absence/weakness of recurring hashtags. */
const HASHTAG_TOKEN = /#[\p{L}\p{N}_]+/u;
const HASHTAG_ABSENCE =
  /\bhashtags?\b[^.!?]{0,160}?(n[ãa]o\s+h[áa]|n[ãa]o\s+criam|n[ãa]o\s+s[ãa]o\s+suficient|ainda\s+n[ãa]o\s+criam|sem\s+assinatura\s+tem[áa]tica|n[ãa]o\s+definem|n[ãa]o\s+chegam|n[ãa]o\s+formam)/i;

/**
 * Visual claims in the verdict paragraph require visual evidence. When
 * the paragraph mentions covers / visual consistency but `evidence_used`
 * carries no `visual_cover.*` rótulo, we treat it as hallucination —
 * the snapshot has no `visual_cover_analysis` to back it up.
 */
const VISUAL_CLAIM_KEYWORDS =
  /\b(capas?|consist[êe]ncia\s+visual|padr[ãa]o\s+visual|clareza\s+visual|identidade\s+visual)\b/i;

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

const EVIDENCE_SET: ReadonlySet<string> = new Set(
  EDITORIAL_VERDICT_EVIDENCE_ALLOWLIST,
);

const editorialVerdictSchema = z.object({
  verdict_label: z.enum(["strong", "promising", "needs_work", "limited_data"]),
  title: z.string().min(1).max(80),
  paragraph: z.string().min(1).max(1400),
  priority: z.string().min(1).max(220),
  strengths: z.array(z.string().min(1).max(120)).length(2),
  limitations: z.array(z.string().min(1).max(120)).length(2),
  confidence: z.enum(["high", "medium", "low"]),
  // ≥ 3 itens — alinhado com o Prompt 4 para garantir grounding.
  evidence_used: z.array(z.string().min(1)).min(3).max(6),
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
  editorial_verdict: editorialVerdictSchema.optional(),
});

export type ValidateV2Result =
  | {
      ok: true;
      sections: Record<AiInsightV2Section, AiInsightV2Item>;
      priorities: ReadonlyArray<AiPriorityItem> | null;
      editorialVerdict: EditorialVerdict | null;
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

  // Editorial verdict opcional — quando ausente, o UI cai para hero +
  // heurística determinística. Quando presente, validamos rigorosamente.
  let editorialVerdict: EditorialVerdict | null = null;
  if (parsed.data.editorial_verdict) {
    const v = parsed.data.editorial_verdict;
    const title = v.title.trim();
    const paragraph = v.paragraph.trim();
    const priority = v.priority.trim();
    const strengths = v.strengths.map((s) => s.trim());
    const limitations = v.limitations.map((s) => s.trim());

    if (!title || !paragraph || !priority) {
      return fail("EMPTY_FIELD", `verdict (title/paragraph/priority)`);
    }
    if (strengths.some((s) => !s) || limitations.some((s) => !s)) {
      return fail("EMPTY_FIELD", `verdict (strengths/limitations)`);
    }

    // Title: 4–8 palavras, sem ponto final, sem dígitos.
    const titleWords = title.split(/\s+/).filter(Boolean).length;
    if (titleWords < 4) {
      return fail(
        "TITLE_TOO_SHORT",
        `verdict.title words=${titleWords} min=4`,
      );
    }
    if (titleWords > 8) {
      return fail(
        "TITLE_TOO_LONG",
        `verdict.title words=${titleWords} max=8`,
      );
    }
    if (/[.!?]$/.test(title)) {
      return fail("TITLE_HAS_PUNCT", `verdict.title ends with punctuation`);
    }
    if (/\d/.test(title)) {
      return fail("TITLE_HAS_NUMBER", `verdict.title contains digit`);
    }

    // Paragraph: 90–140 palavras, máx. 4 frases, sem `%`, sem métricas
    // privadas, sem verbos prescritivos. Hashtags têm de ser tratadas
    // explicitamente (quotar `#tag` ou afirmar ausência).
    const paraWords = paragraph.split(/\s+/).filter(Boolean).length;
    if (paraWords < 90) {
      return fail(
        "PARAGRAPH_TOO_SHORT",
        `verdict.paragraph words=${paraWords} min=90`,
      );
    }
    if (paraWords > 140) {
      return fail(
        "PARAGRAPH_TOO_LONG",
        `verdict.paragraph words=${paraWords} max=140`,
      );
    }
    const sentenceCount = countSentences(paragraph);
    if (sentenceCount > 4) {
      return fail(
        "TOO_MANY_SENTENCES",
        `verdict.paragraph sentences=${sentenceCount} max=4`,
      );
    }
    const pct = PERCENT_LEAK.exec(paragraph);
    if (pct) {
      return fail(
        "ENGAGEMENT_PERCENT_LEAK",
        `verdict.paragraph token="${pct[0]}"`,
      );
    }
    const priv = PRIVATE_METRICS.exec(paragraph);
    if (priv) {
      return fail(
        "PRIVATE_METRIC_LEAK",
        `verdict.paragraph token="${priv[0]}"`,
      );
    }
    if (!HASHTAG_TOKEN.test(paragraph) && !HASHTAG_ABSENCE.test(paragraph)) {
      return fail(
        "HASHTAGS_NOT_HANDLED",
        `verdict.paragraph missing #tag or absence phrase`,
      );
    }
    const presc = RECOMMENDATION_VERBS.exec(paragraph);
    if (presc) {
      return fail(
        "RECOMMENDATION_VERB",
        `verdict.paragraph token="${presc[0]}"`,
      );
    }

    // PT-BR + technical leak em todos os campos textuais.
    const fields: Array<[string, string]> = [
      ["title", title],
      ["paragraph", paragraph],
      ["priority", priority],
      ["strengths[0]", strengths[0]],
      ["strengths[1]", strengths[1]],
      ["limitations[0]", limitations[0]],
      ["limitations[1]", limitations[1]],
    ];
    for (const [field, txt] of fields) {
      const tech = detectTechnicalLeak(txt);
      if (tech) {
        return fail("TECHNICAL_LEAK", `verdict.${field} token=${tech}`);
      }
      const ptbr = detectPtBrLeak(txt);
      if (ptbr) {
        return fail("PTBR_LEAK", `verdict.${field} token=${ptbr}`);
      }
    }

    // Evidence allowlist: cada rótulo deve pertencer ao set fechado.
    const evidence: EditorialVerdictEvidence[] = [];
    for (const ev of v.evidence_used) {
      const trimmed = ev.trim();
      if (!EVIDENCE_SET.has(trimmed)) {
        return fail("EVIDENCE_UNKNOWN", `verdict.evidence="${trimmed}"`);
      }
      evidence.push(trimmed as EditorialVerdictEvidence);
    }

    // Visual claim guard — só permitir falar de capas / consistência
    // visual quando o snapshot tem `visual_cover_analysis` (representado
    // por um rótulo `visual_cover.*` em evidence_used).
    if (VISUAL_CLAIM_KEYWORDS.test(paragraph)) {
      const hasVisualEvidence = evidence.some((e) =>
        e.startsWith("visual_cover."),
      );
      if (!hasVisualEvidence) {
        return fail(
          "VISUAL_CLAIM_UNSUPPORTED",
          "verdict.paragraph mentions visual but no visual_cover.* evidence",
        );
      }
    }

    editorialVerdict = {
      verdict_label: v.verdict_label,
      title,
      paragraph,
      priority,
      strengths: [strengths[0], strengths[1]],
      limitations: [limitations[0], limitations[1]],
      confidence: v.confidence,
      evidence_used: evidence,
    };
  }

  return { ok: true, sections: out, priorities, editorialVerdict };
}