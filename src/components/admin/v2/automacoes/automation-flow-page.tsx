/**
 * AutomationFlowPage — visualização read-only do ciclo de vida beta.
 */

import { Fragment } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { RefreshCw, FileText, MoreHorizontal, CheckCircle2 } from "lucide-react";
import { AdminCard } from "../admin-card";
import { adminFetch } from "@/lib/admin/fetch";
import { AutomationNode } from "./automation-node";
import { AutomationEdge } from "./automation-edge";
import { StageGroup } from "./stage-group";
import { MetricsTab } from "./metrics-tab";
import { PeopleTab } from "./people-tab";
import { TemplatesTab } from "./templates-tab";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import type { AutomationFlow, AutomationFlowResponse, FlowStage } from "@/routes/api/admin/automation-flow";

async function fetchAutomationFlow(): Promise<AutomationFlowResponse> {
  const res = await adminFetch("/api/admin/automation-flow");
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return (await res.json()) as AutomationFlowResponse;
}

interface StageDef {
  key: FlowStage;
  number: string;
  eyebrow: string;
  title: string;
  color: string;
  bg: string;
}

const STAGES: StageDef[] = [
  {
    key: "00_onboarding",
    number: "00",
    eyebrow: "Onboarding · Beta",
    title: "Boas-vindas e acesso à plataforma",
    color: "#7664E4",
    bg: "#F2F0FE",
  },
  {
    key: "01_captacao",
    number: "01",
    eyebrow: "Captação",
    title: "Pedido recebido até relatório pronto",
    color: "#3772E5",
    bg: "#EEF4FE",
  },
  {
    key: "02_entrega",
    number: "02",
    eyebrow: "Entrega",
    title: "Notificação, consumo e arquivo",
    color: "#1D9E75",
    bg: "#EAF7F1",
  },
  {
    key: "03_conversao",
    number: "03",
    eyebrow: "Conversão",
    title: "Validação de utilidade e oportunidade comercial",
    color: "#D85A30",
    bg: "#FDEFEA",
  },
];

export function AutomationFlowPage() {
  const queryClient = useQueryClient();
  const { data, isLoading, error, isFetching } = useQuery({
    queryKey: ["admin", "automation-flow"],
    queryFn: fetchAutomationFlow,
    staleTime: 30_000,
  });

  const handleRefresh = () =>
    queryClient.invalidateQueries({ queryKey: ["admin", "automation-flow"] });

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1.5">
          <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-admin-info-500">
            Pipeline · Automações
          </span>
          <h1 className="m-0 font-serif text-[32px] font-medium leading-tight tracking-tight text-admin-text-primary sm:text-[36px]">
            Fluxo de ciclo de vida
          </h1>
          <p className="m-0 text-[13px] text-admin-text-secondary">
            Cada bloco mostra o que faz, quando dispara e o estado actual.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleRefresh}
            disabled={isFetching}
            className="inline-flex h-9 items-center gap-1.5 rounded-md border bg-white px-3 text-[12px] font-medium text-admin-text-primary hover:bg-admin-neutral-50 disabled:opacity-60"
            style={{ borderColor: "#E4E8F0" }}
          >
            <RefreshCw size={13} className={isFetching ? "animate-spin" : ""} />
            Refrescar
          </button>
          <DisabledButton icon={<FileText size={13} />} label="Ver logs" dark />
          <DisabledButton icon={<MoreHorizontal size={14} />} label="" square />
        </div>
      </header>

      {/* KPI tiles */}
      {data?.kpis && <KpiRow kpis={data.kpis} />}

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
            <FlowStages flows={data.flows} />
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
  );
}

function DisabledButton({
  icon,
  label,
  dark,
  square,
}: {
  icon: React.ReactNode;
  label: string;
  dark?: boolean;
  square?: boolean;
}) {
  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            disabled
            className={`inline-flex h-9 items-center justify-center gap-1.5 rounded-md text-[12px] font-medium ${
              square ? "w-9 px-0" : "px-3"
            } ${dark ? "text-white" : "text-admin-text-primary"}`}
            style={{
              background: dark ? "#0F1B3D" : "#FFFFFF",
              border: dark ? "none" : "1px solid #E4E8F0",
              opacity: 0.85,
              cursor: "not-allowed",
            }}
          >
            {icon}
            {label}
          </button>
        </TooltipTrigger>
        <TooltipContent side="bottom">Disponível em breve</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

function KpiRow({ kpis }: { kpis: NonNullable<AutomationFlowResponse["kpis"]> }) {
  const tiles = [
    {
      label: "Sistema operacional",
      value: `${kpis.systemActive.activeCount} automações activas`,
      headline: null,
      hint: null,
      color: "#1D9E75",
      bg: "#EAF7F1",
      icon: <CheckCircle2 size={18} style={{ color: "#1D9E75" }} />,
    },
    {
      label: "Enviados",
      value: kpis.sent.last30d,
      headline: "total",
      hint:
        kpis.sent.deltaVsYesterday >= 0
          ? `↑ ${kpis.sent.deltaVsYesterday} desde ontem`
          : `↓ ${Math.abs(kpis.sent.deltaVsYesterday)} desde ontem`,
      color: "#3772E5",
      bg: "#FFFFFF",
      icon: null,
    },
    {
      label: "A aguardar",
      value: kpis.waiting.eligibleTotal,
      headline: "na fila",
      hint: kpis.waiting.nextEtaMinutes != null ? `próximo · em ${kpis.waiting.nextEtaMinutes} min` : "—",
      color: "#BA7517",
      bg: "#FFFAF0",
      icon: null,
    },
    {
      label: "Falhas",
      value: kpis.failures.last30d,
      headline: "últimos 30d",
      hint: `taxa ${kpis.failures.deliverabilityPct}%`,
      color: kpis.failures.last30d > 0 ? "#D85A30" : "#1D9E75",
      bg: "#FFFFFF",
      icon: null,
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {tiles.map((t, i) => (
        <div
          key={i}
          className="rounded-xl border px-4 py-3"
          style={{
            background: t.bg,
            borderColor: "#E4E8F0",
            borderLeft: `3px solid ${t.color}`,
          }}
        >
          <div className="flex items-center gap-2">
            {t.icon}
            <span className="text-[10px] font-bold uppercase tracking-[0.1em] text-admin-text-tertiary">
              {t.label}
            </span>
          </div>
          <div className="mt-1.5 flex items-baseline gap-1.5">
            <span className="text-[22px] font-bold tabular-nums text-admin-text-primary">
              {t.value}
            </span>
            {t.headline && (
              <span className="text-[11px] text-admin-text-tertiary">{t.headline}</span>
            )}
          </div>
          {t.hint && <p className="m-0 mt-0.5 text-[11px] text-admin-text-tertiary">{t.hint}</p>}
        </div>
      ))}
    </div>
  );
}

function FlowStages({ flows }: { flows: AutomationFlow[] }) {
  return (
    <div className="mx-auto flex max-w-[820px] flex-col gap-4">
      {STAGES.map((stage) => {
        const stageFlows = flows.filter((f) => f.stage === stage.key);
        if (stageFlows.length === 0) return null;
        const totalSent = stageFlows.reduce((a, f) => a + f.sentTotal, 0);
        const meta =
          stage.key === "00_onboarding"
            ? `${stageFlows.length} email${stageFlows.length === 1 ? "" : "s"} · ${totalSent} envios`
            : `${stageFlows.length} bloco${stageFlows.length === 1 ? "" : "s"}`;

        return (
          <StageGroup
            key={stage.key}
            number={stage.number}
            eyebrow={stage.eyebrow}
            title={stage.title}
            meta={meta}
            color={stage.color}
            bg={stage.bg}
          >
            {stageFlows.map((f, i) => (
              <Fragment key={f.key}>
                <AutomationNode flow={f} stageColor={stage.color} />
                {i < stageFlows.length - 1 && <AutomationEdge />}
              </Fragment>
            ))}
          </StageGroup>
        );
      })}
    </div>
  );
}

function SummarySkeleton() {
  return (
    <div className="flex flex-col gap-4">
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
