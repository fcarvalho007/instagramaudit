/**
 * P03 — Hashtag diagnostics card.
 *
 * Factual, data-only card. No global volumes, no opportunity scores,
 * no AI suggestions. Uses only extracted hashtag data from analyzed posts.
 */
import type { ReactNode } from "react";
import { Hash } from "lucide-react";
import { InsightCallout } from "./insight-callout";
import { INSTAGRAM_CAPTION_CONTEXT } from "@/lib/knowledge/instagram-caption-context";

const KB_HASHTAGS = INSTAGRAM_CAPTION_CONTEXT.hashtagGuidelines;
const KB_SOURCES = INSTAGRAM_CAPTION_CONTEXT.sources;

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

function avgBadge(avg: number): { label: string; className: string } {
  const { min, max } = KB_HASHTAGS.recommendedRange;
  if (avg >= min && avg <= max) {
    return {
      label: "DENTRO DO IDEAL",
      className:
        "bg-tint-success/60 text-signal-success border border-signal-success/20",
    };
  }
  if (avg < min) {
    return {
      label: "ABAIXO DO IDEAL",
      className:
        "bg-amber-50 text-amber-700 border border-amber-200",
    };
  }
  return {
    label: "ACIMA DO IDEAL",
    className:
      "bg-amber-50 text-amber-700 border border-amber-200",
  };
}

function buildDiagnosticText(
  items: HashtagDiagnosticsProps["items"],
  avg: number,
  postsAnalyzed: number,
): string {
  const { min, max } = KB_HASHTAGS.recommendedRange;

  if (items.length === 0) {
    return "Sem hashtags públicas detectadas na amostra. Isto pode ser uma escolha editorial, mas limita a leitura dos territórios temáticos associados ao conteúdo.";
  }

  const avgFormatted = avg.toFixed(1).replace(".", ",");

  // Check if top 2 appear in >50% of posts
  const top2 = items.slice(0, 2);
  const top2InMajority =
    top2.length >= 2 &&
    postsAnalyzed > 0 &&
    top2.every((t) => t.weight / postsAnalyzed > 0.5);

  const rangePart =
    avg < min
      ? `abaixo da recomendação de ${min}–${max} por post`
      : avg <= max
        ? `dentro da recomendação de ${min}–${max} por post`
        : `acima da recomendação de ${min}–${max} por post`;

  if (top2InMajority) {
    return `As 2 hashtags principais (${top2[0].text}, ${top2[1].text}) aparecem em mais de metade dos posts. A média de ${avgFormatted} hashtags por post está ${rangePart}.`;
  }

  if (avg < min) {
    return `O perfil usa poucas hashtags por post (média ${avgFormatted}). Pode haver margem para testar combinações mais específicas, mantendo a legenda limpa.`;
  }

  if (avg > max) {
    return `O perfil usa muitas hashtags por post (média ${avgFormatted}). Pode ser útil reduzir volume e privilegiar hashtags mais relevantes.`;
  }

  return `A utilização de hashtags está equilibrada (média ${avgFormatted} por post). O próximo passo é variar combinações por tema e formato.`;
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
            className={`text-[10px] font-semibold tracking-wide px-2 py-0.5 rounded-full ${badge.className}`}
          >
            {badge.label}
          </span>
        )}
      </div>
      <p className="font-mono text-[1.5rem] md:text-[1.75rem] text-content-primary leading-none tracking-tight tabular-nums">
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
}: {
  rank: number;
  tag: string;
  uses: number;
  sharePct: number;
  barPct: number;
  isTop3: boolean;
}) {
  return (
    <div className="flex items-center gap-3 py-2">
      {/* rank pill */}
      <span
        className={`shrink-0 w-8 h-7 rounded-md flex items-center justify-center text-[11px] font-semibold ${
          isTop3
            ? "bg-accent-primary/10 text-accent-primary"
            : "bg-surface-muted text-content-tertiary"
        }`}
      >
        #{rank}
      </span>

      {/* tag name */}
      <span className="min-w-[120px] max-w-[180px] truncate text-sm font-medium text-content-primary">
        {tag}
      </span>

      {/* bar */}
      <div className="flex-1 h-2 rounded-full bg-surface-muted overflow-hidden">
        <div
          className={`h-full rounded-full ${isTop3 ? "bg-accent-primary" : "bg-accent-primary/30"}`}
          style={{ width: `${Math.max(6, barPct)}%` }}
        />
      </div>

      {/* stats */}
      <span className="shrink-0 text-xs text-content-secondary tabular-nums font-mono w-[52px] text-right">
        {uses} usos
      </span>
      <span className="shrink-0 text-xs text-content-tertiary tabular-nums font-mono w-[60px] text-right">
        {sharePct}% posts
      </span>
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
  const { postsWithHashtags, avgPerPost } = computeStats(posts, postsAnalyzed);
  const uniqueCount = items.length;
  const maxWeight = Math.max(1, ...items.map((x) => x.weight));
  const allPostsHaveHashtags =
    postsAnalyzed > 0 && postsWithHashtags === postsAnalyzed;
  const badge = avgBadge(avgPerPost);
  const isEmpty = items.length === 0;

  const diagnosticText = buildDiagnosticText(items, avgPerPost, postsAnalyzed);

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
            <span className="text-[10px] md:text-[11px] tracking-[0.16em] text-content-tertiary uppercase font-sans">
              03 · HASHTAGS · {postsAnalyzed} POSTS ANALISADOS
            </span>
          </div>
        </div>

        {/* title */}
        <h3 className="font-display text-[1.5rem] md:text-[2rem] font-semibold tracking-tight text-content-primary leading-tight mt-5">
          Que hashtags aparecem mais vezes?
        </h3>
        <p className="text-[13px] md:text-[14px] text-content-secondary leading-relaxed mt-2">
          Hashtags públicas extraídas das legendas dos posts analisados.
        </p>
      </div>

      {/* ── KPI row ── */}
      <div className="px-5 md:px-7 pb-5 pt-2">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <KpiCard
            label="HASHTAGS DIFERENTES"
            value={uniqueCount}
            sub="no total"
          />
          <KpiCard
            label="USOS REGISTADOS"
            value={computeStats(posts, postsAnalyzed).totalHashtagUses}
            sub={`em ${postsAnalyzed} posts`}
          />
          <KpiCard
            label="MÉDIA POR POST"
            value={avgPerPost.toFixed(1).replace(".", ",")}
            sub={`recomendado: ${KB_HASHTAGS.recommendedRange.min}–${KB_HASHTAGS.recommendedRange.max}`}
            badge={postsAnalyzed > 0 ? badge : undefined}
          />
        </div>
      </div>

      {/* ── Frequency list ── */}
      <div className="px-5 md:px-7 pb-5">
        <p className="text-eyebrow-sm text-content-tertiary mb-3">
          FREQUÊNCIA DE CADA HASHTAG{" "}
          <span className="font-normal normal-case">· ordenado por uso</span>
        </p>

        {isEmpty ? (
          <p className="text-sm text-content-secondary py-4">
            Não foram encontradas hashtags públicas nas legendas analisadas.
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
              />
            ))}
          </div>
        )}
      </div>

      {/* ── Diagnostic callout ── */}
      <div className="px-5 md:px-7 pb-5">
        <InsightCallout tone="editorial" label="Diagnóstico">
          {diagnosticText}
        </InsightCallout>
      </div>

    </div>
  );
}