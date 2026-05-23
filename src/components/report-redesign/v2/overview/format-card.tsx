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
import { Fragment, useState } from "react";
import { Play, Image, GalleryHorizontalEnd } from "lucide-react";
import { InsightCallout, type InsightTone } from "./insight-callout";

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
}

// ─── Helpers ────────────────────────────────────────────────────────

const FORMAT_PT: Record<FormatKey, string> = {
  Carousels: "carrosséis",
  Reels: "reels",
  Imagens: "imagens",
  Video: "vídeos",
};

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

const FORMAT_LEGEND_PT: Record<FormatKey, string> = {
  Carousels: "Carrosséis",
  Reels: "Reels",
  Imagens: "Imagens",
  Video: "Vídeos",
};

const BREAKDOWN_ORDER: FormatKey[] = ["Carousels", "Reels", "Imagens"];

const TYPE_PT: Record<string, string> = {
  carousel: "carrossel",
  reel: "reel",
  image: "imagem",
  video: "vídeo",
  unknown: "post",
};

export function getFormatHeadline(formats: FormatEntry[]): string {
  if (!formats.length) return "Sem dados de formato";
  const sorted = [...formats].sort((a, b) => b.sharePct - a.sharePct);
  const top = sorted[0];
  const label = FORMAT_PT[top.format] ?? top.format;
  const capitalised = label.charAt(0).toUpperCase() + label.slice(1);
  if (top.sharePct >= 80) return `Apenas ${label}`;
  if (top.sharePct >= 60) return `${capitalised} dominam`;
  if (top.sharePct >= 40) return "Mistura equilibrada";
  return "Formato pouco definido";
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

/** Build the dynamic subtitle: "Carrosséis mais frequentes · 8 em cada 12 são carrosséis · 4 são reels" */
function buildSubtitleLine(formats: FormatEntry[], postsAnalyzed: number): string {
  const sorted = [...formats].filter((f) => f.count > 0).sort((a, b) => b.count - a.count);
  if (!sorted.length) return `${postsAnalyzed} publicações analisadas`;
  const topLabel = FORMAT_PT[sorted[0].format] ?? sorted[0].format;
  const capitalised = topLabel.charAt(0).toUpperCase() + topLabel.slice(1);
  let line = `${capitalised} mais frequentes · ${sorted[0].count} em cada ${postsAnalyzed} são ${topLabel}`;
  if (sorted.length > 1) {
    const rest = sorted.slice(1).map((f) => `${f.count} são ${FORMAT_PT[f.format] ?? f.format}`);
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
  if (dk === "carousel") {
    return {
      strong: "Foco em conteúdo para guardar.",
      rest: "Carrosséis funcionam para ensinar, listar e organizar ideias.",
    };
  }
  if (dk === "reel") {
    return {
      strong: "Foco em alcance e descoberta.",
      rest: "Reels funcionam para entrar em novas audiências.",
    };
  }
  if (dk === "image") {
    return {
      strong: "Foco em comunicação direta.",
      rest: "Imagens funcionam para mensagens claras e momentos.",
    };
  }
  return {
    strong: "Mix variado.",
    rest: "Diferentes formatos servem objetivos diferentes — as próximas secções mostram onde cada formato rende mais.",
  };
}

function buildStatsLine(formats: FormatEntry[], postsAnalyzed: number): string {
  const sorted = [...formats].filter((f) => f.count > 0).sort((a, b) => b.count - a.count);
  if (!sorted.length) return `${postsAnalyzed} publicações analisadas`;
  const parts = sorted.map((f) => `${f.count} são ${FORMAT_PT[f.format] ?? f.format}`);
  if (parts.length <= 1) {
    return `${sorted[0].count} em cada ${postsAnalyzed} são ${FORMAT_PT[sorted[0].format]}`;
  }
  return `${sorted[0].count} em cada ${postsAnalyzed} são ${FORMAT_PT[sorted[0].format]} · ${parts.slice(1).join(" · ")}`;
}

// ─── Component ──────────────────────────────────────────────────────

export function FormatCard({
  postsAnalyzed,
  dominantFormat,
  dominantFormatShare,
  formats,
  analysedPostFormats,
}: FormatCardProps) {
  const headline = getFormatHeadline(formats);
  const variationStatus = getFormatVariationStatus(formats);
  const subtitleLine = buildSubtitleLine(formats, postsAnalyzed);
  const dk = toDominantKey(dominantFormat, dominantFormatShare);
  const verdict = getFormatVerdict(dk);
  const statsLine = buildStatsLine(formats, postsAnalyzed);
  // Determine callout tone based on format variation
  const calloutTone: InsightTone =
    variationStatus === "Muito variado" ? "positive"
    : variationStatus === "Variado" ? "neutral"
    : dk === "mixed" ? "neutral"
    : "warning";
  const calloutLabel =
    calloutTone === "positive" ? "PONTO FORTE"
    : calloutTone === "warning" ? "A MELHORAR"
    : "DIAGNÓSTICO";

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
  const ariaFormatParts = sortedFormats.map((f) => `${f.count} ${FORMAT_PT[f.format]}`);
  const ariaLabel = `Distribuição dos ${postsAnalyzed} posts analisados: ${ariaFormatParts.join(" e ")}`;

  const activeFormats = sortedFormats;

  return (
    <article className="rounded-2xl border border-border-default bg-surface-secondary shadow-card overflow-hidden flex flex-col">
      {/* Header */}
      <div className="px-5 md:px-6 pt-6 md:pt-8 space-y-2.5">
        <div className="flex items-start gap-3">
          <h3 className="font-display text-[1.5rem] md:text-[2rem] font-semibold tracking-tight text-content-primary leading-tight">
            Formato{" "}
            <span
              className="font-semibold"
              style={{
                borderBottom: `2px solid ${
                  variationStatus === "Muito variado"
                    ? "rgba(29,158,117,0.50)"
                    : variationStatus === "Variado"
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
        <p className="text-[13px] md:text-[14px] text-content-secondary leading-snug">
          {subtitleLine}
        </p>
      </div>

      {/* Breakdown — donut + legend */}
      <FormatBreakdown formats={formats} postsAnalyzed={postsAnalyzed} />

      {/* Thumbnail grid */}
      {sortedPosts.length > 0 && (
        <div className="px-5 md:px-6 mt-6">
          <span className="text-[10px] uppercase tracking-[0.04em] text-content-tertiary block mb-1.5">
            {postsAnalyzed} posts analisados
          </span>
          <div
            role="img"
            aria-label={ariaLabel}
            className="grid gap-1"
            style={{
              gridTemplateColumns: `repeat(${Math.min(sortedPosts.length, 6)}, 1fr)`,
            }}
          >
            {sortedPosts.map((post, idx) => {
              const fk = TYPE_TO_FORMAT_KEY[post.type] ?? "unknown";
              const style = FORMAT_STYLE[fk] ?? FORMAT_STYLE.unknown;
              const Icon = style.icon;
              const label = TYPE_PT[post.type] ?? post.type;
              return (
                <span
                  key={`${post.date}-${idx}`}
                  title={`${label} · ${post.date}`}
                  className="relative rounded-[4px] overflow-hidden bg-slate-50 border border-border-subtle/40"
                  style={{ aspectRatio: "3/4" }}
                >
                  {post.thumbnailUrl ? (
                    <PostThumb src={post.thumbnailUrl} alt={label} />
                  ) : (
                    <span className="absolute inset-0 flex items-center justify-center">
                      <Icon className={`size-3.5 ${style.iconColor}`} aria-hidden="true" />
                    </span>
                  )}
                  {/* Small format dot indicator — bottom-right */}
                  <span
                    className={`absolute bottom-0.5 right-0.5 size-[6px] rounded-full ring-1 ring-white ${style.dot}`}
                    aria-hidden="true"
                  />
                </span>
              );
            })}
          </div>

          {/* Legend */}
          <div className="flex items-center gap-3 mt-1.5">
            {activeFormats.map((f) => {
              const style = FORMAT_STYLE[f.format];
              return (
                <span key={f.format} className="inline-flex items-center gap-1 text-[9px] text-content-secondary">
                  <span className={`size-[7px] rounded-full ${style.dot} shrink-0`} aria-hidden="true" />
                  {FORMAT_PT[f.format]} ({f.count})
                </span>
              );
            })}
          </div>
        </div>
      )}

      {/* Verdict */}
      <InsightCallout tone={calloutTone} label={calloutLabel} className="mt-auto mx-5 md:mx-6 mb-6 md:mb-8">
        <p>
          <span className="font-semibold">{verdict.strong}</span>{" "}
          {verdict.rest}
        </p>
      </InsightCallout>
    </article>
  );
}

/** Tiny thumbnail with graceful fallback to icon. */
function PostThumb({ src, alt }: { src: string; alt: string }) {
  const [failed, setFailed] = useState(false);
  if (failed) {
    return <Image className="size-3.5 text-slate-400" aria-hidden="true" />;
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
}: {
  formats: FormatEntry[];
  postsAnalyzed: number;
}) {
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
  const size = 88;
  const stroke = 11;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  let offsetAcc = 0;

  return (
    <div className="px-5 md:px-6 mt-5">
      <div
        className="flex items-center gap-5 md:gap-6 rounded-xl bg-surface-muted/60 border border-border-subtle/50 px-4 md:px-5 py-3.5"
        role="img"
        aria-label={`Distribuição de formatos em ${total} publicações: ${rows
          .map((k) => `${byKey.get(k)?.count ?? 0} ${FORMAT_LEGEND_PT[k]} (${pctByKey.get(k) ?? 0}%)`)
          .join(", ")}`}
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
            <span className="text-[1.5rem] font-semibold text-content-primary tabular-nums">
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
                  className={`flex items-center gap-2 text-[13px] ${
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
                  {FORMAT_LEGEND_PT[k]}
                </span>
                <span
                  className={`text-[13px] font-semibold tabular-nums text-right ${
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
