/**
 * Zone D — Card 2: Tipo de conteúdo.
 * Human-readable headline → stats → thumbnail grid → verdict.
 *
 * Decorative colours (local to this component):
 *   Carousel legend dot: bg-emerald-200
 *   Reel legend dot:     bg-sky-200
 *   Image legend dot:    bg-amber-200
 *   Video legend dot:    bg-sky-200
 */
import { Fragment, useState, type ComponentType } from "react";
import { Play, Image, GalleryHorizontalEnd } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import { InsightCallout, type InsightTone } from "./insight-callout";
import type {
  SocialinsiderFormatRef,
  SocialinsiderInstagramContext,
} from "@/lib/knowledge/socialinsider-context";
import { ExternalSourceNote, formatDateRange } from "./external-source-note";

// ─── Types ──────────────────────────────────────────────────────────

type FormatKey = "Reels" | "Carousels" | "Imagens" | "Video";

export interface FormatEntry {
  format: FormatKey;
  sharePct: number;
  count: number;
}

export type AnalysedPostFormat = {
  date: string;
  type: "carousel" | "reel" | "image" | "video" | "unknown";
  thumbnailUrl?: string;
};

export interface FormatCardProps {
  postsAnalyzed: number;
  dominantFormat: string;
  dominantFormatShare: number;
  formats: FormatEntry[];
  analysedPostFormats: AnalysedPostFormat[];
  /** External market reference (Socialinsider IG per format). Optional. */
  socialinsiderRef?: SocialinsiderInstagramContext | null;
}

// ─── Helpers ────────────────────────────────────────────────────────

const TYPE_TO_FORMAT_KEY: Record<string, FormatKey> = {
  carousel: "Carousels",
  reel: "Reels",
  image: "Imagens",
  video: "Video",
};

const FORMAT_STYLE: Record<string, { dot: string; iconColor: string; icon: typeof Play }> = {
  Reels: { dot: "bg-sky-300", iconColor: "text-sky-600", icon: Play },
  Carousels: { dot: "bg-emerald-300", iconColor: "text-emerald-600", icon: GalleryHorizontalEnd },
  Imagens: { dot: "bg-amber-300", iconColor: "text-amber-600", icon: Image },
  Video: { dot: "bg-sky-300", iconColor: "text-sky-600", icon: Play },
  unknown: { dot: "bg-slate-300", iconColor: "text-slate-500", icon: Image },
};

const FORMAT_HEX: Record<FormatKey, string> = {
  Carousels: "#6EE7B7", // emerald-300
  Reels: "#7DD3FC",     // sky-300
  Imagens: "#FCD34D",   // amber-300
  Video: "#7DD3FC",     // sky-300
};

const BREAKDOWN_ORDER: FormatKey[] = ["Carousels", "Reels", "Imagens"];

/**
 * Pure helper: directional reading of this profile's mix vs the
 * Socialinsider per-format reference. Exported for tests.
 *
 * IMPORTANT: refShare here is only used for DIRECTIONAL comparison of
 * mix. It is NEVER displayed as a total posting target and must NOT be
 * interpreted as a recommended monthly volume.
 */
export type ExternalReading =
  | "above"
  | "below"
  | "near"
  | "absent"
  | "dash";

export function computeExternalReading(
  key: FormatKey,
  refs: SocialinsiderInstagramContext | null,
  formats: FormatEntry[],
): ExternalReading {
  if (!refs) return "dash";
  const refData =
    key === "Carousels"
      ? refs.carousel
      : key === "Reels"
        ? refs.reel
        : key === "Imagens"
          ? refs.image
          : null;
  if (!refData) return "dash";
  const entry = formats.find((f) => f.format === key);
  if (!entry || entry.count === 0) return "absent";
  const refTotal =
    (refs.carousel?.postsPerMonth ?? 0) +
    (refs.reel?.postsPerMonth ?? 0) +
    (refs.image?.postsPerMonth ?? 0);
  const refShare =
    refTotal > 0 && refData.postsPerMonth
      ? (refData.postsPerMonth / refTotal) * 100
      : null;
  if (refShare === null) return "dash";
  const delta = entry.sharePct - refShare;
  if (delta > 10) return "above";
  if (delta < -10) return "below";
  return "near";
}

function tFormatPlural(t: TFunction, key: FormatKey): string {
  return t(`format.names_plural.${key}`);
}
function tFormatLegend(t: TFunction, key: FormatKey): string {
  return t(`format.names_legend.${key}`);
}
function tTypeSingular(t: TFunction, type: string): string {
  return t(`format.types_singular.${type}` as const, { defaultValue: type });
}

export function getFormatHeadline(formats: FormatEntry[]): string {
  // Legacy export kept for tests; production component uses t() variant below.
  if (!formats.length) return "Sem dados de formato";
  const sorted = [...formats].sort((a, b) => b.sharePct - a.sharePct);
  const top = sorted[0];
  const labelMap: Record<FormatKey, string> = {
    Carousels: "carrosséis", Reels: "reels", Imagens: "imagens", Video: "vídeos",
  };
  const label = labelMap[top.format] ?? top.format;
  const capitalised = label.charAt(0).toUpperCase() + label.slice(1);
  if (top.sharePct >= 80) return `Apenas ${label}`;
  if (top.sharePct >= 60) return `${capitalised} dominam`;
  if (top.sharePct >= 40) return "Mistura equilibrada";
  return "Formato pouco definido";
}

function getFormatHeadlineT(formats: FormatEntry[], t: TFunction): string {
  if (!formats.length) return t("format.headline.no_data");
  const sorted = [...formats].sort((a, b) => b.sharePct - a.sharePct);
  const top = sorted[0];
  const label = tFormatPlural(t, top.format);
  const capitalised = label.charAt(0).toUpperCase() + label.slice(1);
  if (top.sharePct >= 80) return t("format.headline.only", { label });
  if (top.sharePct >= 60) return t("format.headline.dominate", { label: capitalised });
  if (top.sharePct >= 40) return t("format.headline.balanced");
  return t("format.headline.undefined");
}

/** Variation status for the new editorial headline */
export function getFormatVariationStatus(formats: FormatEntry[]): string {
  if (!formats.length) return "Pouco variado";
  const sorted = [...formats].sort((a, b) => b.sharePct - a.sharePct);
  const top = sorted[0];
  const meaningful = sorted.filter((f) => f.count > 0);
  if (top.sharePct >= 60) return "Pouco variado";
  if (meaningful.length >= 3 || top.sharePct < 40) return "Muito variado";
  return "Variado";
}

function buildSubtitleLineT(
  formats: FormatEntry[],
  postsAnalyzed: number,
  t: TFunction,
): string {
  const sorted = [...formats].filter((f) => f.count > 0).sort((a, b) => b.count - a.count);
  if (!sorted.length) return t("format.subtitle.no_data", { count: postsAnalyzed });
  const topLabel = tFormatPlural(t, sorted[0].format);
  const capitalised = topLabel.charAt(0).toUpperCase() + topLabel.slice(1);
  let line = t("format.subtitle.leader", {
    label: capitalised,
    topCount: sorted[0].count,
    total: postsAnalyzed,
    topLower: topLabel,
  });
  if (sorted.length > 1) {
    const rest = sorted.slice(1).map((f) =>
      t("format.subtitle.extra", { count: f.count, label: tFormatPlural(t, f.format) }),
    );
    line += ` · ${rest.join(" · ")}`;
  }
  return line;
}

type DominantKey = "carousel" | "reel" | "image" | "mixed";

export function toDominantKey(format: string, share: number): DominantKey {
  if (share < 40) return "mixed";
  const s = format.toLowerCase();
  if (s.startsWith("reel")) return "reel";
  if (s.startsWith("carro") || s.startsWith("carou")) return "carousel";
  if (s.startsWith("imag")) return "image";
  return "mixed";
}

export function getFormatVerdict(dk: DominantKey): { strong: string; rest: string } {
  // Legacy export — kept for tests. Component uses tVerdict() below.
  const map: Record<DominantKey, { strong: string; rest: string }> = {
    carousel: { strong: "Foco em conteúdo para guardar.", rest: "Carrosséis funcionam para ensinar, listar e organizar ideias." },
    reel: { strong: "Foco em alcance e descoberta.", rest: "Reels funcionam para entrar em novas audiências." },
    image: { strong: "Foco em comunicação direta.", rest: "Imagens funcionam para mensagens claras e momentos." },
    mixed: { strong: "Mix variado.", rest: "Diferentes formatos servem objetivos diferentes — as próximas secções mostram onde cada formato rende mais." },
  };
  return map[dk];
}

function tVerdict(dk: DominantKey, t: TFunction): { strong: string; rest: string } {
  return {
    strong: t(`format.verdict.${dk}.strong`),
    rest: t(`format.verdict.${dk}.rest`),
  };
}

// ─── Component ──────────────────────────────────────────────────────

export function FormatCard({
  postsAnalyzed,
  dominantFormat,
  dominantFormatShare,
  formats,
  analysedPostFormats,
  socialinsiderRef,
}: FormatCardProps) {
  const { t } = useTranslation("report");
  // Headline kept for legacy reasons (export) but render uses t() version.
  void getFormatHeadline(formats);
  const variationKey: "varied_high" | "varied" | "low" = (() => {
    if (!formats.length) return "low";
    const sorted = [...formats].sort((a, b) => b.sharePct - a.sharePct);
    const top = sorted[0];
    const meaningful = sorted.filter((f) => f.count > 0);
    if (top.sharePct >= 60) return "low";
    if (meaningful.length >= 3 || top.sharePct < 40) return "varied_high";
    return "varied";
  })();
  const variationStatus = t(`format.variation.${variationKey}`);
  const subtitleLine = buildSubtitleLineT(formats, postsAnalyzed, t);
  const dk = toDominantKey(dominantFormat, dominantFormatShare);
  const verdict = tVerdict(dk, t);
  const headlineDerived = getFormatHeadlineT(formats, t);
  void headlineDerived;
  // Determine callout tone based on format variation
  const calloutTone: InsightTone =
    variationKey === "varied_high" ? "positive"
    : variationKey === "varied" ? "neutral"
    : dk === "mixed" ? "neutral"
    : "warning";
  const calloutLabel = t(
    calloutTone === "positive"
      ? "format.verdict_label.strong"
      : calloutTone === "warning"
        ? "format.verdict_label.improve"
        : "format.verdict_label.neutral",
  );

  // Build thumbnails from literal per-post data, grouped by dominant format first
  const sortedFormats = [...formats].filter((f) => f.count > 0).sort((a, b) => b.count - a.count);
  const dominantType = sortedFormats.length > 0 ? sortedFormats[0].format : null;
  const dominantTypeNorm = dominantType
    ? Object.entries(TYPE_TO_FORMAT_KEY).find(([, v]) => v === dominantType)?.[0]
    : null;

  const sortedPosts = [...analysedPostFormats].sort((a, b) => {
    const aIsDominant = a.type === dominantTypeNorm ? 0 : 1;
    const bIsDominant = b.type === dominantTypeNorm ? 0 : 1;
    if (aIsDominant !== bIsDominant) return aIsDominant - bIsDominant;
    return a.date.localeCompare(b.date);
  });

  // Aria label
  const ariaFormatParts = sortedFormats.map((f) => `${f.count} ${tFormatPlural(t, f.format)}`);
  const ariaLabel = t("format.aria_distribution", {
    count: postsAnalyzed,
    parts: ariaFormatParts.join(", "),
  });

  const activeFormats = sortedFormats;

  return (
    <article className="rounded-2xl border border-border-default bg-surface-secondary shadow-card overflow-hidden flex flex-col">
      {/* Header */}
      <div className="px-5 md:px-6 pt-5 md:pt-6 space-y-2">
        <div className="flex items-start gap-3">
          <h3 className="font-display text-[1.125rem] sm:text-[1.25rem] md:text-[1.5rem] font-semibold tracking-tight text-content-primary leading-tight">
            {t("format.title")}{" "}
            <span
              className="font-semibold"
              style={{
                borderBottom: `2px solid ${
                  variationKey === "varied_high"
                    ? "rgba(29,158,117,0.50)"
                    : variationKey === "varied"
                      ? "rgba(37,99,217,0.40)"
                      : "rgba(217,119,6,0.50)"
                }`,
                paddingBottom: "1px",
              }}
            >
              {variationStatus}
            </span>
          </h3>
        </div>
        <p className="text-[14px] text-content-secondary leading-relaxed">
          {subtitleLine}
        </p>
      </div>

      {/* Breakdown — donut + legend */}
      <FormatBreakdown formats={formats} postsAnalyzed={postsAnalyzed} t={t} />

      {/* Thumbnail grid */}
      {sortedPosts.length > 0 && (
        <div className="px-5 md:px-6 mt-5">
          <span className="text-xs uppercase tracking-[0.04em] text-content-tertiary block mb-2">
            {t("format.analyzed_count", { count: postsAnalyzed })}
          </span>
          <div
            role="img"
            aria-label={ariaLabel}
            className="grid gap-1.5 grid-cols-6 sm:grid-cols-8 max-w-[520px]"
          >
            {sortedPosts.map((post, idx) => {
              const fk = TYPE_TO_FORMAT_KEY[post.type] ?? "unknown";
              const style = FORMAT_STYLE[fk] ?? FORMAT_STYLE.unknown;
              const Icon = style.icon;
              const label = tTypeSingular(t, post.type);
              return (
                <span
                  key={`${post.date}-${idx}`}
                  title={t("format.thumb_aria", { label, date: post.date })}
                  className="relative rounded-md overflow-hidden bg-surface-muted border border-border-subtle/40"
                  style={{ aspectRatio: "1/1" }}
                >
                  {post.thumbnailUrl ? (
                    <PostThumb
                      src={post.thumbnailUrl}
                      alt={label}
                      fallbackIcon={Icon}
                      fallbackIconColor={style.iconColor}
                    />
                  ) : (
                    <span className="absolute inset-0 flex items-center justify-center">
                      <Icon className={`size-5 ${style.iconColor}`} aria-hidden="true" />
                    </span>
                  )}
                  {/* Small format dot indicator — bottom-right */}
                  <span
                    className={`absolute bottom-0.5 right-0.5 size-1.5 rounded-full ring-1 ring-white ${style.dot}`}
                    aria-hidden="true"
                  />
                </span>
              );
            })}
          </div>

          {/* Legend */}
          <div className="flex items-center gap-3 mt-2">
            {activeFormats.map((f) => {
              const style = FORMAT_STYLE[f.format];
              return (
                <span key={f.format} className="inline-flex items-center gap-1.5 text-xs text-content-secondary">
                  <span className={`size-[7px] rounded-full ${style.dot} shrink-0`} aria-hidden="true" />
                  {tFormatPlural(t, f.format)} ({f.count})
                </span>
              );
            })}
          </div>
        </div>
      )}

      {/* Verdict */}
      <InsightCallout tone={calloutTone} label={calloutLabel} className="mt-auto mx-5 md:mx-6 mb-5 sm:mb-6">
        <p>
          <span className="font-semibold">{verdict.strong}</span>{" "}
          {verdict.rest}
        </p>
      </InsightCallout>
      {socialinsiderRef ? (
        <p className="px-5 md:px-6 -mt-4 mb-3 text-[13px] text-content-secondary leading-relaxed">
          {t("format.external_ref.bridge")}
        </p>
      ) : null}
      <ExternalReferenceTable
        refs={socialinsiderRef ?? null}
        formats={formats}
        postsAnalyzed={postsAnalyzed}
      />
      <ExternalSourceNote
        refData={
          socialinsiderRef?.reel ??
          socialinsiderRef?.carousel ??
          socialinsiderRef?.image ??
          null
        }
      />
    </article>
  );
}

/** Tiny thumbnail with graceful fallback to icon. */
function PostThumb({
  src,
  alt,
  fallbackIcon: FallbackIcon,
  fallbackIconColor,
}: {
  src: string;
  alt: string;
  fallbackIcon?: ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  fallbackIconColor?: string;
}) {
  const [failed, setFailed] = useState(false);
  if (failed) {
    const Icon = FallbackIcon ?? Image;
    return (
      <span
        className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-surface-muted to-surface-base"
        aria-hidden="true"
      >
        <Icon
          className={`size-3.5 ${fallbackIconColor ?? "text-content-tertiary"}`}
          aria-hidden
        />
      </span>
    );
  }
  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      onError={() => setFailed(true)}
      className="absolute inset-0 w-full h-full object-cover"
    />
  );
}

/** Donut + per-format legend showing distribution of published formats. */
function FormatBreakdown({
  formats,
  postsAnalyzed,
  t,
}: {
  formats: FormatEntry[];
  postsAnalyzed: number;
  t: TFunction;
}) {
  void postsAnalyzed;
  const byKey = new Map<FormatKey, FormatEntry>();
  formats.forEach((f) => byKey.set(f.format, f));

  // Always show Carrossel, Reels, Imagem. Add Video only if it has count.
  const rows: FormatKey[] = [...BREAKDOWN_ORDER];
  const video = byKey.get("Video");
  if (video && video.count > 0) rows.push("Video");

  const total = rows.reduce((s, k) => s + (byKey.get(k)?.count ?? 0), 0);
  if (total === 0) return null;

  // Normalised percentages that always sum to 100 (largest segment absorbs
  // rounding drift). Anchor everything to `total` (Σcount), not the
  // upstream `postsAnalyzed` — they can differ if format_stats is partial.
  const rawPcts = rows.map((k) => {
    const c = byKey.get(k)?.count ?? 0;
    return total > 0 ? (c / total) * 100 : 0;
  });
  const rounded = rawPcts.map((p) => Math.round(p));
  const drift = 100 - rounded.reduce((s, n) => s + n, 0);
  if (drift !== 0 && rounded.length > 0) {
    let maxIdx = 0;
    for (let i = 1; i < rounded.length; i++) if (rounded[i] > rounded[maxIdx]) maxIdx = i;
    rounded[maxIdx] = Math.max(0, rounded[maxIdx] + drift);
  }
  const pctByKey = new Map<FormatKey, number>();
  rows.forEach((k, i) => pctByKey.set(k, rounded[i]));

  // Donut geometry
  const size = 76;
  const stroke = 9;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  let offsetAcc = 0;

  return (
    <div className="px-5 md:px-6 mt-5">
      <div
        className="flex items-center gap-4 md:gap-5 rounded-xl bg-surface-muted/60 border border-border-subtle/50 px-4 md:px-5 py-3"
        role="img"
        aria-label={t("format.aria_breakdown", {
          total,
          parts: rows
            .map((k) =>
              t("format.breakdown_part", {
                count: byKey.get(k)?.count ?? 0,
                label: tFormatLegend(t, k),
                pct: pctByKey.get(k) ?? 0,
              }),
            )
            .join(", "),
        })}
      >
        {/* Donut */}
        <div className="relative shrink-0" style={{ width: size, height: size }}>
          <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke="currentColor"
              className="text-border-subtle/60"
              strokeWidth={stroke}
            />
            {rows.map((k) => {
              const entry = byKey.get(k);
              const count = entry?.count ?? 0;
              if (count === 0) return null;
              const share = count / total;
              const arcLen = share * circumference;
              const dasharray = `${arcLen} ${circumference - arcLen}`;
              const dashoffset = -offsetAcc;
              offsetAcc += arcLen;
              return (
                <circle
                  key={k}
                  cx={size / 2}
                  cy={size / 2}
                  r={radius}
                  fill="none"
                  stroke={FORMAT_HEX[k]}
                  strokeWidth={stroke}
                  strokeDasharray={dasharray}
                  strokeDashoffset={dashoffset}
                  transform={`rotate(-90 ${size / 2} ${size / 2})`}
                  strokeLinecap="butt"
                />
              );
            })}
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center leading-none">
            <span className="text-[1.25rem] font-semibold text-content-primary tabular-nums">
              {total}
            </span>
          </div>
        </div>

        {/* Legend */}
        <div className="flex-1 min-w-0 grid grid-cols-[1fr_auto_auto] gap-x-3 gap-y-1.5 items-center">
          {rows.map((k) => {
            const entry = byKey.get(k);
            const count = entry?.count ?? 0;
            const pct = pctByKey.get(k) ?? 0;
            const isZero = count === 0;
            return (
              <Fragment key={k}>
                <span
                  className={`flex items-center gap-2 text-[14px] ${
                    isZero ? "text-content-tertiary" : "text-content-primary"
                  }`}
                >
                  <span
                    className="size-2 rounded-full shrink-0"
                    style={{
                      backgroundColor: isZero
                        ? "var(--border-subtle, #E2E8F0)"
                        : FORMAT_HEX[k],
                    }}
                    aria-hidden="true"
                  />
                  {tFormatLegend(t, k)}
                </span>
                <span
                  className={`text-[14px] font-semibold tabular-nums text-right ${
                    isZero ? "text-content-tertiary" : "text-content-primary"
                  }`}
                >
                  {count}
                </span>
                <span
                  className={`text-[12px] tabular-nums text-right ${
                    isZero ? "text-content-tertiary" : "text-accent-primary"
                  }`}
                >
                  {pct}%
                </span>
              </Fragment>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/**
 * Compact 3-row comparison vs Socialinsider Instagram reference. Factual
 * only; never imperative. Hidden when no external reference is available.
 */
function ExternalReferenceTable({
  refs,
  formats,
  postsAnalyzed,
}: {
  refs: SocialinsiderInstagramContext | null;
  formats: FormatEntry[];
  postsAnalyzed: number;
}) {
  const { t, i18n } = useTranslation("report");
  if (!refs) return null;
  const rows: Array<{
    key: "Carousels" | "Reels" | "Imagens";
    refData: SocialinsiderFormatRef | null;
  }> = [
    { key: "Carousels", refData: refs.carousel },
    { key: "Reels", refData: refs.reel },
    { key: "Imagens", refData: refs.image },
  ];
  const anyRef = rows.find((r) => r.refData);
  if (!anyRef) return null;

  const provisional = postsAnalyzed > 0 && postsAnalyzed < 8;
  const range = anyRef.refData
    ? formatDateRange(
        anyRef.refData.dataRange.from,
        anyRef.refData.dataRange.to,
        i18n.language,
      )
    : "";

  const byKey = new Map<string, FormatEntry>();
  formats.forEach((f) => byKey.set(f.format, f));

  // Profile monthly frequency by format (very rough — based on share × cadence
  // would require window; we only present count + share, and use share to
  // decide above/below the reference qualitatively).
  function readingFor(
    key: "Carousels" | "Reels" | "Imagens",
    refData: SocialinsiderFormatRef | null,
  ): string {
    void refData;
    // Delegates to the pure helper `computeExternalReading`; see its
    // docblock — refShare is DIRECTIONAL only, never a volume target.
    const reading = computeExternalReading(key, refs, formats);
    switch (reading) {
      case "above":
        return t("format.external_ref.reading_above_freq");
      case "below":
        return t("format.external_ref.reading_below_freq");
      case "near":
        return t("format.external_ref.reading_near_freq");
      case "absent":
        return t("format.external_ref.absent");
      case "dash":
      default:
        return t("format.external_ref.reading_dash");
    }
  }

  function refCell(refData: SocialinsiderFormatRef | null): string {
    if (!refData) return "—";
    const eng = refData.engagementPct;
    const posts = refData.postsPerMonth;
    if (posts !== null && eng !== null) {
      return t("format.external_ref.ref_cell", {
        posts,
        eng: eng.toFixed(2),
      });
    }
    if (posts !== null) {
      return t("format.external_ref.ref_cell_no_eng", { posts });
    }
    if (eng !== null) {
      return t("format.external_ref.ref_cell_no_freq", { eng: eng.toFixed(2) });
    }
    return "—";
  }

  function profileCell(key: "Carousels" | "Reels" | "Imagens"): string {
    const entry = byKey.get(key);
    if (!entry || entry.count === 0) {
      return t("format.external_ref.absent");
    }
    return `${entry.count} · ${Math.round(entry.sharePct)}%`;
  }

  return (
    <div className="px-5 md:px-6 mt-4">
      <div className="rounded-xl border border-border-default bg-surface-muted/60 p-3.5 sm:p-4">
        <div className="flex items-baseline justify-between gap-3 mb-2">
          <span className="text-eyebrow-sm text-content-tertiary">
            {t("format.external_ref.title")}
          </span>
          {range ? (
            <span className="text-xs text-content-tertiary tabular-nums">
              {t("format.external_ref.subtitle", { range })}
            </span>
          ) : null}
        </div>
        {provisional ? (
          <p className="text-[12px] text-content-tertiary mb-2 italic">
            {t("format.external_ref.provisional")}
          </p>
        ) : null}
        {/* Mobile: stacked mini-cards (one per format). */}
        <div className="sm:hidden space-y-2" data-testid="external-ref-mobile">
          {rows.map(({ key, refData }) => (
            <div
              key={key}
              className="rounded-lg border border-border-subtle/60 bg-surface-secondary p-3 space-y-1.5"
            >
              <div className="text-[14px] font-semibold text-content-primary">
                {tFormatLegend(t, key)}
              </div>
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-[12px] text-content-tertiary">
                  {t("format.external_ref.mobile_label_profile")}
                </span>
                <span className="text-[13px] text-content-secondary tabular-nums text-right">
                  {profileCell(key)}
                </span>
              </div>
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-[12px] text-content-tertiary">
                  {t("format.external_ref.mobile_label_reference")}
                </span>
                <span className="text-[13px] text-content-secondary tabular-nums text-right">
                  {refCell(refData)}
                </span>
              </div>
              <div>
                <span className="inline-block text-xs text-content-secondary bg-surface-muted px-2 py-0.5 rounded-full">
                  {readingFor(key, refData)}
                </span>
              </div>
            </div>
          ))}
        </div>
        {/* Desktop: compact 4-column grid. */}
        <div className="hidden sm:grid grid-cols-[1fr_1.1fr_1.2fr_1fr] gap-x-3 gap-y-1.5 text-[12px]">
          <span className="text-content-tertiary uppercase tracking-[0.04em]">
            {t("format.external_ref.col_format")}
          </span>
          <span className="text-content-tertiary uppercase tracking-[0.04em]">
            {t("format.external_ref.col_profile")}
          </span>
          <span className="text-content-tertiary uppercase tracking-[0.04em]">
            {t("format.external_ref.col_reference")}
          </span>
          <span className="text-content-tertiary uppercase tracking-[0.04em]">
            {t("format.external_ref.col_reading")}
          </span>
          {rows.map(({ key, refData }) => (
            <Fragment key={key}>
              <span className="text-[13px] text-content-primary">
                {tFormatLegend(t, key)}
              </span>
              <span className="text-[13px] text-content-secondary tabular-nums">
                {profileCell(key)}
              </span>
              <span className="text-[13px] text-content-secondary tabular-nums">
                {refCell(refData)}
              </span>
              <span className="text-[13px] text-content-secondary">
                {readingFor(key, refData)}
              </span>
            </Fragment>
          ))}
        </div>
      </div>
    </div>
  );
}
