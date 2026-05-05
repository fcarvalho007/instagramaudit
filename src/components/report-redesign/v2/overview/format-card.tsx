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
import { useState } from "react";
import { Layers, Check, Play, Image, GalleryHorizontalEnd } from "lucide-react";

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
      strong: "Apostas em conteúdo para guardar.",
      rest: "Carrosséis funcionam para ensinar, listar e organizar ideias.",
    };
  }
  if (dk === "reel") {
    return {
      strong: "Apostas em alcance e descoberta.",
      rest: "Reels funcionam para entrar em novas audiências.",
    };
  }
  if (dk === "image") {
    return {
      strong: "Apostas em comunicação direta.",
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
  const dk = toDominantKey(dominantFormat, dominantFormatShare);
  const verdict = getFormatVerdict(dk);
  const statsLine = buildStatsLine(formats, postsAnalyzed);

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
    <article className="rounded-2xl border border-border-default bg-surface-secondary p-4 md:p-5 shadow-card flex flex-col gap-3">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-[11px] font-medium text-content-secondary">
          <Layers className="size-3.5" aria-hidden="true" />
          Tipo de conteúdo
        </span>
        <span className="text-[9px] text-content-tertiary tracking-[0.06em]">
          ✦ DADOS
        </span>
      </div>

      {/* Hero headline */}
      <div>
        <p className="font-display text-[1.35rem] md:text-[1.5rem] font-semibold text-content-primary leading-[1.15] tracking-tight">
          {headline}
        </p>
        <p className="text-[11px] text-content-secondary mt-1">
          {statsLine}
        </p>
      </div>

      {/* Thumbnail grid */}
      {sortedPosts.length > 0 && (
        <div>
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
      <div className="mt-auto rounded-lg bg-tint-success border border-border-subtle px-3 py-2 flex items-start gap-2">
        <Check className="size-3.5 text-signal-success shrink-0 mt-0.5" aria-hidden="true" />
        <p className="text-[11px] text-content-primary leading-[1.4]">
          <span className="font-medium">{verdict.strong}</span>{" "}
          {verdict.rest}
        </p>
      </div>
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
