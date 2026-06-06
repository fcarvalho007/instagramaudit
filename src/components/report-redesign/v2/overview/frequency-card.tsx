/**
 * Zone D — Card 1: Frequência de publicação.
 * Human-readable headline → stats → posting calendar → verdict.
 */
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import { CheckCircle2, CalendarClock, Activity, TrendingUp } from "lucide-react";
import { computeFrequencia } from "./score-utils";
import type { SocialinsiderInstagramContext } from "@/lib/knowledge/socialinsider-context";
import { ExternalSourceNote, formatDateRange } from "./external-source-note";
import { formatNumber } from "@/lib/i18n/format";
import {
  ReportCardSectionHeader,
  type ReportSectionQualifierTone,
} from "../report-card-section-header";

function getFrequencyStatusKey(score: number): "high" | "medium" | "low" {
  if (score >= 70) return "high";
  if (score >= 40) return "medium";
  return "low";
}

// ─── Helpers ────────────────────────────────────────────────────────

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

// ─── KPI tile (icon + eyebrow on top, value below) ──────────────────

function KpiTile({
  icon,
  label,
  value,
  unit,
  valueSuffix,
  isCategorical,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  unit?: string;
  valueSuffix?: string;
  isCategorical?: boolean;
}) {
  return (
    <div className="rounded-xl border border-border-default bg-surface-base/60 px-4 md:px-5 py-4 md:py-5">
      <div className="flex items-center gap-2 mb-3">
        <span
          className="inline-flex h-7 w-7 items-center justify-center rounded-full text-accent-primary"
          style={{
            background:
              "color-mix(in oklab, var(--accent-primary, #3772E5) 10%, #FFFFFF)",
          }}
        >
          {icon}
        </span>
        <span className="text-eyebrow-sm text-content-secondary">{label}</span>
      </div>
      <div className="flex items-baseline gap-1.5 flex-wrap">
        <span
          className={
            isCategorical
              ? "font-sans text-[1.5rem] md:text-[1.75rem] font-semibold leading-none text-content-primary"
              : "font-sans text-[2rem] md:text-[2.25rem] font-semibold tabular-nums leading-none text-content-primary"
          }
        >
          {value}
        </span>
        {valueSuffix ? (
          <span className="font-sans text-[1.25rem] md:text-[1.5rem] font-semibold leading-none text-content-secondary/70">
            {valueSuffix}
          </span>
        ) : null}
        {unit ? (
          <span className="text-xs text-content-tertiary pb-1">{unit}</span>
        ) : null}
      </div>
    </div>
  );
}

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

// ─── Editorial weekly rhythm chart ──────────────────────────────────

/**
 * Single-focus chart: 7 weekday bars with the post count above each bar.
 * Peak weekday is rendered in the primary blue accent; other days with
 * posts use a calm light blue; zero-post days collapse to a hairline.
 */
function WeeklyRhythmChart({
  days,
  t,
}: {
  days: DayEntry[];
  t: TFunction;
}) {
  const buckets = aggregateByWeekday(days);
  const totalPosts = buckets.reduce((s, b) => s + b.posts, 0);
  if (totalPosts === 0) return null;

  const top = pickMostActive(buckets);
  const maxPosts = Math.max(1, ...buckets.map((b) => b.posts));
  const weekdayShort =
    (t("frequency.weekday_short", { returnObjects: true }) as string[]) ?? [];

  const BAR_MAX = 96;
  const BAR_MIN = 18;
  const ZERO_LINE = 4;
  const ACCENT = "var(--accent-primary, #3772E5)";
  const ACCENT_SOFT =
    "color-mix(in oklab, var(--accent-primary, #3772E5) 22%, #FFFFFF)";
  const ZERO_TINT =
    "color-mix(in oklab, var(--accent-primary, #3772E5) 8%, #FFFFFF)";

  return (
    <div className="mt-8 rounded-xl border border-border-subtle/60 bg-surface-base/40 px-4 md:px-5 pt-5 pb-4">
      <div className="flex items-center justify-between mb-4">
        <span className="text-eyebrow-sm text-content-tertiary">
          {t("frequency.weekly_rhythm.title")}
        </span>
        <span className="inline-flex items-center gap-1.5 text-[11px] text-content-tertiary tabular-nums">
          <span
            className="inline-block h-2 w-2 rounded-sm"
            style={{ background: ACCENT }}
          />
          {t("frequency.weekly_rhythm.peak_chip")}
        </span>
      </div>
      <div
        className="relative grid gap-2 sm:gap-3"
        style={{
          gridTemplateColumns: "repeat(7, minmax(0, 1fr))",
          height: `${BAR_MAX + 32}px`,
        }}
        role="img"
        aria-label={t("frequency.weekly_rhythm.aria_distribution")}
      >
        {/* baseline hairline */}
        <div
          aria-hidden="true"
          className="absolute left-0 right-0 bottom-0 h-px bg-border-default/60"
        />
        {buckets.map((b) => {
          const isPeak = b.weekday === top.weekday && b.posts > 0;
          const isZero = b.posts === 0;
          const ratio = b.posts / maxPosts;
          const height = isZero
            ? ZERO_LINE
            : Math.max(BAR_MIN, Math.round(ratio * BAR_MAX));
          const background = isPeak
            ? ACCENT
            : isZero
              ? ZERO_TINT
              : ACCENT_SOFT;
          return (
            <div
              key={b.weekday}
              className="relative flex flex-col items-center justify-end h-full"
            >
              <span
                className={`mb-1.5 text-[11px] leading-none tabular-nums ${
                  isPeak
                    ? "font-semibold text-content-primary"
                    : isZero
                      ? "text-content-tertiary"
                      : "font-medium text-content-secondary"
                }`}
              >
                {b.posts}
              </span>
              <div
                className="block w-full max-w-[42px] rounded-t-[4px]"
                style={{
                  height: `${height}px`,
                  background,
                  boxShadow: isPeak
                    ? "0 2px 6px -2px color-mix(in oklab, var(--accent-primary, #3772E5) 50%, transparent)"
                    : undefined,
                }}
              />
            </div>
          );
        })}
      </div>
      <div
        className="grid gap-2 sm:gap-3 mt-2.5"
        style={{ gridTemplateColumns: "repeat(7, minmax(0, 1fr))" }}
      >
        {weekdayShort.map((wd, i) => {
          const isPeak = i === top.weekday && buckets[i].posts > 0;
          return (
            <span
              key={i}
              className={`text-xs text-center leading-none select-none ${
                isPeak
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
  );
}

/** Editorial conclusion lines under a hairline divider. */
function FrequencyConclusion({
  days,
  verdict,
  showSuccessMark,
  t,
}: {
  days: DayEntry[];
  verdict: { strong: string; rest: string };
  showSuccessMark: boolean;
  t: TFunction;
}) {
  const buckets = aggregateByWeekday(days);
  const top = pickMostActive(buckets);
  const quietPick = pickQuietest(buckets, t);
  const weekdayLong =
    (t("frequency.weekday_long", { returnObjects: true }) as string[]) ?? [];
  const quietIdx = quietPick
    ? weekdayLong.findIndex((w) => w === quietPick.label)
    : -1;

  const peakLabel = weekdayLong[top.weekday] ?? "";
  const interpretation = (() => {
    if (quietPick && quietIdx >= 0) {
      const silentCount = buckets[quietIdx].daysSilent;
      return t(
        silentCount === 1
          ? "frequency.weekly_rhythm.interpretation_with_quiet_one"
          : "frequency.weekly_rhythm.interpretation_with_quiet_other",
        { peak: peakLabel, quiet: quietPick.label, count: silentCount },
      );
    }
    if (quietPick) {
      return t("frequency.weekly_rhythm.interpretation_peak_only", {
        peak: peakLabel,
      });
    }
    return t("frequency.weekly_rhythm.interpretation_uniform");
  })();

  return (
    <div className="mt-8 pt-5 border-t border-border-default/70 space-y-2.5">
      <p
        className="text-[14px] text-content-secondary leading-relaxed [&_b]:font-semibold [&_b]:text-content-primary"
        dangerouslySetInnerHTML={{ __html: interpretation }}
      />
      <p className="flex items-start gap-2 text-[14px] text-content-secondary leading-relaxed">
        {showSuccessMark && (
          <CheckCircle2
            className="size-4 mt-[3px] shrink-0"
            style={{ color: "rgba(29,158,117,0.95)" }}
            aria-hidden="true"
          />
        )}
        <span>
          <strong className="font-semibold text-content-primary">
            {verdict.strong}
          </strong>{" "}
          {verdict.rest}
        </span>
      </p>
    </div>
  );
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
  const lang: "en" | "pt" = i18n.language.startsWith("pt") ? "pt" : "en";

  // Inline summary metrics (no boxed cards): posts/week · % active days · peak weekday.
  const buckets = aggregateByWeekday(windowedDays);
  const top = pickMostActive(buckets);
  const weekdayLong =
    (t("frequency.weekday_long", { returnObjects: true }) as string[]) ?? [];
  const peakLabel = top.posts > 0 ? weekdayLong[top.weekday] ?? "—" : "—";
  const cadenceValue = formatNumber(postingFrequencyWeekly, lang, {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
  const consistencyPct =
    windowedDays.length > 0
      ? Math.round((publishedCount / windowedDays.length) * 100)
      : 0;

  return (
    <article className="rounded-2xl border border-border-default bg-surface-secondary shadow-card overflow-hidden flex flex-col">
      <div className="px-5 md:px-7 pt-6 md:pt-7 pb-6 md:pb-7">
        <ReportCardSectionHeader
          title={t("frequency.title")}
          qualifier={!isInsufficient ? frequencyStatus : undefined}
          qualifierTone={
            (statusKey === "high"
              ? "positive"
              : statusKey === "medium"
                ? "warning"
                : "negative") as ReportSectionQualifierTone
          }
          subtitle={subtitleLine ?? (isInsufficient ? headline : undefined)}
          bottomMargin={false}
        />

        {!isInsufficient && hasUsableData && (
          <>
            {/* KPI strip — icon + eyebrow on top, value below (aligned with "Índice do perfil" card pattern) */}
            <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
              <KpiTile
                icon={<Activity className="h-3.5 w-3.5" aria-hidden="true" />}
                label={t("frequency.kpi.cadence_label")}
                unit={t("frequency.kpi.cadence_unit")}
                value={cadenceValue}
              />
              <KpiTile
                icon={<CalendarClock className="h-3.5 w-3.5" aria-hidden="true" />}
                label={t("frequency.kpi.consistency_label")}
                value={String(consistencyPct)}
                valueSuffix="%"
              />
              <KpiTile
                icon={<TrendingUp className="h-3.5 w-3.5" aria-hidden="true" />}
                label={t("frequency.kpi.peak_label")}
                value={peakLabel}
                isCategorical
              />
            </div>

            <WeeklyRhythmChart days={windowedDays} t={t} />

            <FrequencyConclusion
              days={windowedDays}
              verdict={verdict}
              showSuccessMark={score >= 70}
              t={t}
            />
          </>
        )}
      </div>

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
        className="px-5 md:px-6 pb-5 sm:pb-6 md:pb-8 -mt-2 text-xs text-content-tertiary leading-relaxed"
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
    <div className="px-5 md:px-6 mt-2 space-y-1.5">
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
