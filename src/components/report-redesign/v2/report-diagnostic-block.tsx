import type { ReactNode } from "react";

import type {
  AdapterResult,
  SnapshotPayload,
} from "@/lib/report/snapshot-to-report-data";
import {
  classifyContentType,
  classifyFunnelStage,
  classifyCaptionPattern,
  classifyAudienceResponse,
  classifyChannelIntegration,
  classifyHashtags,
  inferProbableObjective,
  derivePriorities,
  type ContentTypeResult,
  type FunnelStageResult,
  type CaptionPatternResult,
  type AudienceResponseResult, 
  type IntegrationResult,
  type ObjectiveResult,
  type HashtagsResult,
} from "@/lib/report/block02-diagnostic";

import { ReportDiagnosticVerdict } from "./report-diagnostic-verdict";
import { ReportDiagnosticGroup } from "./report-diagnostic-group";
import {
  ReportDiagnosticCard,
  DiagnosticDistributionBar,
  DiagnosticChecklist,
  DiagnosticFunnelStack,
  DiagnosticAudienceHighlight,
  DiagnosticObjectiveSynthesis,
  type DiagnosticTone,
} from "./report-diagnostic-card";
import { ReportDiagnosticPriorities } from "./report-diagnostic-priorities";
import { ReportDiagnosticCta } from "./report-diagnostic-cta";
import { ReportCaptionIntelligence } from "./report-caption-intelligence";
import { buildCaptionIntelligence } from "@/lib/report/caption-intelligence";

interface Props {
  result: AdapterResult;
  payload?: SnapshotPayload;
}

/**
 * Bloco 02 · Diagnóstico Editorial — orquestrador.
 *
 * Compõe veredito → 3 grupos de perguntas → prioridades de ação → CTA.
 * Toda a evidência vem de classifiers puros sobre `result` + `payload`.
 * Não chama providers, OpenAI, Supabase write, nada.
 */
export function ReportDiagnosticBlock({ result, payload }: Props) {
  const posts = payload?.posts ?? [];
  const km = result.data.keyMetrics;
  const topHashtags = result.data.topHashtags ?? [];
  const topKeywords = result.data.topKeywords ?? [];
  const topThemes = result.data.topThemes ?? [];
  const bio = result.enriched.profile.bio ?? null;
  const externalUrls = result.enriched.profile.externalUrls ?? [];

  const contentType = classifyContentType(posts);
  const funnel = classifyFunnelStage(posts);
  const caption = classifyCaptionPattern(posts);
  const audience = classifyAudienceResponse(posts);
  const hashtags = classifyHashtags(topHashtags);
  const captionIntel = buildCaptionIntelligence({
    posts,
    topThemes,
    topHashtagLabels: topHashtags.map((t) => t.tag),
    aiLanguageText:
      result.enriched.aiInsightsV2?.sections.language?.text ?? null,
  });
  const integration = classifyChannelIntegration(bio, externalUrls, posts);
  const objective = inferProbableObjective({
    contentType,
    funnel,
    integration,
    bio,
    audience,
  });

  const priorities = derivePriorities({
    contentType,
    funnel,
    caption,
    audience,
    integration,
    dominantFormatShare: km.dominantFormatShare ?? 0,
    dominantFormatLabel: km.dominantFormat ?? null,
  });

  const verdictText = buildVerdictText({
    aiHero: result.enriched.aiInsightsV2?.sections.hero?.text ?? null,
    contentType,
    funnel,
    caption,
    audience,
    dominantFormat: km.dominantFormat ?? null,
    dominantFormatShare: km.dominantFormatShare ?? 0,
  });

  const aiHeroText = result.enriched.aiInsightsV2?.sections.hero?.text ?? null;
  const verdictSource: "ai" | "fallback" =
    aiHeroText && aiHeroText.trim().length > 30 ? "ai" : "fallback";

  const aiLanguageText =
    result.enriched.aiInsightsV2?.sections.language?.text ?? null;

  // Build cards as nullable list, then split into groups
  const groupA = compact([
    renderContentTypeCard(contentType),
    renderFunnelCard(funnel),
  ]);
  const groupB = compact([
    renderHashtagsCard(hashtags),
    renderAudienceCard(audience),
  ]);
  const groupC = compact([
    renderIntegrationCard(integration),
    renderObjectiveCard(objective, contentType, funnel, integration),
  ]);

  const totalCards = groupA.length + groupB.length + groupC.length;

  return (
    <div className="space-y-10 md:space-y-12">
      <ReportDiagnosticVerdict text={verdictText} source={verdictSource} />

      {totalCards >= 4 ? (
        <>
          {groupA.length > 0 ? (
            <ReportDiagnosticGroup
              letter="A"
              label="Identidade editorial"
              questionsCount={groupA.length}
            >
              {groupA}
            </ReportDiagnosticGroup>
          ) : null}

          {groupB.length > 0 ? (
            <ReportDiagnosticGroup
              letter="B"
              label="Como comunica"
              questionsCount={groupB.length}
            >
              {groupB}
            </ReportDiagnosticGroup>
          ) : null}

          <ReportCaptionIntelligence data={captionIntel} />

          {groupC.length > 0 ? (
            <ReportDiagnosticGroup
              letter="C"
              label="Contexto estratégico"
              questionsCount={groupC.length}
            >
              {groupC}
            </ReportDiagnosticGroup>
          ) : null}
        </>
      ) : (
        <p className="text-sm text-slate-600 leading-relaxed max-w-2xl">
          A amostra de publicações é demasiado pequena para sustentar um
          diagnóstico editorial detalhado. À medida que houver mais
          atividade, este bloco passa a abrir até oito perguntas de leitura.
        </p>
      )}

      <ReportDiagnosticPriorities
        items={
          result.enriched.aiInsightsV2?.priorities &&
          result.enriched.aiInsightsV2.priorities.length === 3
            ? result.enriched.aiInsightsV2.priorities.map((p) => ({
                level: p.level,
                title: p.title,
                body: p.body,
                resolves: p.resolves,
              }))
            : injectCaptionImprovement(priorities, captionIntel)
        }
        source={
          result.enriched.aiInsightsV2?.priorities &&
          result.enriched.aiInsightsV2.priorities.length === 3
            ? "ai"
            : "deterministic"
        }
      />

      <ReportDiagnosticCta />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────

function compact<T>(arr: Array<T | null>): T[] {
  return arr.filter((x): x is T => x !== null);
}

/**
 * Quando a leitura editorial das captions (Pergunta 04) é IA e produz uma
 * recomendação de melhoria, injectamo-la como prioridade "oportunidade"
 * adicional — desde que ainda não exista nenhuma com título equivalente.
 */
function injectCaptionImprovement(
  base: ReadonlyArray<{ level: "alta" | "media" | "oportunidade"; title: string; body: string; resolves: string }>,
  intel: import("@/lib/report/caption-intelligence").CaptionIntelligence,
): Array<{ level: "alta" | "media" | "oportunidade"; title: string; body: string; resolves: string }> {
  const ab = intel.actionBridge;
  const title = ab.body && ab.body.length > 5 ? ab.body : intel.editorialReading.recommendedImprovement;
  if (!title) return [...base];
  const dup = base.some((p) =>
    p.title.toLowerCase().includes(title.toLowerCase().slice(0, 24)),
  );
  if (dup) return [...base];
  return [
    ...base,
    {
      level: ab.priorityType,
      title: title.length > 60 ? title.slice(0, 57) + "…" : title,
      body: intel.editorialReading.whatIsMissing && intel.editorialReading.whatIsMissing !== "—"
        ? intel.editorialReading.whatIsMissing
        : intel.ctaPatterns.summary,
      resolves: "Resolve a Pergunta 04 — leitura das legendas.",
    },
  ];
}

function buildVerdictText(args: {
  aiHero: string | null;
  contentType: ContentTypeResult;
  funnel: FunnelStageResult;
  caption: CaptionPatternResult;
  audience: AudienceResponseResult;
  dominantFormat: string | null;
  dominantFormatShare: number;
}): string {
  if (args.aiHero && args.aiHero.trim().length > 30) {
    return args.aiHero.trim();
  }
  const parts: string[] = [];
  if (
    args.contentType.available &&
    args.contentType.label &&
    args.contentType.label !== "Misto / pouco claro"
  ) {
    parts.push(`perfil ${args.contentType.label.toLowerCase()}`);
  }
  if (args.funnel.available && args.funnel.label && args.funnel.label !== "Comunicação dispersa") {
    parts.push(`com sinais de ${args.funnel.label.toLowerCase()}`);
  }
  if (args.dominantFormat && args.dominantFormatShare >= 50) {
    parts.push(
      `apoiado em ${args.dominantFormat.toLowerCase()} (${Math.round(
        args.dominantFormatShare,
      )} % da amostra)`,
    );
  }
  if (args.audience.available && args.audience.label === "Audiência silenciosa") {
    parts.push("sinais de audiência silenciosa — likes consistentes, conversa rara");
  } else if (args.audience.available && args.audience.label === "Audiência ativa") {
    parts.push("sinais de audiência ativa");
  }

  if (parts.length < 2) {
    return "Com base na amostra analisada, ainda não há sinal suficiente para um veredito editorial — a amostra é pequena ou pouco diferenciada.";
  }
  return "Com base na amostra analisada, " + parts.join(", ") + ".";
}

// ─────────────────────────────────────────────────────────────────────
// Card builders
// ─────────────────────────────────────────────────────────────────────

function renderContentTypeCard(r: ContentTypeResult): ReactNode | null {
  if (!r.available) return null;
  if (r.label === "Misto / pouco claro" || !r.label) {
    // Quando há um top com share relevante mas sem distância suficiente para
    // dominar (regra share≥35% AND top≥1.5×second), o veredito honesto é:
    // "há sinal, mas não chega para foco editorial". A copy reflete o que
    // a barra mostra — sem contradizer o número visível.
    const top = r.distribution[0];
    const hasStrongTop = !!top && top.sharePct >= 35;
    const body = hasStrongTop && top
      ? `Há um sinal mais forte em ${top.label.toLowerCase()} (${top.sharePct} %), mas sem distância clara para os restantes registos — ainda não chega para falar em foco editorial.`
      : "Nenhuma natureza domina claramente — a comunicação alterna entre vários registos sem foco editorial visível.";
    return (
      <ReportDiagnosticCard
        key="q01"
        number="01"
      label="Tipo de conteúdo · Classificação"
        question="Que natureza de conteúdo aparece mais?"
        answer="Padrão misto"
        tone="slate"
        span="full"
        body={body}
       sourceType="auto"
      sourceDetail="Legendas · classificação"
      >
        {r.distribution.length >= 2 ? (
          <DiagnosticDistributionBar
            variant="vertical-list"
            items={r.distribution.map((d, i) => ({
              label: d.label,
              value: d.sharePct,
              color:
                i === 0
                  ? "bg-slate-500"
                  : i === 1
                    ? "bg-slate-400"
                    : "bg-slate-300",
            }))}
          />
        ) : null}
      </ReportDiagnosticCard>
    );
  }
  const colorByIndex = (i: number) =>
    i === 0 ? "bg-emerald-600" : i === 1 ? "bg-emerald-400" : "bg-slate-300";
  return (
    <ReportDiagnosticCard
      key="q01"
      number="01"
      label="Tipo de conteúdo · Classificação"
      question="Que natureza de conteúdo aparece mais?"
      answer={r.label}
      tone="emerald"
        span="full"
      body={`Classificação do tipo de conteúdo publicado nas legendas e padrões editoriais. Cerca de ${r.sharePct} % das ${r.sampleSize} publicações analisadas têm uma assinatura ${r.label.toLowerCase()}.`}
      sourceType="auto"
      sourceDetail="Legendas · classificação"
    >
      {r.distribution.length >= 2 ? (
        <DiagnosticDistributionBar
          variant="vertical-list"
          items={r.distribution.map((d, i) => ({
            label: d.label,
            value: d.sharePct,
            color: colorByIndex(i),
          }))}
        />
      ) : null}
    </ReportDiagnosticCard>
  );
}

function renderFunnelCard(r: FunnelStageResult): ReactNode | null {
  if (!r.available) return null;
  const bodyByLabel: Record<string, string> = {
    "Topo do funil":
      "A maior parte das publicações procura captar atenção e gerar curiosidade — forte para alcance, fraca para conversão.",
    "Meio do funil":
      "A maioria do conteúdo educa e explica, posicionando o perfil como referência antes da decisão.",
    "Fundo do funil":
      "Há sinais frequentes de chamada à ação — links, ofertas ou pedidos de contacto.",
    "Pós-venda / fidelização":
      "O perfil dá protagonismo a clientes, comunidade e agradecimentos.",
    "Comunicação dispersa":
      "Os sinais de atrair, educar, converter e fidelizar misturam-se sem uma fase claramente dominante.",
  };
  const isFocused = r.label !== "Comunicação dispersa";
  const stageKeyByLabel: Record<string, "topo" | "meio" | "fundo" | "pos" | null> = {
    "Topo do funil": "topo",
    "Meio do funil": "meio",
    "Fundo do funil": "fundo",
    "Pós-venda / fidelização": "pos",
    "Comunicação dispersa": null,
  };
  const dominantStage = stageKeyByLabel[r.label ?? "Comunicação dispersa"] ?? null;
  return (
    <ReportDiagnosticCard
      key="q02"
      number="02"
      label="Funil · Mapeamento"
      question="Atrai, educa, converte ou fideliza?"
      answer={r.label ?? "—"}
      tone={isFocused ? "blue" : "amber"}
      body={`Mapeamento da função do conteúdo na jornada — atenção, educação, decisão ou relação. ${bodyByLabel[r.label ?? "Comunicação dispersa"]}`}
      sourceType="auto"
      sourceDetail="Legendas · mapeamento"
    >
      {r.breakdown.length > 0 ? (
        <DiagnosticFunnelStack
          items={r.breakdown.map((b) => ({
            stage: b.stage,
            label: b.label,
            sharePct: b.sharePct,
            active: dominantStage === b.stage,
          }))}
        />
      ) : null}
    </ReportDiagnosticCard>
  );
}

function renderHashtagsCard(r: HashtagsResult): ReactNode | null {
  if (!r.available) return null;
  const max = Math.max(1, ...r.items.map((x) => x.weight));
  return (
    <ReportDiagnosticCard
      key="q03"
      number="03"
      label="Hashtags"
      question="Que hashtags aparecem mais vezes?"
      answerLabel="Hashtags mais utilizadas"
      answer={r.items.slice(0, 2).map((it) => it.text).join(" · ")}
      tone="blue"
      body="As hashtags mostram como o perfil etiqueta os conteúdos e que territórios quer associar às publicações — não representam, por si só, os assuntos abordados."
      sourceType="dados"
      sourceDetail="Hashtags"
    >
      <ul className="space-y-1.5">
        {r.items.map((it) => {
          const pct = (it.weight / max) * 100;
          return (
            <li key={it.text} className="text-sm">
              <div className="flex items-center justify-between gap-3">
                <span className="text-slate-700 truncate">{it.text}</span>
                <span className="font-mono text-[10px] text-slate-500 tabular-nums shrink-0">
                  {it.weight}×
                </span>
              </div>
              <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full bg-blue-500"
                  style={{ width: `${pct}%` }}
                  aria-hidden
                />
              </div>
            </li>
          );
        })}
      </ul>
    </ReportDiagnosticCard>
  );
}

function renderAudienceCard(r: AudienceResponseResult): ReactNode | null {
  // — State B: data unavailable —
  if (!r.available) {
    return (
      <ReportDiagnosticCard
        key="q05"
        number="05"
        label="Resposta"
        question="O público responde ou só consome?"
        answer={r.label}
        tone="slate"
        span="full"
        body={r.explanation}
      >
        <div className="rounded-md border border-dashed border-slate-300 bg-slate-50 px-3 py-3">
          <p className="text-[12.5px] text-slate-600 leading-relaxed">
            Quando estes dados estiverem disponíveis, o relatório compara
            reação, conversa e concentração de comentários.
          </p>
        </div>
      </ReportDiagnosticCard>
    );
  }

  // — State A: data available —
  const tone: DiagnosticTone =
    r.status === "active"
      ? "emerald"
      : r.status === "silent"
        ? "rose"
        : "blue";

  const highlightTone: "rose" | "emerald" | "amber" =
    r.status === "active"
      ? "emerald"
      : r.status === "moderate" || r.status === "concentrated"
        ? "amber"
        : "rose";

  return (
    <ReportDiagnosticCard
      key="q05"
      number="05"
      label="Resposta"
      question="O público responde ou só consome?"
      answer={r.label}
      tone={tone}
      span="full"
      body={r.explanation}
      sourceType="auto"
      sourceDetail="Gostos + comentários"
    >
      <DiagnosticAudienceHighlight
        avgLikes={r.avgLikes}
        avgComments={r.avgComments}
        totalLikes={r.totals.likes}
        totalComments={r.totals.comments}
        postsWithComments={r.totals.postsWithComments}
        sampleSize={r.sampleSize}
        tone={highlightTone}
        topConversationPost={r.topConversationPost}
        status={r.status}
      />
    </ReportDiagnosticCard>
  );
}

function renderIntegrationCard(r: IntegrationResult): ReportDiagnosticCardChild {
  if (!r.available || r.label === "Sem sinais suficientes") return null;
  const tone: DiagnosticTone =
    r.label === "Integração clara"
      ? "emerald"
      : r.label === "Integração parcial"
        ? "blue"
        : "amber";
  return (
    <ReportDiagnosticCard
      key="q06"
      number="06"
      label="Integração"
      question="Há ligação entre canais?"
      answer={r.label}
      tone={tone}
      body="Há infraestrutura cross-canal quando a bio aponta para fora e as captions reforçam a saída do Instagram. Sem isso, a audiência fica presa à plataforma."
      sourceType="auto"
      sourceDetail="Bio + legendas"
    >
      <DiagnosticChecklist
        items={[
          {
            label: r.signals.bioLink.value
              ? `Link na bio · ${shortenUrl(r.signals.bioLink.value)}`
              : "Link na bio",
            status: r.signals.bioLink.detected ? "detected" : "missing",
          },
          {
            label: "Menções a site/newsletter",
            status: r.signals.siteOrNewsletter.detected
              ? "detected"
              : "missing",
            hint:
              r.signals.siteOrNewsletter.count > 0
                ? `${r.signals.siteOrNewsletter.count} posts`
                : undefined,
          },
          {
            label: "CTAs explícitos no fim de posts",
            status:
              r.signals.explicitCta.sharePct >= 30
                ? "detected"
                : r.signals.explicitCta.sharePct >= 10
                  ? "partial"
                  : "missing",
            hint: `${r.signals.explicitCta.sharePct}%`,
          },
        ]}
      />
    </ReportDiagnosticCard>
  );
}

type ReportDiagnosticCardChild = ReactNode | null;

function renderObjectiveCard(
  r: ObjectiveResult,
  contentType: ContentTypeResult,
  funnel: FunnelStageResult,
  integration: IntegrationResult,
): ReportDiagnosticCardChild {
  if (!r.available || !r.primary) return null;

  // Build support signal chips from detected data
  const supportSignals: string[] = [];
  if (contentType.available && contentType.label && contentType.label !== "Misto / pouco claro") {
    supportSignals.push(`Conteúdo ${contentType.label.toLowerCase()}`);
  }
  if (funnel.available && funnel.label && funnel.label !== "Comunicação dispersa") {
    supportSignals.push(funnel.label);
  }
  if (integration.available) {
    if (integration.signals.bioLink.detected) supportSignals.push("Link na bio");
    if (integration.signals.siteOrNewsletter.detected) supportSignals.push("CTA para site/newsletter");
  }

  // Show secondary objective if close to primary
  const secondary =
    r.ranking.length >= 2 && r.ranking[1].score >= r.ranking[0].score * 0.6
      ? r.ranking[1].label
      : null;

  return (
    <ReportDiagnosticCard
      key="q07"
      number="07"
      label="Objetivo · Síntese"
      question="Que objetivo estratégico parece estar por trás?"
      answer={r.primary}
      tone="blue"
      body="Síntese provável com base no tipo de conteúdo, funil, bio e ligação entre canais."
      sourceType="auto"
      sourceDetail="Conteúdo + funil + bio · síntese"
    >
      <DiagnosticObjectiveSynthesis
        primary={r.primary}
        secondary={secondary}
        confidence={r.confidence}
        supportSignals={supportSignals.slice(0, 4)}
      />
    </ReportDiagnosticCard>
  );
}

function shortenUrl(url: string): string {
  return url.replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/\/$/, "");
}