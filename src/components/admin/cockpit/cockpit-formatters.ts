/**
 * Shared pt-PT formatters and label maps for the admin cockpit.
 *
 * Centralised so every tab renders dates, costs and outcome labels
 * identically. No DOM, no React — pure functions only.
 */

const dateFormatter = new Intl.DateTimeFormat("pt-PT", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

const numberFormatter = new Intl.NumberFormat("pt-PT");
const compactFormatter = new Intl.NumberFormat("pt-PT", {
  notation: "compact",
  maximumFractionDigits: 1,
});

export function formatNumber(n: number | null | undefined): string {
  if (n === null || n === undefined || !Number.isFinite(n)) return "—";
  return numberFormatter.format(n);
}

export function formatCompact(n: number | null | undefined): string {
  if (n === null || n === undefined || !Number.isFinite(n)) return "—";
  return compactFormatter.format(n);
}

export function formatCost(n: number | null | undefined): string {
  if (n === null || n === undefined || !Number.isFinite(n)) return "—";
  // 5 decimals to match the DB column scale; trim trailing zeros for clarity.
  const fixed = n.toFixed(5).replace(/0+$/, "").replace(/\.$/, "");
  return `$${fixed === "" ? "0" : fixed}`;
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return dateFormatter.format(d);
}

export function formatDuration(ms: number | null | undefined): string {
  if (ms === null || ms === undefined || !Number.isFinite(ms)) return "—";
  if (ms < 1000) return `${Math.round(ms)} ms`;
  return `${(ms / 1000).toFixed(1)} s`;
}

/** Outcome (`analysis_events.outcome`) → pt-PT label. */
export function outcomeLabel(value: string): string {
  switch (value) {
    case "success":
      return "Sucesso";
    case "provider_error":
      return "Erro do provedor";
    case "not_found":
      return "Não encontrado";
    case "blocked_allowlist":
      return "Bloqueado (allowlist)";
    case "provider_disabled":
      return "Provedor desligado";
    case "invalid_input":
      return "Input inválido";
    default:
      return value;
  }
}

/** Data source (`analysis_events.data_source`) → pt-PT label. */
export function dataSourceLabel(value: string | null | undefined): string {
  switch (value) {
    case "fresh":
      return "Fresh";
    case "cache":
      return "Cache";
    case "stale":
      return "Stale";
    case "none":
      return "—";
    default:
      return value ?? "—";
  }
}

/** Provider call status → pt-PT label. */
export function providerStatusLabel(value: string): string {
  switch (value) {
    case "success":
      return "Sucesso";
    case "timeout":
      return "Timeout";
    case "http_error":
      return "Erro HTTP";
    case "config_error":
      return "Configuração";
    case "network_error":
      return "Rede";
    default:
      return value;
  }
}

/** Alert kind → pt-PT label. */
export function alertKindLabel(value: string): string {
  switch (value) {
    case "repeated_profile":
      return "Perfil repetido";
    case "high_failure_rate":
      return "Taxa de falhas elevada";
    case "ip_burst":
      return "Burst de IP";
    case "daily_cost_threshold":
      return "Custo diário acima do limite";
    case "stale_serve":
      return "Snapshot expirada servida";
    default:
      return value;
  }
}

/** Alert severity → pt-PT label. */
export function severityLabel(value: string): string {
  switch (value) {
    case "critical":
      return "Crítico";
    case "warning":
      return "Aviso";
    case "info":
      return "Info";
    default:
      return value;
  }
}