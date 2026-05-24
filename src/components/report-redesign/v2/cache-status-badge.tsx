import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useTranslation } from "react-i18next";
import {
  REPORT_RETENTION_DAYS,
  REPORT_RETENTION_MS,
} from "@/lib/report/retention";

export type CacheStatus = "fresh" | "expiring_soon" | "stale" | "unknown";

interface Props {
  /** ISO timestamp da última geração (preferir `meta.generated_at`, senão `updated_at`/`created_at`). */
  analyzedAtIso: string | null;
  /** ISO `expires_at` real do servidor. Quando ausente, derivado por `ttlHours`. */
  expiresAtIso?: string | null;
  /** Fallback de TTL se `expiresAtIso` não vier. Default = janela de retenção do relatório. */
  ttlHours?: number;
  /** Janela "a expirar em breve" em horas. Default 24h (último dia da retenção). */
  warnWithinHours?: number;
  /** Variante reduzida para footers densos. */
  compact?: boolean;
}

interface Variant {
  labelKey: string;
  fallback: string;
  dot: string;
  text: string;
}

const VARIANTS: Record<CacheStatus, Variant> = {
  fresh: { labelKey: "cache.fresh", fallback: "Dados atualizados", dot: "bg-signal-success", text: "text-signal-success" },
  expiring_soon: { labelKey: "cache.expiring", fallback: "A expirar em breve", dot: "bg-signal-warning", text: "text-signal-warning" },
  stale: { labelKey: "cache.stale", fallback: "Dados antigos", dot: "bg-signal-danger", text: "text-signal-danger" },
  unknown: { labelKey: "cache.unknown", fallback: "Estado por confirmar", dot: "bg-content-tertiary", text: "text-content-tertiary" },
};

/**
 * Calcula o estado da cache em função de `now`, do timestamp gerado e do
 * `expires_at` (real ou derivado). Exportado para testes.
 */
export function computeCacheStatus(params: {
  nowMs: number;
  generatedMs: number | null;
  expiresMs: number | null;
  warnWithinMs: number;
}): CacheStatus {
  const { nowMs, generatedMs, expiresMs, warnWithinMs } = params;
  if (generatedMs === null || !Number.isFinite(generatedMs)) return "unknown";
  if (expiresMs === null || !Number.isFinite(expiresMs)) {
    // Sem expiry: usar a janela central de retenção como cutoff de stale.
    return nowMs - generatedMs >= REPORT_RETENTION_MS ? "stale" : "fresh";
  }
  if (nowMs >= expiresMs) return "stale";
  if (nowMs >= expiresMs - warnWithinMs) return "expiring_soon";
  return "fresh";
}

export function CacheStatusBadge({
  analyzedAtIso,
  expiresAtIso = null,
  ttlHours = REPORT_RETENTION_DAYS * 24,
  warnWithinHours = 24,
  compact = false,
}: Props) {
  const { t, i18n } = useTranslation("report");
  const locale = i18n.language === "en" ? "en-GB" : "pt-PT";
  const generatedMs = analyzedAtIso ? new Date(analyzedAtIso).getTime() : null;
  const generatedValid = generatedMs !== null && Number.isFinite(generatedMs);

  const expiresFromServer = expiresAtIso ? new Date(expiresAtIso).getTime() : null;
  const expiresMs = expiresFromServer && Number.isFinite(expiresFromServer)
    ? expiresFromServer
    : generatedValid
      ? (generatedMs as number) + ttlHours * 60 * 60 * 1000
      : null;

  const nowMs = Date.now();
  const status = computeCacheStatus({
    nowMs,
    generatedMs: generatedValid ? (generatedMs as number) : null,
    expiresMs,
    warnWithinMs: warnWithinHours * 60 * 60 * 1000,
  });

  const variant = VARIANTS[status];
  const variantLabel = t(variant.labelKey, { defaultValue: variant.fallback });

  // Estado unknown: badge simples sem tooltip nem datas.
  if (status === "unknown") {
    return (
      <span className={`inline-flex items-center gap-1.5 text-xs ${variant.text}`}>
        <span className={`size-1.5 rounded-full ${variant.dot}`} aria-hidden="true" />
        <span>{variantLabel}</span>
      </span>
    );
  }

  const generatedDate = new Date(generatedMs as number);
  const expiresDate = expiresMs !== null ? new Date(expiresMs) : null;

  const relative = formatRelative(Math.max(0, nowMs - (generatedMs as number)), t);
  const expiresShort =
    expiresDate && status !== "stale" ? formatExpiresShort(expiresDate, locale) : null;

  const tooltipLines = [
    t("cache.last_analysis", { when: formatAbsolute(generatedDate, locale) }),
    expiresDate
      ? status === "stale"
        ? t("cache.expired_on", { when: formatAbsolute(expiresDate, locale) })
        : t("cache.valid_through", { when: formatAbsolute(expiresDate, locale) })
      : null,
  ].filter(Boolean) as string[];

  const trigger = (
    <span
      className={`inline-flex max-w-full flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs tabular-nums ${variant.text}`}
    >
      <span className={`size-1.5 shrink-0 rounded-full ${variant.dot}`} aria-hidden="true" />
      <span className="font-medium">{variantLabel}</span>
      {!compact ? (
        <span className="text-content-tertiary">
          <span aria-hidden="true" className="mx-1 opacity-60">·</span>
          {t("cache.updated", { relative })}
          {expiresShort ? (
            <>
              <span aria-hidden="true" className="mx-1 opacity-60">·</span>
              {t("cache.valid_until", { when: expiresShort })}
            </>
          ) : null}
        </span>
      ) : null}
    </span>
  );

  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            className="inline-flex max-w-full cursor-default items-center bg-transparent p-0 text-left"
            aria-label={`${variantLabel}. ${tooltipLines.join(". ")}.`}
          >
            {trigger}
          </button>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs whitespace-pre-line text-xs leading-relaxed">
          {tooltipLines.join("\n")}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

function formatRelative(
  ageMs: number,
  t: (key: string, opts?: Record<string, unknown>) => string,
): string {
  const mins = Math.floor(ageMs / 60_000);
  if (mins < 1) return t("cache.just_now", { defaultValue: "agora mesmo" });
  if (mins < 60) return t("cache.minutes", { count: mins, defaultValue: `há ${mins} min` });
  const hours = Math.floor(mins / 60);
  if (hours < 24) return hours === 1
    ? t("cache.hour_one", { defaultValue: "há 1 hora" })
    : t("cache.hours_other", { count: hours, defaultValue: `há ${hours} horas` });
  const days = Math.floor(hours / 24);
  if (days === 1) return t("cache.day_one", { defaultValue: "há 1 dia" });
  if (days < 30) return t("cache.days_other", { count: days, defaultValue: `há ${days} dias` });
  const months = Math.floor(days / 30);
  return months === 1
    ? t("cache.month_one", { defaultValue: "há 1 mês" })
    : t("cache.months_other", { count: months, defaultValue: `há ${months} meses` });
}

function formatExpiresShort(date: Date, locale: string): string {
  const now = new Date();
  const sameDay =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate();
  const time = date.toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" });
  if (sameDay) return time;
  const dayLabel = date.toLocaleDateString(locale, { day: "2-digit", month: "short" });
  return `${dayLabel} ${time}`;
}

function formatAbsolute(date: Date, locale: string): string {
  return date.toLocaleString(locale, {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
