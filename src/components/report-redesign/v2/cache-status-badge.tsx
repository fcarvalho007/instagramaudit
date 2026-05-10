import { Calendar } from "lucide-react";

interface Props {
  /** ISO timestamp do `meta.generated_at` ou `updated_at` do snapshot. */
  analyzedAtIso: string | null;
  /** TTL em horas. Default 24h (igual a CACHE_TTL_MS no servidor). */
  ttlHours?: number;
  /** Variante compacta (sem ícone) para usar em footers densos. */
  compact?: boolean;
}

/**
 * Mostra "Atualizado há Xh · válido até HH:MM" com o timestamp absoluto
 * em tooltip. Resolve a ambiguidade do antigo "Atualizado <string>" que
 * dependia de o backend pré-formatar o texto.
 */
export function CacheStatusBadge({ analyzedAtIso, ttlHours = 24, compact = false }: Props) {
  if (!analyzedAtIso) return null;
  const generatedMs = new Date(analyzedAtIso).getTime();
  if (!Number.isFinite(generatedMs)) return null;

  const now = Date.now();
  const ageMs = Math.max(0, now - generatedMs);
  const expiresMs = generatedMs + ttlHours * 60 * 60 * 1000;
  const isExpired = now >= expiresMs;

  const relative = formatRelative(ageMs);
  const expiresLabel = formatExpires(new Date(expiresMs), isExpired);
  const absolute = formatAbsolute(new Date(generatedMs));

  return (
    <span
      title={`Análise gerada em ${absolute}\nCache válida até ${formatAbsolute(
        new Date(expiresMs),
      )}`}
      className="inline-flex items-center gap-1.5 text-xs text-content-tertiary"
    >
      {!compact && <Calendar className="size-3 text-content-tertiary" aria-hidden="true" />}
      <span>
        Atualizado {relative}
        <span aria-hidden="true" className="mx-1.5 opacity-60">·</span>
        {expiresLabel}
      </span>
    </span>
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

function formatExpires(date: Date, expired: boolean): string {
  if (expired) return "cache expirada";
  const now = new Date();
  const sameDay =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate();
  const time = date.toLocaleTimeString("pt-PT", {
    hour: "2-digit",
    minute: "2-digit",
  });
  if (sameDay) return `válido até ${time}`;
  const dayLabel = date.toLocaleDateString("pt-PT", {
    day: "2-digit",
    month: "short",
  });
  return `válido até ${dayLabel} ${time}`;
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