/**
 * Ranking de votos 1-5 ordenado por frequência, com barra horizontal
 * e sparkline da evolução diária. Responde "qual o emoji mais votado?".
 */

import { LineChart, Line, ResponsiveContainer, YAxis } from "recharts";

const RATING_LABEL: Record<1 | 2 | 3 | 4 | 5, string> = {
  1: "1 · Muito mau",
  2: "2 · Mau",
  3: "3 · Neutro",
  4: "4 · Bom",
  5: "5 · Excelente",
};
const RATING_EMOJI: Record<1 | 2 | 3 | 4 | 5, string> = {
  1: "😡", 2: "😕", 3: "😐", 4: "🙂", 5: "🤩",
};
const RATING_COLOR: Record<1 | 2 | 3 | 4 | 5, string> = {
  1: "#E24B4A",
  2: "#BA7517",
  3: "#888780",
  4: "#3772E5",
  5: "#1D9E75",
};

export interface RatingDailyPoint {
  day: string;
  r1: number; r2: number; r3: number; r4: number; r5: number;
}

export function RatingRanking({
  totals,
  daily,
}: {
  totals: Record<1 | 2 | 3 | 4 | 5, number>;
  daily: RatingDailyPoint[];
}) {
  const sum = (Object.values(totals) as number[]).reduce((a, b) => a + b, 0);
  const entries = ([5, 4, 3, 2, 1] as const)
    .map((k) => ({ k, n: totals[k] }))
    .sort((a, b) => b.n - a.n);
  const max = Math.max(...entries.map((e) => e.n), 1);

  if (sum === 0) {
    return (
      <div className="rounded-lg border border-dashed border-admin-border bg-white px-4 py-6 text-center text-[13px] text-admin-text-secondary">
        Sem votos no período.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {entries.map(({ k, n }) => {
        const pct = sum > 0 ? n / sum : 0;
        const barPct = (n / max) * 100;
        const series = daily.map((d) => ({ x: d.day, y: d[`r${k}` as keyof RatingDailyPoint] as number }));
        return (
          <div
            key={k}
            className="grid grid-cols-[180px_1fr_88px_72px] items-center gap-3 rounded-md border border-admin-border bg-white px-3 py-2"
          >
            <div className="flex items-center gap-2 text-[13px] text-admin-text-primary">
              <span className="text-[18px] leading-none">{RATING_EMOJI[k]}</span>
              <span className="font-medium">{RATING_LABEL[k]}</span>
            </div>
            <div className="h-2 rounded-full bg-admin-surface-elevated overflow-hidden">
              <div
                className="h-full"
                style={{ width: `${barPct}%`, background: RATING_COLOR[k] }}
              />
            </div>
            <div className="text-[13px] tabular-nums text-admin-text-primary text-right">
              {n} · {Math.round(pct * 100)}%
            </div>
            <div className="h-7" aria-hidden>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={series} margin={{ top: 2, right: 0, bottom: 2, left: 0 }}>
                  <YAxis hide domain={[0, "auto"]} />
                  <Line
                    type="monotone"
                    dataKey="y"
                    stroke={RATING_COLOR[k]}
                    strokeWidth={1.5}
                    dot={false}
                    isAnimationActive={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        );
      })}
    </div>
  );
}