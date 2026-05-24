import { Sparkles, Layers, MessageCircle, Compass } from "lucide-react";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";

import { cn } from "@/lib/utils";
import type {
  ContentTypeResult,
  FunnelStageResult,
  AudienceResponseResult,
  ObjectiveResult,
} from "@/lib/report/block02-diagnostic";

interface Props {
  contentType: ContentTypeResult;
  funnel: FunnelStageResult;
  audience: AudienceResponseResult;
  objective: ObjectiveResult;
}

/* Headline lookup helper: resolves i18n key by raw PT key, falls back to raw */
const tHeadline = (t: TFunction, ns: string, raw: string) => {
  const key = `diagnostic.summary.${ns}.headlines.${raw}`;
  const translated = t(key);
  return translated === key ? raw : translated;
};

/* ── Tone map (pastel icon circles) ────────────────────────────────── */

type CardTone = "blue" | "emerald" | "rose" | "violet";

const TONE_CLASSES: Record<CardTone, { wrap: string; icon: string }> = {
  blue: {
    wrap: "bg-blue-50 ring-1 ring-blue-100",
    icon: "text-blue-600",
  },
  emerald: {
    wrap: "bg-emerald-50 ring-1 ring-emerald-100",
    icon: "text-emerald-600",
  },
  rose: {
    wrap: "bg-rose-50 ring-1 ring-rose-100",
    icon: "text-rose-600",
  },
  violet: {
    wrap: "bg-violet-50 ring-1 ring-violet-100",
    icon: "text-violet-600",
  },
};

/* ── Card data builders ────────────────────────────────────────────── */

interface SummaryCard {
  label: string;
  headline: string;
  subtitle: string;
  icon: ReactNode;
  tone: CardTone;
  subtitleTone?: "danger" | "success";
}

function buildContentCard(r: ContentTypeResult, t: TFunction): SummaryCard {
  const raw = r.label ?? "Misto / pouco claro";
  const headline = tHeadline(t, "content", raw);
  const top = r.distribution[0];
  let subtitle: string;
  if (!r.available || !top) {
    subtitle = t("diagnostic.summary.fallback_insufficient");
  } else if (raw === "Misto / pouco claro" && top) {
    subtitle = t("diagnostic.summary.content.mixed_top_lead", {
      label: top.label,
      share: top.sharePct,
    });
  } else {
    subtitle = t("diagnostic.summary.content.share_of", {
      share: r.sharePct,
      label: raw.toLowerCase(),
    });
  }
  return {
    label: t("diagnostic.summary.labels.content_type"),
    headline,
    subtitle,
    icon: <Sparkles className="size-4" />,
    tone: "blue",
  };
}

function buildFunnelCard(r: FunnelStageResult, t: TFunction): SummaryCard {
  const raw = r.label ?? "Comunicação dispersa";
  const headline = tHeadline(t, "funnel", raw);
  const topoItem = r.breakdown.find((b) => b.stage === "topo");
  let subtitle: string;
  if (!r.available) {
    subtitle = t("diagnostic.summary.fallback_insufficient");
  } else if (raw === "Topo do funil" && topoItem) {
    subtitle = t("diagnostic.summary.funnel.top_discovery", { share: topoItem.sharePct });
  } else {
    subtitle = t("diagnostic.summary.funnel.dominant_share", { share: r.sharePct });
  }
  return {
    label: t("diagnostic.summary.labels.funnel"),
    headline,
    subtitle,
    icon: <Layers className="size-4" />,
    tone: "emerald",
  };
}

function buildAudienceCard(r: AudienceResponseResult, t: TFunction): SummaryCard {
  const raw = r.label;
  const headline = tHeadline(t, "audience", raw);
  const avg = r.avgComments;
  const subtitle =
    !r.available
      ? t("diagnostic.summary.fallback_insufficient")
      : avg === 0
        ? t("diagnostic.summary.audience.zero")
        : avg > 0 && avg < 0.1
        ? t("diagnostic.summary.audience.under_decimal")
        : avg < 10
          ? t("diagnostic.summary.audience.small", {
              count: Number(avg.toFixed(1)),
            })
          : t("diagnostic.summary.audience.large", { count: Math.round(avg) });
  const isSilent = r.status === "silent" || avg === 0;
  return {
    label: t("diagnostic.summary.labels.audience"),
    headline,
    subtitle,
    icon: <MessageCircle className="size-4" />,
    tone: "rose",
    subtitleTone: isSilent ? "danger" : undefined,
  };
}

function buildObjectiveCard(r: ObjectiveResult, t: TFunction): SummaryCard {
  const primary = r.primary ?? t("diagnostic.summary.objective.no_signal");
  // Extract short label: "Notoriedade · marca pessoal" → "Notoriedade"
  const headline = primary.includes("·")
    ? primary.split("·")[0].trim()
    : primary;
  const detail = primary.includes("·")
    ? primary.split("·")[1].trim()
    : null;
  const confLabel =
    r.confidence === "med"
      ? t("diagnostic.summary.objective.confidence_med")
      : t("diagnostic.summary.objective.confidence_low");
  const subtitle = r.available
    ? detail
      ? t("diagnostic.summary.objective.detail_with_conf", {
          detail: detail.charAt(0).toUpperCase() + detail.slice(1),
          conf: confLabel,
        })
      : confLabel
    : t("diagnostic.summary.fallback_insufficient");
  return {
    label: t("diagnostic.summary.labels.objective"),
    headline,
    subtitle,
    icon: <Compass className="size-4" />,
    tone: "violet",
  };
}

/* ── Component ─────────────────────────────────────────────────────── */

/**
 * 4 KPI summary cards rendered at the top of Block 02, between
 * the verdict box and the detailed question groups. Compact,
 * human-readable headlines derived from the classifier outputs.
 */
export function ReportDiagnosticSummaryCards({
  contentType,
  funnel,
  audience,
  objective,
}: Props) {
  const { t } = useTranslation("report");
  const cards: SummaryCard[] = [
    buildContentCard(contentType, t),
    buildFunnelCard(funnel, t),
    buildAudienceCard(audience, t),
    buildObjectiveCard(objective, t),
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
      {cards.map((c) => {
        const tone = TONE_CLASSES[c.tone];
        return (
          <article
            key={c.label}
            aria-label={`${c.label}: ${c.headline}. ${c.subtitle}.`}
            className={cn(
              "flex flex-col gap-2.5",
              "rounded-2xl border border-border-default bg-surface-secondary",
              "p-4 sm:p-5",
              "shadow-card",
            )}
          >
            <span
              aria-hidden="true"
              className={cn(
                "inline-flex size-9 items-center justify-center rounded-full shrink-0",
                tone.wrap,
              )}
            >
              <span className={tone.icon}>{c.icon}</span>
            </span>

            <p className="text-eyebrow-sm text-content-secondary">
              {c.label}
            </p>

            <h3 className="font-display text-[0.95rem] sm:text-base font-semibold leading-snug tracking-tight text-content-primary">
              {c.headline}
            </h3>

            <p
              className={cn(
                "text-xs leading-relaxed",
                c.subtitleTone === "danger"
                  ? "text-signal-danger"
                  : c.subtitleTone === "success"
                    ? "text-signal-success"
                    : "text-content-secondary",
              )}
            >
              {c.subtitle}
            </p>
          </article>
        );
      })}
    </div>
  );
}