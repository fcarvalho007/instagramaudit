/**
 * CockpitShell — operational/business cockpit for /admin.
 *
 * Six tabs sharing a single `/api/admin/diagnostics` snapshot via
 * `useCockpitData`. Diagnostics, analyses, profiles, costs and alerts are
 * read-only views; the Pedidos panel keeps full report-request functionality.
 *
 * Header inclui um "readiness strip" compacto que comunica em 3 segundos
 * o estado operacional do Apify (ligado/desligado, modo de teste, allowlist).
 */

import {
  RefreshCw,
  Activity,
  BarChart3,
  Users,
  DollarSign,
  AlertTriangle,
  Inbox,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { useCockpitData } from "./use-cockpit-data";
import { DiagnosticsPanel } from "./panels/diagnostics-panel";
import { AnalysesPanel } from "./panels/analyses-panel";
import { ProfilesPanel } from "./panels/profiles-panel";
import { CostsPanel } from "./panels/costs-panel";
import { AlertsPanel } from "./panels/alerts-panel";
import { RequestsPanel } from "./panels/requests-panel";
import { formatDate } from "./cockpit-formatters";
import type { CockpitData } from "./cockpit-types";

type TabKey =
  | "diagnostics"
  | "analyses"
  | "profiles"
  | "costs"
  | "alerts"
  | "requests";

const TABS: { value: TabKey; label: string; Icon: typeof Activity }[] = [
  { value: "diagnostics", label: "Diagnóstico", Icon: Activity },
  { value: "analyses", label: "Análises", Icon: BarChart3 },
  { value: "profiles", label: "Perfis", Icon: Users },
  { value: "costs", label: "Custos", Icon: DollarSign },
  { value: "alerts", label: "Alertas", Icon: AlertTriangle },
  { value: "requests", label: "Pedidos", Icon: Inbox },
];

export function CockpitShell() {
  const cockpit = useCockpitData();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="font-mono text-[0.6875rem] uppercase tracking-[0.18em] text-content-tertiary">
            Cockpit
          </p>
          <h2 className="font-display text-lg text-content-primary">
            Operação · Custos · Sinais
          </h2>
        </div>
        <div className="flex items-center gap-3">
          {cockpit.error ? (
            <span className="text-xs text-signal-danger">{cockpit.error}</span>
          ) : null}
          <Button
            variant="outline"
            size="sm"
            onClick={() => void cockpit.refresh()}
            disabled={cockpit.loading}
            aria-busy={cockpit.loading}
            aria-label={cockpit.loading ? "A atualizar" : "Atualizar dados"}
          >
            <RefreshCw
              className={`mr-2 size-3.5 ${cockpit.loading ? "animate-spin" : ""}`}
            />
            Atualizar
          </Button>
        </div>
      </div>

      <ReadinessStrip data={cockpit.data} loading={cockpit.loading} />

      <Tabs defaultValue="diagnostics" className="space-y-6">
        <TabsList className="flex h-auto w-full flex-wrap justify-start gap-1 rounded-lg border border-border-subtle bg-surface-elevated p-1.5">
          {TABS.map((tab) => (
            <TabsTrigger
              key={tab.value}
              value={tab.value}
              className="gap-1.5 rounded-md px-3 py-1.5 text-sm text-content-secondary data-[state=active]:bg-surface-base data-[state=active]:text-content-primary data-[state=active]:shadow-sm"
            >
              <tab.Icon className="size-3.5" aria-hidden="true" />
              <span>{tab.label}</span>
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="diagnostics" className="mt-0">
          <DiagnosticsPanel data={cockpit.data} />
        </TabsContent>

        <TabsContent value="analyses" className="mt-0">
          <AnalysesPanel data={cockpit.data} />
        </TabsContent>

        <TabsContent value="profiles" className="mt-0">
          <ProfilesPanel data={cockpit.data} />
        </TabsContent>

        <TabsContent value="costs" className="mt-0">
          <CostsPanel data={cockpit.data} />
        </TabsContent>

        <TabsContent value="alerts" className="mt-0">
          <AlertsPanel data={cockpit.data} />
        </TabsContent>

        <TabsContent value="requests" className="mt-0">
          <RequestsPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
}

/**
 * ReadinessStrip — leitura compacta de 4 chips que respondem a:
 *   1. Apify está a fazer chamadas reais? (APIFY_ENABLED)
 *   2. Modo de teste protege o gasto? (allowlist activa)
 *   3. Allowlist tem handles?
 *   4. Quando foi a última actualização?
 *
 * Quando modo de teste activo + allowlist vazia → aviso explícito.
 */
function ReadinessStrip({
  data,
  loading,
}: {
  data: CockpitData | null;
  loading: boolean;
}) {
  if (!data) {
    return (
      <div
        className={`h-[3.5rem] rounded-lg border border-border-subtle bg-surface-elevated ${loading ? "animate-pulse" : ""}`}
        aria-hidden="true"
      />
    );
  }

  const apifyOn = data.apify.enabled;
  const testingOn = data.testing_mode.active;
  const allowlistSize = data.testing_mode.allowlist.length;
  const allowlistEmptyWarning = testingOn && allowlistSize === 0;

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border-subtle bg-surface-elevated px-4 py-3">
        <Chip
          label="APIFY"
          variant={apifyOn ? "danger" : "success"}
          dot
          value={apifyOn ? "Ligado · chamadas reais" : "Desligado · sem chamadas"}
        />
        <Chip
          label="Modo teste"
          variant={testingOn ? "accent" : "warning"}
          dot
          value={testingOn ? "Allowlist activa" : "Aberto · qualquer handle"}
        />
        <Chip
          label="Allowlist"
          variant={allowlistSize > 0 ? "success" : testingOn ? "warning" : "default"}
          dot
          value={
            allowlistSize > 0
              ? `${allowlistSize} handle${allowlistSize === 1 ? "" : "s"}`
              : "Vazia"
          }
        />
        <div className="ml-auto flex items-center gap-2 text-xs text-content-tertiary">
          <span className="font-mono uppercase tracking-[0.18em]">
            Atualizado
          </span>
          <span className="font-mono text-content-secondary">
            {formatDate(data.generated_at)}
          </span>
        </div>
      </div>
      {allowlistEmptyWarning ? (
        <div
          className="flex items-start gap-2 rounded-lg border border-signal-warning/30 bg-signal-warning/10 px-4 py-2.5 text-sm text-signal-warning"
          role="alert"
        >
          <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <p>
            Allowlist vazia — nenhuma chamada real será permitida em modo de
            teste.
          </p>
        </div>
      ) : null}
    </div>
  );
}

function Chip({
  label,
  value,
  variant,
  dot,
}: {
  label: string;
  value: string;
  variant: "default" | "success" | "warning" | "danger" | "accent";
  dot?: boolean;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="font-mono text-[0.6875rem] uppercase tracking-[0.18em] text-content-tertiary">
        {label}
      </span>
      <Badge variant={variant} dot={dot}>
        {value}
      </Badge>
    </div>
  );
}
