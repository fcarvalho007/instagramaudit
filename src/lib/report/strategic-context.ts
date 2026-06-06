/**
 * Strategic Context (Bloco 06) — helper puro híbrido.
 *
 * Combina sinais determinísticos do diagnóstico editorial com insights
 * AI já cacheados (`aiInsightsV2`) para compor:
 *   - 1 síntese editorial curta
 *   - até 3 pilares (Padrão forte / Risco editorial / Sinal a acompanhar)
 *
 * Sem I/O, sem prompts novos, sem inferências sobre dados privados.
 * Quando o sinal é insuficiente, devolve um array vazio de pilares e
 * a UI degrada graciosamente.
 */

import type {
  ContentTypeResult,
  FunnelStageResult,
  AudienceResponseResult,
  IntegrationResult,
} from "./block02-diagnostic";
import type {
  AiInsightV2Item,
  AiInsightV2Section,
  EditorialVerdict,
} from "@/lib/insights/types";

export type StrategicPillarKind = "strength" | "risk" | "watch";

export interface StrategicPillar {
  kind: StrategicPillarKind;
  eyebrow: string;
  title: string;
  body: string;
}

export interface StrategicContext {
  summary: string;
  pillars: StrategicPillar[];
  /** Quando true, a UI deve mostrar a nota discreta de "sinais insuficientes". */
  insufficient: boolean;
}

type AiSections = Partial<Record<AiInsightV2Section, AiInsightV2Item>> | null | undefined;

interface Input {
  contentType: ContentTypeResult;
  funnel: FunnelStageResult;
  audience: AudienceResponseResult;
  integration: IntegrationResult;
  aiSections?: AiSections;
  editorialVerdict?: EditorialVerdict | null;
}

const EYEBROW = {
  strength: "Padrão forte",
  risk: "Risco editorial",
  watch: "Sinal a acompanhar",
} as const;

/**
 * Síntese editorial — prefere AI (editorial_verdict.paragraph → sections.hero),
 * com fallback determinístico fundado em labels já calculadas.
 */
function buildSummary(input: Input): string {
  const verdict = input.editorialVerdict?.paragraph?.trim();
  if (verdict) return verdict;
  const hero = input.aiSections?.hero?.text?.trim();
  if (hero) return hero;

  const parts: string[] = [];
  if (input.contentType.available && input.contentType.label) {
    parts.push(
      `O perfil comunica predominantemente em registo ${input.contentType.label.toLowerCase()}`,
    );
  }
  if (input.funnel.available && input.funnel.label) {
    const focused = input.funnel.label !== "Comunicação dispersa";
    parts.push(
      focused
        ? `, com foco em ${input.funnel.label.toLowerCase()}`
        : ", embora a comunicação esteja dispersa entre várias fases",
    );
  }
  if (input.audience.available) {
    if (input.audience.status === "active") {
      parts.push(". A audiência responde de forma activa.");
    } else if (input.audience.status === "silent") {
      parts.push(". A audiência ainda interage pouco com o conteúdo.");
    } else {
      parts.push(". A resposta da audiência mantém-se moderada.");
    }
  } else {
    if (parts.length > 0) parts.push(".");
  }
  const sentence = parts.join("").trim();
  if (sentence.length > 0) return sentence;
  return "Esta secção sintetiza o que os sinais visíveis sugerem sobre a direcção editorial, o padrão de publicação e a resposta da audiência.";
}

/** Procura uma secção AI com determinada ênfase, devolve texto se existir. */
function aiText(
  sections: AiSections,
  keys: AiInsightV2Section[],
  emphasis: ("positive" | "negative" | "neutral" | "default")[],
): string | null {
  if (!sections) return null;
  for (const k of keys) {
    const item = sections[k];
    if (item && emphasis.includes(item.emphasis) && item.text?.trim()) {
      return item.text.trim();
    }
  }
  return null;
}

function pillar(
  kind: StrategicPillarKind,
  title: string,
  body: string,
): StrategicPillar {
  return { kind, eyebrow: EYEBROW[kind], title, body };
}

/** Derivação determinística do Padrão forte. */
function deriveStrength(input: Input): StrategicPillar | null {
  const aiBody = aiText(input.aiSections, ["topPosts", "formats", "hero"], [
    "positive",
  ]);

  // Sinais determinísticos elegíveis, por ordem de prioridade
  if (input.contentType.available && input.contentType.label && input.contentType.sharePct >= 40) {
    return pillar(
      "strength",
      `${input.contentType.label} como linha dominante`,
      aiBody ??
        `Cerca de ${input.contentType.sharePct}% das publicações analisadas seguem este registo, o que dá identidade clara ao perfil.`,
    );
  }
  if (input.audience.available && input.audience.status === "active") {
    return pillar(
      "strength",
      "Audiência activa e em conversa",
      aiBody ??
        `A relação comentários/likes (${input.audience.commentsToLikesPct.toFixed(1)}%) indica uma audiência que reage e responde.`,
    );
  }
  if (
    input.funnel.available &&
    input.funnel.label &&
    input.funnel.label !== "Comunicação dispersa" &&
    input.funnel.sharePct >= 45
  ) {
    return pillar(
      "strength",
      `Foco em ${input.funnel.label.toLowerCase()}`,
      aiBody ??
        `A maior parte dos posts (≈ ${input.funnel.sharePct}%) trabalha esta fase do funil, o que dá consistência editorial.`,
    );
  }
  if (input.integration.available && input.integration.label === "Integração clara") {
    return pillar(
      "strength",
      "Integração clara com canais externos",
      aiBody ??
        "A bio, ligações externas e chamadas à acção apontam para canais próprios — o perfil não fica preso ao Instagram.",
    );
  }
  if (aiBody) {
    return pillar("strength", "Sinal positivo identificado", aiBody);
  }
  return null;
}

/** Derivação determinística do Risco editorial. */
function deriveRisk(input: Input): StrategicPillar | null {
  const aiBody = aiText(input.aiSections, ["formats", "language", "hero"], ["negative"]);

  if (
    input.contentType.available &&
    input.contentType.label &&
    input.contentType.sharePct >= 70
  ) {
    return pillar(
      "risk",
      "Dependência de um único registo",
      aiBody ??
        `Cerca de ${input.contentType.sharePct}% das publicações repetem o mesmo registo (${input.contentType.label.toLowerCase()}). Falta variação para sustentar atenção a longo prazo.`,
    );
  }
  if (input.funnel.available && input.funnel.label === "Comunicação dispersa") {
    return pillar(
      "risk",
      "Comunicação editorial dispersa",
      aiBody ??
        "A distribuição entre fases do funil é equilibrada de mais — sem um foco editorial reconhecível, é mais difícil para a audiência perceber a promessa do perfil.",
    );
  }
  if (input.audience.available && input.audience.status === "silent") {
    return pillar(
      "risk",
      "Audiência pouco activa",
      aiBody ??
        `A relação comentários/likes (${input.audience.commentsToLikesPct.toFixed(1)}%) é baixa: a audiência consome, mas pouco responde.`,
    );
  }
  if (
    input.integration.available &&
    (input.integration.label === "Pouca ligação visível" ||
      !input.integration.signals.bioLink.detected)
  ) {
    return pillar(
      "risk",
      "Pouca ligação a canais próprios",
      aiBody ??
        "A bio e as publicações apresentam poucos sinais de ligação a site, newsletter ou outros canais — o perfil depende muito da plataforma.",
    );
  }
  if (aiBody) {
    return pillar("risk", "Fragilidade editorial identificada", aiBody);
  }
  return null;
}

/** Derivação determinística do Sinal a acompanhar. */
function deriveWatch(input: Input, used: Set<StrategicPillarKind>): StrategicPillar | null {
  // Evitar repetir mensagens já cobertas em "strength" ou "risk"
  const aiBody = aiText(input.aiSections, ["heatmap", "daysOfWeek", "evolutionChart", "language"], [
    "neutral",
    "default",
  ]);

  if (input.contentType.available && input.contentType.distribution.length >= 2) {
    const second = input.contentType.distribution[1];
    if (second && second.sharePct >= 15 && second.sharePct < 40) {
      return pillar(
        "watch",
        `${second.label} como segunda linha`,
        aiBody ??
          `${second.label} representa ${second.sharePct}% das publicações — vale a pena observar se cresce ou se estabiliza.`,
      );
    }
  }
  if (
    input.audience.available &&
    (input.audience.status === "moderate" || input.audience.status === "concentrated")
  ) {
    return pillar(
      "watch",
      "Resposta da audiência a estabilizar",
      aiBody ??
        "A audiência responde, mas de forma irregular. Vale a pena observar quais publicações concentram a maior parte da conversa.",
    );
  }
  if (input.integration.available && input.integration.label === "Integração parcial") {
    return pillar(
      "watch",
      "Integração parcial com canais externos",
      aiBody ??
        "Há alguns sinais de ligação a canais próprios, mas ainda não são consistentes ao longo das publicações.",
    );
  }
  if (aiBody && !used.has("watch")) {
    return pillar("watch", "Padrão a observar", aiBody);
  }
  return null;
}

export function buildStrategicContext(input: Input): StrategicContext {
  const summary = buildSummary(input);

  const pillars: StrategicPillar[] = [];
  const used = new Set<StrategicPillarKind>();

  const strength = deriveStrength(input);
  if (strength) {
    pillars.push(strength);
    used.add("strength");
  }
  const risk = deriveRisk(input);
  if (risk) {
    pillars.push(risk);
    used.add("risk");
  }
  const watch = deriveWatch(input, used);
  if (watch) {
    pillars.push(watch);
    used.add("watch");
  }

  return {
    summary,
    pillars,
    insufficient: pillars.length === 0,
  };
}