/**
 * AutomationFlowPage — visualização read-only do ciclo de vida beta.
 *
 * Stages, cores e backgrounds vêm da API (`data.stages`) — nunca hardcoded
 * no frontend. Tokens em `src/styles/admin-tokens.css` (`--admin-stage-*`).
 */

import { Fragment } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { RefreshCw, FileText, MoreHorizontal, CheckCircle2, ShieldCheck, AlertTriangle } from "lucide-react";
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
import type {
  AutomationFlow,
  AutomationFlowResponse,
  StageDef,
  LifecycleBadge,
} from "@/lib/admin/automation-flow-types";
import { LIFECYCLE_BADGE_LABELS } from "@/lib/admin/automation-flow-types";
import { LifecycleBadgeRow } from "./automation-node";

async function fetchAutomationFlow(): Promise<AutomationFlowResponse> {
  const res = await adminFetch("/api/admin/automation-flow");
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return (await res.json()) as AutomationFlowResponse;
}

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
            Ciclo de vida · Automações
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
            className="inline-flex h-9 items-center gap-1.5 rounded-md border border-admin-border bg-white px-3 text-[12px] font-medium text-admin-text-primary hover:bg-admin-neutral-50 disabled:opacity-60"
          >
            <RefreshCw size={13} className={isFetching ? "animate-spin" : ""} />
            Refrescar
          </button>
          <DisabledButton icon={<FileText size={13} />} label="Ver logs" dark />
          <DisabledButton
            icon={<MoreHorizontal size={14} />}
            label=""
            square
            ariaLabel="Mais opções"
          />
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
            <LifecycleLegend />
            <FlowStages flows={data.flows} stages={data.stages} />
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
  ariaLabel,
}: {
  icon: React.ReactNode;
  label: string;
  dark?: boolean;
  square?: boolean;
  ariaLabel?: string;
}) {
  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            disabled
            aria-label={ariaLabel ?? (label || undefined)}
            className={`inline-flex h-9 items-center justify-center gap-1.5 rounded-md text-[12px] font-medium ${
              square ? "w-9 px-0" : "px-3"
            } ${
              dark
                ? "bg-[rgb(var(--admin-button-dark))] text-white border-0"
                : "bg-white text-admin-text-primary border border-admin-border"
            }`}
            style={{ opacity: 0.85, cursor: "not-allowed" }}
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
  const hasFailures = kpis.failures.last30d > 0;
  const hasWaiting = kpis.waiting.eligibleTotal > 0;

  const tiles = [
    {
      label: "Sistema operacional",
      value: `${kpis.systemActive.activeCount} automações activas`,
      headline: null as string | null,
      hint: `de ${kpis.systemActive.totalCount} blocos`,
      tokenColor: "admin-pill-active-fg",
      tokenBg: "admin-pill-active-bg",
      icon: <CheckCircle2 size={18} className="text-[rgb(var(--admin-pill-active-fg))]" />,
    },
    {
      label: "Enviados",
      value: kpis.sent.last30d,
      headline: "últimos 30 dias",
      hint:
        kpis.sent.deltaVsYesterday >= 0
          ? `↑ ${kpis.sent.deltaVsYesterday} desde ontem`
          : `↓ ${Math.abs(kpis.sent.deltaVsYesterday)} desde ontem`,
      tokenColor: "admin-stage-captacao",
      tokenBg: null,
      icon: null,
    },
    {
      label: "A aguardar",
      value: kpis.waiting.eligibleTotal,
      headline: "na fila",
      hint:
        kpis.waiting.nextEtaMinutes != null
          ? `próximo · em ${kpis.waiting.nextEtaMinutes} min`
          : null,
      tokenColor: hasWaiting ? "admin-pill-warn-fg" : "admin-pill-info-fg",
      tokenBg: hasWaiting ? "admin-pill-warn-bg" : "admin-pill-info-soft-bg",
      icon: null,
    },
    {
      label: "Falhas",
      value: kpis.failures.last30d,
      headline: "últimos 30 dias",
      hint:
        kpis.failures.deliverabilityPct != null
          ? `taxa de entrega ${kpis.failures.deliverabilityPct}%`
          : "sem dados",
      tokenColor: hasFailures ? "admin-signal-500" : "admin-pill-active-fg",
      tokenBg: null,
      icon: hasFailures ? (
        <AlertTriangle size={18} className="text-[rgb(var(--admin-signal-500))]" />
      ) : (
        <ShieldCheck size={18} className="text-[rgb(var(--admin-pill-active-fg))]" />
      ),
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {tiles.map((t, i) => (
        <div
          key={i}
          className="rounded-xl border border-admin-border px-4 py-3"
          style={{
            background: t.tokenBg
              ? `rgb(var(--${t.tokenBg}))`
              : "rgb(var(--admin-neutral-50) / 0)",
            borderLeftWidth: 3,
            borderLeftColor: `rgb(var(--${t.tokenColor}))`,
            backgroundColor: t.tokenBg
              ? `rgb(var(--${t.tokenBg}))`
              : "#FFFFFF",
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

function LifecycleLegend() {
  const badges: LifecycleBadge[] = [
    "activo",
    "manual",
    "transaccional",
    "kill_switch_off",
    "planeado",
    "bloqueado",
    "legado",
    "sem_trigger",
  ];
  return (
    <div className="mb-3 flex flex-wrap items-center gap-1.5 rounded-xl border border-admin-border bg-white px-3 py-2">
      <span className="mr-1 text-[10px] font-bold uppercase tracking-[0.12em] text-admin-text-tertiary">
        Legenda
      </span>
      <LifecycleBadgeRow badges={badges} />
    </div>
  );
}

function FlowStages({
  flows,
  stages,
}: {
  flows: AutomationFlow[];
  stages: readonly StageDef[];
}) {
  return (
    <div className="mx-auto flex max-w-[820px] flex-col gap-4">
      {stages.map((stage) => {
        const stageFlows = flows.filter((f) => f.stage === stage.key);
        if (stageFlows.length === 0) return null;
        const meta = computeStageMeta(stage.key, stageFlows);

        return (
          <StageGroup
            key={stage.key}
            number={stage.number}
            eyebrow={stage.eyebrow}
            title={stage.title}
            meta={meta}
            tokenColor={stage.tokenColor}
            tokenBg={stage.tokenBg}
          >
            {stageFlows.map((f, i) => (
              <Fragment key={f.key}>
                <AutomationNode flow={f} stageTokenColor={stage.tokenColor} />
                {i < stageFlows.length - 1 && <AutomationEdge />}
              </Fragment>
            ))}
          </StageGroup>
        );
      })}
    </div>
  );
}

function computeStageMeta(stageKey: string, stageFlows: AutomationFlow[]): string {
  if (stageKey === "00_onboarding") {
    const sent = stageFlows.reduce((a, f) => a + f.sentEvents, 0);
    return `${stageFlows.length} email${stageFlows.length === 1 ? "" : "s"} · ${sent} envios`;
  }
  if (stageKey === "01_captacao") {
    const cycles =
      stageFlows.find((f) => f.key === "relatorio_gerado")?.completedLeads ??
      stageFlows.find((f) => f.key === "pedido_recebido")?.completedLeads ??
      0;
    const gen = stageFlows.find((f) => f.key === "relatorio_gerado");
    const avgLabel =
      gen && gen.timing.kind === "average" ? gen.timing.averageLabel : null;
    return avgLabel && avgLabel !== "sem dados"
      ? `${cycles} ciclos · ${avgLabel}`
      : `${cycles} ciclos`;
  }
  if (stageKey === "02_entrega") {
    const saved = stageFlows.find((f) => f.key === "report_saved");
    const link = stageFlows.find((f) => f.key === "link_enviado");
    const sent = (saved?.sentEvents ?? 0) + (link?.sentEvents ?? 0);
    const seen =
      stageFlows.find((f) => f.key === "relatorio_visto")?.completedLeads ?? 0;
    if (sent > 0) {
      const pct = Math.round((seen / sent) * 100);
      return `${seen}/${sent} abertos · ${pct}%`;
    }
    return `${stageFlows.length} blocos`;
  }
  if (stageKey === "03_retencao") {
    const fb = stageFlows.find((f) => f.key === "feedback_pedido");
    const eligible = fb?.eligibleCount ?? 0;
    const sent = fb?.sentEvents ?? 0;
    return `${eligible} elegíveis · ${sent} pedidos enviados`;
  }
  if (stageKey === "04_conversao") {
    const followUp = stageFlows.find((f) => f.key === "follow_up_comercial");
    const eligible = followUp?.eligibleCount ?? 0;
    const converted = followUp?.completedLeads ?? 0;
    return `${eligible} elegíveis · ${converted} convertido${converted === 1 ? "" : "s"}`;
  }
  if (stageKey === "05_pagamento") {
    const pay = stageFlows.find((f) => f.key === "payment_confirmed");
    const sent = pay?.sentEvents ?? 0;
    return `${sent} confirmações · kill-switch OFF`;
  }
  if (stageKey === "99_legado") {
    return `${stageFlows.length} flow${stageFlows.length === 1 ? "" : "s"} mantidos para auditoria`;
  }
  return `${stageFlows.length} bloco${stageFlows.length === 1 ? "" : "s"}`;
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
