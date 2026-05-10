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
import { adminFetch } from "@/lib/admin/fetch";
import { AutomationNode } from "./automation-node";
import { AutomationEdge } from "./automation-edge";
import { StageGroup } from "./stage-group";
import { StageConnector } from "./stage-connector";
import { MetricsTab } from "./metrics-tab";
import { PeopleTab } from "./people-tab";
import { TemplatesTab } from "./templates-tab";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import type { EmailTemplateKey } from "@/lib/admin/email-template-registry";
import type {
  AutomationFlow,
  AutomationFlowResponse,
} from "@/routes/api/admin/automation-flow";

async function fetchAutomationFlow(): Promise<AutomationFlowResponse> {
  const res = await adminFetch("/api/admin/automation-flow");
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return (await res.json()) as AutomationFlowResponse;
}

type FlowKey = AutomationFlow["key"];

interface StageDef {
  key: string;
  number: string;
  label: string;
  description: string;
  color: string;
  flowKeys: FlowKey[];
}

const STAGES: StageDef[] = [
  {
    key: "captacao",
    number: "1",
    label: "Captação",
    description: "pedido beta → relatório gerado",
    color: "#0E9488",
    flowKeys: ["pedido_recebido", "relatorio_gerado"],
  },
  {
    key: "entrega",
    number: "2",
    label: "Entrega",
    description: "envio do link → consumo do relatório",
    color: "#3772E5",
    flowKeys: ["link_enviado", "relatorio_visto"],
  },
  {
    key: "conversao",
    number: "3",
    label: "Conversão",
    description: "feedback → follow-up comercial",
    color: "#BA7517",
    flowKeys: ["feedback_pedido", "feedback_recebido", "follow_up_comercial"],
  },
];

const TEMPLATE_BY_FLOW: Partial<Record<FlowKey, EmailTemplateKey>> = {
  pedido_recebido: "request_received",
  link_enviado: "report_ready",
  feedback_pedido: "feedback_request",
  follow_up_comercial: "commercial_followup",
};

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
        subtitle="Visualização operacional do ciclo de vida beta. Nenhuma ação é executada nesta página."
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
          <Tabs defaultValue="fluxo" className="w-full">
            <div className="mb-4 -mx-4 px-4 overflow-x-auto sm:mx-0 sm:px-0">
              <TabsList className="inline-flex w-auto whitespace-nowrap">
                <TabsTrigger value="fluxo">Fluxo</TabsTrigger>
                <TabsTrigger value="metricas">Métricas</TabsTrigger>
                <TabsTrigger value="pessoas">Pessoas</TabsTrigger>
                <TabsTrigger value="templates">Templates</TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="fluxo" className="mt-0">
              {data.flows.length === 0 || data.totalActive === 0 ? (
                <AdminCard>
                  <p className="text-[13px] text-admin-text-tertiary">
                    Sem leads ativas — assim que chegar o primeiro pedido beta,
                    o fluxo aparece aqui com contagens reais.
                  </p>
                </AdminCard>
              ) : (
                <FlowStages flows={data.flows} />
              )}
            </TabsContent>

            <TabsContent value="metricas" className="mt-0">
              <MetricsTab data={data} />
            </TabsContent>

            <TabsContent value="pessoas" className="mt-0">
              <PeopleTab />
            </TabsContent>

            <TabsContent value="templates" className="mt-0">
              <TemplatesTab />
            </TabsContent>
          </Tabs>
        )}
      </div>
    </>
  );
}

function FlowStages({ flows }: { flows: AutomationFlow[] }) {
  const byKey = new Map<FlowKey, AutomationFlow>(
    flows.map((f) => [f.key, f]),
  );

  return (
    <div className="mx-auto flex max-w-[820px] flex-col">
      {STAGES.map((stage, sIdx) => {
        const stageFlows = stage.flowKeys
          .map((k) => byKey.get(k))
          .filter((x): x is AutomationFlow => Boolean(x));
        const stageEligible = stageFlows.reduce(
          (a, f) => a + f.eligibleCount,
          0,
        );

        return (
          <Fragment key={stage.key}>
            {sIdx > 0 && <StageConnector label={stage.label} />}
            <StageGroup
              number={stage.number}
              label={stage.label}
              description={stage.description}
              count={stageEligible}
              color={stage.color}
            >
              {stageFlows.map((f, i) => (
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
                    templateKey={TEMPLATE_BY_FLOW[f.key]}
                  />
                  {i < stageFlows.length - 1 && <AutomationEdge />}
                </Fragment>
              ))}
            </StageGroup>
          </Fragment>
        );
      })}
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