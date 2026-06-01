/**
 * Zone D — Card 1: Frequência de publicação.
 * Human-readable headline → stats → posting calendar → verdict.
 */
import { ArrowDown } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import { useState } from "react";
import { computeFrequencia } from "./score-utils";
import { InsightCallout } from "./insight-callout";
import type { SocialinsiderInstagramContext } from "@/lib/knowledge/socialinsider-context";
import { ExternalSourceNote, formatDateRange } from "./external-source-note";
import { formatNumber } from "@/lib/i18n/format";

function getFrequencyStatusKey(score: number): "high" | "medium" | "low" {
  if (score >= 70) return "high";
  if (score >= 40) return "medium";
  return "low";
}

// ─── Helpers ────────────────────────────────────────────────────────

const PT_MONTHS = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
];

const EN_MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export function getFrequencyHeadline(postsPerDay: number): string {
  if (postsPerDay > 1.2) return "Mais de 1 post por dia";
  if (postsPerDay >= 0.85) return "Cerca de 1 post por dia";
  if (postsPerDay >= 0.5) return "1 post a cada 1–2 dias";
  if (postsPerDay >= 0.3) return "1 post a cada 2–3 dias";
  return "Menos de 1 post por semana";
}

function getFrequencyHeadlineKey(postsPerDay: number): string {
  if (postsPerDay > 1.2) return "frequency.headline.very_high";
  if (postsPerDay >= 0.85) return "frequency.headline.daily";
  if (postsPerDay >= 0.5) return "frequency.headline.every_1_2";
  if (postsPerDay >= 0.3) return "frequency.headline.every_2_3";
  return "frequency.headline.weekly_low";
}

export function getFrequencyVerdict(score: number): { strong: string; rest: string } {
  if (score >= 70) {
    return {
      strong: "Cadência forte e consistente.",
      rest: "Publica mais que a média de perfis com um número de seguidores semelhante.",
    };
  }
  if (score >= 40) {
    return {
      strong: "Cadência aceitável.",
      rest: "Há espaço para regularidade mais previsível.",
    };
  }
  return {
    strong: "Cadência irregular.",
    rest: "A audiência não cria hábito de te encontrar.",
  };
}

function fmtLocaleDate(iso: string, lang: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  if (lang.startsWith("en")) {
    return `${EN_MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}`;
  }
  return `${d.getUTCDate()} de ${PT_MONTHS[d.getUTCMonth()]}`;
}

// ─── Props ──────────────────────────────────────────────────────────

export interface DayEntry {
  date: string;
  published: boolean;
  postCount: number;
}

export interface FrequencyCardProps {
  postsAnalyzed: number;
  windowDays: number;
  postingFrequencyWeekly: number;
  calendarDays: DayEntry[];
  /** Cadence cascade result — drives copy gating when sample is insufficient. */
  cadenceSufficient?: boolean;
  cadenceSampleSize?: number;
  cadenceWindowDays?: number;
  /** External market reference (Socialinsider IG per format). Optional. */
  socialinsiderRef?: SocialinsiderInstagramContext | null;
}

// ─── Weekly summary helpers ─────────────────────────────────────────

/** Aggregate posts/days by weekday (Mon=0..Sun=6). */
function aggregateByWeekday(days: DayEntry[]): Array<{
  weekday: number;
  posts: number;
  daysTotal: number;
  daysSilent: number;
}> {
  const buckets = Array.from({ length: 7 }, (_, weekday) => ({
    weekday,
    posts: 0,
    daysTotal: 0,
    daysSilent: 0,
  }));
  for (const d of days) {
    const date = new Date(d.date);
    if (Number.isNaN(date.getTime())) continue;
    const idx = (date.getUTCDay() + 6) % 7; // Mon=0
    buckets[idx].posts += d.postCount;
    buckets[idx].daysTotal += 1;
    if (d.postCount === 0) buckets[idx].daysSilent += 1;
  }
  return buckets;
}

function pickMostActive(buckets: ReturnType<typeof aggregateByWeekday>) {
  let best = buckets[0];
  for (const b of buckets) if (b.posts > best.posts) best = b;
  return best;
}

function pickQuietest(
  buckets: ReturnType<typeof aggregateByWeekday>,
  t: TFunction,
): { label: string; detail: string } | null {
  const sat = buckets[5];
  const sun = buckets[6];
  const weekendSilent = sat.daysSilent + sun.daysSilent;
  const weekendPosts = sat.posts + sun.posts;
  const weekdayPosts = buckets.slice(0, 5).reduce((sum, b) => sum + b.posts, 0);

  // Weekend rule: only fire when both Sat and Sun are present in the window
  // AND the entire weekend is silent. Avoids false alerts on short windows.
  if (
    weekendPosts === 0 &&
    weekdayPosts > 0 &&
    sat.daysTotal >= 1 &&
    sun.daysTotal >= 1 &&
    weekendSilent >= 2
  ) {
    return {
      label: t("frequency.weekly_summary.weekend_label"),
      detail: t(
        weekendSilent === 1
          ? "frequency.weekly_summary.silent_one"
          : "frequency.weekly_summary.silent_other",
        { count: weekendSilent },
      ),
    };
  }

  // Otherwise: only consider weekdays that appeared at least twice in the
  // window (otherwise a single missed Monday looks like a pattern).
  const eligible = buckets.filter((b) => b.daysTotal >= 2);
  if (eligible.length === 0) return null;
  const sorted = [...eligible].sort(
    (a, b) => b.daysSilent - a.daysSilent || a.posts - b.posts,
  );
  const worst = sorted[0];
  // No silent days on any eligible weekday → nothing meaningful to flag.
  if (worst.daysSilent === 0) return null;
  const weekdayLong = (t("frequency.weekday_long", { returnObjects: true }) as string[]) ?? [];
  return {
    label: weekdayLong[worst.weekday] ?? "",
    detail: t(
      worst.daysSilent === 1
        ? "frequency.weekly_summary.silent_one"
        : "frequency.weekly_summary.silent_other",
      { count: worst.daysSilent },
    ),
  };
}

function WeeklySummary({ days, t }: { days: DayEntry[]; t: TFunction }) {
  const buckets = aggregateByWeekday(days);
  const totalPosts = buckets.reduce((s, b) => s + b.posts, 0);
  if (totalPosts === 0) return null;

  const top = pickMostActive(buckets);
  const quiet = pickQuietest(buckets, t);
  const maxPosts = Math.max(...buckets.map((b) => b.posts));
  const weekdayShort = (t("frequency.weekday_short", { returnObjects: true }) as string[]) ?? [];

  return (
    <div className="px-4 sm:px-5 md:px-6 mt-4">
      <div className="rounded-xl border border-border-default bg-surface-muted/60 p-3.5 sm:p-4">
        <span className="text-eyebrow-sm text-content-tertiary block mb-3">
          {t("frequency.weekly_summary.title")}
        </span>

        {quiet ? (
          <div className="flex items-start gap-2.5">
            <span
              aria-hidden
              className="flex size-7 shrink-0 items-center justify-center rounded-full"
              style={{ background: "rgba(163,45,45,0.10)" }}
            >
              <ArrowDown
                className="size-3.5"
                style={{ color: "rgba(163,45,45,0.85)" }}
              />
            </span>
            <div className="min-w-0">
              <p className="text-eyebrow-sm text-content-tertiary leading-none mb-1">
                {t("frequency.weekly_summary.quietest_label")}
              </p>
              <p className="text-[15px] text-content-primary leading-relaxed">
                <span className="font-semibold">{quiet.label}</span>{" "}
                <span className="text-content-secondary tabular-nums">
                  · {quiet.detail}
                </span>
              </p>
            </div>
          </div>
        ) : (
          <p className="text-[15px] text-content-secondary leading-relaxed">
            {t("frequency.weekly_summary.no_silent")}
          </p>
        )}

        {/* Mini bars S T Q Q S S D */}
        <div className="mt-4">
          <div
            className="grid gap-1.5 items-end"
            style={{ gridTemplateColumns: "repeat(7, 1fr)" }}
            role="img"
            aria-label={t("frequency.weekly_summary.aria_distribution")}
          >
            {buckets.map((b) => {
              const isTop = b.weekday === top.weekday && b.posts > 0;
              const isWeekend = b.weekday >= 5;
              const ratio = maxPosts > 0 ? b.posts / maxPosts : 0;
              const height = b.posts > 0 ? 8 + Math.round(ratio * 18) : 5;
              const bg =
                b.posts === 0
                  ? isWeekend
                    ? "rgba(163,45,45,0.12)"
                    : "rgba(148,163,184,0.25)"
                  : isTop
                    ? "rgba(29,158,117,0.90)"
                    : "rgba(29,158,117,0.45)";
              return (
                <span
                  key={b.weekday}
                  className="rounded-[3px] w-full"
                  style={{ height: `${height}px`, background: bg }}
                />
              );
            })}
          </div>
          <div
            className="grid gap-1.5 mt-1.5"
            style={{ gridTemplateColumns: "repeat(7, 1fr)" }}
          >
            {weekdayShort.map((wd, i) => {
              const isTop = i === top.weekday && buckets[i].posts > 0;
              return (
                <span
                  key={i}
                  className={`text-xs text-center leading-none select-none ${
                    isTop
                      ? "font-semibold text-content-primary"
                      : "text-content-tertiary"
                  }`}
                >
                  {wd}
                </span>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── KPI strip (Cadência · Consistência · Pico semanal) ─────────────

function FrequencyKpiStrip({
  postingFrequencyWeekly,
  publishedCount,
  totalDays,
  days,
  t,
  lang,
}: {
  postingFrequencyWeekly: number;
  publishedCount: number;
  totalDays: number;
  days: DayEntry[];
  t: TFunction;
  lang: "en" | "pt";
}) {
  const cadenceValue = formatNumber(postingFrequencyWeekly, lang, {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
  const consistencyPct =
    totalDays > 0 ? (publishedCount / totalDays) * 100 : 0;
  const consistencyValue = formatNumber(consistencyPct, lang, {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });

  const buckets = aggregateByWeekday(days);
  const top = pickMostActive(buckets);
  const weekdayLong =
    (t("frequency.weekday_long", { returnObjects: true }) as string[]) ?? [];
  const hasPeak = top.posts > 0;
  const peakLabel = hasPeak ? weekdayLong[top.weekday] ?? "—" : "—";
  const peakCaption = hasPeak
    ? t(
        top.posts === 1
          ? "frequency.kpi.peak_caption_posts_one"
          : "frequency.kpi.peak_caption_posts_other",
        { count: top.posts },
      )
    : t("frequency.kpi.peak_caption_none");

  return (
    <div className="px-4 sm:px-5 md:px-6 mt-4">
      <div className="rounded-xl border border-border-default bg-white grid grid-cols-1 sm:grid-cols-3 overflow-hidden divide-y divide-border-default/60 sm:divide-y-0">
        {/* Cadência */}
        <div className="px-4 py-4 sm:px-5 sm:py-5">
          <span className="text-eyebrow-sm text-content-secondary block mb-2">
            {t("frequency.kpi.cadence_label")}
          </span>
          <div className="flex items-baseline gap-1.5">
            <span className="font-sans text-[1.25rem] sm:text-[1.5rem] font-semibold tabular-nums text-content-primary leading-none">
              {cadenceValue}
            </span>
            <span className="text-xs text-content-tertiary">
              {t("frequency.kpi.cadence_unit")}
            </span>
          </div>
        </div>

        {/* Consistência */}
        <div className="px-4 py-4 sm:px-5 sm:py-5 sm:border-l sm:border-border-default/60">
          <span className="text-eyebrow-sm text-content-secondary block mb-2">
            {t("frequency.kpi.consistency_label")}
          </span>
          <div className="flex items-baseline gap-1">
            <span className="font-sans text-[1.25rem] sm:text-[1.5rem] font-semibold tabular-nums text-content-primary leading-none">
              {consistencyValue}
            </span>
            <span className="font-sans text-[1.25rem] sm:text-[1.5rem] font-semibold text-content-secondary/60 leading-none">
              %
            </span>
          </div>
          <span className="block text-xs text-content-tertiary mt-1.5 leading-snug">
            {t("frequency.kpi.consistency_caption")}
          </span>
        </div>

        {/* Pico semanal */}
        <div className="px-4 py-4 sm:px-5 sm:py-5 sm:border-l sm:border-border-default/60">
          <span className="text-eyebrow-sm text-content-secondary block mb-2">
            {t("frequency.kpi.peak_label")}
          </span>
          <span
            className={`block font-sans text-[1.25rem] sm:text-[1.5rem] font-semibold leading-none ${
              hasPeak ? "text-accent-primary" : "text-content-tertiary"
            }`}
          >
            {peakLabel}
          </span>
          <span className="block text-xs text-content-tertiary mt-1.5 leading-snug">
            {peakCaption}
          </span>
        </div>
      </div>
    </div>
  );
}

// ─── Calendar grid helpers ──────────────────────────────────────────

/**
 * Build a week-aligned grid from raw day entries.
 * Pads the start so the first day lands on the correct weekday column (Mon = 0).
 */
function buildWeekGrid(days: DayEntry[]): (DayEntry | null)[][] {
  if (days.length === 0) return [];

  const firstDate = new Date(days[0].date);
  // JS getUTCDay: 0=Sun. Shift to Mon=0: (day+6)%7
  const startDow = (firstDate.getUTCDay() + 6) % 7;

  const padded: (DayEntry | null)[] = Array.from<null>({ length: startDow }).fill(null);
  for (const d of days) padded.push(d);

  // Pad right so the last row is always a complete week — keeps the grid
  // visually aligned with the analysis window (e.g. 30 days = 5 rows).
  while (padded.length % 7 !== 0) padded.push(null);

  const weeks: (DayEntry | null)[][] = [];
  for (let i = 0; i < padded.length; i += 7) {
    weeks.push(padded.slice(i, i + 7));
  }
  return weeks;
}

/**
 * Ensure the day series spans exactly `window` days. If the upstream
 * timeline is shorter (e.g. last post older than today, or no posts in the
 * last few days), append empty trailing entries so the calendar/legend
 * always match the "X publicações em Y dias" subtitle.
 */
function backFillToWindow(days: DayEntry[], windowDays: number): DayEntry[] {
  if (windowDays <= 0 || days.length >= windowDays) return days;
  if (days.length === 0) return days;
  const lastDateStr = days[days.length - 1].date;
  // Date strings are ISO "YYYY-MM-DD". Build successive dates in UTC.
  const lastDate = new Date(`${lastDateStr}T00:00:00Z`);
  const filled: DayEntry[] = [...days];
  for (let i = filled.length; i < windowDays; i++) {
    lastDate.setUTCDate(lastDate.getUTCDate() + 1);
    const iso = lastDate.toISOString().slice(0, 10);
    filled.push({ date: iso, published: false, postCount: 0 });
  }
  return filled;
}

/**
 * Cell styles by post count.
 *   0: muted slate (visible but calm)
 *   1: soft green
 *   2: medium green
 *   3+: full green
 */
function cellStyle(count: number): { bg: string; border: string } {
  if (count === 0)
    return { bg: "rgb(241,245,249)", border: "1px solid rgba(148,163,184,0.35)" };
  if (count === 1)
    return { bg: "rgba(29,158,117,0.40)", border: "1px solid rgba(29,158,117,0.55)" };
  if (count === 2)
    return { bg: "rgba(29,158,117,0.65)", border: "1px solid rgba(29,158,117,0.75)" };
  return { bg: "rgba(29,158,117,0.90)", border: "1px solid rgba(29,158,117,0.95)" };
}

/** Flat bg colour for legend swatches — matches cell fill. */
function legendBg(count: number): string {
  if (count === 0) return "rgb(241,245,249)";
  if (count === 1) return "rgba(29,158,117,0.40)";
  if (count === 2) return "rgba(29,158,117,0.65)";
  return "rgba(29,158,117,0.90)";
}

// ─── Component ──────────────────────────────────────────────────────

export function FrequencyCard({
  postsAnalyzed,
  windowDays,
  postingFrequencyWeekly,
  calendarDays,
  cadenceSufficient,
  cadenceSampleSize,
  cadenceWindowDays,
  socialinsiderRef,
}: FrequencyCardProps) {
  const { t, i18n } = useTranslation("report");
  const [calendarOpen, setCalendarOpen] = useState(false);
  // Prefer cadence-derived sample (pinned-excluded) for subtitle counts.
  const effectiveSampleSize =
    typeof cadenceSampleSize === "number" && cadenceSampleSize > 0
      ? cadenceSampleSize
      : postsAnalyzed;
  // When cadence is insufficient (cadenceWindowDays === 0), the raw
  // posting timeline can span hundreds of days (e.g. 12 posts spread
  // across 629 days). Clamp to a sensible recent window so the
  // calendar/legend never read "12/629 dias".
  const INSUFFICIENT_CALENDAR_MAX_DAYS = 90;
  const effectiveWindowDays =
    typeof cadenceWindowDays === "number" && cadenceWindowDays > 0
      ? cadenceWindowDays
      : calendarDays.length > 0
        ? Math.min(calendarDays.length, INSUFFICIENT_CALENDAR_MAX_DAYS)
        : windowDays;
  // When cadence is explicitly insufficient, do NOT derive headline from
  // a fabricated postsPerDay (would yield "Less than 1 post per week" on
  // empty samples). Use the neutral insufficient headline.
  const isInsufficient = cadenceSufficient === false;
  const postsPerDay =
    effectiveWindowDays > 0 ? effectiveSampleSize / effectiveWindowDays : 0;
  // Single source of truth for the card window: clamp the raw timeline
  // (which may span months from the oldest sample post) to the active
  // cadence window so the calendar, weekly summary and legend all match
  // the "X publicações em Y dias" subtitle.
  const slicedDays =
    effectiveWindowDays > 0
      ? calendarDays.slice(-effectiveWindowDays)
      : calendarDays;
  // If the upstream timeline ended before today (Apify snapshot, last post
  // older than today), back-fill empty trailing days so the calendar always
  // covers the full effectiveWindowDays window we promised in the subtitle.
  const windowedDays = backFillToWindow(slicedDays, effectiveWindowDays);
  const headline = isInsufficient
    ? t("frequency.headline.insufficient")
    : t(getFrequencyHeadlineKey(postsPerDay));
  const score = computeFrequencia(postingFrequencyWeekly);
  const statusKey = getFrequencyStatusKey(score);
  const verdictKey = statusKey === "high" ? "high" : statusKey === "medium" ? "medium" : "low";
  const verdict = {
    strong: t(`frequency.verdict.${verdictKey}.strong`),
    rest: t(`frequency.verdict.${verdictKey}.rest`),
  };
  const frequencyStatus = t(`frequency.status.${statusKey}`);
  const verdictTone =
    score >= 70 ? ("positive" as const) : score >= 40 ? ("warning" as const) : ("danger" as const);
  const verdictLabel = t(
    score >= 70
      ? "frequency.verdict_label.strong"
      : score >= 40
        ? "frequency.verdict_label.improve"
        : "frequency.verdict_label.alert",
  );
  const weekdayShort = (t("frequency.weekday_short", { returnObjects: true }) as string[]) ?? [];

  // Dynamic subtitle: "1 post a cada 1–2 dias · 12 publicações em 18 dias"
  const hasUsableData =
    !isInsufficient && effectiveSampleSize > 0 && effectiveWindowDays > 0;
  const subtitleLine = hasUsableData
    ? t("frequency.subtitle", {
        headline,
        posts: effectiveSampleSize,
        postsLabel: t(
          effectiveSampleSize === 1 ? "frequency.posts_one" : "frequency.posts_other",
        ),
        days: effectiveWindowDays,
        daysLabel: t(
          effectiveWindowDays === 1 ? "frequency.days_one" : "frequency.days_other",
        ),
      })
    : null;

  const publishedCount = windowedDays.filter((d) => d.published).length;
  const pausedCount = windowedDays.length - publishedCount;
  const maxPosts = Math.max(1, ...windowedDays.map((d) => d.postCount));

  const weeks = buildWeekGrid(windowedDays);

  return (
    <article className="rounded-2xl border border-border-default bg-surface-secondary shadow-card overflow-hidden flex flex-col">
      {/* Header */}
      <div className="px-4 sm:px-5 md:px-6 pt-5 sm:pt-6 md:pt-8 space-y-2.5">
        <div className="flex items-start gap-3">
          <h3 className="font-display text-[1.25rem] sm:text-[1.5rem] md:text-[2rem] font-semibold tracking-tight text-content-primary leading-tight break-words">
            {t("frequency.title")}{" "}
            {!isInsufficient ? (
            <span
              className="font-semibold"
              style={{
                borderBottom: `2px solid ${
                  statusKey === "high"
                    ? "rgba(29,158,117,0.50)"
                    : statusKey === "medium"
                      ? "rgba(217,119,6,0.50)"
                      : "rgba(163,45,45,0.50)"
                }`,
                paddingBottom: "1px",
              }}
            >
              {frequencyStatus}
            </span>
            ) : null}
          </h3>
        </div>
        {subtitleLine ? (
          <p className="text-[15px] text-content-secondary leading-relaxed">
            {subtitleLine}
          </p>
        ) : isInsufficient ? (
          <p className="text-[15px] text-content-secondary leading-relaxed">
            {headline}
          </p>
        ) : null}
      </div>

      {/* KPI strip (Cadência · Consistência · Pico semanal) — gated on usable data */}
      {!isInsufficient && hasUsableData && (
        <FrequencyKpiStrip
          postingFrequencyWeekly={postingFrequencyWeekly}
          publishedCount={publishedCount}
          totalDays={windowedDays.length}
          days={windowedDays}
          t={t}
          lang={i18n.language.startsWith("pt") ? "pt" : "en"}
        />
      )}

      {/* Resumo da semana — hidden when cadence is insufficient */}
      {!isInsufficient && <WeeklySummary days={windowedDays} t={t} />}

      {/* Calendar grid */}
      {weeks.length > 0 && (
        <div className="px-4 sm:px-5 md:px-6 mt-4 sm:mt-6">
          <span className="text-xs uppercase tracking-[0.04em] text-content-tertiary block mb-2">
            {t("frequency.calendar.title")}
          </span>

          {/* Weekday headers */}
          <div className="grid grid-cols-7 gap-1 md:gap-1.5 mb-1 md:mb-1.5">
            {weekdayShort.map((wd, i) => (
              <span
                key={i}
                className="text-xs font-medium text-content-secondary text-center leading-none select-none"
              >
                {wd}
              </span>
            ))}
          </div>

          {/* Week rows */}
          <div
            role="img"
            aria-label={t("frequency.calendar.aria", { published: publishedCount, paused: pausedCount })}
            className="grid gap-1 md:gap-1.5"
            style={{ gridTemplateColumns: "repeat(7, 1fr)" }}
          >
            {weeks.flatMap((week, wi) =>
              Array.from({ length: 7 }).map((_, di) => {
                const day = week[di] ?? null;
                if (!day) {
                  return (
                    <span
                      key={`pad-${wi}-${di}`}
                      className="aspect-[7/4] rounded-md"
                    />
                  );
                }
                const dateLabel = fmtLocaleDate(day.date, i18n.language);
                const tooltipPosts = day.postCount > 0
                  ? t(
                      day.postCount === 1
                        ? "frequency.weekly_summary.posts_one"
                        : "frequency.weekly_summary.posts_other",
                      { count: day.postCount },
                    )
                  : t("frequency.calendar.tooltip_no_post");
                return (
                  <span
                    key={day.date}
                    title={`${dateLabel} · ${tooltipPosts}`}
                    className="relative aspect-[7/4] rounded-md flex items-center justify-center transition-colors"
                    style={{ background: cellStyle(day.postCount).bg, border: cellStyle(day.postCount).border }}
                  >
                    {day.postCount > 1 && (
                      <span
                        className="text-xs font-bold leading-none text-white select-none drop-shadow-[0_1px_1px_rgba(0,0,0,0.25)]"
                        aria-hidden="true"
                      >
                        {day.postCount}
                      </span>
                    )}
                  </span>
                );
              }),
            )}
          </div>

          {/* Legend */}
          <div className="flex items-center gap-3 md:gap-4 mt-2.5 md:mt-3">
            <span className="inline-flex items-center gap-1.5 text-xs text-content-secondary">
              <span
                className="size-[9px] md:size-[10px] rounded-[3px] shrink-0"
                aria-hidden="true"
                style={{ background: legendBg(0), border: "1px solid rgba(148,163,184,0.35)" }}
              />
              {t("frequency.calendar.legend_stopped", { count: pausedCount })}
            </span>
            <span className="inline-flex items-center gap-1.5 text-xs text-content-secondary">
              <span
                className="size-[9px] md:size-[10px] rounded-[3px] shrink-0"
                aria-hidden="true"
                style={{ background: legendBg(1) }}
              />
              {t("frequency.calendar.legend_one_post")}
            </span>
            {maxPosts >= 2 && (
              <span className="inline-flex items-center gap-1.5 text-xs text-content-secondary">
                <span
                  className="size-[9px] md:size-[10px] rounded-[3px] shrink-0"
                  aria-hidden="true"
                  style={{ background: legendBg(maxPosts >= 3 ? 3 : 2) }}
                />
                {t("frequency.calendar.legend_many", { label: maxPosts >= 3 ? "3+" : "2" })}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Verdict — suppressed when cadence is insufficient (no strong claims). */}
      {!isInsufficient && (
      <InsightCallout tone={verdictTone} label={verdictLabel} className="mt-auto mx-4 sm:mx-5 md:mx-6 mb-5 sm:mb-6 md:mb-8">
        <p>
          <span className="font-semibold">{verdict.strong}</span>{" "}
          {verdict.rest}
        </p>
      </InsightCallout>
      )}
      <ExternalReferenceNote
        refs={socialinsiderRef ?? null}
        headline={headline}
        posts={effectiveSampleSize}
        days={effectiveWindowDays}
        scoreHigh={score >= 70}
        hasUsableData={hasUsableData}
        lang={i18n.language}
      />
      <ExternalSourceNote
        refData={
          socialinsiderRef?.reel ??
          socialinsiderRef?.carousel ??
          socialinsiderRef?.image ??
          null
        }
        className="px-4 sm:px-5 md:px-6 pb-5 sm:pb-6 md:pb-8 -mt-2 text-xs text-content-tertiary leading-relaxed"
      />
    </article>
  );
}

function ExternalReferenceNote({
  refs,
  headline,
  posts,
  days,
  scoreHigh,
  hasUsableData,
  lang,
}: {
  refs: SocialinsiderInstagramContext | null;
  headline: string;
  posts: number;
  days: number;
  scoreHigh: boolean;
  hasUsableData: boolean;
  lang: string;
}) {
  const { t } = useTranslation("report");
  if (!refs) return null;
  const anyRef = refs.reel ?? refs.carousel ?? refs.image;
  if (!anyRef) return null;
  const range = formatDateRange(
    anyRef.dataRange.from,
    anyRef.dataRange.to,
    lang,
  );
  const intro = t("frequency.external_ref.intro", {
    reel: refs.reel?.postsPerMonth ?? "—",
    carousel: refs.carousel?.postsPerMonth ?? "—",
    image: refs.image?.postsPerMonth ?? "—",
    range,
  });
  return (
    <div className="px-4 sm:px-5 md:px-6 mt-2 space-y-1.5">
      {hasUsableData ? (
        <p className="text-[13px] text-content-secondary leading-relaxed">
          {t("frequency.external_ref.profile_line", {
            cadence: headline,
            posts,
            days,
          })}
        </p>
      ) : null}
      <p className="text-[13px] text-content-secondary leading-relaxed">
        {intro}
        {scoreHigh ? (
          <>
            {" "}
            <span className="text-content-primary">
              {t("frequency.external_ref.opportunity_mix")}
            </span>
          </>
        ) : null}
      </p>
    </div>
  );
}
