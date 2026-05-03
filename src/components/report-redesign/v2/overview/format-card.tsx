/**
 * Zone D — Card 2: Tipo de conteúdo.
 * Human-readable headline → stats → visual thumbnails → verdict.
 */
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

const FORMAT_STYLE: Record<string, { bg: string; iconColor: string; icon: typeof Play }> = {
  Reels: { bg: "bg-sky-100", iconColor: "text-sky-700", icon: Play },
  Carousels: { bg: "bg-emerald-100", iconColor: "text-emerald-700", icon: GalleryHorizontalEnd },
  Imagens: { bg: "bg-amber-100", iconColor: "text-amber-700", icon: Image },
  Video: { bg: "bg-sky-100", iconColor: "text-sky-700", icon: Play },
  unknown: { bg: "bg-slate-100", iconColor: "text-slate-500", icon: Image },
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
    rest: "Diferentes formatos servem objetivos diferentes — vê nas próximas secções onde cada um está a render.",
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

  // Active formats for legend
  const activeFormats = sortedFormats;

  return (
    <article className="rounded-2xl border border-slate-200/70 bg-white p-5 md:p-6 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_-12px_rgba(15,23,42,0.08)] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <span className="flex items-center gap-1.5 text-[13px] font-medium text-slate-900">
          <Layers className="size-4 text-slate-500" aria-hidden="true" />
          Tipo de conteúdo
        </span>
        <span className="text-[9px] text-slate-400 tracking-[0.06em]">
          ⬡ DADOS
        </span>
      </div>

      {/* Human headline */}
      <p className="font-display text-[22px] font-medium text-slate-900 leading-[1.2] mb-1.5">
        {headline}
      </p>

      {/* Stats line */}
      <p className="text-[12px] text-slate-500 mb-5">
        {statsLine}
      </p>

      {/* Thumbnails visualisation */}
      {thumbnails.length > 0 && (
        <div className="mb-5">
          <span className="text-[10px] uppercase tracking-[0.04em] text-slate-400 block mb-2">
            {`OS TEUS ${postsAnalyzed} POSTS`}
          </span>
          <div
            role="img"
            aria-label={ariaLabel}
            className="flex flex-wrap gap-1"
          >
            {sortedPosts.map((post, idx) => {
              const fk = TYPE_TO_FORMAT_KEY[post.type] ?? "unknown";
              const style = FORMAT_STYLE[fk] ?? FORMAT_STYLE.unknown;
              const Icon = style.icon;
              const label = TYPE_PT[post.type] ?? post.type;
              return (
                <span
                  key={`${post.date}-${idx}`}
                  title={`Post de ${post.date} · ${label}`}
                  className={`flex items-center justify-center rounded-[3px] shrink-0 ${style.bg}`}
                  style={{ width: 28, height: 37 }}
                >
                  <Icon className={`size-3 ${style.iconColor}`} aria-hidden="true" />
                </span>
              );
            })}
          </div>

          {/* Legend */}
          <div className="flex items-center gap-4 mt-2">
            {activeFormats.map((f) => {
              const style = FORMAT_STYLE[f.format];
              return (
                <span key={f.format} className="inline-flex items-center gap-1.5 text-[10px] text-slate-500">
                  <span className={`size-2 rounded-full ${style.bg} shrink-0`} aria-hidden="true" />
                  {FORMAT_PT[f.format]} ({f.count})
                </span>
              );
            })}
          </div>
        </div>
      )}

      {/* Verdict */}
      <div className="mt-auto rounded-lg bg-emerald-50 border border-emerald-100 px-3 py-2.5 flex items-start gap-2">
        <Check className="size-3.5 text-emerald-600 shrink-0 mt-0.5" aria-hidden="true" />
        <p className="text-[12px] text-emerald-900 leading-[1.4]">
          <span className="font-medium">{verdict.strong}</span>{" "}
          {verdict.rest}
        </p>
      </div>
    </article>
  );
}
