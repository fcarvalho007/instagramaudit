import { Sparkles, Layers, MessageCircle, Compass } from "lucide-react";
import type { ReactNode } from "react";

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

const AUDIENCE_HEADLINE: Record<string, string> = {
  "Audiência silenciosa": "Quase sem comentários",
  "Audiência ativa": "Conversa ativa",
  "Resposta moderada": "Resposta moderada",
  "Resposta concentrada": "Conversa pontual",
  "Dados insuficientes": "Dados insuficientes",
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
  return {
    label: "Tipo de conteúdo",
    headline,
    subtitle,
    icon: <Sparkles className="size-4" />,
    tone: "blue",
  };
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
  return {
    label: "Papel do conteúdo",
    headline,
    subtitle,
    icon: <Layers className="size-4" />,
    tone: "emerald",
  };
}

function buildAudienceCard(r: AudienceResponseResult): SummaryCard {
  const raw = r.label;
  const headline = AUDIENCE_HEADLINE[raw] ?? raw;
  const avg = r.avgComments;
  const subtitle =
    !r.available
      ? "Dados insuficientes"
      : `${avg} comentários médios por post`;
  const isSilent = r.status === "silent" || avg === 0;
  return {
    label: "Resposta do público",
    headline,
    subtitle,
    icon: <MessageCircle className="size-4" />,
    tone: "rose",
    subtitleTone: isSilent ? "danger" : undefined,
  };
}

function buildObjectiveCard(r: ObjectiveResult): SummaryCard {
  const primary = r.primary ?? "Sem sinal claro";
  // Extract short label: "Notoriedade · marca pessoal" → "Notoriedade"
  const headline = primary.includes("·")
    ? primary.split("·")[0].trim()
    : primary;
  const detail = primary.includes("·")
    ? primary.split("·")[1].trim()
    : null;
  const confLabel = r.confidence === "med" ? "70%" : "< 50%";
  const subtitle = r.available
    ? detail
      ? `${detail.charAt(0).toUpperCase() + detail.slice(1)} · ${confLabel}`
      : confLabel
    : "Dados insuficientes";
  return {
    label: "Objetivo deste perfil",
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
  const cards: SummaryCard[] = [
    buildContentCard(contentType),
    buildFunnelCard(funnel),
    buildAudienceCard(audience),
    buildObjectiveCard(objective),
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
      {cards.map((c) => {
        const t = TONE_CLASSES[c.tone];
        return (
          <article
            key={c.label}
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
                t.wrap,
              )}
            >
              <span className={t.icon}>{c.icon}</span>
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