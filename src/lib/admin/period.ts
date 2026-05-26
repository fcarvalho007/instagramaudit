/**
 * Helper de período partilhado entre rotas /admin (Relatórios, Perfis, etc.).
 *
 * Mapeia o `AdminPeriod` (7d | 30d | 90d | ytd) para `sinceISO` + nº de dias
 * efetivo, de forma a todos os endpoints aceitarem ?period=… consistentemente.
 */

export type AdminPeriodKey = "7d" | "30d" | "90d" | "ytd";

const VALID: ReadonlyArray<AdminPeriodKey> = ["7d", "30d", "90d", "ytd"];

export function parsePeriod(input: string | null | undefined): AdminPeriodKey {
  if (!input) return "30d";
  const v = input.trim().toLowerCase() as AdminPeriodKey;
  return VALID.includes(v) ? v : "30d";
}

export interface PeriodWindow {
  period: AdminPeriodKey;
  days: number;
  sinceMs: number;
  sinceISO: string;
}

export function resolvePeriod(input: string | null | undefined): PeriodWindow {
  const period = parsePeriod(input);
  const now = Date.now();
  let days: number;
  let sinceMs: number;
  if (period === "7d") {
    days = 7;
    sinceMs = now - 7 * 24 * 60 * 60 * 1000;
  } else if (period === "90d") {
    days = 90;
    sinceMs = now - 90 * 24 * 60 * 60 * 1000;
  } else if (period === "ytd") {
    const ytdStart = new Date(new Date().getFullYear(), 0, 1).getTime();
    sinceMs = ytdStart;
    days = Math.max(1, Math.ceil((now - ytdStart) / (24 * 60 * 60 * 1000)));
  } else {
    days = 30;
    sinceMs = now - 30 * 24 * 60 * 60 * 1000;
  }
  return {
    period,
    days,
    sinceMs,
    sinceISO: new Date(sinceMs).toISOString(),
  };
}