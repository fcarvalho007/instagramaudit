/**
 * Montagem final das Prioridades de ação — lógica pura extraída de
 * `report-diagnostic-block.tsx` sem qualquer alteração de comportamento.
 *
 * Ordem, dedupe, corte e sanitização mantêm-se EXACTAMENTE como estavam:
 * itens de IA persistida primeiro (com a prosa sanitizada), depois os
 * itens determinísticos por score, dedupe por `título|categoria|primeira
 * base` e corte em 6.
 *
 * Puro: sem I/O, sem geração, sem chamadas de IA.
 */

import {
  derivePriorities,
  type PriorityBasis,
  type PriorityCategory,
  type PriorityItem,
} from "@/lib/report/block02-diagnostic";
import { sanitizeAiPriorityBody } from "@/lib/insights/sanitize-ai-priorities";

export interface AiPriorityInput {
  level: "alta" | "media" | "oportunidade";
  title: string;
  body: string;
  resolves: string;
}

/** Número máximo de prioridades apresentadas — contrato de produção. */
export const MAX_PRIORITY_ITEMS = 6;

/**
 * Map an AI-produced priority item into the local `PriorityItem` shape.
 * Infers `category` from action verbs and `basedOn` from keyword hints
 * in title/body. Source is always "ai".
 */
export function inferAiPriorityItem(p: AiPriorityInput): PriorityItem {
  const text = `${p.title} ${p.body}`.toLowerCase();
  let category: PriorityCategory = "oportunidade";
  if (/\b(corrig|resolve[r]?|reparar|arrumar|endereçar)/.test(text)) {
    category = "corrigir";
  } else if (/\b(repetir|manter|continuar|escalar|replicar)/.test(text)) {
    category = "repetir";
  } else if (/\b(testar|experimentar|tentar|introduzir|variar|adicionar)/.test(text)) {
    category = "testar";
  }

  const basedOn: PriorityBasis[] = [];
  const add = (b: PriorityBasis) => {
    if (!basedOn.includes(b)) basedOn.push(b);
  };
  if (/\b(coment|respond|conversa|audi[êe]ncia)\b/.test(text)) add("Resposta do público");
  if (/\b(capa|thumbnail|visual|imagem)\b/.test(text)) add("Análise visual das capas");
  if (/\b(ritmo|frequ[êe]ncia|cad[êe]ncia|semana|semanal|publica)\b/.test(text))
    add("Frequência editorial");
  if (/\b(reel|carross|formato)\b/.test(text)) add("Mix de formatos");
  if (/\b(post[s]? com|melhor post|post-âncora|post ancora|publica[çc][ãa]o-chave)\b/.test(text))
    add("Publicações-chave");
  if (/\b(caption|legend|cta|chamada)\b/.test(text)) add("Padrão das captions");
  if (/\b(bio|link|newsletter|site|canal|whatsapp|dm)\b/.test(text)) add("Integração entre canais");
  if (basedOn.length === 0) add("Tipo de conteúdo dominante");

  return {
    level: p.level,
    category,
    title: p.title,
    body: p.body,
    resolves: p.resolves,
    basedOn,
    source: "ai",
  };
}

export interface BuildPriorityItemsArgs {
  /** Prioridades de IA já persistidas. Nunca geradas aqui. */
  aiPriorities?: readonly AiPriorityInput[] | null;
  /** Mesmos argumentos que a produção passa a `derivePriorities`. */
  deterministicArgs: Parameters<typeof derivePriorities>[0];
  /** Pool numérico usado pela sanitização da prosa de IA. */
  sanitizationPool: unknown;
}

export interface BuildPriorityItemsResult {
  items: PriorityItem[];
  /** Proveniência global, tal como a produção a calcula. */
  source: "ai" | "deterministic";
}

export function buildPriorityItems({
  aiPriorities,
  deterministicArgs,
  sanitizationPool,
}: BuildPriorityItemsArgs): BuildPriorityItemsResult {
  const source: "ai" | "deterministic" = aiPriorities?.length ? "ai" : "deterministic";

  const deterministicPriorities = derivePriorities(deterministicArgs);

  const aiMapped: PriorityItem[] = (aiPriorities ?? []).map((p) => {
    const item = inferAiPriorityItem(p);
    const { body, sanitized } = sanitizeAiPriorityBody(item.body, sanitizationPool);
    return sanitized ? { ...item, body } : item;
  });

  const dedupKey = (p: PriorityItem) =>
    `${p.title.trim().toLowerCase()}|${p.category ?? ""}|${p.basedOn?.[0] ?? ""}`;

  const seen = new Set<string>();
  const items: PriorityItem[] = [];
  for (const it of [...aiMapped, ...deterministicPriorities]) {
    const k = dedupKey(it);
    if (seen.has(k)) continue;
    seen.add(k);
    items.push(it);
    if (items.length >= MAX_PRIORITY_ITEMS) break;
  }

  return { items, source };
}
