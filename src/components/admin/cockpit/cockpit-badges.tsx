/**
 * Badge presets for the admin cockpit. Encapsulate variant choices so
 * each tab calls a single component instead of duplicating switch logic.
 */

import { Badge } from "@/components/ui/badge";

import {
  alertKindLabel,
  dataSourceLabel,
  outcomeLabel,
  providerStatusLabel,
  severityLabel,
} from "./cockpit-formatters";

type Variant = "default" | "success" | "warning" | "danger" | "accent";

function outcomeVariant(value: string): Variant {
  if (value === "success") return "success";
  if (value === "blocked_allowlist" || value === "provider_disabled")
    return "warning";
  if (
    value === "provider_error" ||
    value === "not_found" ||
    value === "invalid_input"
  )
    return "danger";
  return "default";
}

function dataSourceVariant(value: string | null | undefined): Variant {
  if (value === "fresh") return "success";
  if (value === "cache") return "accent";
  if (value === "stale") return "warning";
  return "default";
}

function providerStatusVariant(value: string): Variant {
  if (value === "success") return "success";
  if (value === "timeout" || value === "network_error") return "warning";
  if (value === "http_error" || value === "config_error") return "danger";
  return "default";
}

function severityVariant(value: string): Variant {
  if (value === "critical") return "danger";
  if (value === "warning") return "warning";
  if (value === "info") return "accent";
  return "default";
}

export function OutcomeBadge({ value }: { value: string }) {
  return (
    <Badge variant={outcomeVariant(value)} dot>
      {outcomeLabel(value)}
    </Badge>
  );
}

export function DataSourceBadge({
  value,
}: {
  value: string | null | undefined;
}) {
  if (!value || value === "none") {
    return <span className="font-mono text-content-tertiary">—</span>;
  }
  return <Badge variant={dataSourceVariant(value)}>{dataSourceLabel(value)}</Badge>;
}

export function ProviderStatusBadge({ value }: { value: string }) {
  return (
    <Badge variant={providerStatusVariant(value)} dot>
      {providerStatusLabel(value)}
    </Badge>
  );
}

export function SeverityBadge({ value }: { value: string }) {
  return (
    <Badge variant={severityVariant(value)} dot>
      {severityLabel(value)}
    </Badge>
  );
}

export function AlertKindBadge({ value }: { value: string }) {
  return <Badge variant="default">{alertKindLabel(value)}</Badge>;
}

export function PresenceBadge({ present }: { present: boolean }) {
  return (
    <Badge variant={present ? "success" : "danger"} dot>
      {present ? "Configurado" : "Em falta"}
    </Badge>
  );
}