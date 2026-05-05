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
  type ContentTypeResult,
  type FunnelStageResult,
  type AudienceResponseResult, 
  type IntegrationResult,
} from "@/lib/report/block02-diagnostic";

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
import { HashtagDiagnosticsCard } from "./hashtag-diagnostics-card";
import {
  CommentIntelligenceUnavailable,
} from "./report-comment-intelligence";
import type { CommentIntelligence } from "@/lib/analysis/types";
import { VisualCoverAnalysisCard } from "./visual-cover-analysis-card";

interface Props {
  result: AdapterResult;
  payload?: SnapshotPayload;
}

/**
 * Bloco 02 · Diagnóstico Editorial — orquestrador.
 *
 * Compõe veredicto → 3 grupos de perguntas → prioridades de ação → CTA.
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

  const aiLanguageText =
    result.enriched.aiInsightsV2?.sections.language?.text ?? null;

  // Build cards as nullable list, then split into groups
  // A · Identidade editorial: Q01 + Q02
  const groupA = compact([
    renderContentTypeCard(contentType),
    renderFunnelCard(funnel),
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
  const groupC = compact([
    renderAudienceCard(audience, result.enriched.commentIntelligence),
  ]);
  // D · Contexto estratégico: Q06 + Q07
  const groupD = compact([
    renderIntegrationCard(integration),
  ]);

  const totalCards = groupA.length + groupB.length + 1 + groupC.length + groupD.length;

  return (
    <div className="space-y-10 md:space-y-12">
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

          <ReportDiagnosticGroup
            letter="B"
            label="Como comunica"
            questionsCount={groupB.length + 1}
          >
            {groupB}
            <CaptionDiagnosticsCard data={captionIntel} />
          </ReportDiagnosticGroup>

          {/* E · Análise visual */}
          <ReportDiagnosticGroup
            letter="E"
            label="Análise visual"
            questionsCount={1}
          >
            <VisualCoverAnalysisCard
              posts={posts}
              analysis={null}
            />
          </ReportDiagnosticGroup>

          {groupC.length > 0 ? (
            <ReportDiagnosticGroup
              letter="C"
              label="Resposta do público"
              questionsCount={groupC.length}
            >
              {groupC}
            </ReportDiagnosticGroup>
          ) : null}

          {groupD.length > 0 ? (
            <ReportDiagnosticGroup
              letter="D"
              label="Contexto estratégico"
              questionsCount={groupD.length}
            >
              {groupD}
            </ReportDiagnosticGroup>
          ) : null}
        </>
      ) : (
        <p className="text-sm text-content-secondary leading-relaxed max-w-2xl">
          A amostra de publicações é demasiado pequena para sustentar um
          diagnóstico editorial detalhado. À medida que houver mais
          atividade, este bloco passa a abrir até oito perguntas de leitura.
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


const CONTENT_TYPE_SUBLABELS: Record<string, string> = {
  Institucional: "quem somos, missão, valores, bastidores",
  Promocional: "campanhas, descontos, lançamentos",
  Educativo: "dicas, tutoriais, explicações",
  Inspiracional: "frases, histórias, motivação",
  Entretenimento: "memes, trends, desafios",
  "Prova social": "clientes, reviews, testemunhos",
};

function renderContentTypeCard(r: ContentTypeResult): ReactNode | null {
  if (!r.available) return null;
  if (r.label === "Misto / pouco claro" || !r.label) {
    // Quando há um top com share relevante mas sem distância suficiente para
    // dominar (regra share≥35% AND top≥1.5×second), o veredicto honesto é:
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
      label="Tipo de conteúdo · Classificação"
      question="Que natureza de conteúdo aparece mais?"
      answer={r.label}
      tone="blue"
        span="half"
      body={`Classificação do tipo de conteúdo publicado nas legendas e padrões editoriais. Cerca de ${r.sharePct} % das ${r.sampleSize} publicações analisadas têm uma assinatura ${r.label.toLowerCase()}.`}
    >
      {r.distribution.length >= 2 && (
        <DiagnosticDistributionBar
          variant="vertical-list"
          items={r.distribution.map((d, i) => ({
            label: d.label,
            sublabel: CONTENT_TYPE_SUBLABELS[d.label],
            value: d.sharePct,
            color: colorByIndex(i),
          }))}
        />
      )}
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
      tone={isFocused ? "emerald" : "amber"}
      body={`Mapeamento da função do conteúdo na jornada — atenção, educação, decisão ou relação. ${bodyByLabel[r.label ?? "Comunicação dispersa"]}`}
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
          <InsightCallout tone="warning" label="O que isto sugere">
            Sem uma fase dominante, o conteúdo pode não estar a conduzir a audiência
            numa direção clara. Definir uma intenção por bloco de publicações pode
            melhorar a coerência editorial.
          </InsightCallout>
        )}
      </div>
    </ReportDiagnosticCard>
  );
}

function renderAudienceCard(
  r: AudienceResponseResult,
  commentIntel: CommentIntelligence | null,
): ReactNode | null {
  // — State B: data unavailable —
  if (!r.available) {
    return (
      <ReportDiagnosticCard
        key="q05"
        number="05"
        label="Conversa"
        question="O público responde ou só consome?"
        answer={r.label}
        tone="slate"
        span="full"
        body={r.explanation}
        sourceType="auto"
      >
        <div className="rounded-md border border-dashed border-border-default bg-surface-muted px-3 py-3">
          <p className="text-[12.5px] text-content-secondary leading-relaxed">
            Quando estes dados estiverem disponíveis, o relatório compara
            reação, conversa e concentração de comentários.
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
      label="Conversa"
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
        sampleSize={r.sampleSize}
        totalLikes={r.totals.likes}
        totalComments={r.totals.comments}
        postsWithComments={r.totals.postsWithComments}
        topConversationPost={r.topConversationPost}
        status={r.status}
        commentIntel={commentIntel?.available ? commentIntel : null}
      />
      {!commentIntel?.available && (
        <CommentIntelligenceUnavailable data={commentIntel} />
      )}
    </ReportDiagnosticCard>
  );
}

function renderIntegrationCard(r: IntegrationResult): ReactNode | null {
  if (!r.available || r.label === "Sem sinais suficientes") return null;
  const tone: DiagnosticTone =
    r.label === "Integração clara"
      ? "emerald"
      : r.label === "Integração parcial"
        ? "blue"
        : "amber";
  const bodyByLabel: Record<string, string> = {
    "Integração clara": "Existe infraestrutura de saída do Instagram.",
    "Integração parcial": "Há sinais parciais de saída do Instagram.",
    "Sem integração": "Sem infraestrutura de saída do Instagram.",
  };
  return (
    <ReportDiagnosticCard
      key="q06"
      number="06"
      label="Integração"
      question="Há ligação entre canais?"
      answer={r.label}
      tone={tone}
      body={bodyByLabel[r.label] ?? "Avaliação da ligação entre Instagram e canais externos."}
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

function shortenUrl(url: string): string {
  return url.replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/\/$/, "");
}
