/**
 * Padrões editoriais (Prompt 18) — visualização dos cruzamentos derivados
 * em `editorialPatterns` (R4-B). Mostra ATÉ 6 cards explicativos com:
 * tendência de engagement, sweet spot de hashtags, comprimento de
 * legenda, lift de menções/colabs, padrão de duração de Reels e
 * alinhamento com a procura de mercado.
 *
 * Defensivo: cada padrão tem `available:false` quando os dados são
 * insuficientes — esses cards são omitidos. Se TODOS estiverem
 * indisponíveis, mostra um vazio subtil. Mobile-first, sem scroll
 * horizontal a 375px, copy 100% pt-PT.
 */

import {
  TrendingUp,
  TrendingDown,
  Minus,
  Hash,
  Type,
  Users,
  Film,
  Target,
} from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";
import type { EditorialPatterns } from "@/lib/report/editorial-patterns";

import { ReportFramedBlock } from "./report-framed-block";
import { REDESIGN_TOKENS } from "./report-tokens";

interface Props {
  patterns: EditorialPatterns;
}

export function ReportEditorialPatterns({ patterns }: Props) {
  const cards: Array<ReactNode> = [];

  // 1. Tendência de engagement
  if (patterns.engagementTrend.available) {
    const t = patterns.engagementTrend;
    const Icon =
      t.direction === "up"
        ? TrendingUp
        : t.direction === "down"
          ? TrendingDown
          : Minus;
    const tone =
      t.direction === "up"
        ? "text-emerald-600"
        : t.direction === "down"
          ? "text-rose-600"
          : "text-slate-500";
    const label =
      t.direction === "up"
        ? "A subir"
        : t.direction === "down"
          ? "A descer"
          : "Estável";
    cards.push(
      <PatternCard
        key="trend"
        icon={<Icon className={cn("size-5", tone)} aria-hidden />}
        title="Tendência de engagement"
        eyebrow="Direção"
        primary={label}
        primaryTone={tone}
        body={
          <>
            Confiança {t.confidence ?? "—"} · amostra de {t.sampleSize}{" "}
            publicações.
          </>
        }
      />,
    );
  }

  // 2. Comprimento de legenda
  if (patterns.captionLengthBuckets.available && patterns.captionLengthBuckets.bestBucket) {
    const b = patterns.captionLengthBuckets;
    const best = b.buckets.find((x) => x.label === b.bestBucket);
    cards.push(
      <PatternCard
        key="caption"
        icon={<Type className="size-5 text-blue-600" aria-hidden />}
        title="Comprimento de legenda"
        eyebrow="Sweet spot"
        primary={b.bestBucket ?? "—"}
        body={
          best
            ? `ER médio ${best.avgEngagementPct.toFixed(2)}% em ${best.count} publicações.`
            : "Sem leitura disponível."
        }
        breakdown={b.buckets}
      />,
    );
  }

  // 3. Hashtags sweet spot
  if (patterns.hashtagSweetSpot.available && patterns.hashtagSweetSpot.bestBucket) {
    const h = patterns.hashtagSweetSpot;
    const best = h.buckets.find((x) => x.label === h.bestBucket);
    cards.push(
      <PatternCard
        key="hashtags"
        icon={<Hash className="size-5 text-blue-600" aria-hidden />}
        title="Volume de hashtags"
        eyebrow="Sweet spot"
        primary={h.bestBucket ?? "—"}
        body={
          best
            ? `ER médio ${best.avgEngagementPct.toFixed(2)}% em ${best.count} publicações.`
            : "Sem leitura disponível."
        }
        breakdown={h.buckets}
      />,
    );
  }

  // 4. Menções e colaborações
  if (patterns.mentionsCollabsLift.available && patterns.mentionsCollabsLift.lift !== null) {
    const m = patterns.mentionsCollabsLift;
    const liftPct = ((m.lift! - 1) * 100).toFixed(0);
    const direction = m.lift! >= 1 ? "+" : "";
    cards.push(
      <PatternCard
        key="mentions"
        icon={<Users className="size-5 text-blue-600" aria-hidden />}
        title="Menções e colaborações"
        eyebrow="Lift"
        primary={`${direction}${liftPct}%`}
        primaryTone={
          m.lift! >= 1.1
            ? "text-emerald-600"
            : m.lift! < 0.9
              ? "text-rose-600"
              : "text-slate-700"
        }
        body={
          <>
            ER {m.withAvgEngagementPct?.toFixed(2)}% com menções ({m.withCount})
            vs {m.withoutAvgEngagementPct?.toFixed(2)}% sem ({m.withoutCount}).
          </>
        }
      />,
    );
  }

  // 5. Duração de Reels
  if (patterns.videoDurationPattern.available && patterns.videoDurationPattern.bestBucket) {
    const v = patterns.videoDurationPattern;
    const best = v.buckets.find((x) => x.label === v.bestBucket);
    cards.push(
      <PatternCard
        key="video"
        icon={<Film className="size-5 text-blue-600" aria-hidden />}
        title="Duração de Reels"
        eyebrow="Melhor faixa"
        primary={v.bestBucket ?? "—"}
        body={
          best
            ? `ER médio ${best.avgEngagementPct.toFixed(2)}% em ${best.count} Reels.`
            : "Sem leitura disponível."
        }
        breakdown={v.buckets}
      />,
    );
  }

  // 6. Alinhamento com procura de mercado
  if (patterns.marketDemandContentFit.available) {
    const f = patterns.marketDemandContentFit;
    const pct = f.coverage !== null ? `${Math.round(f.coverage * 100)}%` : "—";
    cards.push(
      <PatternCard
        key="market"
        icon={<Target className="size-5 text-blue-600" aria-hidden />}
        title="Alinhamento com procura de mercado"
        eyebrow="Cobertura"
        primary={pct}
        body={
          <>
            {f.matchedKeywords} de {f.marketKeywordsTotal} keywords de mercado
            aparecem nas legendas/hashtags.
            {f.missingTop.length > 0 ? (
              <span className="block mt-2 text-slate-500">
                Em falta:{" "}
                <span className="font-mono text-[12px] text-slate-700">
                  {f.missingTop.join(", ")}
                </span>
              </span>
            ) : null}
          </>
        }
      />,
    );
  }

  return (
    <ReportFramedBlock
      tone="canvas"
      ariaLabel="Padrões que explicam os resultados"
    >
      <header className="mb-6 md:mb-8">
        <p className={REDESIGN_TOKENS.eyebrowAccent}>Análise editorial</p>
        <h2 className={cn(REDESIGN_TOKENS.h2Section, "mt-2")}>
          Padrões que explicam os resultados
        </h2>
        <p className={cn(REDESIGN_TOKENS.subtitle, "mt-2 max-w-3xl")}>
          Cruzamentos derivados das publicações analisadas — não basta saber{" "}
          <em>o quê</em>, importa perceber <em>porquê</em>.
        </p>
      </header>

      {cards.length === 0 ? (
        <p className="text-sm text-slate-500">
          Ainda não há dados suficientes para cruzamentos avançados. A próxima
          análise poderá revelar padrões mais sólidos.
        </p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5">
          {cards}
        </div>
      )}
    </ReportFramedBlock>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Subcomponente: card individual de padrão
// ─────────────────────────────────────────────────────────────────────────

interface PatternCardProps {
  icon: ReactNode;
  title: string;
  eyebrow: string;
  primary: string;
  primaryTone?: string;
  body: ReactNode;
  breakdown?: Array<{ label: string; count: number; avgEngagementPct: number }>;
}

function PatternCard({
  icon,
  title,
  eyebrow,
  primary,
  primaryTone = "text-slate-900",
  body,
  breakdown,
}: PatternCardProps) {
  return (
    <article
      className={cn(
        "rounded-2xl border border-slate-200/70 bg-white p-5 md:p-6",
        "shadow-[0_1px_2px_rgba(15,23,42,0.04)]",
        "flex flex-col gap-4",
      )}
    >
      <div className="flex items-start gap-3">
        <div className="shrink-0 rounded-lg bg-blue-50 p-2">{icon}</div>
        <div className="min-w-0">
          <p className={REDESIGN_TOKENS.eyebrow}>{eyebrow}</p>
          <h3 className="mt-1 text-[15px] font-semibold text-slate-900 leading-tight">
            {title}
          </h3>
        </div>
      </div>

      <p
        className={cn(
          "font-display text-[1.75rem] font-semibold tracking-tight leading-none",
          primaryTone,
        )}
      >
        {primary}
      </p>

      <p className="text-sm text-slate-600 leading-relaxed">{body}</p>

      {breakdown && breakdown.length > 0 ? (
        <ul className="mt-1 grid grid-cols-2 gap-x-3 gap-y-1.5 text-[12px]">
          {breakdown.map((b) => (
            <li
              key={b.label}
              className="flex items-baseline justify-between gap-2 text-slate-500"
            >
              <span className="truncate">{b.label}</span>
              <span className="font-mono text-slate-700 tabular-nums">
                {b.count > 0 ? `${b.avgEngagementPct.toFixed(2)}%` : "—"}
              </span>
            </li>
          ))}
        </ul>
      ) : null}
    </article>
  );
}