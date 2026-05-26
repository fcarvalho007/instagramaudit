/**
 * P03 — Hashtag diagnostics card.
 *
 * Factual, data-only card. No global volumes, no opportunity scores,
 * no AI suggestions. Uses only extracted hashtag data from analyzed posts.
 */
import type { ReactNode } from "react";
import { Hash } from "lucide-react";
import { useTranslation } from "react-i18next";
import { InsightCallout } from "./insight-callout";
import { INSTAGRAM_CAPTION_CONTEXT } from "@/lib/knowledge/instagram-caption-context";

const KB_HASHTAGS = INSTAGRAM_CAPTION_CONTEXT.hashtagGuidelines;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface HashtagDiagnosticsProps {
  items: Array<{ text: string; weight: number; avgEngagement: number }>;
  /** Total posts analyzed (used for share % and avg computation). */
  postsAnalyzed: number;
  /** Raw posts array — used to derive per-post hashtag stats. */
  posts: Array<{ hashtags?: string[] | null }>;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function computeStats(
  posts: Array<{ hashtags?: string[] | null }>,
  postsAnalyzed: number,
) {
  let postsWithHashtags = 0;
  let totalHashtagUses = 0;

  for (const p of posts) {
    const tags = Array.isArray(p.hashtags) ? p.hashtags : [];
    if (tags.length > 0) postsWithHashtags++;
    totalHashtagUses += tags.length;
  }

  const denominator = postsAnalyzed > 0 ? postsAnalyzed : 1;
  const avgPerPost = totalHashtagUses / denominator;

  return { postsWithHashtags, totalHashtagUses, avgPerPost };
}

function avgBadge(
  avg: number,
  t: (key: string) => string,
): { label: string; className: string } {
  const { min, max } = KB_HASHTAGS.recommendedRange;
  if (avg >= min && avg <= max) {
    return {
      label: t("hashtag.badge_within"),
      className:
        "bg-tint-success/60 text-signal-success border border-signal-success/20",
    };
  }
  if (avg < min) {
    return {
      label: t("hashtag.badge_below"),
      className:
        "bg-amber-50 text-amber-700 border border-amber-200",
    };
  }
  return {
    label: t("hashtag.badge_above"),
    className:
      "bg-amber-50 text-amber-700 border border-amber-200",
  };
}

function buildDiagnosticText(
  items: HashtagDiagnosticsProps["items"],
  avg: number,
  postsAnalyzed: number,
  t: (key: string, opts?: Record<string, unknown>) => string,
): string {
  const { min, max } = KB_HASHTAGS.recommendedRange;

  if (items.length === 0) {
    return t("hashtag.diag.none");
  }

  const lng = (typeof navigator !== "undefined" ? navigator.language : "pt") || "pt";
  const sep = lng.toLowerCase().startsWith("en") ? "." : ",";
  const avgFormatted = avg.toFixed(1).replace(".", sep);

  // Check if top 2 appear in >50% of posts
  const top2 = items.slice(0, 2);
  const top2InMajority =
    top2.length >= 2 &&
    postsAnalyzed > 0 &&
    top2.every((t) => t.weight / postsAnalyzed > 0.5);

  const rangePart =
    avg < min
      ? t("hashtag.diag.range_below", { min, max })
      : avg <= max
        ? t("hashtag.diag.range_within", { min, max })
        : t("hashtag.diag.range_above", { min, max });

  if (top2InMajority) {
    return t("hashtag.diag.top2_majority", { a: top2[0].text, b: top2[1].text, avg: avgFormatted, range: rangePart });
  }

  if (avg < min) {
    return t("hashtag.diag.below", { avg: avgFormatted });
  }

  if (avg > max) {
    return t("hashtag.diag.above", { avg: avgFormatted });
  }

  return t("hashtag.diag.balanced", { avg: avgFormatted });
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function KpiCard({
  label,
  value,
  sub,
  badge,
}: {
  label: string;
  value: ReactNode;
  sub: string;
  badge?: { label: string; className: string };
}) {
  return (
    <div className="rounded-xl border border-border-subtle bg-white p-4 md:p-5 flex flex-col gap-1">
      <div className="flex items-center gap-2 flex-wrap">
        <p className="text-eyebrow-sm text-content-tertiary">{label}</p>
        {badge && (
          <span
            className={`text-xs font-semibold tracking-wide px-2 py-0.5 rounded-full ${badge.className}`}
          >
            {badge.label}
          </span>
        )}
      </div>
      <p className="tabular-nums text-[1.5rem] md:text-[1.75rem] text-content-primary leading-none tracking-tight tabular-nums">
        {value}
      </p>
      <p className="text-xs text-content-tertiary">{sub}</p>
    </div>
  );
}

function FrequencyRow({
  rank,
  tag,
  uses,
  sharePct,
  barPct,
  isTop3,
  t,
}: {
  rank: number;
  tag: string;
  uses: number;
  sharePct: number;
  barPct: number;
  isTop3: boolean;
  t: (key: string, opts?: Record<string, unknown>) => string;
}) {
  return (
    <div className="py-2.5">
      {/* Row 1: rank + tag + bar (always single line) */}
      <div className="flex items-center gap-3">
        <span
          className={`shrink-0 w-9 h-8 rounded-md flex items-center justify-center text-xs font-semibold ${
            isTop3
              ? "bg-accent-primary/10 text-accent-primary"
              : "bg-surface-muted text-content-tertiary"
          }`}
        >
          #{rank}
        </span>

        <span className="min-w-0 flex-1 sm:flex-none sm:min-w-[140px] sm:max-w-[220px] truncate text-sm font-medium text-content-primary">
          {tag}
        </span>

        <div className="hidden sm:block flex-1 h-2 rounded-full bg-surface-muted overflow-hidden">
          <div
            className={`h-full rounded-full ${isTop3 ? "bg-accent-primary" : "bg-accent-primary/30"}`}
            style={{ width: `${Math.max(6, barPct)}%` }}
          />
        </div>

        <span className="hidden sm:inline-block shrink-0 text-[13px] text-content-secondary tabular-nums w-[56px] text-right">
          {t("hashtag.uses_suffix", { count: uses })}
        </span>
        <span className="hidden sm:inline-block shrink-0 text-[13px] text-content-tertiary tabular-nums w-[64px] text-right">
          {t("hashtag.posts_suffix", { pct: sharePct })}
        </span>
      </div>

      {/* Row 2 (mobile only): bar + stats inline below */}
      <div className="sm:hidden mt-2 flex items-center gap-3 pl-12">
        <div className="flex-1 h-2 rounded-full bg-surface-muted overflow-hidden">
          <div
            className={`h-full rounded-full ${isTop3 ? "bg-accent-primary" : "bg-accent-primary/30"}`}
            style={{ width: `${Math.max(6, barPct)}%` }}
          />
        </div>
        <span className="shrink-0 text-xs text-content-secondary tabular-nums">
          {t("hashtag.uses_suffix", { count: uses })}
        </span>
        <span className="shrink-0 text-xs text-content-tertiary tabular-nums">
          {t("hashtag.posts_suffix", { pct: sharePct })}
        </span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function HashtagDiagnosticsCard({
  items,
  postsAnalyzed,
  posts,
}: HashtagDiagnosticsProps) {
  const { t } = useTranslation("report");
  const { postsWithHashtags, avgPerPost } = computeStats(posts, postsAnalyzed);
  const uniqueCount = items.length;
  const maxWeight = Math.max(1, ...items.map((x) => x.weight));
  void postsWithHashtags;
  const badge = avgBadge(avgPerPost, t);
  const isEmpty = items.length === 0;

  const diagnosticText = buildDiagnosticText(items, avgPerPost, postsAnalyzed, t);
  const lng = (typeof navigator !== "undefined" ? navigator.language : "pt") || "pt";
  const decSep = lng.toLowerCase().startsWith("en") ? "." : ",";

  return (
    <div className="rounded-2xl border border-border-subtle bg-white shadow-[0_1px_3px_rgba(0,0,0,0.04)] overflow-hidden md:col-span-2">
      {/* ── Header ── */}
      <div className="px-5 pt-5 md:px-7 md:pt-7 pb-4">
        {/* top metadata row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-content-tertiary">
            <span className="w-6 h-6 rounded-md bg-surface-muted/60 flex items-center justify-center">
              <Hash className="w-3 h-3 text-content-tertiary/70" />
            </span>
            <span className="text-xs md:text-xs tracking-[0.16em] text-content-tertiary uppercase font-sans">
              {t("hashtag.header", { count: postsAnalyzed })}
            </span>
          </div>
        </div>

        {/* title */}
        <h3 className="font-display text-[1.5rem] md:text-[2rem] font-semibold tracking-tight text-content-primary leading-tight mt-5">
          {t("hashtag.title")}
        </h3>
        <p className="text-[13px] md:text-[14px] text-content-secondary leading-relaxed mt-2">
          {t("hashtag.subtitle")}
        </p>
      </div>

      {/* ── KPI row ── */}
      <div className="px-5 md:px-7 pb-5 pt-2">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <KpiCard
            label={t("hashtag.kpi.unique_label")}
            value={uniqueCount}
            sub={t("hashtag.kpi.unique_sub")}
          />
          <KpiCard
            label={t("hashtag.kpi.uses_label")}
            value={computeStats(posts, postsAnalyzed).totalHashtagUses}
            sub={t("hashtag.kpi.uses_sub", { count: postsAnalyzed })}
          />
          <KpiCard
            label={t("hashtag.kpi.avg_label")}
            value={avgPerPost.toFixed(1).replace(".", decSep)}
            sub={t("hashtag.kpi.avg_sub", {
              min: KB_HASHTAGS.recommendedRange.min,
              max: KB_HASHTAGS.recommendedRange.max,
            })}
            badge={postsAnalyzed > 0 ? badge : undefined}
          />
        </div>
      </div>

      {/* ── Frequency list ── */}
      <div className="px-5 md:px-7 pb-5">
        <p className="text-eyebrow-sm text-content-tertiary mb-3">
          {t("hashtag.list_title")}{" "}
          <span className="font-normal normal-case">· {t("hashtag.list_sort")}</span>
        </p>

        {isEmpty ? (
          <p className="text-sm text-content-secondary py-4">
            {t("hashtag.empty")}
          </p>
        ) : (
          <div className="divide-y divide-border-subtle">
            {items.map((it, i) => (
              <FrequencyRow
                key={it.text}
                rank={i + 1}
                tag={it.text}
                uses={it.weight}
                sharePct={
                  postsAnalyzed > 0
                    ? Math.round((it.weight / postsAnalyzed) * 100)
                    : 0
                }
                barPct={(it.weight / maxWeight) * 100}
                isTop3={i < 3}
                t={t}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── Diagnostic callout ── */}
      <div className="px-5 md:px-7 pb-5">
        <InsightCallout tone="editorial" label={t("hashtag.diagnostic_label")}>
          {diagnosticText}
        </InsightCallout>
      </div>

    </div>
  );
}