import { useState } from "react";
import { Image as ImageIcon } from "lucide-react";
import { CompareCardShell, CompareStatBlock } from "@/components/report-redesign/v2/compare";
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

  const primaryStrip = (primaryRecentPosts ?? []).slice(0, 5);
  const competitorStrip = showSampleStrips
    ? extractRecentPosts(competitor.posts, 5)
    : [];
  const sampleN = Math.min(
    Math.max(primaryStrip.length, competitorStrip.length, 0),
    12,
  );
  const insight = buildCadenceInsight(
    primary.postingFrequencyWeekly,
    competitor.estimatedPostsPerWeek,
    { primary: primaryStrip.length, competitor: competitorStrip.length },
  );

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

      {(primaryStrip.length > 0 || competitorStrip.length > 0) ? (
        <div className="mt-5 sm:mt-6 grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
          {primaryStrip.length > 0 ? (
            <SampleStrip side="primary" handle={primary.handle} posts={primaryStrip} />
          ) : null}
          {competitorStrip.length > 0 ? (
            <SampleStrip side="competitor" handle={competitor.username} posts={competitorStrip} />
          ) : null}
        </div>
      ) : null}

      <p className="mt-4 text-xs text-content-tertiary">
        {sampleN > 0
          ? `Amostra: últimas ${sampleN} publicações disponíveis.`
          : "Amostra com base nas últimas publicações disponíveis."}
      </p>
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
}: {
  side: "primary" | "competitor";
  handle: string;
  posts: CadenceSamplePost[];
}) {
  const eyebrowColor =
    side === "primary" ? "text-accent-primary" : "text-compare-competitor";
  return (
    <div
      className="flex flex-col gap-2"
      aria-label={`Amostra recente de @${handle}`}
    >
      <span className={cn("text-eyebrow-sm", eyebrowColor)}>@{handle}</span>
      <div className="flex gap-2">
        {posts.map((p, i) => (
          <Thumb key={`${p.permalink ?? i}`} side={side} post={p} />
        ))}
      </div>
    </div>
  );
}

function Thumb({
  side,
  post,
}: {
  side: "primary" | "competitor";
  post: CadenceSamplePost;
}) {
  const [failed, setFailed] = useState(false);
  const borderClass =
    side === "primary"
      ? "border-accent-primary/20"
      : "border-compare-competitor/20";
  const wrapper = cn(
    "relative aspect-square w-[18%] sm:w-20 rounded-lg overflow-hidden border bg-surface-muted shrink-0",
    borderClass,
  );
  const showImg = Boolean(post.thumbUrl) && !failed;
  const content = showImg ? (
    <img
      src={post.thumbUrl as string}
      alt=""
      loading="lazy"
      decoding="async"
      onError={() => setFailed(true)}
      className="size-full object-cover"
    />
  ) : (
    <span
      aria-hidden="true"
      className="absolute inset-0 flex items-center justify-center"
    >
      <ImageIcon className="size-4 text-content-tertiary/60" />
    </span>
  );
  if (post.permalink) {
    return (
      <a
        href={post.permalink}
        target="_blank"
        rel="noreferrer"
        className={wrapper}
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