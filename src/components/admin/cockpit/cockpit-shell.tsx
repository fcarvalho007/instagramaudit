/**
 * CockpitShell — operational/business cockpit for /admin.
 *
 * Six tabs sharing a single `/api/admin/diagnostics` snapshot via
 * `useCockpitData`. Five tabs render lightweight placeholders for now
 * ("A migrar…") while the existing Pedidos panel keeps full functionality.
 *
 * No public UI, no payments, no email gate.
 */

import { RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { useCockpitData } from "./use-cockpit-data";
import { DiagnosticsPanel } from "./panels/diagnostics-panel";
import { AnalysesPanel } from "./panels/analyses-panel";
import { ProfilesPanel } from "./panels/profiles-panel";
import { CostsPanel } from "./panels/costs-panel";
import { AlertsPanel } from "./panels/alerts-panel";
import { RequestsPanel } from "./panels/requests-panel";

type TabKey =
  | "diagnostics"
  | "analyses"
  | "profiles"
  | "costs"
  | "alerts"
  | "requests";

const TABS: { value: TabKey; label: string }[] = [
  { value: "diagnostics", label: "Diagnóstico" },
  { value: "analyses", label: "Análises" },
  { value: "profiles", label: "Perfis" },
  { value: "costs", label: "Custos" },
  { value: "alerts", label: "Alertas" },
  { value: "requests", label: "Pedidos" },
];

export function CockpitShell() {
  const cockpit = useCockpitData();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <p className="font-mono text-[0.625rem] uppercase tracking-[0.18em] text-content-tertiary">
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
          >
            <RefreshCw
              className={`mr-2 size-3.5 ${cockpit.loading ? "animate-spin" : ""}`}
            />
            Atualizar
          </Button>
        </div>
      </div>

      <Tabs defaultValue="diagnostics" className="space-y-6">
        <TabsList className="flex-wrap">
          {TABS.map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value}>
              {tab.label}
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