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
  inferThemesFromCaptions,
  inferProbableObjective,
  derivePriorities,
  type ContentTypeResult,
  type FunnelStageResult,
  type CaptionPatternResult,
  type AudienceResponseResult,
  type IntegrationResult,
  type ObjectiveResult,
  type HashtagsResult,
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
import { ReportThemesFeature } from "./report-themes-feature";

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
  const bio = result.enriched.profile.bio ?? null;
  const externalUrls = result.enriched.profile.externalUrls ?? [];

  const contentType = classifyContentType(posts);
  const funnel = classifyFunnelStage(posts);
  const caption = classifyCaptionPattern(posts);
  const audience = classifyAudienceResponse(posts);
  const hashtags = classifyHashtags(topHashtags);
  const themes = inferThemesFromCaptions({
    topKeywords,
    aiSections: result.enriched.aiInsightsV2?.sections ?? null,
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
  const aiLanguage =
    aiLanguageText && aiLanguageText.trim().length > 0
      ? { kind: "interpretation" as const, text: aiLanguageText.trim() }
      : null;

  // Build cards as nullable list, then split into groups
  const groupA = compact([
    renderContentTypeCard(contentType),
    renderFunnelCard(funnel),
  ]);
  const groupB = compact([
    renderHashtagsCard(hashtags),
    renderCaptionCard(caption, aiLanguage),
    renderAudienceCard(audience),
  ]);
  const groupC = compact([
    renderIntegrationCard(integration),
    renderObjectiveCard(objective),
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

          {themes.available ? (
            <ReportThemesFeature themes={themes} />
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
            : priorities
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
        label="Tipo de conteúdo"
        question="Que natureza de conteúdo aparece mais?"
        answer="Padrão misto"
        tone="slate"
        body={body}
        sourceType="automatic"
        sourceDetail="Legendas"
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
      sourceType="automatic"
      sourceDetail="Legendas"
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
      sourceType="automatic"
      sourceDetail="Legendas"
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
      sourceType="extracted"
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

function renderThemesCard(r: ThemesResult): ReactNode | null {
  if (!r.available) return null;
  // Só consideramos "leitura IA" quando temos efectivamente texto da IA
  // para mostrar — caso contrário cai para leitura automática (keyword
  // recurrence) e o chip reflecte isso, evitando "LEITURA IA" sem bloco
  // interpretativo abaixo.
  const hasAiText = !!(r.aiText && r.aiText.trim().length >= 20);
  const isAi = r.source === "ai" && hasAiText;
  const body = isAi
    ? "Esta leitura resume os assuntos recorrentes nas legendas, com base na interpretação editorial gerada pela IA."
    : "Esta leitura resume os assuntos mais frequentes nas legendas analisadas — não as hashtags utilizadas.";
  return (
    <ReportDiagnosticCard
      key="q04"
      number="04"
      label="Temas"
      question="Sobre que assuntos o perfil fala mais?"
      answerLabel="Temas dominantes"
      answer={r.headline}
      tone="blue"
      body={body}
      sourceType={isAi ? "ai" : "automatic"}
      sourceDetail="Assuntos das legendas"
      aiSource={
        isAi && r.aiText
          ? { kind: "interpretation", text: r.aiText }
          : null
      }
    >
      {!isAi && r.items.length > 0 ? (
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
      ) : null}
    </ReportDiagnosticCard>
  );
}

function renderCaptionCard(
  r: CaptionPatternResult,
  aiSource: { kind: "interpretation"; text: string } | null,
): ReactNode | null {
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
      aiSource={aiSource}
      sourceType={aiSource ? "ai" : "automatic"}
      sourceDetail="Estilo das legendas"
    >
      <DiagnosticMiniStats
        items={
          r.questionShareAvailable
            ? [
                { value: String(r.avgLength), label: "CARACTERES MÉDIOS" },
                { value: `${r.questionSharePct}%`, label: "COM PERGUNTAS" },
                { value: `${r.ctaSharePct}%`, label: "COM CTA" },
              ]
            : [
                { value: String(r.avgLength), label: "CARACTERES MÉDIOS" },
                { value: `${r.ctaSharePct}%`, label: "COM CTA" },
              ]
        }
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
      sourceType="calculation"
      sourceDetail="Gostos + comentários"
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
      sourceType="automatic"
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
      body="Hipótese derivada dos sinais de conteúdo, funil, bio e ligação entre canais. Não substitui o objetivo real da marca ou do criador — deve ser confirmada por quem comunica."
      sourceType="automatic"
      sourceDetail="Conteúdo + funil + bio"
    >
      <DiagnosticRanking items={r.ranking} valuePosition="left" />
    </ReportDiagnosticCard>
  );
}

function shortenUrl(url: string): string {
  return url.replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/\/$/, "");
}