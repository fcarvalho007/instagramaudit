/**
 * Zone D — Card 1: Frequência de publicação.
 * Human-readable headline → stats → posting calendar → verdict.
 */
import { CalendarDays, Check } from "lucide-react";
import { computeFrequencia } from "./score-utils";

// ─── Helpers ────────────────────────────────────────────────────────

const PT_MONTHS = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
];

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
      rest: "Publicas mais que a média de quem tem o teu número de seguidores.",
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

  const publishedCount = calendarDays.filter((d) => d.published).length;
  const pausedCount = calendarDays.length - publishedCount;

  const statsLine =
    windowDays > 0
      ? `${postsAnalyzed} publicações em ${windowDays} dias · ${fmtNum(postingFrequencyWeekly)} por semana`
      : `${postsAnalyzed} publicações analisadas`;

  return (
    <article className="rounded-2xl border border-border-default bg-surface-secondary p-5 md:p-6 shadow-card flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <span className="flex items-center gap-1.5 text-[13px] font-medium text-content-primary">
          <CalendarDays className="size-4 text-content-secondary" aria-hidden="true" />
          Frequência de publicação
        </span>
        <span className="text-[9px] text-content-tertiary tracking-[0.06em]">
          ✦ AUTO
        </span>
      </div>

      {/* Human headline */}
      <p className="font-display text-[22px] font-medium text-content-primary leading-[1.2] mb-1.5">
        {headline}
      </p>

      {/* Stats line */}
      <p className="text-[12px] text-content-secondary mb-5">
        {statsLine}
      </p>

      {/* Calendar visualisation */}
      {calendarDays.length > 0 && (
        <div className="mb-5">
          <span className="text-[10px] uppercase tracking-[0.04em] text-content-tertiary block mb-2">
            Quando publicou
          </span>
          <div
            role="img"
            aria-label={`Calendário de publicação dos últimos ${calendarDays.length} dias, ${publishedCount} dias com publicação e ${pausedCount} sem publicação`}
            className="flex flex-wrap gap-[3px]"
          >
            {calendarDays.map((day) => (
              <span
                key={day.date}
                title={`${fmtPtDate(day.date)} · ${day.published ? "publicou" : "não publicou"}`}
                className={`size-[14px] rounded-[3px] shrink-0 transition-opacity duration-300 ${
                  day.published
                    ? "bg-emerald-500"
                    : "bg-surface-muted"
                }`}
              />
            ))}
          </div>

          {/* Legend */}
          <div className="flex items-center gap-4 mt-2">
            <span className="inline-flex items-center gap-1.5 text-[10px] text-content-secondary">
              <span className="size-2 rounded-full bg-emerald-500 shrink-0" aria-hidden="true" />
              publicou ({publishedCount})
            </span>
            <span className="inline-flex items-center gap-1.5 text-[10px] text-content-secondary">
              <span className="size-2 rounded-full bg-surface-muted shrink-0" aria-hidden="true" />
              parou ({pausedCount})
            </span>
          </div>
        </div>
      )}

      {/* Verdict */}
      <div className="mt-auto rounded-lg bg-tint-success border border-border-subtle px-3 py-2.5 flex items-start gap-2">
        <Check className="size-3.5 text-signal-success shrink-0 mt-0.5" aria-hidden="true" />
        <p className="text-[12px] text-content-primary leading-[1.4]">
          <span className="font-medium">{verdict.strong}</span>{" "}
          {verdict.rest}
        </p>
      </div>
    </article>
  );
}
