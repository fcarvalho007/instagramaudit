/**
 * Zone D — Card 1: Frequência de publicação.
 * Human-readable headline → stats → posting calendar → verdict.
 */
import { ArrowDown, ArrowUp } from "lucide-react";
import { computeFrequencia } from "./score-utils";
import { InsightCallout } from "./insight-callout";

function getFrequencyStatus(score: number): string {
  if (score >= 70) return "Alta";
  if (score >= 40) return "Média";
  return "Baixa";
}

// ─── Helpers ────────────────────────────────────────────────────────

const PT_MONTHS = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
];

const PT_WEEKDAYS_SHORT = ["S", "T", "Q", "Q", "S", "S", "D"];
const PT_WEEKDAYS_LONG = [
  "Segunda",
  "Terça",
  "Quarta",
  "Quinta",
  "Sexta",
  "Sábado",
  "Domingo",
];

export function getFrequencyHeadline(postsPerDay: number): string {
  if (postsPerDay > 1.2) return "Mais de 1 post por dia";
  if (postsPerDay >= 0.85) return "Cerca de 1 post por dia";
  if (postsPerDay >= 0.5) return "1 post a cada 1–2 dias";
  if (postsPerDay >= 0.3) return "1 post a cada 2–3 dias";
  return "Menos de 1 post por semana";
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

function fmtPtDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
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
      label: "Fim-de-semana",
      detail: `${weekendSilent} ${weekendSilent === 1 ? "dia" : "dias"} s/ post`,
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
  return {
    label: PT_WEEKDAYS_LONG[worst.weekday],
    detail: `${worst.daysSilent} ${worst.daysSilent === 1 ? "dia" : "dias"} s/ post`,
  };
}

function WeeklySummary({ days }: { days: DayEntry[] }) {
  const buckets = aggregateByWeekday(days);
  const totalPosts = buckets.reduce((s, b) => s + b.posts, 0);
  if (totalPosts === 0) return null;

  const top = pickMostActive(buckets);
  const quiet = pickQuietest(buckets);
  const maxPosts = Math.max(...buckets.map((b) => b.posts));

  return (
    <div className="px-4 sm:px-5 md:px-6 mt-4">
      <div className="rounded-xl border border-border-default bg-surface-muted/60 p-3.5 sm:p-4">
        <span className="text-eyebrow-sm text-content-tertiary block mb-3">
          Resumo da semana
        </span>

        <div
          className={`grid gap-3 ${quiet ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-1"}`}
        >
          {/* Mais ativo */}
          <div className="flex items-start gap-2.5">
            <span
              aria-hidden
              className="flex size-7 shrink-0 items-center justify-center rounded-full"
              style={{ background: "rgba(29,158,117,0.15)" }}
            >
              <ArrowUp
                className="size-3.5"
                style={{ color: "rgb(29,158,117)" }}
              />
            </span>
            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-[0.04em] text-content-tertiary leading-none mb-1">
                Mais ativo
              </p>
              <p className="text-[13px] text-content-primary leading-snug">
                <span className="font-semibold">
                  {PT_WEEKDAYS_LONG[top.weekday]}
                </span>{" "}
                <span className="text-content-secondary tabular-nums">
                  · {top.posts} {top.posts === 1 ? "post" : "posts"}
                </span>
              </p>
            </div>
          </div>

          {/* Mais parado — only when sample qualifies */}
          {quiet && (
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
              <p className="text-[10px] uppercase tracking-[0.04em] text-content-tertiary leading-none mb-1">
                Mais parado
              </p>
              <p className="text-[13px] text-content-primary leading-snug">
                <span className="font-semibold">{quiet.label}</span>{" "}
                <span className="text-content-secondary tabular-nums">
                  · {quiet.detail}
                </span>
              </p>
            </div>
          </div>
          )}
        </div>

        {/* Mini bars S T Q Q S S D */}
        <div className="mt-4">
          <div
            className="grid gap-1.5 items-end"
            style={{ gridTemplateColumns: "repeat(7, 1fr)" }}
            role="img"
            aria-label="Distribuição de publicações por dia da semana"
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
            {PT_WEEKDAYS_SHORT.map((wd, i) => {
              const isTop = i === top.weekday && buckets[i].posts > 0;
              return (
                <span
                  key={i}
                  className={`text-[10px] text-center leading-none select-none ${
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

  const weeks: (DayEntry | null)[][] = [];
  for (let i = 0; i < padded.length; i += 7) {
    weeks.push(padded.slice(i, i + 7));
  }
  return weeks;
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
}: FrequencyCardProps) {
  // Source-of-truth for "Y dias" is the calendar itself when present.
  // Falls back to the windowDays prop (matches now, defensive for future).
  const effectiveWindowDays =
    calendarDays.length > 0 ? calendarDays.length : windowDays;
  const postsPerDay =
    effectiveWindowDays > 0 ? postsAnalyzed / effectiveWindowDays : 0;
  const headline = getFrequencyHeadline(postsPerDay);
  const score = computeFrequencia(postingFrequencyWeekly);
  const verdict = getFrequencyVerdict(score);
  const frequencyStatus = getFrequencyStatus(score);
  const verdictTone =
    score >= 70 ? ("positive" as const) : score >= 40 ? ("warning" as const) : ("danger" as const);
  const verdictLabel =
    score >= 70 ? "PONTO FORTE" : score >= 40 ? "A MELHORAR" : "ALERTA";

  // Dynamic subtitle: "1 post a cada 1–2 dias · 12 publicações em 18 dias"
  const hasUsableData = postsAnalyzed > 0 && effectiveWindowDays > 0;
  const subtitleLine = hasUsableData
    ? `${headline} · ${postsAnalyzed} publicações em ${effectiveWindowDays} dias`
    : null;

  const publishedCount = calendarDays.filter((d) => d.published).length;
  const pausedCount = calendarDays.length - publishedCount;
  const maxPosts = Math.max(1, ...calendarDays.map((d) => d.postCount));

  const weeks = buildWeekGrid(calendarDays);

  return (
    <article className="rounded-2xl border border-border-default bg-surface-secondary shadow-card overflow-hidden flex flex-col">
      {/* Header */}
      <div className="px-4 sm:px-5 md:px-6 pt-5 sm:pt-6 md:pt-8 space-y-2.5">
        <div className="flex items-start gap-3">
          <h3 className="font-display text-[1.25rem] sm:text-[1.5rem] md:text-[2rem] font-semibold tracking-tight text-content-primary leading-tight break-words">
            Frequência de publicação{" "}
            <span
              className="font-semibold"
              style={{
                borderBottom: `2px solid ${
                  frequencyStatus === "Alta"
                    ? "rgba(29,158,117,0.50)"
                    : frequencyStatus === "Média"
                      ? "rgba(217,119,6,0.50)"
                      : "rgba(163,45,45,0.50)"
                }`,
                paddingBottom: "1px",
              }}
            >
              {frequencyStatus}
            </span>
          </h3>
        </div>
        {subtitleLine && (
          <p className="text-[15px] text-content-secondary leading-relaxed">
            {subtitleLine}
          </p>
        )}
      </div>

      {/* Resumo da semana */}
      <WeeklySummary days={calendarDays} />

      {/* Calendar grid */}
      {weeks.length > 0 && (
        <div className="px-4 sm:px-5 md:px-6 mt-4 sm:mt-6">
          <span className="text-[10px] uppercase tracking-[0.04em] text-content-tertiary block mb-2">
            Quando publicou
          </span>

          {/* Weekday headers */}
          <div className="grid grid-cols-7 gap-1 md:gap-1.5 mb-1 md:mb-1.5">
            {PT_WEEKDAYS_SHORT.map((wd, i) => (
              <span
                key={i}
                className="text-[11px] md:text-xs font-medium text-content-secondary text-center leading-none select-none"
              >
                {wd}
              </span>
            ))}
          </div>

          {/* Week rows */}
          <div
            role="img"
            aria-label={`Calendário de publicação: ${publishedCount} dias com publicação, ${pausedCount} sem publicação`}
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
                return (
                  <span
                    key={day.date}
                    title={`${fmtPtDate(day.date)} · ${day.postCount > 0 ? `${day.postCount} post${day.postCount > 1 ? "s" : ""}` : "sem publicação"}`}
                    className="relative aspect-[7/4] rounded-md flex items-center justify-center transition-colors"
                    style={{ background: cellStyle(day.postCount).bg, border: cellStyle(day.postCount).border }}
                  >
                    {day.postCount > 1 && (
                      <span
                        className="text-[9px] md:text-[10px] font-bold leading-none text-white select-none drop-shadow-[0_1px_1px_rgba(0,0,0,0.25)]"
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
            <span className="inline-flex items-center gap-1.5 text-[10px] md:text-[11px] text-content-secondary">
              <span
                className="size-[9px] md:size-[10px] rounded-[3px] shrink-0"
                aria-hidden="true"
                style={{ background: legendBg(0), border: "1px solid rgba(148,163,184,0.35)" }}
              />
              parou ({pausedCount})
            </span>
            <span className="inline-flex items-center gap-1.5 text-[10px] md:text-[11px] text-content-secondary">
              <span
                className="size-[9px] md:size-[10px] rounded-[3px] shrink-0"
                aria-hidden="true"
                style={{ background: legendBg(1) }}
              />
              1 post
            </span>
            {maxPosts >= 2 && (
              <span className="inline-flex items-center gap-1.5 text-[10px] md:text-[11px] text-content-secondary">
                <span
                  className="size-[9px] md:size-[10px] rounded-[3px] shrink-0"
                  aria-hidden="true"
                  style={{ background: legendBg(maxPosts >= 3 ? 3 : 2) }}
                />
                {maxPosts >= 3 ? "3+" : "2"} posts
              </span>
            )}
            <span className="ml-auto text-[13px] md:text-sm font-medium tabular-nums text-content-secondary">
              {publishedCount}/{calendarDays.length} dias
            </span>
          </div>
        </div>
      )}

      {/* Verdict */}
      <InsightCallout tone={verdictTone} label={verdictLabel} className="mt-auto mx-4 sm:mx-5 md:mx-6 mb-5 sm:mb-6 md:mb-8">
        <p>
          <span className="font-semibold">{verdict.strong}</span>{" "}
          {verdict.rest}
        </p>
      </InsightCallout>
    </article>
  );
}
