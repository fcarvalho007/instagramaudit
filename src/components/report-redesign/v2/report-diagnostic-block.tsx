import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";

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
  type ContentTypeResult,
  type FunnelStageResult,
  type AudienceResponseResult, 
  type IntegrationResult,
} from "@/lib/report/block02-diagnostic";
import {
  derivePriorities,
  type PriorityItem,
  type PriorityCategory,
  type PriorityBasis,
} from "@/lib/report/block02-diagnostic";
import { ReportDiagnosticPriorities } from "./report-diagnostic-priorities";
import { ReportDiagnosticVerdict } from "./report-diagnostic-verdict";


import { ReportDiagnosticGroup } from "./report-diagnostic-group";
import {
  ReportDiagnosticCard,
  DiagnosticDistributionBar,
  DiagnosticChecklist,
  DiagnosticFunnelStack,
  DiagnosticAudienceHighlight,
  type DiagnosticTone,
} from "./report-diagnostic-card";
import { InsightCallout } from "./insight-callout";
import { CaptionDiagnosticsCard } from "./caption-diagnostics-card";
import { buildCaptionIntelligence } from "@/lib/report/caption-intelligence";
import type { CaptionSemanticAnalysis } from "@/lib/report/caption-semantic-types";
import { HashtagDiagnosticsCard } from "./hashtag-diagnostics-card";
import {
  CommentIntelligenceUnavailable,
} from "./report-comment-intelligence";
import type { CommentIntelligence } from "@/lib/analysis/types";
import { VisualCoverAnalysisCard } from "./visual-cover-analysis-card";
import type { VisualCoverAnalysis } from "@/lib/report/visual-cover-types";
import { useReportVariant, useVariantFeatures } from "@/lib/report/report-variant";
import { getEnrichmentState } from "./enrichment-pending";
import { EnrichmentPlaceholderCard } from "./enrichment-placeholder-card";
import { sanitizeAiPriorityBody } from "@/lib/insights/sanitize-ai-priorities";

/** Parse persisted visual_cover_analysis from snapshot payload. */
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

/** Parse persisted caption_semantic_analysis from snapshot payload. */
function parseCaptionSemanticAnalysis(
  payload?: SnapshotPayload,
): CaptionSemanticAnalysis | null {
  const raw = payload?.caption_semantic_analysis;
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  if (r.source !== "openai" || typeof r.analyzedCaptions !== "number") return null;
  if (r.schemaVersion !== 2) return null;
  return raw as CaptionSemanticAnalysis;
}

/**
 * Map an AI-produced priority item into the local `PriorityItem` shape.
 * Infers `category` from action verbs and `basedOn` from keyword hints
 * in title/body. Source is always "ai".
 */
function inferAiPriorityItem(p: {
  level: "alta" | "media" | "oportunidade";
  title: string;
  body: string;
  resolves: string;
}): PriorityItem {
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

interface Props {
  result: AdapterResult;
  payload?: SnapshotPayload;
  premiumUnlocked?: boolean;
}

/**
 * Bloco 02 · Diagnóstico Editorial — orquestrador.
 *
 * Compõe veredicto → 3 grupos de perguntas → prioridades de ação → CTA.
 * Toda a evidência vem de classifiers puros sobre `result` + `payload`.
 * Não chama providers, OpenAI, Supabase write, nada.
 */
export function ReportDiagnosticBlock({ result, payload, premiumUnlocked = false }: Props) {
  const { t } = useTranslation("report");
  const posts = payload?.posts ?? [];
  const features = useVariantFeatures();
  const variant = useReportVariant();
  const isLab = variant === "internal_lab";
  const isFree = variant === "public_mvp";
  const showPaidPlaceholders =
    premiumUnlocked || variant === "pro_preview" || variant === "internal_lab";
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

  const aiLanguageText =
    result.enriched.aiInsightsV2?.sections.language?.text ?? null;

  // ── Prioridades de ação ──────────────────────────────────────────
  const aiPriorities = result.enriched.aiInsightsV2?.priorities;
  const dominantFormat = contentType.available
    ? contentType.distribution[0]
    : null;

  const prioritySource: "ai" | "deterministic" = aiPriorities?.length
    ? "ai"
    : "deterministic";

  const deterministicPriorities = derivePriorities({
    contentType,
    funnel,
    caption,
    audience,
    integration,
    dominantFormatShare: dominantFormat?.sharePct ?? 0,
    dominantFormatLabel: dominantFormat?.label ?? null,
    commentIntel:
      features.commentIntelligence === "full"
        ? (result.enriched.commentIntelligence ?? null)
        : null,
    coverAnalysis: parseVisualCoverAnalysis(payload),
    cadence: result.enriched.cadence
      ? {
          weekly: result.enriched.cadence.weekly,
          sufficient: result.enriched.cadence.sufficient,
        }
      : null,
  });

  // Always guarantee ≥3 priority cards: AI items first (cleaned of any
  // unsupported numbers), then deterministic items merged with a
  // composite dedup key (title + category + first basis).
  const sanitizationPool = {
    keyMetrics: km,
    cadence: result.enriched.cadence ?? null,
    commentIntelligence: result.enriched.commentIntelligence ?? null,
    coverAnalysis: parseVisualCoverAnalysis(payload),
    contentType,
    caption,
    audience,
    integration,
    dominantFormatShare: dominantFormat?.sharePct ?? 0,
  };

  const aiMapped: PriorityItem[] = (aiPriorities ?? []).map((p) => {
    const item = inferAiPriorityItem(p);
    const { body, sanitized } = sanitizeAiPriorityBody(item.body, sanitizationPool);
    return sanitized ? { ...item, body } : item;
  });

  const dedupKey = (p: PriorityItem) =>
    `${p.title.trim().toLowerCase()}|${p.category ?? ""}|${(p.basedOn?.[0] ?? "")}`;
  const seen = new Set<string>();
  const priorityItems: PriorityItem[] = [];
  for (const it of [...aiMapped, ...deterministicPriorities]) {
    const k = dedupKey(it);
    if (seen.has(k)) continue;
    seen.add(k);
    priorityItems.push(it);
    if (priorityItems.length >= 6) break;
  }

  // ── Enrichment pending / error placeholders (Pro + Lab only) ─────
  const coverAnalysis = parseVisualCoverAnalysis(payload);
  const captionSemanticForState = parseCaptionSemanticAnalysis(payload);
  const coverState = getEnrichmentState(payload, "visual_cover");
  const captionStateGate = getEnrichmentState(payload, "caption_semantic");
  const insightsState = getEnrichmentState(payload, "insights_v2");

  const renderCoverSlot = (): ReactNode => {
    if (showPaidPlaceholders && coverState === "pending" && coverAnalysis === null) {
      return (
        <EnrichmentPlaceholderCard
          variant="pending"
          title={t("pending.cover.title")}
          body={t("pending.cover.body")}
          className="md:col-span-2"
        />
      );
    }
    if (showPaidPlaceholders && coverState === "error" && coverAnalysis === null) {
      return (
        <EnrichmentPlaceholderCard
          variant="error"
          title={t("pending.cover.title")}
          body={t("pending.error.body")}
          className="md:col-span-2"
        />
      );
    }
    return (
      <VisualCoverAnalysisCard posts={posts} analysis={coverAnalysis} />
    );
  };

  const renderCaptionSlot = (
    captionIntelData: ReturnType<typeof buildCaptionIntelligence>,
    captionSemantic: CaptionSemanticAnalysis | null,
  ): ReactNode => {
    if (showPaidPlaceholders && captionStateGate === "pending" && captionSemantic === null) {
      return (
        <EnrichmentPlaceholderCard
          variant="pending"
          title={t("pending.caption.title")}
          body={t("pending.caption.body")}
          className="md:col-span-2"
        />
      );
    }
    if (showPaidPlaceholders && captionStateGate === "error" && captionSemantic === null) {
      return (
        <EnrichmentPlaceholderCard
          variant="error"
          title={t("pending.caption.title")}
          body={t("pending.error.body")}
          className="md:col-span-2"
        />
      );
    }
    return (
      <CaptionDiagnosticsCard
        data={captionIntelData}
        semantic={captionSemantic}
        posts={posts}
      />
    );
  };

  const renderInsightsPending = (): ReactNode => {
    if (!showPaidPlaceholders) return null;
    if (result.enriched.aiInsightsV2 != null) return null;
    if (insightsState === "pending") {
      return (
        <EnrichmentPlaceholderCard
          variant="pending"
          title={t("pending.insights.title")}
          body={t("pending.insights.body")}
        />
      );
    }
    if (insightsState === "error") {
      return (
        <EnrichmentPlaceholderCard
          variant="error"
          title={t("pending.insights.title")}
          body={t("pending.error.body")}
        />
      );
    }
    return null;
  };

  // ── Commercial Pro report: render section 06 (Diagnóstico editorial) + 07 (Prioridades) ──
  if (!isLab) {
    const captionSemantic = parseCaptionSemanticAnalysis(payload);
    const captionEngagementStrategy =
      captionSemantic?.commentEngagement?.strategyLabel ?? null;
    const captionAsksForCommentsPct =
      captionSemantic?.commentEngagement?.asksForCommentsPct ?? null;
    const effectiveCommentIntel =
      features.commentIntelligence === "full"
        ? result.enriched.commentIntelligence
        : null;

    const withAnchor = (id: string, node: ReactNode | null): ReactNode | null =>
      node ? (
        <div key={id} id={id} className="scroll-mt-24">
          {node}
        </div>
      ) : null;

    const groupA = compact([
      withAnchor("diag-conteudo", renderContentTypeCard(contentType, t)),
      withAnchor("diag-funil", renderFunnelCard(funnel, t)),
    ]);
    const groupBHashtag = hashtags.available
      ? withAnchor(
          "diag-hashtags",
          <HashtagDiagnosticsCard
            key="q03"
            items={hashtags.items}
            postsAnalyzed={posts.length}
            posts={posts}
          />,
        )
      : null;
    const groupC = compact([
      withAnchor(
        "diag-audiencia",
        renderAudienceCard(
          audience,
          effectiveCommentIntel,
          captionEngagementStrategy,
          captionAsksForCommentsPct,
          t,
        ),
      ),
    ]);
    const groupD = compact([
      withAnchor("diag-integracao", renderIntegrationCard(integration, t)),
    ]);

    const hasAnyCard =
      groupA.length > 0 ||
      groupBHashtag !== null ||
      true /* caption + visual sempre renderizam com empty-state próprio */ ||
      groupC.length > 0 ||
      groupD.length > 0;

    return (
      <div className="space-y-12 md:space-y-14">
        <div id="diagnostico-editorial" className="scroll-mt-24 space-y-10 md:space-y-12">
          {hasAnyCard ? (
            <>
              {groupA.length > 0 ? (
                <ReportDiagnosticGroup
                  letter="A"
                  label={t("diagnostic_groups.A")}
                  questionsCount={groupA.length}
                >
                  {groupA}
                </ReportDiagnosticGroup>
              ) : null}

              <ReportDiagnosticGroup
                letter="B"
                label={t("diagnostic_groups.B")}
                questionsCount={(groupBHashtag ? 1 : 0) + 1}
                layout="stack"
              >
                {groupBHashtag}
                <div id="diag-legendas" className="scroll-mt-24">
                  {renderCaptionSlot(captionIntel, captionSemantic)}
                </div>
              </ReportDiagnosticGroup>

              <ReportDiagnosticGroup
                letter="E"
                label={t("diagnostic_groups.E")}
                questionsCount={1}
                layout="stack"
              >
                <div id="diag-capas" className="scroll-mt-24">
                  {renderCoverSlot()}
                </div>
              </ReportDiagnosticGroup>

              {groupC.length > 0 ? (
                <ReportDiagnosticGroup
                  letter="C"
                  label={t("diagnostic_groups.C")}
                  questionsCount={groupC.length}
                  layout="stack"
                >
                  {groupC}
                </ReportDiagnosticGroup>
              ) : null}

              {groupD.length > 0 ? (
                <ReportDiagnosticGroup
                  letter="D"
                  label={t("diagnostic_groups.D")}
                  questionsCount={groupD.length}
                  layout="stack"
                >
                  {groupD}
                </ReportDiagnosticGroup>
              ) : null}
            </>
          ) : (
            <p className="text-sm text-content-secondary leading-relaxed max-w-2xl">
              {t("diagnostic_groups.small_sample")}
            </p>
          )}
        </div>

        {renderInsightsPending() ? (
          <div className="scroll-mt-24">{renderInsightsPending()}</div>
        ) : null}

        {priorityItems.length > 0 && (
          <div id="prioridades" className="scroll-mt-24">
            <ReportDiagnosticPriorities
              items={priorityItems}
              source={prioritySource}
            />
          </div>
        )}
      </div>
    );
  }

  // Build cards as nullable list, then split into groups
  // A · Identidade editorial: Q01 + Q02
  const groupA = compact([
    renderContentTypeCard(contentType, t),
    renderFunnelCard(funnel, t),
  ]);
  // B · Como comunica: Q03 (hashtags) — Q04 (captions) rendered inside group
  const groupB = compact([
    hashtags.available ? (
      <HashtagDiagnosticsCard
        key="q03"
        items={hashtags.items}
        postsAnalyzed={posts.length}
        posts={posts}
      />
    ) : null,
  ]);
  // C · Resposta do público: Q05 (audience) — full width
  const captionSemantic = parseCaptionSemanticAnalysis(payload);
  const captionEngagementStrategy = captionSemantic?.commentEngagement?.strategyLabel ?? null;
  const captionAsksForCommentsPct = captionSemantic?.commentEngagement?.asksForCommentsPct ?? null;
  // In public_mvp, suppress detailed comment intelligence even if cached
  const effectiveCommentIntel =
    features.commentIntelligence === "full"
      ? result.enriched.commentIntelligence
      : null;
  const groupC = compact([
    renderAudienceCard(audience, effectiveCommentIntel, captionEngagementStrategy, captionAsksForCommentsPct, t),
  ]);
  // D · Contexto estratégico: Q06 + Q07
  const groupD = compact([
    renderIntegrationCard(integration, t),
  ]);

  const totalCards = groupA.length + groupB.length + 1 + groupC.length + groupD.length;

  return (
    <div className="space-y-10 md:space-y-12">
      {totalCards >= 4 ? (
        <>
          {groupA.length > 0 ? (
            <ReportDiagnosticGroup
              letter="A"
              label={t("diagnostic_groups.A")}
              questionsCount={groupA.length}
            >
              {groupA}
            </ReportDiagnosticGroup>
          ) : null}

          <ReportDiagnosticGroup
            letter="B"
            label={t("diagnostic_groups.B")}
            questionsCount={groupB.length + 1}
          >
            {groupB}
            {renderCaptionSlot(captionIntel, captionSemantic)}
          </ReportDiagnosticGroup>

          {/* E · Análise visual */}
          <ReportDiagnosticGroup
            letter="E"
            label={t("diagnostic_groups.E")}
            questionsCount={1}
          >
            {renderCoverSlot()}
          </ReportDiagnosticGroup>

          {groupC.length > 0 ? (
            <ReportDiagnosticGroup
              letter="C"
              label={t("diagnostic_groups.C")}
              questionsCount={groupC.length}
            >
              {groupC}
            </ReportDiagnosticGroup>
          ) : null}

          {groupD.length > 0 ? (
            <ReportDiagnosticGroup
              letter="D"
              label={t("diagnostic_groups.D")}
              questionsCount={groupD.length}
            >
              {groupD}
            </ReportDiagnosticGroup>
          ) : null}

          {/* Prioridades de ação (AI ou determinísticas) */}
          {renderInsightsPending()}
          {priorityItems.length > 0 && (
            <div id="prioridades" className="scroll-mt-24">
              <ReportDiagnosticPriorities
                items={priorityItems}
                source={prioritySource}
              />
            </div>
          )}
        </>
      ) : (
        <p className="text-sm text-content-secondary leading-relaxed max-w-2xl">
          {t("diagnostic_groups.small_sample")}
        </p>
      )}

    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────

function compact<T>(arr: Array<T | null>): T[] {
  return arr.filter((x): x is T => x !== null);
}

// ─────────────────────────────────────────────────────────────────────
// Card builders
// ─────────────────────────────────────────────────────────────────────


type TR = TFunction<"report", undefined>;

function renderContentTypeCard(r: ContentTypeResult, t: TR): ReactNode | null {
  if (!r.available) return null;
  if (r.label === "Misto / pouco claro" || !r.label) {
    const top = r.distribution[0];
    const hasStrongTop = !!top && top.sharePct >= 35;
    const body = hasStrongTop && top
      ? t("diagnostic_questions.content_type.body_strong_signal", { label: top.label.toLowerCase(), share: top.sharePct })
      : t("diagnostic_questions.content_type.body_no_dominant");
    return (
      <ReportDiagnosticCard
        key="q01"
        number="01"
        label={t("diagnostic_questions.content_type.label")}
        question={t("diagnostic_questions.content_type.question")}
        answer={t("diagnostic_questions.content_type.answer_mixed")}
        tone="slate"
        span="half"
        body={body}
      >
        {r.distribution.length >= 2 && (
          <DiagnosticDistributionBar
            variant="vertical-list"
            items={r.distribution.map((d, i) => ({
              label: d.label,
              value: d.sharePct,
              color:
                i === 0
                  ? "bg-content-tertiary"
                  : i === 1
                    ? "bg-content-tertiary/60"
                    : "bg-content-tertiary/30",
            }))}
          />
        )}
      </ReportDiagnosticCard>
    );
  }
  const colorByIndex = (i: number) =>
    i === 0 ? "bg-accent-primary" : i === 1 ? "bg-accent-primary/50" : "bg-content-tertiary/30";
  return (
    <ReportDiagnosticCard
      key="q01"
      number="01"
      label={t("diagnostic_questions.content_type.label")}
      question={t("diagnostic_questions.content_type.question")}
      answer={r.label}
      tone="blue"
        span="half"
      body={t("diagnostic_questions.content_type.body_with_label", {
        share: r.sharePct,
        sample: r.sampleSize,
        label: r.label.toLowerCase(),
      })}
    >
      {r.distribution.length >= 2 && (
        <DiagnosticDistributionBar
          variant="vertical-list"
          items={r.distribution.map((d, i) => ({
            label: d.label,
            sublabel: t(`diagnostic_questions.content_type.sublabels.${d.label}`, { defaultValue: "" }) || undefined,
            value: d.sharePct,
            color: colorByIndex(i),
          }))}
        />
      )}
    </ReportDiagnosticCard>
  );
}

function renderFunnelCard(r: FunnelStageResult, t: TR): ReactNode | null {
  if (!r.available) return null;
  const isFocused = r.label !== "Comunicação dispersa";
  const stageKeyByLabel: Record<string, "topo" | "meio" | "fundo" | "pos" | null> = {
    "Topo do funil": "topo",
    "Meio do funil": "meio",
    "Fundo do funil": "fundo",
    "Pós-venda / fidelização": "pos",
    "Comunicação dispersa": null,
  };
  const dominantStage = stageKeyByLabel[r.label ?? "Comunicação dispersa"] ?? null;
  const bodyKey = r.label ?? "Comunicação dispersa";
  const bodyText = `${t("diagnostic_questions.funnel.body_lead")} ${t(`diagnostic_questions.funnel.bodies.${bodyKey}`)}`;
  const stageLabelKey = (s: string) => `diagnostic_questions.funnel.stage_labels.${s}`;
  return (
    <ReportDiagnosticCard
      key="q02"
      number="02"
      label={t("diagnostic_questions.funnel.label")}
      question={t("diagnostic_questions.funnel.question")}
      answer={r.label ? t(stageLabelKey(r.label), { defaultValue: r.label }) : "—"}
      tone={isFocused ? "emerald" : "amber"}
      body={bodyText}
    >
      <div className="flex flex-col gap-4">
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
        {!isFocused && (
          <InsightCallout tone="warning" label={t("diagnostic_questions.funnel.callout_label")}>
            {t("diagnostic_questions.funnel.callout_body")}
          </InsightCallout>
        )}
      </div>
    </ReportDiagnosticCard>
  );
}

function renderAudienceCard(
  r: AudienceResponseResult,
  commentIntel: CommentIntelligence | null,
  captionEngagementStrategy?: "active" | "occasional" | "passive" | null,
  captionAsksForCommentsPct?: number | null,
  t?: TR,
): ReactNode | null {
  const tr = t as TR;
  // — State B: data unavailable —
  if (!r.available) {
    return (
      <ReportDiagnosticCard
        key="q05"
        number="05"
        label={tr("diagnostic_questions.audience.label")}
        question={tr("diagnostic_questions.audience.question")}
        answer={r.label}
        tone="slate"
        span="full"
        body={r.explanation}
        sourceType="auto"
      >
        <div className="rounded-md border border-dashed border-border-default bg-surface-muted px-3 py-3">
          <p className="text-[12.5px] text-content-secondary leading-relaxed">
            {tr("diagnostic_questions.audience.empty_help")}
          </p>
        </div>
        <CommentIntelligenceUnavailable data={commentIntel} />
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

  return (
    <ReportDiagnosticCard
      key="q05"
      number="05"
      label={tr("diagnostic_questions.audience.label")}
      question={tr("diagnostic_questions.audience.question")}
      answer={r.label}
      tone={tone}
      span="full"
      body={r.explanation}
      sourceType="auto"
      sourceDetail={tr("diagnostic_questions.audience.source_detail")}
    >
      <DiagnosticAudienceHighlight
        avgLikes={r.avgLikes}
        avgComments={r.avgComments}
        commentsToLikesPct={r.commentsToLikesPct}
        sampleSize={r.sampleSize}
        totalLikes={r.totals.likes}
        totalComments={r.totals.comments}
        postsWithComments={r.totals.postsWithComments}
        topConversationPost={r.topConversationPost}
        topCommentPosts={r.topCommentPosts}
        status={r.status}
        commentIntel={commentIntel?.available ? commentIntel : null}
        captionEngagementStrategy={captionEngagementStrategy}
        captionAsksForCommentsPct={captionAsksForCommentsPct}
      />
      {!commentIntel?.available && (
        <CommentIntelligenceUnavailable data={commentIntel} />
      )}
    </ReportDiagnosticCard>
  );
}

function renderIntegrationCard(r: IntegrationResult, t: TR): ReactNode | null {
  if (!r.available || r.label === "Sem sinais suficientes") return null;
  const tone: DiagnosticTone =
    r.label === "Integração clara"
      ? "emerald"
      : r.label === "Integração parcial"
        ? "blue"
        : "amber";
  const body = t(`diagnostic_questions.integration.bodies.${r.label}`, {
    defaultValue: t("diagnostic_questions.integration.body_default"),
  });
  const integrationLabel = t(`diagnostic_questions.integration.labels.${r.label}`, { defaultValue: r.label });
  return (
    <ReportDiagnosticCard
      key="q06"
      number="06"
      label={t("diagnostic_questions.integration.label")}
      question={t("diagnostic_questions.integration.question")}
      answer={integrationLabel}
      tone={tone}
      span="full"
      body={body}
      sourceDetail={t("diagnostic_questions.integration.source_detail")}
    >
      <DiagnosticChecklist
        items={[
          {
            label: r.signals.bioLink.value
              ? t("diagnostic_questions.integration.signals.bio_with_url", { url: shortenUrl(r.signals.bioLink.value) })
              : t("diagnostic_questions.integration.signals.bio_without_url"),
            status: r.signals.bioLink.detected ? "detected" : "missing",
          },
          {
            label: t("diagnostic_questions.integration.signals.mentions"),
            status: r.signals.siteOrNewsletter.detected
              ? "detected"
              : "missing",
            hint:
              r.signals.siteOrNewsletter.count > 0
                ? t("diagnostic_questions.integration.signals.mentions_hint", { count: r.signals.siteOrNewsletter.count })
                : undefined,
          },
          {
            label: t("diagnostic_questions.integration.signals.cta"),
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

function shortenUrl(url: string): string {
  return url.replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/\/$/, "");
}
