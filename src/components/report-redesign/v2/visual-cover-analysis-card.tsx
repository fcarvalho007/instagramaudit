import { useState } from "react";
import { cn } from "@/lib/utils";
import {
  Eye,
  ImageOff,
  User,
  Type,
  Palette,
  Copy,
  CheckCircle2,
  AlertTriangle,
  Search,
} from "lucide-react";
import type {
  VisualCoverAnalysis,
  ThumbnailStatus,
} from "@/lib/report/visual-cover-types";
import {
  STATUS_LABEL,
  THUMB_STATUS_LABEL,
} from "@/lib/report/visual-cover-types";
import { InsightCallout } from "./insight-callout";
import type { SnapshotPost } from "@/lib/report/snapshot-to-report-data";

// ─── Props ──────────────────────────────────────────────────────────

interface Props {
  posts: SnapshotPost[];
  /** AI analysis result — null when not yet available. */
  analysis: VisualCoverAnalysis | null;
}

// ─── Constants ──────────────────────────────────────────────────────

const STATUS_COLOR: Record<ThumbnailStatus, string> = {
  good: "bg-signal-success",
  medium: "bg-signal-warning",
  weak: "bg-signal-danger",
};

const STATUS_RING: Record<ThumbnailStatus, string> = {
  good: "ring-signal-success/30",
  medium: "ring-signal-warning/30",
  weak: "ring-signal-danger/30",
};

const SUB_SCORE_LABELS: { key: keyof VisualCoverAnalysis["subScores"]; label: string }[] = [
  { key: "recognizability", label: "Reconhecibilidade" },
  { key: "colorCoherence", label: "Coerência cromática" },
  { key: "composition", label: "Composição" },
  { key: "visualVariety", label: "Variedade visual" },
  { key: "textDensity", label: "Densidade de texto" },
];

const METHODOLOGY_AXES = [
  "Composição",
  "Presença humana",
  "Texto na imagem",
  "Enquadramento / cropping",
  "Cor e luz",
  "Reconhecibilidade",
  "Coerência de grelha",
];

// ─── Helpers ────────────────────────────────────────────────────────

function proxyThumbUrl(rawUrl: string): string {
  return `/api/public/ig-thumb?url=${encodeURIComponent(rawUrl)}`;
}

// ─── Component ──────────────────────────────────────────────────────

export function VisualCoverAnalysisCard({ posts, analysis }: Props) {
  const thumbPosts = posts
    .filter((p) => typeof p.thumbnail_url === "string" && p.thumbnail_url.length > 0)
    .slice(0, 12);

  const analyzedCount = analysis?.analyzedCount ?? thumbPosts.length;
  const hasAi = analysis !== null;

  // Count statuses for legend
  const statusCounts = hasAi
    ? {
        good: analysis.thumbnails.filter((t) => t.status === "good").length,
        medium: analysis.thumbnails.filter((t) => t.status === "medium").length,
        weak: analysis.thumbnails.filter((t) => t.status === "weak").length,
      }
    : null;

  return (
    <article
      className={cn(
        "md:col-span-2 flex flex-col gap-6",
        "rounded-2xl border border-border-default bg-surface-secondary",
        "p-5 md:p-7 shadow-card",
        "border-t-2 border-t-accent-primary/50",
      )}
    >
      {/* ── Header ─────────────────────────────────────────────── */}
      <header className="space-y-2">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <span className="text-eyebrow-sm text-content-tertiary">
            07 · ANÁLISE VISUAL DAS CAPAS · {analyzedCount} THUMBNAILS ANALISADOS
          </span>
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-full px-2 py-0.5",
              "bg-tint-primary ring-1 ring-accent-primary/15",
              "text-[10px] font-medium uppercase tracking-wider text-accent-primary",
            )}
          >
            <Eye className="size-3" aria-hidden />
            IA · Visão computacional
          </span>
        </div>
        <h3 className="text-lg md:text-xl font-semibold text-content-primary leading-snug">
          As capas comunicam em 1 segundo?
        </h3>
        <p className="text-[13px] text-content-secondary leading-relaxed max-w-2xl">
          Análise IA aos thumbnails dos posts — composição, presença humana, texto, cor e legibilidade.
        </p>
      </header>

      {/* ── Main content: grid + score ─────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left: thumbnail grid */}
        <div className="space-y-3">
          <ThumbnailGrid
            posts={thumbPosts}
            analysis={analysis}
          />
          {statusCounts ? (
            <div className="flex items-center gap-4 text-[11px] text-content-tertiary">
              <StatusLegendItem status="good" count={statusCounts.good} />
              <StatusLegendItem status="medium" count={statusCounts.medium} />
              <StatusLegendItem status="weak" count={statusCounts.weak} />
            </div>
          ) : null}
          <p className="text-[10.5px] text-content-tertiary italic">
            Cada thumbnail tem score individual
          </p>
        </div>

        {/* Right: overall score */}
        {hasAi ? (
          <ScorePanel analysis={analysis} />
        ) : (
          <ScorePanelUnavailable />
        )}
      </div>

      {/* ── "What AI sees" row ─────────────────────────────────── */}
      {hasAi ? (
        <AiSeesRow aggregate={analysis.aggregate} />
      ) : null}

      {/* ── Methodology axes ───────────────────────────────────── */}
      <div className="space-y-2">
        <p className="text-eyebrow-sm text-content-tertiary">
          EIXOS DE AVALIAÇÃO
        </p>
        <div className="flex flex-wrap gap-2">
          {METHODOLOGY_AXES.map((axis) => (
            <span
              key={axis}
              className={cn(
                "inline-flex items-center rounded-full px-2.5 py-1",
                "ring-1 ring-border-default bg-surface-muted",
                "text-[11px] text-content-secondary",
              )}
            >
              {axis}
            </span>
          ))}
        </div>
      </div>

      {/* ── Final diagnostic callout ───────────────────────────── */}
      {hasAi ? (
        <div className="space-y-3">
          <InsightCallout tone="editorial" label="DIAGNÓSTICO VISUAL">
            {analysis.diagnostic.main}
          </InsightCallout>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <MicroConclusion
              icon={CheckCircle2}
              label="FUNCIONA"
              text={analysis.diagnostic.works}
              color="text-signal-success"
              bg="bg-tint-success"
            />
            <MicroConclusion
              icon={AlertTriangle}
              label="PONTO CRÍTICO"
              text={analysis.diagnostic.critical}
              color="text-signal-danger"
              bg="bg-tint-danger"
            />
            <MicroConclusion
              icon={Search}
              label="A OBSERVAR"
              text={analysis.diagnostic.watch}
              color="text-signal-warning"
              bg="bg-tint-warning"
            />
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-border-default bg-surface-muted px-4 py-5 text-center">
          <p className="text-[13px] text-content-secondary leading-relaxed">
            Análise visual indisponível — aguarda processamento IA.
          </p>
          <p className="text-[11px] text-content-tertiary mt-1">
            Os thumbnails acima serão analisados por visão computacional numa próxima atualização.
          </p>
        </div>
      )}
    </article>
  );
}

// ─── Sub-components ────────────────────────────────────────────────

function ThumbnailGrid({
  posts,
  analysis,
}: {
  posts: SnapshotPost[];
  analysis: VisualCoverAnalysis | null;
}) {
  return (
    <div className="grid grid-cols-4 gap-1.5 sm:gap-2">
      {posts.map((post, idx) => (
        <ThumbnailCell
          key={post.id ?? idx}
          thumbnailUrl={proxyThumbUrl(post.thumbnail_url!)}
          status={analysis?.thumbnails[idx]?.status ?? null}
        />
      ))}
      {/* Fill remaining slots if fewer than 12 */}
      {Array.from({ length: Math.max(0, 12 - posts.length) }).map((_, i) => (
        <div
          key={`empty-${i}`}
          className="aspect-square rounded-lg bg-surface-muted flex items-center justify-center"
        >
          <ImageOff className="size-4 text-content-tertiary/30" aria-hidden />
        </div>
      ))}
    </div>
  );
}

function ThumbnailCell({
  thumbnailUrl,
  status,
}: {
  thumbnailUrl: string;
  status: ThumbnailStatus | null;
}) {
  const [imgError, setImgError] = useState(false);

  return (
    <div className="relative aspect-square rounded-lg overflow-hidden bg-surface-muted">
      {!imgError ? (
        <img
          src={thumbnailUrl}
          alt=""
          loading="lazy"
          onError={() => setImgError(true)}
          className="absolute inset-0 size-full object-cover"
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center">
          <ImageOff className="size-4 text-content-tertiary/30" aria-hidden />
        </div>
      )}
      {status && (
        <div
          className={cn(
            "absolute top-1 right-1 size-3 rounded-full ring-2 ring-white/80",
            STATUS_COLOR[status],
          )}
          title={THUMB_STATUS_LABEL[status]}
          aria-label={THUMB_STATUS_LABEL[status]}
        />
      )}
    </div>
  );
}

function StatusLegendItem({ status, count }: { status: ThumbnailStatus; count: number }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={cn("size-2 rounded-full", STATUS_COLOR[status])} aria-hidden />
      <span>{THUMB_STATUS_LABEL[status]} {count}</span>
    </span>
  );
}

function ScorePanel({ analysis }: { analysis: VisualCoverAnalysis }) {
  const statusLabel = STATUS_LABEL[analysis.status];
  const statusColor =
    analysis.status === "strong"
      ? "text-signal-success"
      : analysis.status === "needs_improvement"
        ? "text-signal-warning"
        : "text-signal-danger";

  return (
    <div className="space-y-5">
      {/* Big score */}
      <div className="rounded-xl border border-border-default bg-surface-muted p-5 text-center space-y-1">
        <p className="text-4xl font-mono font-bold text-content-primary tabular-nums">
          {analysis.overallScore}<span className="text-lg text-content-tertiary">/100</span>
        </p>
        <p className={cn("text-eyebrow font-semibold", statusColor)}>
          {statusLabel}
        </p>
        <p className="text-[12.5px] text-content-secondary leading-relaxed mt-2 max-w-xs mx-auto">
          {analysis.summary}
        </p>
      </div>

      {/* Sub-score bars */}
      <div className="space-y-2.5">
        {SUB_SCORE_LABELS.map(({ key, label }) => {
          const value = analysis.subScores[key];
          return (
            <div key={key} className="space-y-0.5">
              <div className="flex items-center justify-between">
                <span className="text-[12px] text-content-secondary">{label}</span>
                <span className="font-mono text-[11px] tabular-nums text-content-tertiary">{value}</span>
              </div>
              <div className="h-1.5 rounded-full bg-surface-muted overflow-hidden">
                <div
                  className="h-full rounded-full bg-accent-primary transition-all"
                  style={{ width: `${Math.min(100, value)}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ScorePanelUnavailable() {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border-default bg-surface-muted p-6 text-center space-y-2">
      <Eye className="size-8 text-content-tertiary/30" aria-hidden />
      <p className="text-[13px] text-content-secondary font-medium">
        Score visual indisponível
      </p>
      <p className="text-[11px] text-content-tertiary max-w-[16rem] leading-relaxed">
        Será calculado automaticamente quando a análise por visão computacional estiver ativa.
      </p>
    </div>
  );
}

function AiSeesRow({ aggregate }: { aggregate: VisualCoverAnalysis["aggregate"] }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      <AiSeesMiniCard
        icon={User}
        label="Presença humana"
        value={`${Math.round(aggregate.humanPresencePct)}%`}
        detail="das capas com rostos ou pessoas visíveis"
      />
      <AiSeesMiniCard
        icon={Type}
        label="Texto na imagem"
        value={`${Math.round(aggregate.textInImagePct)}%`}
        detail="das capas onde se deteta texto"
      />
      <AiSeesMiniCard
        icon={Palette}
        label="Paleta dominante"
        value={null}
        detail={null}
      >
        <div className="flex gap-1 mt-1">
          {aggregate.dominantPalette.slice(0, 5).map((hex) => (
            <span
              key={hex}
              className="size-5 rounded-full ring-1 ring-border-default"
              style={{ backgroundColor: hex }}
              title={hex}
              aria-label={hex}
            />
          ))}
        </div>
      </AiSeesMiniCard>
      <AiSeesMiniCard
        icon={Copy}
        label="Repetição de template"
        value={`${aggregate.repeatedTemplateCount}`}
        detail={aggregate.repeatedTemplateNote ?? "padrões visuais repetidos"}
      />
    </div>
  );
}

function AiSeesMiniCard({
  icon: Icon,
  label,
  value,
  detail,
  children,
}: {
  icon: typeof User;
  label: string;
  value: string | null;
  detail: string | null;
  children?: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border border-border-default bg-surface-muted p-3.5 space-y-1",
      )}
    >
      <div className="flex items-center gap-2">
        <Icon className="size-3.5 text-accent-primary shrink-0" aria-hidden />
        <span className="text-eyebrow-sm text-content-tertiary">{label}</span>
      </div>
      {value !== null ? (
        <p className="text-lg font-mono font-semibold text-content-primary tabular-nums">{value}</p>
      ) : null}
      {detail !== null ? (
        <p className="text-[10.5px] text-content-tertiary leading-relaxed">{detail}</p>
      ) : null}
      {children}
    </div>
  );
}

function MicroConclusion({
  icon: Icon,
  label,
  text,
  color,
  bg,
}: {
  icon: typeof CheckCircle2;
  label: string;
  text: string;
  color: string;
  bg: string;
}) {
  return (
    <div className={cn("rounded-xl p-3.5 space-y-1.5", bg)}>
      <div className="flex items-center gap-1.5">
        <Icon className={cn("size-3.5 shrink-0", color)} aria-hidden />
        <span className={cn("text-eyebrow-sm font-semibold", color)}>{label}</span>
      </div>
      <p className="text-[12px] text-content-secondary leading-relaxed">{text}</p>
    </div>
  );
}