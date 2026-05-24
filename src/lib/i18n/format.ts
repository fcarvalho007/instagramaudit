/**
 * Locale-aware formatting helpers. Pass the active language from
 * `useLanguage()` so the same component renders consistently in PT and EN.
 */

import type { SupportedLanguage } from "@/i18n";

const LOCALE_MAP: Record<SupportedLanguage, string> = {
  pt: "pt-PT",
  en: "en-US",
};

function resolveLocale(lang: SupportedLanguage): string {
  return LOCALE_MAP[lang] ?? LOCALE_MAP.pt;
}

export function formatDate(
  date: Date | string | number,
  lang: SupportedLanguage,
  options: Intl.DateTimeFormatOptions = { dateStyle: "medium" },
): string {
  const d = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat(resolveLocale(lang), options).format(d);
}

export function formatNumber(
  value: number,
  lang: SupportedLanguage,
  options: Intl.NumberFormatOptions = {},
): string {
  if (!Number.isFinite(value)) return "";
  return new Intl.NumberFormat(resolveLocale(lang), options).format(value);
}

const RTF_UNITS: { unit: Intl.RelativeTimeFormatUnit; seconds: number }[] = [
  { unit: "year", seconds: 60 * 60 * 24 * 365 },
  { unit: "month", seconds: 60 * 60 * 24 * 30 },
  { unit: "week", seconds: 60 * 60 * 24 * 7 },
  { unit: "day", seconds: 60 * 60 * 24 },
  { unit: "hour", seconds: 60 * 60 },
  { unit: "minute", seconds: 60 },
  { unit: "second", seconds: 1 },
];

export function formatRelativeTime(
  date: Date | string | number,
  lang: SupportedLanguage,
): string {
  const d = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(d.getTime())) return "";
  const diff = (d.getTime() - Date.now()) / 1000;
  const abs = Math.abs(diff);
  const rtf = new Intl.RelativeTimeFormat(resolveLocale(lang), {
    numeric: "auto",
  });
  for (const { unit, seconds } of RTF_UNITS) {
    if (abs >= seconds || unit === "second") {
      return rtf.format(Math.round(diff / seconds), unit);
    }
  }
  return "";
}