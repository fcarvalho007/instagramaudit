/**
 * AutomationNode — cartão visual de um passo do fluxo (read-only).
 *
 * Layout em 3 zonas verticais:
 *   1) Identificação (ícone + pílula tipo + status + título + subject + acções)
 *   2) Faixa de temporização (quando dispara, com trigger técnico)
 *   3) Stats (Enviados / A aguardar / Falhas)
 */

import { Lock, Pencil, MoreHorizontal, Mail, Settings, BarChart3, ArrowRightLeft, Clock, AlertTriangle } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import type {
  AutomationFlow,
  FlowStage,
  FlowStatus,
  FlowVisualKind,
  FlowExtraTag,
  FlowTiming,
} from "@/routes/api/admin/automation-flow";

interface AutomationNodeProps {
  flow: AutomationFlow;
  stageColor: string;
}

const VISUAL_LABEL: Record<FlowVisualKind, string> = {
  email: "Email",
  system: "Sistema · Geração",
  report: "Relatório",
};

const VISUAL_ICON: Record<FlowVisualKind, typeof Mail> = {
  email: Mail,
  system: Settings,
  report: BarChart3,
};

const VISUAL_BADGE: Record<FlowVisualKind, string> = {
  email: "EM",
  system: "SY",
  report: "RP",
};

const STATUS_META: Record<FlowStatus, { label: string; bg: string; color: string; dot: string | null }> = {
  active: { label: "Ativo", bg: "#E1F4E8", color: "#1D9E75", dot: "#1D9E75" },
  blocked: { label: "Bloqueado", bg: "#EDEDEA", color: "#5A6B8C", dot: null },
  preparing: { label: "Em preparação", bg: "#FAEEDA", color: "#BA7517", dot: "#BA7517" },
  undefined: { label: "Sem trigger", bg: "#FAEEDA", color: "#BA7517", dot: null },
};

const EXTRA_META: Record<Exclude<FlowExtraTag, null>, { label: string; bg: string; color: string }> = {
  primary_delivery: { label: "Entrega principal", bg: "#E0EBFB", color: "#185FA5" },
  no_email: { label: "Sem email", bg: "#EDEDEA", color: "#5A6B8C" },
  blocked: { label: "Bloqueado", bg: "#EDEDEA", color: "#5A6B8C" },
};

export function AutomationNode({ flow, stageColor }: AutomationNodeProps) {
  const visual = flow.visualKind;
  const Icon = VISUAL_ICON[visual];
  const status = STATUS_META[flow.status];
  const isBlocked = flow.status === "blocked";

  return (
    <article
      className="group relative rounded-2xl border bg-white transition-all"
      style={{
        borderColor: "#E4E8F0",
        boxShadow: "0 1px 2px rgba(44,44,42,0.04), 0 4px 16px rgba(44,44,42,0.05)",
      }}
    >
      {/* Zone 1 — identification */}
      <div className="flex items-start gap-4 px-5 pt-5">
        {/* Icon + badge */}
        <div className="relative shrink-0">
          <div
            className="flex h-[50px] w-[50px] items-center justify-center rounded-xl"
            style={{
              background: `linear-gradient(135deg, ${stageColor}22, ${stageColor}10)`,
              border: `1px solid ${stageColor}33`,
            }}
          >
            <Icon size={22} style={{ color: stageColor }} strokeWidth={1.75} />
          </div>
          <span
            className="absolute -bottom-1 -right-1 inline-flex h-5 min-w-[24px] items-center justify-center rounded-md px-1 font-mono text-[9px] font-bold tracking-tight text-white"
            style={{ background: stageColor }}
          >
            {VISUAL_BADGE[visual]}
          </span>
        </div>

        {/* Header content */}
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <div className="flex flex-wrap items-center gap-1.5">
            <TypePill kind={visual} stageColor={stageColor} />
            <StatusPill meta={status} />
            {flow.extraTag && <ExtraPill tag={flow.extraTag} />}
          </div>
          <h3 className="m-0 text-[16px] font-semibold leading-tight text-admin-text-primary">
            {flow.title}
          </h3>
          {flow.subject && (
            <p className="m-0 flex items-baseline gap-1.5 text-[12px] text-admin-text-tertiary">
              <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-admin-text-tertiary/70">
                Subject
              </span>
              <span className="text-admin-text-secondary">{flow.subject}</span>
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="flex shrink-0 items-center gap-1.5">
          <EditButton blocked={isBlocked} templateKey={flow.templateKey} />
          <TooltipProvider delayDuration={200}>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  disabled
                  className="flex h-8 w-8 items-center justify-center rounded-md border text-admin-text-tertiary opacity-60"
                  style={{ borderColor: "#E4E8F0", cursor: "not-allowed" }}
                  aria-label="Mais opções"
                >
                  <MoreHorizontal size={14} />
                </button>
              </TooltipTrigger>
              <TooltipContent side="top">Disponível em breve</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      {/* Zone 2 — timing strip */}
      <TimingStrip timing={flow.timing} />

      {/* Zone 3 — stats */}
      <div className="grid grid-cols-3 gap-2 px-5 pb-5 pt-3">
        <Stat label="Enviados" value={flow.sentTotal} tone="muted" />
        <Stat
          label="A aguardar"
          value={flow.eligibleCount + flow.inFlightCount}
          tone={flow.eligibleCount + flow.inFlightCount > 0 ? "warning" : "muted"}
        />
        <Stat
          label="Falhas"
          value={flow.failuresTotal}
          tone={flow.failuresTotal > 0 ? "danger" : "muted"}
        />
      </div>
    </article>
  );
}

function TypePill({ kind, stageColor }: { kind: FlowVisualKind; stageColor: string }) {
  const Icon = VISUAL_ICON[kind];
  return (
    <span
      className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.1em]"
      style={{ background: `${stageColor}14`, color: stageColor }}
    >
      <Icon size={10} strokeWidth={2.5} />
      {VISUAL_LABEL[kind]}
    </span>
  );
}

function StatusPill({ meta }: { meta: typeof STATUS_META[FlowStatus] }) {
  return (
    <span
      className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em]"
      style={{ background: meta.bg, color: meta.color }}
    >
      {meta.dot && (
        <span
          className="inline-block h-1.5 w-1.5 rounded-full"
          style={{ background: meta.dot }}
        />
      )}
      {meta.label}
    </span>
  );
}

function ExtraPill({ tag }: { tag: Exclude<FlowExtraTag, null> }) {
  const meta = EXTRA_META[tag];
  return (
    <span
      className="inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em]"
      style={{ background: meta.bg, color: meta.color }}
    >
      {meta.label}
    </span>
  );
}

function EditButton({ blocked, templateKey }: { blocked: boolean; templateKey: string | null }) {
  if (blocked) {
    return (
      <TooltipProvider delayDuration={200}>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              disabled
              className="inline-flex h-8 items-center gap-1.5 rounded-md border px-3 text-[12px] font-medium text-admin-text-tertiary"
              style={{ background: "#F1F4F9", borderColor: "#E4E8F0", cursor: "not-allowed" }}
              aria-label="Bloqueado"
            >
              <Lock size={12} />
              Bloqueado
            </button>
          </TooltipTrigger>
          <TooltipContent side="top">Sistema · não-editável</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }
  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            disabled
            className="inline-flex h-8 items-center gap-1.5 rounded-md px-3 text-[12px] font-semibold text-white opacity-90"
            style={{ background: "#0F1B3D", cursor: "not-allowed", boxShadow: "0 1px 2px rgba(15,27,61,0.2)" }}
          >
            <Pencil size={12} />
            Editar
          </button>
        </TooltipTrigger>
        <TooltipContent side="top">
          {templateKey ? "Disponível em breve" : "Sem template editável"}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

function TimingStrip({ timing }: { timing: FlowTiming }) {
  if (timing.kind === "undefined") {
    return (
      <div
        className="mx-5 mt-3 flex items-center gap-2 rounded-md border px-3 py-2 text-[12px]"
        style={{ background: "#FFF7E8", borderColor: "#F4DCA6" }}
      >
        <AlertTriangle size={13} style={{ color: "#BA7517" }} />
        <span className="text-admin-text-secondary">
          <strong className="font-semibold text-admin-text-primary">Não definido</strong>
          {" · falta configurar "}
          <TriggerCode name={timing.missingTrigger} />
          {" para disparar este email"}
        </span>
      </div>
    );
  }

  if (timing.kind === "average") {
    return (
      <div
        className="mx-5 mt-3 flex items-center gap-2 rounded-md px-3 py-2 text-[12px]"
        style={{ background: "#F4F8FE" }}
      >
        <Clock size={13} className="text-admin-info-500" />
        <span className="text-admin-text-secondary">
          {"Demora "}
          <strong className="font-semibold text-admin-text-primary">{timing.averageLabel}</strong>
          {" · disparado pelo evento "}
          <TriggerCode name={timing.eventName} />
        </span>
      </div>
    );
  }

  if (timing.kind === "delay") {
    return (
      <div
        className="mx-5 mt-3 flex flex-wrap items-center gap-x-1.5 gap-y-1 rounded-md px-3 py-2 text-[12px]"
        style={{ background: "#F4F8FE" }}
      >
        <Clock size={13} className="text-admin-info-500 shrink-0" />
        <span className="text-admin-text-secondary">
          <strong className="font-semibold text-admin-text-primary">{timing.delayLabel}</strong>
          {" após "}
          <TriggerCode name={timing.eventName} />
          {timing.contextHint ? ` — ${timing.contextHint}` : ""}
        </span>
      </div>
    );
  }

  // immediate
  return (
    <div
      className="mx-5 mt-3 flex flex-wrap items-center gap-x-1.5 gap-y-1 rounded-md px-3 py-2 text-[12px]"
      style={{ background: "#F4F8FE" }}
    >
      <ArrowRightLeft size={13} className="text-admin-info-500 shrink-0" />
      <span className="text-admin-text-secondary">
        <strong className="font-semibold text-admin-text-primary">Imediato</strong>
        {" após o evento "}
        <TriggerCode name={timing.eventName} />
        {timing.contextHint ? ` — ${timing.contextHint}` : ""}
      </span>
    </div>
  );
}

function TriggerCode({ name }: { name: string }) {
  return (
    <code
      className="rounded px-1.5 py-0.5 font-mono text-[11px]"
      style={{ background: "#E0EBFB", color: "#185FA5" }}
    >
      {name}
    </code>
  );
}

type Tone = "muted" | "warning" | "danger" | "success";
const TONE_COLOR: Record<Tone, string> = {
  muted: "#1D9E75",
  warning: "#BA7517",
  danger: "#D85A30",
  success: "#1D9E75",
};

function Stat({ label, value, tone }: { label: string; value: number; tone: Tone }) {
  const color = value > 0 ? TONE_COLOR[tone] : "#8A98B2";
  return (
    <div className="flex flex-col items-center gap-1 rounded-lg py-2">
      <span className="text-[20px] font-bold leading-none tabular-nums" style={{ color }}>
        {value}
      </span>
      <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-admin-text-tertiary">
        {label}
      </span>
    </div>
  );
}

// Stage prop kept for future use (badge color override) — currently not used.
export type { FlowStage };
