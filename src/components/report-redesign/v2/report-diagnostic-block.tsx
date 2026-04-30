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
  inferThemes,
  inferProbableObjective,
  derivePriorities,
  type ContentTypeResult,
  type FunnelStageResult,
  type CaptionPatternResult,
  type AudienceResponseResult,
  type IntegrationResult,
  type ObjectiveResult,
  type ThemesResult,
} from "@/lib/report/block02-diagnostic";

import { ReportDiagnosticVerdict } from "./report-diagnostic-verdict";
import { ReportDiagnosticGroup } from "./report-diagnostic-group";
import {
  ReportDiagnosticCard,
  DiagnosticDistributionBar,
  DiagnosticMiniStats,
  DiagnosticChecklist,
  DiagnosticRanking,
  DiagnosticFunnelStack,
  DiagnosticAudienceHighlight,
  type DiagnosticTone,
} from "./report-diagnostic-card";
import { ReportDiagnosticPriorities } from "./report-diagnostic-priorities";
import { ReportDiagnosticCta } from "./report-diagnostic-cta";

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
  const formatBreakdown = result.data.formatBreakdown ?? [];
  const topHashtags = result.data.topHashtags ?? [];
  const topKeywords = result.data.topKeywords ?? [];
  const bio = result.enriched.profile.bio ?? null;

  const contentType = classifyContentType(posts);
  const funnel = classifyFunnelStage(posts);
  const caption = classifyCaptionPattern(posts);
  const audience = classifyAudienceResponse(posts);
  const themes = inferThemes(topHashtags, topKeywords);
  const integration = classifyChannelIntegration(bio, posts);
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

  // Build cards as nullable list, then split into groups
  const groupA = compact([
    renderContentTypeCard(contentType),
    renderFunnelCard(funnel),
  ]);
  const groupB = compact([
    renderFormatCard(km, formatBreakdown),
    renderThemesCard(themes),
    renderCaptionCard(caption),
    renderAudienceCard(audience),
  ]);
  const groupC = compact([
    renderIntegrationCard(integration),
    renderObjectiveCard(objective),
  ]);

  const totalCards = groupA.length + groupB.length + groupC.length;

  return (
    <div className="space-y-8 md:space-y-10">
      <ReportDiagnosticVerdict text={verdictText} />

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
          atividade, este bloco passa a abrir oito perguntas de leitura.
        </p>
      )}

      <ReportDiagnosticPriorities items={priorities} />

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

function humanFormat(raw: string | null): string {
  if (!raw) return "—";
  const map: Record<string, string> = {
    Reels: "Reels",
    Reel: "Reels",
    Carousels: "Carrosséis",
    Carrosseis: "Carrosséis",
    Carrosséis: "Carrosséis",
    Carousel: "Carrosséis",
    Imagens: "Imagens",
    Image: "Imagens",
    Photo: "Imagens",
    Photos: "Imagens",
    Video: "Vídeo",
  };
  return map[raw] ?? raw;
}

// ─────────────────────────────────────────────────────────────────────
// Card builders
// ─────────────────────────────────────────────────────────────────────

function renderContentTypeCard(r: ContentTypeResult): ReactNode | null {
  if (!r.available) return null;
  if (r.label === "Misto / pouco claro" || !r.label) {
    return (
      <ReportDiagnosticCard
        key="q01"
        number="01"
        label="Tipo de conteúdo"
        question="Que natureza de conteúdo aparece mais?"
        answer="Padrão misto"
        tone="slate"
        body="Nenhuma natureza domina claramente — a comunicação alterna entre vários registos sem foco editorial visível."
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
      label="Tipo de conteúdo"
      question="Que natureza de conteúdo aparece mais?"
      answer={r.label}
      tone="emerald"
      body={`Cerca de ${r.sharePct} % das ${r.sampleSize} publicações analisadas têm uma assinatura ${r.label.toLowerCase()}, com base em legendas e hashtags.`}
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
      label="Funil"
      question="Atrai, educa, converte ou fideliza?"
      answerLabel="Fase dominante"
      answer={r.label ?? "—"}
      tone={isFocused ? "blue" : "amber"}
      body={bodyByLabel[r.label ?? "Comunicação dispersa"]}
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

function renderFormatCard(
  km: AdapterResult["data"]["keyMetrics"],
  breakdown: AdapterResult["data"]["formatBreakdown"],
): ReactNode | null {
  if (!km.dominantFormat || !breakdown || breakdown.length === 0) return null;
  const share = km.dominantFormatShare ?? 0;
  const label = humanFormat(km.dominantFormat);
  const high = share >= 60;
  const items = breakdown.map((b, i) => ({
    label: humanFormat(b.format),
    value: b.sharePct,
    color:
      i === 0
        ? "bg-blue-600"
        : i === 1
          ? "bg-blue-300"
          : "bg-slate-300",
  }));
  return (
    <ReportDiagnosticCard
      key="q03"
      number="03"
      label="Formatos"
      question="Que formato domina a presença?"
      answer={`${label} · ${Math.round(share)}% da amostra`}
      tone={high ? "amber" : "blue"}
      body={
        high
          ? `A presença concentra-se em ${label.toLowerCase()}. Diversificar pode equilibrar alcance e conversa, especialmente em formatos sub-explorados.`
          : `${label} é o formato mais usado, sem chegar a uma dependência clara — há uma mistura saudável de tipos de publicação.`
      }
    >
      <DiagnosticDistributionBar items={items} valueFormat="percent" />
    </ReportDiagnosticCard>
  );
}

function renderThemesCard(r: ThemesResult): ReactNode | null {
  if (!r.available) return null;
  // Resposta dominante: título editorial curto (sem listar hashtags — essas
  // aparecem só uma vez no slot de evidência abaixo).
  const headline = inferThemesHeadline(r);
  return (
    <ReportDiagnosticCard
      key="q04"
      number="04"
      label="Temas"
      question="Sobre que temas o perfil fala mais?"
      answerLabel="Foco temático"
      answer={headline}
      tone="blue"
      body="Estes temas voltam com frequência ao longo da amostra e descrevem o território editorial mais consistente do perfil."
    >
      <ul className="space-y-1.5">
        {r.items.map((it) => {
          const max = Math.max(1, ...r.items.map((x) => x.weight));
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

function inferThemesHeadline(r: ThemesResult): string {
  const top = r.items[0];
  if (!top) return r.label;
  // Tira "#" e devolve a palavra principal capitalizada.
  const raw = top.text.replace(/^#/, "");
  // Casos especiais simples
  const lower = raw.toLowerCase();
  if (lower === "ia" || lower === "ai") return "Foco claro em IA";
  if (lower.includes("inteligenciaartificial")) return "Foco claro em IA";
  if (lower.includes("marketingdigital")) return "Foco em marketing digital";
  // Fallback genérico: "Foco em <tema>"
  return `Foco em ${raw}`;
}

function renderCaptionCard(r: CaptionPatternResult): ReactNode | null {
  if (!r.available) return null;
  const ctaLabel =
    r.ctaSharePct === 0
      ? "Poucos sinais explícitos de chamada à ação foram detetados."
      : r.ctaSharePct < 20
        ? "Poucas publicações terminam com chamada à ação clara."
        : r.ctaSharePct < 50
          ? "Algumas publicações incluem chamada à ação direta."
          : "A maioria das publicações termina com chamada à ação clara.";
  return (
    <ReportDiagnosticCard
      key="q05"
      number="05"
      label="Linguagem"
      question="Como são as legendas?"
      answerLabel="Padrão dominante"
      answer={r.label}
      tone="blue"
      body={ctaLabel + " O texto explica o conteúdo, mas a forma como convida o leitor a responder define a conversa pública."}
    >
      <DiagnosticMiniStats
        items={[
          { value: String(r.avgLength), label: "CARACTERES MÉDIOS" },
          { value: `${r.questionSharePct}%`, label: "COM PERGUNTAS" },
          { value: `${r.ctaSharePct}%`, label: "COM CTA" },
        ]}
      />
    </ReportDiagnosticCard>
  );
}

function renderAudienceCard(r: AudienceResponseResult): ReactNode | null {
  if (!r.available) return null;
  const tone: DiagnosticTone =
    r.label === "Audiência ativa"
      ? "emerald"
      : r.label === "Audiência silenciosa"
        ? "rose"
        : "blue";
  const bodyByLabel: Record<string, string> = {
    "Audiência ativa":
      "Os comentários surgem de forma consistente face aos likes — sinal de conversa, não apenas consumo.",
    "Resposta moderada":
      "Os comentários aparecem, mas em volume moderado face aos likes recebidos.",
    "Audiência silenciosa":
      "Comunicação unidirecional: o público vê o conteúdo, mas conversa pouco em público.",
  };
  // Reconstroi avgLikes a partir do ratio: ratioPct = comments/likes * 100
  // → likes ≈ comments / (ratio/100). Quando ratioPct = 0 fallback = 0.
  const avgLikes =
    r.commentsToLikesPct > 0
      ? Math.round((r.avgComments / r.commentsToLikesPct) * 100)
      : 0;
  const highlightTone =
    r.label === "Audiência ativa"
      ? "emerald"
      : r.label === "Resposta moderada"
        ? "amber"
        : "rose";
  return (
    <ReportDiagnosticCard
      key="q06"
      number="06"
      label="Resposta"
      question="O público responde ou só consome?"
      answer={r.label}
      tone={tone}
      body={bodyByLabel[r.label]}
    >
      <DiagnosticAudienceHighlight
        avgLikes={avgLikes}
        avgComments={r.avgComments}
        tone={highlightTone}
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
      key="q07"
      number="07"
      label="Integração"
      question="Há ligação entre canais?"
      answerLabel="Estado"
      answer={r.label}
      tone={tone}
      body="Há infraestrutura cross-canal quando a bio aponta para fora e as captions reforçam a saída do Instagram. Sem isso, a audiência fica presa à plataforma."
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

function renderObjectiveCard(r: ObjectiveResult): ReportDiagnosticCardChild {
  if (!r.available || !r.primary) return null;
  return (
    <ReportDiagnosticCard
      key="q08"
      number="08"
      label="Objetivo"
      question="Que objetivo provável serve?"
      answerLabel={
        r.confidence === "med" ? "Hipótese principal" : "Hipótese (sinal parcial)"
      }
      answer={r.primary}
      tone="blue"
      body="Inferência por padrão de conteúdo + funil + bio + ligação entre canais. É uma hipótese de leitura — confirme com o contexto real do perfil."
    >
      <DiagnosticRanking items={r.ranking} valuePosition="left" />
    </ReportDiagnosticCard>
  );
}

function shortenUrl(url: string): string {
  return url.replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/\/$/, "");
}