import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
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
  label: string;
  dot: string;
  text: string;
}

const VARIANTS: Record<CacheStatus, Variant> = {
  fresh: {
    label: "Dados atualizados",
    dot: "bg-signal-success",
    text: "text-signal-success",
  },
  expiring_soon: {
    label: "A expirar em breve",
    dot: "bg-signal-warning",
    text: "text-signal-warning",
  },
  stale: {
    label: "Dados antigos",
    dot: "bg-signal-danger",
    text: "text-signal-danger",
  },
  unknown: {
    label: "Estado por confirmar",
    dot: "bg-content-tertiary",
    text: "text-content-tertiary",
  },
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

  // Estado unknown: badge simples sem tooltip nem datas.
  if (status === "unknown") {
    return (
      <span className={`inline-flex items-center gap-1.5 text-xs ${variant.text}`}>
        <span className={`size-1.5 rounded-full ${variant.dot}`} aria-hidden="true" />
        <span>{variant.label}</span>
      </span>
    );
  }

  const generatedDate = new Date(generatedMs as number);
  const expiresDate = expiresMs !== null ? new Date(expiresMs) : null;

  const relative = formatRelative(Math.max(0, nowMs - (generatedMs as number)));
  const expiresShort =
    expiresDate && status !== "stale" ? formatExpiresShort(expiresDate) : null;

  const tooltipLines = [
    `Última análise: ${formatAbsolute(generatedDate)}`,
    expiresDate
      ? status === "stale"
        ? `Cache expirou em ${formatAbsolute(expiresDate)}`
        : `Cache válida até ${formatAbsolute(expiresDate)}`
      : null,
  ].filter(Boolean) as string[];

  const trigger = (
    <span
      className={`inline-flex max-w-full flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs tabular-nums ${variant.text}`}
    >
      <span className={`size-1.5 shrink-0 rounded-full ${variant.dot}`} aria-hidden="true" />
      <span className="font-medium">{variant.label}</span>
      {!compact ? (
        <span className="text-content-tertiary">
          <span aria-hidden="true" className="mx-1 opacity-60">·</span>
          Atualizado {relative}
          {expiresShort ? (
            <>
              <span aria-hidden="true" className="mx-1 opacity-60">·</span>
              Válido até {expiresShort}
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
            aria-label={`${variant.label}. ${tooltipLines.join(". ")}.`}
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

function formatRelative(ageMs: number): string {
  const mins = Math.floor(ageMs / 60_000);
  if (mins < 1) return "agora mesmo";
  if (mins < 60) return `há ${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return hours === 1 ? "há 1 hora" : `há ${hours} horas`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "há 1 dia";
  if (days < 30) return `há ${days} dias`;
  const months = Math.floor(days / 30);
  return months === 1 ? "há 1 mês" : `há ${months} meses`;
}

function formatExpiresShort(date: Date): string {
  const now = new Date();
  const sameDay =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate();
  const time = date.toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit" });
  if (sameDay) return time;
  const dayLabel = date.toLocaleDateString("pt-PT", { day: "2-digit", month: "short" });
  return `${dayLabel} ${time}`;
}

function formatAbsolute(date: Date): string {
  return date.toLocaleString("pt-PT", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
