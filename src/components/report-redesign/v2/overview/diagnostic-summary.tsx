/**
 * 3 diagnostic summary cards for the overview block.
 * Shows: Content Type, Funnel Role, Profile Objective.
 * Reuses classifiers from block02-diagnostic.
 */

import { useMemo } from "react";
import { Sparkles, Layers, Compass } from "lucide-react";

import { cn } from "@/lib/utils";
import type {
  AdapterResult,
  SnapshotPayload,
} from "@/lib/report/snapshot-to-report-data";
import {
  classifyContentType,
  classifyFunnelStage,
  classifyAudienceResponse,
  classifyChannelIntegration,
  inferProbableObjective,
  type ContentTypeResult,
  type FunnelStageResult,
  type ObjectiveResult,
} from "@/lib/report/block02-diagnostic";

interface Props {
  result: AdapterResult;
  payload?: SnapshotPayload;
}

/* ── Headline humanization lookups ─────────────────────────────────── */

const CONTENT_HEADLINE: Record<string, string> = {
  "Misto / pouco claro": "Conteúdo variado",
};

const FUNNEL_HEADLINE: Record<string, string> = {
  "Topo do funil": "Atrai mais do que converte",
  "Meio do funil": "Educa antes de vender",
  "Fundo do funil": "Foco na conversão",
  "Pós-venda / fidelização": "Relação com a comunidade",
  "Comunicação dispersa": "Sem direção clara",
};

/* ── Card builder types ────────────────────────────────────────────── */

interface SummaryCard {
  label: string;
  headline: string;
  subtitle: string;
  icon: typeof Sparkles;
  tone: "blue" | "emerald" | "violet";
}

const TONE_CLASSES = {
  blue: { wrap: "bg-blue-50 ring-1 ring-blue-100", icon: "text-blue-600" },
  emerald: { wrap: "bg-emerald-50 ring-1 ring-emerald-100", icon: "text-emerald-600" },
  violet: { wrap: "bg-violet-50 ring-1 ring-violet-100", icon: "text-violet-600" },
} as const;

function buildContentCard(r: ContentTypeResult): SummaryCard {
  const raw = r.label ?? "Misto / pouco claro";
  const headline = CONTENT_HEADLINE[raw] ?? raw;
  const top = r.distribution[0];
  let subtitle: string;
  if (!r.available || !top) {
    subtitle = "Dados insuficientes";
  } else if (raw === "Misto / pouco claro" && top) {
    subtitle = `${top.label} lidera, mas só com ${top.sharePct}%`;
  } else {
    subtitle = `${r.sharePct}% ${raw.toLowerCase()}`;
  }
  return { label: "Tipo de conteúdo", headline, subtitle, icon: Sparkles, tone: "blue" };
}

function buildFunnelCard(r: FunnelStageResult): SummaryCard {
  const raw = r.label ?? "Comunicação dispersa";
  const headline = FUNNEL_HEADLINE[raw] ?? raw;
  const topoItem = r.breakdown.find((b) => b.stage === "topo");
  let subtitle: string;
  if (!r.available) {
    subtitle = "Dados insuficientes";
  } else if (raw === "Topo do funil" && topoItem) {
    subtitle = `${topoItem.sharePct}% dos posts geram descoberta`;
  } else {
    subtitle = `${r.sharePct}% na fase dominante`;
  }
  return { label: "Papel do conteúdo", headline, subtitle, icon: Layers, tone: "emerald" };
}

function buildObjectiveCard(r: ObjectiveResult): SummaryCard {
  const primary = r.primary ?? "Sem sinal claro";
  const headline = primary.includes("·") ? primary.split("·")[0].trim() : primary;
  const detail = primary.includes("·") ? primary.split("·")[1].trim() : null;
  const confLabel = r.confidence === "med" ? "70%" : "< 50%";
  const subtitle = r.available
    ? detail
      ? `${detail.charAt(0).toUpperCase() + detail.slice(1)} · ${confLabel}`
      : confLabel
    : "Dados insuficientes";
  return { label: "Objetivo deste perfil", headline, subtitle, icon: Compass, tone: "violet" };
}

/* ── Component ─────────────────────────────────────────────────────── */

export function OverviewDiagnosticSummary({ result, payload }: Props) {
  const posts = payload?.posts ?? [];
  const bio = result.enriched.profile.bio ?? null;
  const externalUrls = result.enriched.profile.externalUrls ?? [];

  const cards = useMemo(() => {
    const contentType = classifyContentType(posts);
    const funnel = classifyFunnelStage(posts);
    const audience = classifyAudienceResponse(posts);
    const integration = classifyChannelIntegration(bio, externalUrls, posts);
    const objective = inferProbableObjective({
      contentType,
      funnel,
      integration,
      bio,
      audience,
    });

    return [
      buildContentCard(contentType),
      buildFunnelCard(funnel),
      buildObjectiveCard(objective),
    ];
  }, [posts, bio, externalUrls]);

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 sm:gap-5">
      {cards.map((c) => {
        const t = TONE_CLASSES[c.tone];
        const Icon = c.icon;
        return (
          <article
            key={c.label}
            aria-label={`${c.label}: ${c.headline}. ${c.subtitle}.`}
            className={cn(
              "flex flex-col gap-2.5",
              "rounded-2xl border border-border-default bg-surface-secondary",
              "p-4 sm:p-5",
              "shadow-[0_1px_3px_rgba(15,23,42,0.04),0_4px_12px_-4px_rgba(15,23,42,0.06)]",
            )}
          >
            <span
              aria-hidden="true"
              className={cn(
                "inline-flex size-9 items-center justify-center rounded-full shrink-0",
                t.wrap,
              )}
            >
              <Icon className={cn("size-4", t.icon)} />
            </span>

            <p className="text-eyebrow-sm text-content-secondary">
              {c.label}
            </p>

            <h3 className="font-display text-[0.95rem] sm:text-base font-semibold leading-snug tracking-tight text-content-primary">
              {c.headline}
            </h3>

            <p className="text-xs leading-relaxed text-content-secondary">
              {c.subtitle}
            </p>
          </article>
        );
      })}
    </div>
  );
}
