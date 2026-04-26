/**
 * CockpitShell — operational/business cockpit for /admin.
 *
 * Six tabs sharing a single `/api/admin/diagnostics` snapshot via
 * `useCockpitData`. Five tabs render lightweight placeholders for now
 * ("A migrar…") while the existing Pedidos panel keeps full functionality.
 *
 * No public UI, no payments, no email gate.
 */

import { useState } from "react";
import { RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  RequestList,
  type AdminRequestRow,
} from "@/components/admin/request-list";
import { RequestDetailSheet } from "@/components/admin/request-detail-sheet";

import { useCockpitData } from "./use-cockpit-data";

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
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);
  const [requestsRefreshKey, setRequestsRefreshKey] = useState(0);

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
          <PlaceholderPanel
            title="Diagnóstico"
            description="Saúde técnica, secrets, allowlist, snapshots e últimos erros."
          />
        </TabsContent>

        <TabsContent value="analyses" className="mt-0">
          <PlaceholderPanel
            title="Análises"
            description="Histórico recente: handle, outcome, fonte, duração e custo estimado."
          />
        </TabsContent>

        <TabsContent value="profiles" className="mt-0">
          <PlaceholderPanel
            title="Perfis analisados"
            description="Rollup por handle: total de análises, seguidores e custos acumulados."
          />
        </TabsContent>

        <TabsContent value="costs" className="mt-0">
          <PlaceholderPanel
            title="Custos Apify"
            description="Agregados 24h / 7d / mês e poupança via cache."
          />
        </TabsContent>

        <TabsContent value="alerts" className="mt-0">
          <PlaceholderPanel
            title="Alertas"
            description="Sinais não bloqueantes: perfis repetidos, falhas, picos de IP, custo diário."
          />
        </TabsContent>

        <TabsContent value="requests" className="mt-0">
          <RequestList
            onSelect={(row: AdminRequestRow) => setSelectedRequestId(row.id)}
            refreshKey={requestsRefreshKey}
          />
        </TabsContent>
      </Tabs>

      <RequestDetailSheet
        reportRequestId={selectedRequestId}
        onClose={() => setSelectedRequestId(null)}
        onChanged={() => setRequestsRefreshKey((k) => k + 1)}
      />
    </div>
  );
}

function PlaceholderPanel({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-lg border border-border-subtle bg-surface-elevated p-8">
      <div className="space-y-2">
        <p className="font-mono text-[0.625rem] uppercase tracking-[0.18em] text-content-tertiary">
          A migrar…
        </p>
        <h3 className="font-display text-base text-content-primary">{title}</h3>
        <p className="text-sm text-content-secondary">{description}</p>
      </div>
    </div>
  );
}