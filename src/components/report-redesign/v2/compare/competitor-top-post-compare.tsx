import { useState } from "react";
import { CompareCardShell } from "./compare-card-shell";
import type { ReportCompetitorBreakdownEntry } from "@/components/report/report-mock-data";
import type { ReportEnriched } from "@/lib/report/snapshot-to-report-data";
import { pickThumbnailUrl } from "@/lib/report/pick-thumbnail";
import { cn } from "@/lib/utils";

type EnrichedTopPost = ReportEnriched["topPosts"][number];

interface NormalizedPost {
  caption: string;
  format: string;
  likes: number;
  comments: number;
  engagementPct: number;
  date: string;
  thumbnailUrl: string | null;
  permalink: string | null;
}

interface Props {
  primaryHandle: string;
  primaryAvatarUrl?: string | null;
  primaryFullName?: string | null;
  primaryVerified?: boolean;
  primaryTopPost: EnrichedTopPost | null;
  competitor: ReportCompetitorBreakdownEntry;
}

const MONTHS_PT = [
  "jan",
  "fev",
  "mar",
  "abr",
  "mai",
  "jun",
  "jul",
  "ago",
  "set",
  "out",
  "nov",
  "dez",
];

function formatDatePt(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return `${d.getUTCDate()} ${MONTHS_PT[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

function formatLabelPt(raw: string | null | undefined): string {
  if (!raw) return "Publicação";
  const v = raw.toLowerCase();
  if (v.includes("reel")) return "Reel";
  if (v.includes("carousel") || v.includes("carrosse") || v.includes("sidecar")) return "Carrossel";
  if (v.includes("image") || v.includes("photo") || v.includes("imagem")) return "Imagem";
  return raw;
}

function fmtInt(n: number): string {
  if (!Number.isFinite(n) || n < 0) return "0";
  return Math.round(n).toLocaleString("pt-PT");
}

function fmtPct(n: number): string {
  if (!Number.isFinite(n) || n <= 0) return "0,0 %";
  return `${n.toLocaleString("pt-PT", { maximumFractionDigits: 1, minimumFractionDigits: 1 })} %`;
}

function normalizePrimary(p: EnrichedTopPost): NormalizedPost {
  return {
    caption: typeof p.caption === "string" ? p.caption : "",
    format: formatLabelPt(p.format),
    likes: typeof p.likes === "number" ? p.likes : 0,
    comments: typeof p.comments === "number" ? p.comments : 0,
    engagementPct: typeof p.engagementPct === "number" ? p.engagementPct : 0,
    date: p.date || formatDatePt(p.takenAtIso ?? null),
    thumbnailUrl: p.thumbnailUrl ?? null,
    permalink: p.permalink ?? null,
  };
}

function pickCompetitorTopPost(rawPosts: unknown[] | undefined): NormalizedPost | null {
  if (!Array.isArray(rawPosts) || rawPosts.length === 0) return null;
  const eligible = rawPosts
    .map((p) => (p && typeof p === "object" ? (p as Record<string, unknown>) : null))
    .filter((p): p is Record<string, unknown> => !!p && p.is_pinned !== true);
  if (eligible.length === 0) return null;

  const ranked = eligible
    .map((p) => ({
      raw: p,
      er: typeof p.engagement_pct === "number" ? p.engagement_pct : 0,
      taken:
        typeof p.taken_at === "number"
          ? p.taken_at
          : typeof p.taken_at_iso === "string"
            ? Date.parse(p.taken_at_iso) / 1000
            : 0,
    }))
    .sort((a, b) => {
      if (b.er !== a.er) return b.er - a.er;
      return b.taken - a.taken;
    });

  const top = ranked[0]?.raw;
  if (!top) return null;

  const permalinkRaw =
    typeof top.permalink === "string" && top.permalink.trim().length > 0
      ? (top.permalink as string).trim()
      : null;
  const shortcode =
    typeof top.shortcode === "string" && (top.shortcode as string).trim().length > 0
      ? (top.shortcode as string).trim()
      : null;
  const permalink =
    permalinkRaw ?? (shortcode ? `https://www.instagram.com/p/${shortcode}/` : null);

  return {
    caption: typeof top.caption === "string" ? top.caption : "",
    format: formatLabelPt(typeof top.format === "string" ? top.format : null),
    likes: typeof top.likes === "number" ? top.likes : 0,
    comments: typeof top.comments === "number" ? top.comments : 0,
    engagementPct: typeof top.engagement_pct === "number" ? top.engagement_pct : 0,
    date: formatDatePt(typeof top.taken_at_iso === "string" ? top.taken_at_iso : null),
    thumbnailUrl: pickThumbnailUrl({
      thumbnail_storage_url:
        typeof top.thumbnail_storage_url === "string" ? top.thumbnail_storage_url : null,
      thumbnail_url: typeof top.thumbnail_url === "string" ? top.thumbnail_url : null,
    }),
    permalink,
  };
}

function captionExcerpt(c: string, max = 140): string {
  const clean = c.replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  return clean.slice(0, max).trimEnd() + "…";
}

function ThumbBox({ post }: { post: NormalizedPost }) {
  const [broken, setBroken] = useState(false);
  const showImg = post.thumbnailUrl && !broken;
  return (
    <div className="relative aspect-video w-full overflow-hidden rounded-xl border border-border-default/60 bg-surface-muted">
      {showImg ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={post.thumbnailUrl ?? undefined}
          alt=""
          loading="lazy"
          referrerPolicy="no-referrer"
          onError={() => setBroken(true)}
          className="h-full w-full object-cover"
        />
      ) : (
        <div
          aria-hidden
          className="flex h-full w-full items-center justify-center text-content-tertiary"
          style={{
            background:
              "linear-gradient(135deg, color-mix(in oklab, var(--accent-primary) 12%, white) 0%, color-mix(in oklab, var(--accent-secondary) 10%, white) 100%)",
          }}
        >
          <span className="text-eyebrow-sm">{post.format}</span>
        </div>
      )}
    </div>
  );
}

function PostSide({
  side,
  post,
}: {
  side: "primary" | "competitor";
  post: NormalizedPost;
}) {
  const topBar = side === "primary" ? "bg-accent-primary" : "bg-compare-competitor";
  const eyebrowColor =
    side === "primary" ? "text-accent-primary" : "text-compare-competitor";
  const eyebrow = side === "primary" ? "Perfil" : "Concorrente";

  const content = (
    <div
      className={cn(
        "relative flex h-full flex-col overflow-hidden rounded-2xl border border-border-default/70 bg-white p-4 sm:p-5",
        "shadow-[0_1px_2px_-1px_rgba(15,23,42,0.04),0_8px_24px_-12px_rgba(15,23,42,0.08)]",
      )}
    >
      <span aria-hidden="true" className={cn("absolute inset-x-0 top-0 h-[3px]", topBar)} />
      <span className={cn("text-eyebrow-sm mb-3", eyebrowColor)}>{eyebrow}</span>
      <ThumbBox post={post} />
      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-content-tertiary">
        <span className="inline-flex items-center rounded-full border border-border-subtle bg-surface-muted/60 px-2 py-0.5">
          {post.format}
        </span>
        <span className="tabular-nums">{post.date}</span>
      </div>
      {post.caption ? (
        <p className="mt-3 text-sm text-content-secondary leading-relaxed line-clamp-3">
          {captionExcerpt(post.caption)}
        </p>
      ) : (
        <p className="mt-3 text-sm text-content-tertiary italic">Sem legenda.</p>
      )}
      <dl className="mt-4 flex flex-wrap items-baseline gap-x-4 gap-y-1 text-sm">
        <div className="flex items-baseline gap-1">
          <dt className="text-content-tertiary">Likes</dt>
          <dd className="font-semibold tabular-nums text-content-primary">{fmtInt(post.likes)}</dd>
        </div>
        <div className="flex items-baseline gap-1">
          <dt className="text-content-tertiary">Comentários</dt>
          <dd className="font-semibold tabular-nums text-content-primary">{fmtInt(post.comments)}</dd>
        </div>
        <div className="flex items-baseline gap-1">
          <dt className="text-content-tertiary">ER</dt>
          <dd className="font-semibold tabular-nums text-content-primary">{fmtPct(post.engagementPct)}</dd>
        </div>
      </dl>
    </div>
  );

  if (post.permalink) {
    return (
      <a
        href={post.permalink}
        target="_blank"
        rel="noreferrer"
        aria-label={`Abrir publicação no Instagram`}
        className="block h-full transition-transform hover:-translate-y-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary rounded-2xl"
      >
        {content}
      </a>
    );
  }
  return content;
}

function MissingCompetitorSide() {
  return (
    <div
      role="note"
      className={cn(
        "relative flex h-full flex-col items-center justify-center overflow-hidden rounded-2xl border border-dashed border-border-default/70 bg-surface-muted/40 p-6 text-center",
      )}
    >
      <span
        aria-hidden="true"
        className="absolute inset-x-0 top-0 h-[3px] bg-compare-competitor opacity-60"
      />
      <span className="text-eyebrow-sm text-compare-competitor mb-3">Concorrente</span>
      <p className="text-sm font-medium text-content-secondary leading-relaxed">
        Dados de publicações do concorrente indisponíveis nesta amostra.
      </p>
    </div>
  );
}

/**
 * Pro-only "Profile vs Competitor" top-post comparison.
 *
 * Picks the best recent post on each side (ranked by engagement_pct;
 * tiebreak: most recent). Returns null if the primary has no post —
 * never broken or empty on the primary side.
 */
export function CompetitorTopPostCompare({
  primaryHandle,
  primaryAvatarUrl,
  primaryFullName,
  primaryVerified,
  primaryTopPost,
  competitor,
}: Props) {
  if (!primaryTopPost) return null;
  const primary = normalizePrimary(primaryTopPost);
  const comp = pickCompetitorTopPost(competitor.posts);

  const footer = comp
    ? buildFooter(primary, comp)
    : null;

  return (
    <CompareCardShell
      title="Publicação em destaque"
      subtitle="Melhor publicação recente lado a lado"
      windowAligned={competitor.windowAligned}
      primary={{
        handle: primaryHandle,
        avatarUrl: primaryAvatarUrl ?? null,
        isVerified: Boolean(primaryVerified),
        displayName: primaryFullName ?? null,
      }}
      competitor={{
        handle: competitor.username,
        avatarUrl: competitor.avatarUrl ?? null,
        isVerified: competitor.isVerified,
        displayName: competitor.displayName,
      }}
      footer={footer ?? undefined}
    >
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6">
        <PostSide side="primary" post={primary} />
        {comp ? <PostSide side="competitor" post={comp} /> : <MissingCompetitorSide />}
      </div>
    </CompareCardShell>
  );
}

function buildFooter(primary: NormalizedPost, comp: NormalizedPost): string | null {
  const delta = primary.engagementPct - comp.engagementPct;
  if (!Number.isFinite(delta)) return null;
  const sign = delta >= 0 ? "+" : "−";
  const absDelta = Math.abs(delta).toLocaleString("pt-PT", {
    maximumFractionDigits: 1,
    minimumFractionDigits: 1,
  });
  if (Math.abs(delta) < 0.1) {
    return `A tua melhor publicação (${primary.format}) e a do concorrente (${comp.format}) têm desempenho equivalente.`;
  }
  if (delta >= 0) {
    return `A tua melhor publicação (${primary.format}, ${fmtPct(primary.engagementPct)}) supera a do concorrente (${comp.format}, ${fmtPct(comp.engagementPct)}) em ${sign}${absDelta} pp.`;
  }
  return `A melhor publicação do concorrente (${comp.format}, ${fmtPct(comp.engagementPct)}) supera a tua (${primary.format}, ${fmtPct(primary.engagementPct)}) em ${sign}${absDelta} pp.`;
}