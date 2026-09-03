/**
 * Editorial V2 — adaptador puro do Diagnóstico editorial (06).
 *
 * Reutiliza EXACTAMENTE os classificadores determinísticos e as saídas de
 * enrichment/IA já persistidas que o Pro público usa hoje
 * (`report-diagnostic-block.tsx`). Não gera nada, não faz I/O, não inventa
 * números nem confiança e não cria regras novas de diagnóstico.
 *
 * Cada "fio" separa explicitamente:
 *   - `observations` → factos medidos (nunca interpretação);
 *   - `reading`      → interpretação já produzida em produção (ou nula).
 */

import type { AdapterResult, SnapshotPayload } from "@/lib/report/snapshot-to-report-data";
import type { VisualCoverAnalysis } from "@/lib/report/visual-cover-types";
import {
  classifyAudienceResponse,
  classifyChannelIntegration,
  classifyContentType,
  classifyFunnelStage,
  classifyHashtags,
} from "@/lib/report/block02-diagnostic";
import { buildCaptionIntelligence } from "@/lib/report/caption-intelligence";
import { getEnrichmentState } from "@/components/report-redesign/v2/enrichment-pending";

export type DiagnosisThreadSource = "regra" | "ia" | "regra_ia";

export interface DiagnosisThread {
  /** Slug apenas de apresentação. Não é chave funcional de produção. */
  id: string;
  title: string;
  /** Factos medidos, um por frase. */
  observations: string[];
  /** Interpretação já existente em produção. Null quando não há. */
  reading: string | null;
  /** Proveniência conhecida. Nunca inferida quando desconhecida. */
  source: DiagnosisThreadSource;
}

export type DiagnosisNoticeKind = "pending" | "error";

export interface DiagnosisNotice {
  id: string;
  kind: DiagnosisNoticeKind;
  label: string;
}

export interface EditorialDiagnosisData {
  verdict: { text: string; source: "ia" | "regra" } | null;
  threads: DiagnosisThread[];
  notices: DiagnosisNotice[];
  /** True quando não há veredicto nem qualquer fio disponível. */
  empty: boolean;
}

/* ── helpers de formatação (apenas apresentação) ───────────────────── */

function int(n: number): string {
  return new Intl.NumberFormat("pt-PT").format(Math.round(n));
}

function pct(n: number): string {
  return `${Math.round(n)} %`;
}

function dec1(n: number): string {
  return n.toFixed(1).replace(".", ",");
}

function listPt(items: readonly string[]): string {
  if (items.length <= 1) return items[0] ?? "";
  return `${items.slice(0, -1).join(", ")} e ${items[items.length - 1]}`;
}

/** Mesmo parse defensivo do bloco de produção. */
function parseVisualCoverAnalysis(
  payload?: SnapshotPayload,
): VisualCoverAnalysis | null {
  const raw = payload?.visual_cover_analysis;
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  if (typeof r.overallScore !== "number" || typeof r.status !== "string") {
    return null;
  }
  return raw as VisualCoverAnalysis;
}

/* ── adaptador ─────────────────────────────────────────────────────── */

export function buildEditorialDiagnosisData(
  result: AdapterResult,
  payload?: SnapshotPayload,
): EditorialDiagnosisData {
  const posts = payload?.posts ?? [];
  const topHashtags = result.data.topHashtags ?? [];
  const topThemes = result.data.topThemes ?? [];
  const bio = result.enriched.profile.bio ?? null;
  const externalUrls = result.enriched.profile.externalUrls ?? [];
  const aiLanguageText =
    result.enriched.aiInsightsV2?.sections.language?.text ?? null;

  const contentType = classifyContentType(posts);
  const funnel = classifyFunnelStage(posts);
  const audience = classifyAudienceResponse(posts);
  const hashtags = classifyHashtags(topHashtags);
  const integration = classifyChannelIntegration(bio, externalUrls, posts);
  const captionIntel = buildCaptionIntelligence({
    posts,
    topThemes,
    topHashtagLabels: topHashtags.map((t) => t.tag),
    aiLanguageText,
  });
  const cover = parseVisualCoverAnalysis(payload);

  const threads: DiagnosisThread[] = [];

  /* 01 — Tipo de conteúdo (regra) */
  if (contentType.available && contentType.label) {
    const top = contentType.distribution.slice(0, 3);
    const observations = [
      `Cerca de ${pct(contentType.sharePct)} das ${contentType.sampleSize} publicações analisadas têm assinatura ${contentType.label.toLowerCase()}.`,
    ];
    if (top.length > 1) {
      observations.push(
        `Distribuição observada: ${listPt(
          top.map((d) => `${d.label.toLowerCase()} ${pct(d.sharePct)} (${d.count})`),
        )}.`,
      );
    }
    threads.push({
      id: "tipo-de-conteudo",
      title: "Tipo de conteúdo",
      observations,
      reading:
        contentType.sharePct < 40
          ? "Nenhuma natureza de conteúdo domina com clareza, o que pode indicar ausência de foco editorial definido."
          : `A concentração em conteúdo ${contentType.label.toLowerCase()} sugere que é este o registo que a audiência associa ao perfil.`,
      source: "regra",
    });
  }

  /* 02 — Papel no funil (regra) */
  if (funnel.available && funnel.label) {
    threads.push({
      id: "funil",
      title: "Papel do conteúdo no funil",
      observations: [
        `A fase dominante observada é ${funnel.label.toLowerCase()}, com ${pct(funnel.sharePct)} das publicações analisadas.`,
      ],
      reading:
        funnel.label === "Comunicação dispersa"
          ? "Sem uma fase dominante, os dados sugerem que o conteúdo pode não estar a conduzir a audiência numa direcção clara."
          : `A distribuição sugere que o conteúdo trabalha sobretudo a fase de ${funnel.label.toLowerCase()}, com menos peso nas restantes.`,
      source: "regra",
    });
  }

  /* 03 — Hashtags (regra, apenas factual) */
  if (hashtags.available && hashtags.items.length > 0) {
    threads.push({
      id: "hashtags",
      title: "Hashtags recorrentes",
      observations: [
        `As hashtags mais repetidas nesta amostra são ${listPt(
          hashtags.items.map((i) => `${i.text} (${int(i.weight)})`),
        )}.`,
      ],
      reading: null,
      source: "regra",
    });
  }

  /* 04 — Legendas (regra + IA persistida quando existe) */
  if (captionIntel.available) {
    const observations = [
      `Foram analisadas ${captionIntel.sampleSize} legendas, com uma média de ${int(
        captionIntel.captionStats.avgWordsPerCaption,
      )} palavras por publicação.`,
      `${pct(captionIntel.ctaPatterns.hasCtaPct)} das legendas incluem uma chamada à ação e ${pct(
        captionIntel.ctaPatterns.hasQuestionPct,
      )} colocam uma pergunta.`,
    ];
    const reading = [
      captionIntel.editorialReading.whatItCommunicates,
      captionIntel.editorialReading.whatIsMissing,
    ]
      .filter((s) => typeof s === "string" && s.trim().length > 0)
      .join(" ");
    threads.push({
      id: "legendas",
      title: "Padrão das legendas",
      observations,
      reading: reading.length > 0 ? reading : null,
      source:
        captionIntel.editorialReading.source === "ai" ? "regra_ia" : "regra",
    });
  }

  /* 05 — Resposta do público (regra) */
  if (audience.available) {
    const observations = [
      `Média de ${int(audience.avgLikes)} gostos e ${dec1(audience.avgComments)} comentários por publicação, em ${audience.sampleSize} publicações.`,
      `Os comentários representam ${dec1(audience.commentsToLikesPct)} % dos gostos.`,
    ];
    if (audience.totals.postsWithComments > 0) {
      observations.push(
        `${audience.totals.postsWithComments} de ${audience.totals.analysedPosts} publicações têm pelo menos um comentário.`,
      );
    }
    threads.push({
      id: "resposta-do-publico",
      title: "Resposta do público",
      observations,
      reading: audience.explanation?.trim() ? audience.explanation : null,
      source: "regra",
    });
  }

  /* 06 — Integração entre canais (regra) */
  if (integration.available) {
    const signals: string[] = [];
    signals.push(
      integration.signals.bioLink.detected
        ? "há link na bio"
        : "não há link detetado na bio",
    );
    signals.push(
      integration.signals.siteOrNewsletter.detected
        ? `${integration.signals.siteOrNewsletter.count} publicações mencionam site ou newsletter`
        : "não há menções a site ou newsletter nas legendas",
    );
    signals.push(
      integration.signals.explicitCta.detected
        ? `${pct(integration.signals.explicitCta.sharePct)} das publicações terminam com chamada à ação explícita`
        : "não há chamadas à ação explícitas no fim das publicações",
    );
    threads.push({
      id: "integracao",
      title: "Integração entre canais",
      observations: [`Sinais observados: ${listPt(signals)}.`],
      reading:
        integration.label === "Integração clara"
          ? "Existe infraestrutura de saída do Instagram, pelo que o tráfego pode ser encaminhado para canais próprios."
          : "Os sinais disponíveis sugerem que a atenção gerada no Instagram tem poucas saídas para canais próprios.",
      source: "regra",
    });
  }

  /* 07 — Capas (IA persistida) */
  if (cover) {
    const observations = [
      `Foram analisadas ${cover.analyzedCount} capas, com uma pontuação visual agregada de ${int(cover.overallScore)} / 100.`,
      `${pct(cover.aggregate.humanPresencePct)} das capas mostram presença humana e ${pct(
        cover.aggregate.textInImagePct,
      )} têm texto na imagem.`,
    ];
    threads.push({
      id: "capas",
      title: "Capas e consistência visual",
      observations,
      reading: cover.diagnostic?.main?.trim() ? cover.diagnostic.main : null,
      source: "ia",
    });
  }

  /* Estados verdadeiros de enrichment — nunca disparam geração. */
  const notices: DiagnosisNotice[] = [];
  const coverState = getEnrichmentState(payload, "visual_cover");
  if (!cover && (coverState === "pending" || coverState === "error")) {
    notices.push({
      id: "visual_cover",
      kind: coverState,
      label: "Análise visual das capas",
    });
  }
  const captionState = getEnrichmentState(payload, "caption_semantic");
  if (captionState === "pending" || captionState === "error") {
    notices.push({
      id: "caption_semantic",
      kind: captionState,
      label: "Leitura semântica das legendas",
    });
  }
  const insightsState = getEnrichmentState(payload, "insights_v2");
  if (insightsState === "pending" || insightsState === "error") {
    notices.push({
      id: "insights_v2",
      kind: insightsState,
      label: "Síntese editorial",
    });
  }

  /* Veredicto — mesma autoridade de produção. */
  const aiVerdict = result.enriched.aiInsightsV2?.sections.hero?.text ?? null;
  let verdict: EditorialDiagnosisData["verdict"] = null;
  if (aiVerdict && aiVerdict.trim().length > 0) {
    verdict = { text: aiVerdict, source: "ia" };
  } else if (
    contentType.available &&
    funnel.available &&
    audience.available &&
    contentType.label &&
    funnel.label
  ) {
    verdict = {
      text: `Os sinais disponíveis apontam para um perfil com conteúdo sobretudo ${contentType.label.toLowerCase()}, posicionado em ${funnel.label.toLowerCase()}, com uma resposta do público classificada como ${audience.label.toLowerCase()}.`,
      source: "regra",
    };
  }

  return {
    verdict,
    threads,
    notices,
    empty: verdict === null && threads.length === 0,
  };
}
