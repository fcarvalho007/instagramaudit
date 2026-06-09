import { useState } from "react";
import {
  CompareCardShell,
  CompareStatBlock,
  CompareThumbPlaceholder,
  CompareMissingDataNote,
} from "@/components/report-redesign/v2/compare";
import type { ReportCompetitorBreakdownEntry } from "@/components/report/report-mock-data";
import { pickThumbnailUrl } from "@/lib/report/pick-thumbnail";
import { cn } from "@/lib/utils";

interface PrimarySide {
  handle: string;
  avatarUrl?: string | null;
  fullName?: string | null;
  verified?: boolean;
  postingFrequencyWeekly: number;
}

export interface CadenceSamplePost {
  thumbUrl: string | null;
  permalink: string | null;
  takenAt: number | null;
}

interface Props {
  primary: PrimarySide;
  // TODO: multi-competitor layout (Fase 1.5) — today only the first
  // competitor is rendered.
  competitor: ReportCompetitorBreakdownEntry;
  /** Recent post thumbnails for the primary side, already sorted desc. */
  primaryRecentPosts?: CadenceSamplePost[];
  /** When true (default), parse competitor.posts in-card to extract a strip. */
  showSampleStrips?: boolean;
}

/**
 * Pro-only "Profile vs Competitor" cadence comparison — Frequency section.
 *
 * Adds optional sample strips of recent thumbnails (per side) sourced only
 * from the snapshot already in the page — no new fetches, no provider
 * calls. Broken/blocked thumbnails fall back to a clean placeholder.
 */
export function CompetitorCadenceCompare({
  primary,
  competitor,
  primaryRecentPosts,
  showSampleStrips = true,
}: Props) {
  if (!isPositive(primary.postingFrequencyWeekly)) return null;
  if (!isPositive(competitor.estimatedPostsPerWeek)) return null;

  const MAX = 5;
  const primaryStrip = (primaryRecentPosts ?? []).slice(0, MAX);
  const competitorStrip = showSampleStrips
    ? extractRecentPosts(competitor.posts, MAX)
    : [];
  // Count only real thumbnails (placeholders don't count as evidence)
  const primaryThumbs = primaryStrip.filter((p) => Boolean(p.thumbUrl)).length;
  const competitorThumbs = competitorStrip.filter((p) => Boolean(p.thumbUrl)).length;

  // Methodology line uses postsAnalyzed (analysed posts), not thumbnail
  // count — a blocked CDN doesn't reduce the analysed sample.
  const primaryPostsAnalyzed = primaryStrip.length;
  const competitorPostsAnalyzed =
    typeof competitor.postsAnalyzed === "number" && competitor.postsAnalyzed > 0
      ? competitor.postsAnalyzed
      : 0;
  const bothSidesHavePosts =
    primaryPostsAnalyzed > 0 && competitorPostsAnalyzed > 0;
  const fallbackSampleN = primaryPostsAnalyzed > 0
    ? primaryPostsAnalyzed
    : competitorPostsAnalyzed;

  const insight = buildCadenceInsight(
    primary.postingFrequencyWeekly,
    competitor.estimatedPostsPerWeek,
    { primary: primaryThumbs, competitor: competitorThumbs },
  );

  const competitorBlocked =
    competitor.hasPosts === true && competitorThumbs === 0;
  const competitorPostsMissing = competitor.hasPosts === false;

  return (
    <CompareCardShell
      title="Cadência semanal"
      subtitle="Publicações por semana"
      windowAligned={competitor.windowAligned}
      primary={{
        handle: primary.handle,
        avatarUrl: primary.avatarUrl ?? null,
        isVerified: Boolean(primary.verified),
        displayName: primary.fullName ?? null,
      }}
      competitor={{
        handle: competitor.username,
        avatarUrl: competitor.avatarUrl ?? null,
        isVerified: competitor.isVerified,
        displayName: competitor.displayName,
      }}
      footer={insight}
    >
      <CompareStatBlock
        variant="bare"
        label="Cadência semanal"
        primary={{
          handle: primary.handle,
          value: primary.postingFrequencyWeekly,
          formatted: fmtDecimal(primary.postingFrequencyWeekly, 1),
        }}
        competitor={{
          handle: competitor.username,
          value: competitor.estimatedPostsPerWeek,
          formatted: fmtDecimal(competitor.estimatedPostsPerWeek, 1),
        }}
        unit="abs"
        higherIsBetter={true}
      />

      <div className="mt-5 sm:mt-6 flex flex-col gap-2">
        <span className="text-eyebrow-sm text-content-tertiary">
          Amostra recente
        </span>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
          <SampleStrip
            side="primary"
            handle={primary.handle}
            posts={primaryStrip}
            slots={MAX}
            realCount={primaryThumbs}
          />
          <SampleStrip
            side="competitor"
            handle={competitor.username}
            posts={competitorStrip}
            slots={MAX}
            realCount={competitorThumbs}
          />
        </div>
      </div>

      <CompareMissingDataNote
        className="mt-4"
        sampleN={bothSidesHavePosts ? null : fallbackSampleN > 0 ? fallbackSampleN : null}
        perSide={
          bothSidesHavePosts
            ? {
                primaryHandle: primary.handle,
                primaryN: primaryPostsAnalyzed,
                competitorHandle: competitor.username,
                competitorN: competitorPostsAnalyzed,
              }
            : null
        }
        competitorMissing={competitorPostsMissing}
        qualifier={
          competitorBlocked
            ? "Miniaturas do concorrente indisponíveis (links de CDN expirados)."
            : null
        }
      />
    </CompareCardShell>
  );
}

// ─── Insight ──────────────────────────────────────────────────────

function buildCadenceInsight(
  weekly: number,
  cWeekly: number,
  strip: { primary: number; competitor: number },
): string {
  const tooSmall = strip.primary === 0 && strip.competitor === 0;
  if (tooSmall) {
    const r = weekly / cWeekly;
    if (r >= 1.05) return "Este perfil publica com maior frequência.";
    if (r <= 0.95) return "O concorrente publica com maior frequência.";
    return "Os dois perfis têm uma cadência semelhante.";
  }
  const ratio = weekly / cWeekly;
  const w = fmtDecimal(weekly, 1);
  const c = fmtDecimal(cWeekly, 1);
  const avg = fmtDecimal((weekly + cWeekly) / 2, 1);
  if (ratio >= 0.9 && ratio <= 1.1) {
    return `Os dois perfis publicam com ritmo semelhante (≈ ${avg} pub./semana).`;
  }
  if (ratio > 1.5) {
    return `Este perfil publica com uma cadência claramente superior (${w} vs ${c} pub./semana).`;
  }
  if (ratio > 1.1) {
    return `Este perfil publica mais (${w} vs ${c} pub./semana).`;
  }
  if (ratio < 0.66) {
    return `O concorrente publica com uma cadência claramente superior (${c} vs ${w} pub./semana).`;
  }
  return `O concorrente publica mais (${c} vs ${w} pub./semana).`;
}

// ─── Strip extraction ─────────────────────────────────────────────

function extractRecentPosts(
  raw: unknown[] | undefined,
  max: number,
): CadenceSamplePost[] {
  if (!Array.isArray(raw) || raw.length === 0) return [];
  const items: CadenceSamplePost[] = [];
  for (const it of raw) {
    if (!it || typeof it !== "object") continue;
    const obj = it as Record<string, unknown>;
    const thumb = pickThumbnailUrl({
      thumbnail_storage_url: typeof obj.thumbnail_storage_url === "string" ? obj.thumbnail_storage_url : null,
      thumbnail_url: typeof obj.thumbnail_url === "string" ? obj.thumbnail_url : null,
      thumbnailUrl: typeof obj.thumbnailUrl === "string" ? obj.thumbnailUrl : null,
    });
    const permalink =
      (typeof obj.permalink === "string" && obj.permalink) ||
      (typeof obj.shortcode_url === "string" && obj.shortcode_url) ||
      (typeof obj.url === "string" && obj.url) ||
      null;
    const takenRaw =
      (typeof obj.taken_at_timestamp === "number" && obj.taken_at_timestamp) ||
      (typeof obj.takenAt === "number" && obj.takenAt) ||
      (typeof obj.taken_at === "number" && obj.taken_at) ||
      null;
    items.push({ thumbUrl: thumb, permalink, takenAt: takenRaw });
  }
  items.sort((a, b) => (b.takenAt ?? 0) - (a.takenAt ?? 0));
  return items.slice(0, max);
}

// ─── Strip UI ─────────────────────────────────────────────────────

function SampleStrip({
  side,
  handle,
  posts,
  slots,
  realCount,
}: {
  side: "primary" | "competitor";
  handle: string;
  posts: CadenceSamplePost[];
  slots: number;
  realCount: number;
}) {
  const eyebrowColor =
    side === "primary" ? "text-accent-primary" : "text-compare-competitor";
  // Always render exactly `slots` tiles — fill missing with placeholders
  const tiles: (CadenceSamplePost | null)[] = [];
  for (let i = 0; i < slots; i++) {
    tiles.push(posts[i] ?? null);
  }
  const allPlaceholders = realCount === 0;
  return (
    <div
      className="flex flex-col gap-2 min-w-0"
      aria-label={`Amostra recente de @${handle}`}
    >
      <div className="flex items-baseline justify-between gap-3">
        <span className={cn("text-eyebrow-sm truncate", eyebrowColor)}>
          @{handle}
        </span>
        <span className="text-xs text-content-tertiary shrink-0">
          {allPlaceholders
            ? "Sem amostra disponível"
            : `${realCount} ${realCount === 1 ? "mais recente" : "mais recentes"}`}
        </span>
      </div>
      <div className="grid grid-cols-5 gap-2 sm:gap-2.5">
        {tiles.map((p, i) => (
          <Thumb key={`${p?.permalink ?? i}`} side={side} post={p} />
        ))}
      </div>
      {allPlaceholders ? (
        <p className="text-xs text-content-tertiary">
          Miniaturas indisponíveis nesta amostra.
        </p>
      ) : null}
    </div>
  );
}

function Thumb({
  side,
  post,
}: {
  side: "primary" | "competitor";
  post: CadenceSamplePost | null;
}) {
  const [failed, setFailed] = useState(false);
  const borderClass =
    side === "primary"
      ? "border-accent-primary/20"
      : "border-compare-competitor/20";
  const wrapper = cn(
    "relative aspect-square w-full rounded-lg overflow-hidden border bg-surface-muted",
    borderClass,
  );
  const showImg = Boolean(post?.thumbUrl) && !failed;
  const content = showImg ? (
    <img
      src={post!.thumbUrl as string}
      alt=""
      loading="lazy"
      decoding="async"
      onError={() => setFailed(true)}
      className="size-full object-cover"
    />
  ) : (
    <CompareThumbPlaceholder className="absolute inset-0 size-full rounded-none" />
  );
  if (post?.permalink && showImg) {
    return (
      <a
        href={post.permalink}
        target="_blank"
        rel="noreferrer"
        className={cn(wrapper, "transition-shadow hover:shadow-[0_2px_8px_-2px_rgba(15,23,42,0.18)]")}
      >
        {content}
      </a>
    );
  }
  return <span className={wrapper}>{content}</span>;
}

function isPositive(n: number | null | undefined): n is number {
  return typeof n === "number" && Number.isFinite(n) && n > 0;
}

function fmtDecimal(n: number, digits: number): string {
  return n.toLocaleString("pt-PT", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}