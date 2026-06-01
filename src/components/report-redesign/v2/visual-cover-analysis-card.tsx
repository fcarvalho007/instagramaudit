import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useVariantFeatures } from "@/lib/report/report-variant";
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
import { InsightCallout } from "./insight-callout";
import type { SnapshotPost } from "@/lib/report/snapshot-to-report-data";
import { pickThumbnailUrl } from "@/lib/report/pick-thumbnail";

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

const SUB_SCORE_KEYS: (keyof VisualCoverAnalysis["subScores"])[] = [
  "recognizability",
  "colorCoherence",
  "composition",
  "visualVariety",
  "textDensity",
];

const METHODOLOGY_AXES_KEYS = [
  "composition",
  "human_presence",
  "text_in_image",
  "framing",
  "color_light",
  "recognizability",
  "grid_coherence",
];

// ─── Component ──────────────────────────────────────────────────────

export function VisualCoverAnalysisCard({ posts, analysis }: Props) {
  const { t } = useTranslation("report");
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
            {t("cover.header", { count: analyzedCount })}
          </span>
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-full px-2 py-0.5",
              "bg-tint-primary ring-1 ring-accent-primary/15",
              "text-xs font-medium uppercase tracking-wider text-accent-primary",
            )}
          >
            <Eye className="size-3" aria-hidden />
            {t("cover.ai_badge")}
          </span>
        </div>
        <h3 className="text-lg md:text-xl font-semibold text-content-primary leading-snug">
          {t("cover.title")}
        </h3>
        <p className="text-[13px] text-content-secondary leading-relaxed max-w-2xl">
          {t("cover.subtitle")}
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
            <div className="flex items-center gap-4 text-xs text-content-tertiary">
              <StatusLegendItem status="good" count={statusCounts.good} />
              <StatusLegendItem status="medium" count={statusCounts.medium} />
              <StatusLegendItem status="weak" count={statusCounts.weak} />
            </div>
          ) : null}
          <p className="text-[10.5px] text-content-tertiary italic">
            {t("cover.thumb_hint")}
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
          {t("cover.axes_title")}
        </p>
        <div className="flex flex-wrap gap-2">
          {METHODOLOGY_AXES_KEYS.map((axisKey) => (
            <span
              key={axisKey}
              className={cn(
                "inline-flex items-center rounded-full px-2.5 py-1",
                "ring-1 ring-border-default bg-surface-muted",
                "text-xs text-content-secondary",
              )}
            >
              {t(`cover.axes.${axisKey}`)}
            </span>
          ))}
        </div>
      </div>

      {/* ── Final diagnostic callout ───────────────────────────── */}
      {hasAi ? (
        <div className="space-y-3">
          <InsightCallout tone="editorial" label={t("cover.diagnostic_label")}>
            {analysis.diagnostic.main}
          </InsightCallout>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <MicroConclusion
              icon={CheckCircle2}
              label={t("cover.works_label")}
              text={analysis.diagnostic.works}
              color="text-signal-success"
              bg="bg-tint-success"
            />
            <MicroConclusion
              icon={AlertTriangle}
              label={t("cover.critical_label")}
              text={analysis.diagnostic.critical}
              color="text-signal-danger"
              bg="bg-tint-danger"
            />
            <MicroConclusion
              icon={Search}
              label={t("cover.watch_label")}
              text={analysis.diagnostic.watch}
              color="text-signal-warning"
              bg="bg-tint-warning"
            />
          </div>
        </div>
      ) : (
        <VisualAnalysisFallback />
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
          thumbnailUrl={post.thumbnail_url!}
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
  const { t } = useTranslation("report");
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
          title={t(`cover.thumb_status.${status}`)}
          aria-label={t(`cover.thumb_status.${status}`)}
        />
      )}
    </div>
  );
}

function StatusLegendItem({ status, count }: { status: ThumbnailStatus; count: number }) {
  const { t } = useTranslation("report");
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={cn("size-2 rounded-full", STATUS_COLOR[status])} aria-hidden />
      <span>{t(`cover.thumb_status.${status}`)} {count}</span>
    </span>
  );
}

function ScorePanel({ analysis }: { analysis: VisualCoverAnalysis }) {
  const { t } = useTranslation("report");
  const statusLabel = t(`cover.status.${analysis.status}`);
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
        <p className="text-4xl tabular-nums font-bold text-content-primary tabular-nums">
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
        {SUB_SCORE_KEYS.map((key) => {
          const label = t(`cover.sub_scores.${key}`);
          const value = analysis.subScores[key];
          return (
            <div key={key} className="space-y-0.5">
              <div className="flex items-center justify-between">
                <span className="text-[12px] text-content-secondary">{label}</span>
                <span className="tabular-nums text-xs tabular-nums text-content-tertiary">{value}</span>
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

function VisualAnalysisFallback() {
  const features = useVariantFeatures();
  const { t } = useTranslation("report");
  const isPublic = features.debugLabels === "hidden";
  return (
    <div className="rounded-xl border border-dashed border-border-default bg-surface-muted px-4 py-5 text-center">
      <p className="text-[13px] text-content-secondary leading-relaxed">
        {isPublic ? t("cover.fallback.public_title") : t("cover.fallback.dev_title")}
      </p>
      <p className="text-xs text-content-tertiary mt-1">
        {isPublic ? t("cover.fallback.public_body") : t("cover.fallback.dev_body")}
      </p>
    </div>
  );
}

function ScorePanelUnavailable() {
  const features = useVariantFeatures();
  const { t } = useTranslation("report");
  const isPublic = features.debugLabels === "hidden";
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border-default bg-surface-muted p-6 text-center space-y-2">
      <Eye className="size-8 text-content-tertiary/30" aria-hidden />
      <p className="text-[13px] text-content-secondary font-medium">
        {isPublic ? t("cover.fallback.score_public_title") : t("cover.fallback.score_dev_title")}
      </p>
      <p className="text-xs text-content-tertiary max-w-[16rem] leading-relaxed">
        {isPublic ? t("cover.fallback.score_public_body") : t("cover.fallback.score_dev_body")}
      </p>
    </div>
  );
}

function AiSeesRow({ aggregate }: { aggregate: VisualCoverAnalysis["aggregate"] }) {
  const { t } = useTranslation("report");
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      <AiSeesMiniCard
        icon={User}
        label={t("cover.ai_sees.human_presence_label")}
        value={`${Math.round(aggregate.humanPresencePct)}%`}
        detail={t("cover.ai_sees.human_presence_detail")}
      />
      <AiSeesMiniCard
        icon={Type}
        label={t("cover.ai_sees.text_in_image_label")}
        value={`${Math.round(aggregate.textInImagePct)}%`}
        detail={t("cover.ai_sees.text_in_image_detail")}
      />
      <AiSeesMiniCard
        icon={Palette}
        label={t("cover.ai_sees.palette_label")}
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
        label={t("cover.ai_sees.template_label")}
        value={`${aggregate.repeatedTemplateCount}`}
        detail={aggregate.repeatedTemplateNote ?? t("cover.ai_sees.template_default_detail")}
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
        <p className="text-lg tabular-nums font-semibold text-content-primary tabular-nums">{value}</p>
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