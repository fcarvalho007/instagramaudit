/**
 * Zone D — Card 1: Frequência de publicação.
 * Human-readable headline → stats → posting calendar → verdict.
 */
import { CalendarDays } from "lucide-react";
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

export function getFrequencyHeadline(postsPerDay: number): string {
  if (postsPerDay > 1.2) return "Mais de 1 post por dia";
  if (postsPerDay >= 0.85) return "Cerca de 1 post por dia";
  if (postsPerDay >= 0.5) return "1 post a cada 1–2 dias";
  if (postsPerDay >= 0.3) return "1 post a cada 2–3 dias";
  return "Menos de 1 post por semana";
}

export function getFrequencyVerdict(score: number): { strong: string; rest: string } {
  if (score >= 90) {
    return {
      strong: "Cadência forte e consistente.",
      rest: "Publica mais que a média de perfis com um número de seguidores semelhante.",
    };
  }
  if (score >= 50) {
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

function fmtNum(n: number): string {
  return n.toFixed(1).replace(".", ",");
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
 * Cell colour by post count (local decorative RGBA):
 *   0: rgba(15,23,42,0.04)
 *   1: rgba(29,158,117,0.45)
 *   2: rgba(29,158,117,0.70)
 *   3+: rgba(29,158,117,1.00)
 */
function cellBg(count: number): string {
  if (count === 0) return "rgba(15,23,42,0.04)";
  if (count === 1) return "rgba(29,158,117,0.45)";
  if (count === 2) return "rgba(29,158,117,0.70)";
  return "rgba(29,158,117,1.00)";
}

// ─── Component ──────────────────────────────────────────────────────

export function FrequencyCard({
  postsAnalyzed,
  windowDays,
  postingFrequencyWeekly,
  calendarDays,
}: FrequencyCardProps) {
  const postsPerDay = windowDays > 0 ? postsAnalyzed / windowDays : 0;
  const headline = getFrequencyHeadline(postsPerDay);
  const score = computeFrequencia(postingFrequencyWeekly);
  const verdict = getFrequencyVerdict(score);
  const frequencyStatus = getFrequencyStatus(score);
  const verdictTone = score >= 90 ? "positive" as const : score >= 50 ? "warning" as const : "danger" as const;
  const verdictLabel = score >= 90 ? "PONTO FORTE" : score >= 50 ? "A MELHORAR" : "ALERTA";

  // Dynamic subtitle: "1 post a cada 1–2 dias · 12 publicações em 18 dias"
  const subtitleLine = `${headline} · ${postsAnalyzed} publicações em ${windowDays} dias`;

  const publishedCount = calendarDays.filter((d) => d.published).length;
  const pausedCount = calendarDays.length - publishedCount;
  const maxPosts = Math.max(1, ...calendarDays.map((d) => d.postCount));

  const statsLine =
    windowDays > 0
      ? `${postsAnalyzed} publicações em ${windowDays} dias · ${fmtNum(postingFrequencyWeekly)}/semana`
      : `${postsAnalyzed} publicações analisadas`;

  const weeks = buildWeekGrid(calendarDays);

  return (
    <article className="rounded-2xl border border-border-default bg-surface-secondary p-4 md:p-5 shadow-card flex flex-col gap-4">
      {/* Header */}
      <div className="space-y-2.5">
        <div className="flex items-start gap-3">
          <h3 className="font-display text-[1.5rem] md:text-[2rem] font-semibold tracking-tight text-content-primary leading-tight">
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
        <p className="text-[13px] md:text-[14px] text-content-secondary leading-snug">
          {subtitleLine}
        </p>
      </div>

      {/* Calendar grid */}
      {weeks.length > 0 && (
        <div>
          <span className="text-[10px] uppercase tracking-[0.04em] text-content-tertiary block mb-1.5">
            Quando publicou
          </span>

          {/* Weekday headers */}
          <div className="grid grid-cols-7 gap-[3px] mb-[3px]">
            {PT_WEEKDAYS_SHORT.map((wd, i) => (
              <span
                key={i}
                className="text-[8px] text-content-tertiary text-center leading-none select-none"
              >
                {wd}
              </span>
            ))}
          </div>

          {/* Week rows */}
          <div
            role="img"
            aria-label={`Calendário de publicação: ${publishedCount} dias com publicação, ${pausedCount} sem publicação`}
            className="grid gap-[3px]"
            style={{ gridTemplateColumns: "repeat(7, 1fr)" }}
          >
            {weeks.flatMap((week, wi) =>
              Array.from({ length: 7 }).map((_, di) => {
                const day = week[di] ?? null;
                if (!day) {
                  return (
                    <span
                      key={`pad-${wi}-${di}`}
                      className="aspect-square rounded-[3px]"
                    />
                  );
                }
                return (
                  <span
                    key={day.date}
                    title={`${fmtPtDate(day.date)} · ${day.postCount > 0 ? `${day.postCount} post${day.postCount > 1 ? "s" : ""}` : "sem publicação"}`}
                    className="relative aspect-square rounded-[3px] flex items-center justify-center"
                    style={{ background: cellBg(day.postCount) }}
                  >
                    {day.postCount > 1 && (
                      <span
                        className="text-[7px] font-bold leading-none text-white select-none"
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
          <div className="flex items-center gap-3 mt-1.5">
            <span className="inline-flex items-center gap-1 text-[9px] text-content-secondary">
              <span
                className="size-[7px] rounded-[2px] shrink-0"
                aria-hidden="true"
                style={{ background: cellBg(0) }}
              />
              parou ({pausedCount})
            </span>
            <span className="inline-flex items-center gap-1 text-[9px] text-content-secondary">
              <span
                className="size-[7px] rounded-[2px] shrink-0"
                aria-hidden="true"
                style={{ background: cellBg(1) }}
              />
              1 post
            </span>
            {maxPosts >= 2 && (
              <span className="inline-flex items-center gap-1 text-[9px] text-content-secondary">
                <span
                  className="size-[7px] rounded-[2px] shrink-0"
                  aria-hidden="true"
                  style={{ background: cellBg(maxPosts >= 3 ? 3 : 2) }}
                />
                {maxPosts >= 3 ? "3+" : "2"} posts
              </span>
            )}
            <span className="ml-auto text-[9px] tabular-nums text-content-tertiary">
              {publishedCount}/{calendarDays.length} dias
            </span>
          </div>
        </div>
      )}

      {/* Verdict */}
      <InsightCallout tone={verdictTone} label={verdictLabel} className="mt-auto">
        <p>
          <span className="font-semibold">{verdict.strong}</span>{" "}
          {verdict.rest}
        </p>
      </InsightCallout>
    </article>
  );
}
