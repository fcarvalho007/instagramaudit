import { useTranslation } from "react-i18next";
import type { SocialinsiderFormatRef } from "@/lib/knowledge/socialinsider-context";

const PT_MONTHS_SHORT = [
  "Jan", "Fev", "Mar", "Abr", "Mai", "Jun",
  "Jul", "Ago", "Set", "Out", "Nov", "Dez",
];
const EN_MONTHS_SHORT = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

export function formatDateRange(
  from: string,
  to: string | null,
  lang: string,
): string {
  const months = lang.startsWith("en") ? EN_MONTHS_SHORT : PT_MONTHS_SHORT;
  const f = new Date(from);
  if (Number.isNaN(f.getTime())) return from;
  const fromStr = `${months[f.getUTCMonth()]} ${f.getUTCFullYear()}`;
  if (!to) return fromStr;
  const t = new Date(to);
  if (Number.isNaN(t.getTime())) return fromStr;
  const toStr = `${months[t.getUTCMonth()]} ${t.getUTCFullYear()}`;
  return `${fromStr}–${toStr}`;
}

interface Props {
  refData: SocialinsiderFormatRef | null;
  className?: string;
}

/**
 * Dynamic source attribution rendered at the bottom of cards that consume
 * external market data. Renders nothing if `refData` is null.
 */
export function ExternalSourceNote({ refData, className }: Props) {
  const { t, i18n } = useTranslation("report");
  if (!refData) return null;
  const range = formatDateRange(
    refData.dataRange.from,
    refData.dataRange.to,
    i18n.language,
  );
  const sourceLink = refData.sourceUrl ? (
    <a
      href={refData.sourceUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="underline decoration-dotted underline-offset-2 hover:text-content-secondary"
    >
      {refData.sourceName}
    </a>
  ) : (
    <span>{refData.sourceName}</span>
  );
  const template = t("external_source_note.template", {
    source: "__SOURCE__",
    range,
  });
  const [before, after] = template.split("__SOURCE__");
  return (
    <p
      className={
        className ??
        "px-5 md:px-6 pb-6 md:pb-8 -mt-2 text-xs text-content-tertiary leading-relaxed"
      }
    >
      {before}
      {sourceLink}
      {after}
    </p>
  );
}