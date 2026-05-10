/**
 * AutomationFlowPage — visualização read-only do ciclo de vida beta.
 *
 * Inspirado no padrão UX do CRM Webinar (nó + aresta + contagens), mas
 * adaptado ao lifecycle real da InstaBench. Sem execução, sem emails,
 * sem providers — apenas leitura agregada de `leads.commercial_status`.
 */

import { Fragment } from "react";
import { useQuery } from "@tanstack/react-query";
import { AdminPageHeader } from "../admin-page-header";
import { AdminCard } from "../admin-card";
import { AdminSectionHeader } from "../admin-section-header";
import { adminFetch } from "@/lib/admin/fetch";
import { AutomationNode } from "./automation-node";
import { AutomationEdge } from "./automation-edge";
import { EligibilitySummary } from "./eligibility-summary";
import type {
  AutomationFlow,
  AutomationFlowResponse,
} from "@/routes/api/admin/automation-flow";

async function fetchAutomationFlow(): Promise<AutomationFlowResponse> {
  const res = await adminFetch("/api/admin/automation-flow");
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return (await res.json()) as AutomationFlowResponse;
}

export function AutomationFlowPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["admin", "automation-flow"],
    queryFn: fetchAutomationFlow,
    staleTime: 30_000,
  });

  return (
    <>
      <AdminPageHeader
        title="Automações"
        subtitle="Visualização read-only do ciclo de vida beta. Nenhuma ação é executada nesta página."
      />

      <div className="flex flex-col gap-6">
        <ReadOnlyBanner />

        {isLoading ? (
          <SummarySkeleton />
        ) : error || !data?.success ? (
          <AdminCard>
            <p className="text-[13px] text-admin-text-tertiary">
              Não foi possível carregar os fluxos de automação.
            </p>
          </AdminCard>
        ) : (
          <>
            <EligibilitySummary
              totalActive={data.totalActive}
              totalArchived={data.totalArchived}
              totalEligible={sum(data.flows.map((f) => f.eligibleCount))}
              totalInFlight={sum(data.flows.map((f) => f.inFlightCount))}
            />

            <section className="flex flex-col gap-3">
              <AdminSectionHeader
                title="Fluxo do ciclo de vida"
                subtitle="seis passos do pedido beta ao follow-up comercial"
                accent="leads"
                info="Cada nó representa um passo do ciclo de vida da lead. Os números refletem o estado atual em `leads.commercial_status` — elegíveis aguardam ação, em curso estão a meio do passo, concluídos já avançaram. Leads arquivadas não contam."
              />
              {data.flows.length === 0 || data.totalActive === 0 ? (
                <AdminCard>
                  <p className="text-[13px] text-admin-text-tertiary">
                    Sem leads ativas — assim que chegar o primeiro pedido beta,
                    o fluxo aparece aqui com contagens reais.
                  </p>
                </AdminCard>
              ) : (
                <FlowList flows={data.flows} />
              )}
            </section>
          </>
        )}
      </div>
    </>
  );
}

function FlowList({ flows }: { flows: AutomationFlow[] }) {
  return (
    <div className="flex flex-col">
      {flows.map((f, i) => (
        <Fragment key={f.key}>
          <AutomationNode
            title={f.title}
            description={f.description}
            trigger={f.trigger}
            action={f.action}
            kind={f.kind}
            toStatus={f.toStatus}
            eligibleCount={f.eligibleCount}
            inFlightCount={f.inFlightCount}
            completedCount={f.completedCount}
            recentFailures={f.recentFailures}
            last24hCount={f.last24hCount}
            lastEventAt={f.lastEventAt}
          />
          {i < flows.length - 1 && <AutomationEdge />}
        </Fragment>
      ))}
    </div>
  );
}

function ReadOnlyBanner() {
  return (
    <div
      className="rounded-lg border px-4 py-2.5 text-[12px]"
      style={{
        borderColor: "rgb(var(--admin-info-500) / 0.3)",
        background: "rgb(var(--admin-info-500) / 0.06)",
        color: "rgb(var(--admin-info-500))",
      }}
    >
      <strong className="font-semibold">Modo visualização.</strong>{" "}
      <span className="text-admin-text-secondary">
        Esta página não envia emails nem executa automações. As ações reais
        continuam a acontecer em <em>Leads</em>.
      </span>
    </div>
  );
}

function SummarySkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <AdminCard>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex flex-col gap-2">
              <div className="h-2 w-20 rounded bg-admin-surface-elevated" />
              <div className="h-7 w-12 rounded bg-admin-surface-elevated" />
            </div>
          ))}
        </div>
      </AdminCard>
      {Array.from({ length: 3 }).map((_, i) => (
        <AdminCard key={i}>
          <div className="flex flex-col gap-3">
            <div className="h-3 w-32 rounded bg-admin-surface-elevated" />
            <div className="h-5 w-3/4 rounded bg-admin-surface-elevated" />
            <div className="h-3 w-full rounded bg-admin-surface-elevated" />
          </div>
        </AdminCard>
      ))}
    </div>
  );
}

function sum(arr: number[]): number {
  return arr.reduce((a, b) => a + b, 0);
}