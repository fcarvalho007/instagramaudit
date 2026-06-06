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
import type { InsightTone } from "./insight-callout";
import type {
  SocialinsiderFormatRef,
  SocialinsiderInstagramContext,
} from "@/lib/knowledge/socialinsider-context";
import { ExternalSourceNote, formatDateRange } from "./external-source-note";
import { ReportCardSectionHeader } from "../report-card-section-header";

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
  // Unified blue family — aligned with the rest of the report accents.
  Carousels: "#3772E5",
  Reels: "color-mix(in oklab, #3772E5 45%, #FFFFFF)",
  Imagens: "color-mix(in oklab, #3772E5 22%, #FFFFFF)",
  Video: "color-mix(in oklab, #3772E5 32%, #FFFFFF)",
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

  return (
    <article className="rounded-2xl border border-border-default bg-surface-secondary shadow-card overflow-hidden flex flex-col">
      {/* Header */}
      <div className="px-5 md:px-6 pt-5 md:pt-6 space-y-2">
        <ReportCardSectionHeader
          title={t("format.title")}
          qualifier={variationStatus}
          qualifierTone={
            variationKey === "varied_high"
              ? "positive"
              : variationKey === "varied"
                ? "info"
                : "warning"
          }
          subtitle={subtitleLine}
          bottomMargin={false}
        />
      </div>

      {/* Hero proportion bar + legend */}
      <FormatProportionBar formats={formats} t={t} ariaLabel={ariaLabel} />

      {/* Thumbnail filmstrip — single elegant row */}
      {sortedPosts.length > 0 && (
        <FormatFilmstrip
          posts={sortedPosts}
          postsAnalyzed={postsAnalyzed}
          t={t}
        />
      )}

      {/* Verdict — calmer, editorial */}
      <div className="px-5 md:px-6 mt-6 mb-5 sm:mb-6">
        <div className="border-t border-border-subtle/60 pt-4">
          <span className="text-eyebrow-sm text-content-tertiary">
            {calloutLabel}
          </span>
          <p className="mt-1.5 text-[14px] leading-relaxed text-content-secondary">
            <span className="font-semibold text-content-primary">{verdict.strong}</span>{" "}
            {verdict.rest}
          </p>
        </div>
      </div>
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

/**
 * Cinematic split hero — large editorial percentage on the left, fully
 * filled vertical proportion bar on the right. Zero-count formats appear
 * only in the legend below, never as bar segments. Pure presentational
 * change — math/rounding is unchanged from the previous implementation.
 */
function FormatProportionBar({
  formats,
  t,
  ariaLabel,
}: {
  formats: FormatEntry[];
  t: TFunction;
  ariaLabel: string;
}) {
  const byKey = new Map<FormatKey, FormatEntry>();
  formats.forEach((f) => byKey.set(f.format, f));

  const rows: FormatKey[] = [...BREAKDOWN_ORDER];
  const video = byKey.get("Video");
  if (video && video.count > 0) rows.push("Video");

  const total = rows.reduce((s, k) => s + (byKey.get(k)?.count ?? 0), 0);
  if (total === 0) return null;

  // Same normalised-to-100 rounding logic as before (no math change).
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

  // Bar segments: only formats with count > 0, ordered by share desc.
  const segments = rows
    .map((k) => ({
      key: k,
      count: byKey.get(k)?.count ?? 0,
      pct: pctByKey.get(k) ?? 0,
    }))
    .filter((s) => s.count > 0)
    .sort((a, b) => b.pct - a.pct);

  const ACCENT = "#3772E5";
  const segmentBg = (idx: number) => {
    if (idx === 0) return ACCENT;
    // Solid tints over white (never depend on --surface-base) so segments
    // always read clearly against the card background.
    const mix = Math.max(18, 42 - idx * 12);
    return `color-mix(in oklab, ${ACCENT} ${mix}%, #FFFFFF)`;
  };
  const segmentFg = (idx: number) =>
    idx === 0 ? "#FFFFFF" : "var(--content-primary, #0F172A)";

  const dominant = segments[0];
  const dominantLabel = tFormatPlural(t, dominant.key);
  const dominantCapital =
    dominantLabel.charAt(0).toUpperCase() + dominantLabel.slice(1);

  return (
    <div className="px-5 md:px-6 mt-6">
      <div
        role="img"
        aria-label={ariaLabel}
        className="grid grid-cols-[1fr_auto] gap-5 md:gap-8 items-stretch rounded-2xl border border-border-subtle/60 bg-surface-base/50 px-5 md:px-7 py-5 md:py-6"
      >
        {/* Left — editorial percentage */}
        <div className="flex flex-col justify-center min-w-0">
          <span
            className="font-display font-semibold tabular-nums leading-[0.95] tracking-[-0.02em] text-[3.5rem] sm:text-[4.5rem] md:text-[5.25rem]"
            style={{ color: ACCENT }}
          >
            {dominant.pct}%
          </span>
          <span className="mt-2 text-[13px] md:text-sm text-content-secondary leading-snug">
            <span className="font-semibold text-content-primary">
              {dominantCapital}
            </span>{" "}
            · {dominant.count} {t("format.subtitle.extra_of", {
              defaultValue: "de",
            })}{" "}
            {total}
          </span>
        </div>

        {/* Right — cinematic vertical proportion column */}
        <div className="flex flex-col w-[88px] sm:w-[104px] md:w-[128px] h-[156px] md:h-[180px] rounded-xl overflow-hidden border border-border-subtle/60 shadow-sm">
          {segments.map((seg, idx) => {
            const label = tFormatPlural(t, seg.key);
            const showInline = seg.pct >= 14;
            return (
              <div
                key={seg.key}
                className="flex flex-col items-center justify-center px-2 text-center min-h-0"
                style={{
                  flexBasis: `${seg.pct}%`,
                  flexGrow: 0,
                  flexShrink: 0,
                  backgroundColor: segmentBg(idx),
                  color: segmentFg(idx),
                }}
                title={`${seg.pct}% · ${label} · ${seg.count}`}
              >
                {showInline ? (
                  <>
                    <span className="text-[13px] md:text-sm font-semibold tabular-nums leading-none">
                      {seg.pct}%
                    </span>
                    <span
                      className="mt-1 text-[10px] md:text-[11px] uppercase tracking-[0.12em] leading-none truncate max-w-full"
                      style={{
                        color:
                          idx === 0
                            ? "color-mix(in oklab, #FFFFFF 80%, transparent)"
                            : "var(--content-secondary, #475569)",
                      }}
                    >
                      {label}
                    </span>
                  </>
                ) : (
                  <span className="text-[10px] font-semibold tabular-nums leading-none">
                    {seg.pct}%
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Subtle legend */}
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5">
        {rows.map((k) => {
          const entry = byKey.get(k);
          const count = entry?.count ?? 0;
          const isZero = count === 0;
          return (
            <span
              key={k}
              className={`inline-flex items-center gap-1.5 text-xs tabular-nums ${
                isZero ? "text-content-tertiary" : "text-content-secondary"
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
              {tFormatLegend(t, k)} {count}
            </span>
          );
        })}
      </div>
    </div>
  );
}

/** Single-row filmstrip of post thumbnails with overflow fade + +N chip. */
function FormatFilmstrip({
  posts,
  postsAnalyzed,
  t,
}: {
  posts: AnalysedPostFormat[];
  postsAnalyzed: number;
  t: TFunction;
}) {
  const MAX_VISIBLE = 12;
  const visible = posts.slice(0, MAX_VISIBLE);
  const overflow = Math.max(0, posts.length - MAX_VISIBLE);

  return (
    <div className="px-5 md:px-6 mt-6">
      <div className="mb-2.5">
        <span className="text-eyebrow-sm text-content-tertiary">
          {t("format.analyzed_count", { count: postsAnalyzed })}
        </span>
      </div>
      <div
        className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        style={{
          maskImage:
            "linear-gradient(to right, black 0, black calc(100% - 32px), transparent 100%)",
          WebkitMaskImage:
            "linear-gradient(to right, black 0, black calc(100% - 32px), transparent 100%)",
        }}
      >
        {visible.map((post, idx) => {
          const fk = TYPE_TO_FORMAT_KEY[post.type] ?? "unknown";
          const style = FORMAT_STYLE[fk] ?? FORMAT_STYLE.unknown;
          const Icon = style.icon;
          const label = tTypeSingular(t, post.type);
          return (
            <span
              key={`${post.date}-${idx}`}
              title={t("format.thumb_aria", { label, date: post.date })}
              className="relative shrink-0 h-16 w-16 md:h-20 md:w-20 rounded-lg overflow-hidden bg-surface-muted border border-border-default/60"
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
                  <Icon className={`size-6 ${style.iconColor}`} aria-hidden="true" />
                </span>
              )}
              <span
                className={`absolute bottom-1 right-1 size-2 rounded-full ring-1 ring-white ${style.dot}`}
                aria-hidden="true"
              />
            </span>
          );
        })}
        {overflow > 0 ? (
          <span className="relative shrink-0 h-16 w-16 md:h-20 md:w-20 rounded-lg border border-border-default/60 bg-surface-muted flex items-center justify-center text-[13px] font-semibold text-content-secondary tabular-nums">
            +{overflow}
          </span>
        ) : null}
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
