/**
 * AutomationNode — cartão visual de um passo do fluxo (read-only).
 * Layout em 3 zonas: identificação · temporização · stats.
 * Cores via tokens admin (`--admin-pill-*`, `--admin-stage-*`).
 */

import { Lock, Pencil, Mail, Settings, BarChart3, ArrowRightLeft, Clock, AlertTriangle, AlertCircle, Zap } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Link } from "@tanstack/react-router";
import type {
  AutomationFlow,
  FlowStatus,
  FlowVisualKind,
  FlowExtraTag,
  FlowTiming,
  LifecycleBadge,
} from "@/lib/admin/automation-flow-types";
import { LIFECYCLE_BADGE_LABELS } from "@/lib/admin/automation-flow-types";

interface AutomationNodeProps {
  flow: AutomationFlow;
  stageTokenColor: string;
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

interface PillMeta {
  label: string;
  bgToken: string;
  fgToken: string;
  showDot: boolean;
}

const STATUS_META: Record<FlowStatus, PillMeta> = {
  active:    { label: "Ativo",         bgToken: "admin-pill-active-bg",  fgToken: "admin-pill-active-fg",  showDot: true  },
  blocked:   { label: "Bloqueado",     bgToken: "admin-pill-blocked-bg", fgToken: "admin-pill-blocked-fg", showDot: false },
  preparing: { label: "Em preparação", bgToken: "admin-pill-warn-bg",    fgToken: "admin-pill-warn-fg",    showDot: true  },
  undefined: { label: "Sem trigger",   bgToken: "admin-pill-warn-bg",    fgToken: "admin-pill-warn-fg",    showDot: false },
};

const EXTRA_META: Record<Exclude<FlowExtraTag, null>, Omit<PillMeta, "showDot">> = {
  primary_delivery: { label: "Entrega principal", bgToken: "admin-pill-info-bg",    fgToken: "admin-pill-info-fg" },
  no_email:         { label: "Sem email",         bgToken: "admin-pill-blocked-bg", fgToken: "admin-pill-blocked-fg" },
  blocked:          { label: "Bloqueado",         bgToken: "admin-pill-blocked-bg", fgToken: "admin-pill-blocked-fg" },
};

export function AutomationNode({ flow, stageTokenColor }: AutomationNodeProps) {
  const visual = flow.visualKind;
  const Icon = VISUAL_ICON[visual];
  const status = STATUS_META[flow.status];
  const isBlocked = flow.status === "blocked";
  const stageColor = `rgb(var(--${stageTokenColor}))`;

  return (
    <article
      className="group relative rounded-2xl border border-admin-border bg-white shadow-admin-card transition-all"
    >
      {/* Zone 1 — identification */}
      <div className="flex items-start gap-4 px-5 pt-5">
        <div className="relative shrink-0">
          <div
            className="flex h-[50px] w-[50px] items-center justify-center rounded-xl"
            style={{
              background: `color-mix(in oklab, ${stageColor} 13%, transparent)`,
              border: `1px solid color-mix(in oklab, ${stageColor} 22%, transparent)`,
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

        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <div className="flex flex-wrap items-center gap-1.5">
            <TypePill kind={visual} stageColor={stageColor} />
            <StatusPill meta={status} />
            {flow.extraTag && <ExtraPill tag={flow.extraTag} />}
            {flow.lifecycleBadges && flow.lifecycleBadges.length > 0 && (
              <LifecycleBadgeRow badges={flow.lifecycleBadges} />
            )}
          </div>
          <h3 className="m-0 text-[16px] font-semibold leading-tight text-admin-text-primary">
            {flow.title}
          </h3>
          {flow.subject && (
            <p className="m-0 flex items-baseline gap-1.5 text-[12px] text-admin-text-tertiary">
              <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-admin-text-tertiary/70">
                Subject
              </span>
              <SubjectLine text={flow.subject} />
            </p>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-1.5">
          <EditButton
            blocked={isBlocked}
            templateKey={flow.templateKey}
            needsTrigger={flow.status === "undefined"}
          />
        </div>
      </div>

      {/* Zone 2 — timing strip */}
      <TimingStrip timing={flow.timing} instrumented={flow.instrumented} />

      {/* Zone 3 — stats */}
      <div className="grid grid-cols-3 gap-2 px-5 pb-5 pt-3">
        <Stat label="Enviados" value={flow.sentEvents} tone="success" />
        <Stat
          label="A aguardar"
          value={flow.eligibleCount + flow.inFlightCount}
          tone="warning"
        />
        <Stat label="Falhas" value={flow.failuresTotal} tone="danger" />
      </div>
    </article>
  );
}

function SubjectLine({ text }: { text: string }) {
  // Renderiza `{{var}}` como chip em vez de literal Liquid no UI.
  const parts = text.split(/(\{\{[^}]+\}\})/g);
  return (
    <span className="text-admin-text-secondary">
      {parts.map((p, i) => {
        const m = p.match(/^\{\{\s*([^}\s]+)\s*\}\}$/);
        if (!m) return <span key={i}>{p}</span>;
        return (
          <code
            key={i}
            className="rounded px-1 py-0.5 font-mono text-[11px]"
            style={{
              background: "rgb(var(--admin-pill-info-bg))",
              color: "rgb(var(--admin-pill-info-fg))",
            }}
          >
            {m[1]}
          </code>
        );
      })}
    </span>
  );
}

function TypePill({ kind, stageColor }: { kind: FlowVisualKind; stageColor: string }) {
  const Icon = VISUAL_ICON[kind];
  return (
    <span
      className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.1em]"
      style={{
        background: `color-mix(in oklab, ${stageColor} 10%, transparent)`,
        color: stageColor,
      }}
    >
      <Icon size={10} strokeWidth={2.5} />
      {VISUAL_LABEL[kind]}
    </span>
  );
}

function StatusPill({ meta }: { meta: PillMeta }) {
  return (
    <span
      className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em]"
      style={{
        background: `rgb(var(--${meta.bgToken}))`,
        color: `rgb(var(--${meta.fgToken}))`,
      }}
    >
      {meta.showDot && (
        <span
          className="inline-block h-1.5 w-1.5 rounded-full"
          style={{ background: `rgb(var(--${meta.fgToken}))` }}
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
      style={{
        background: `rgb(var(--${meta.bgToken}))`,
        color: `rgb(var(--${meta.fgToken}))`,
      }}
    >
      {meta.label}
    </span>
  );
}

function EditButton({
  blocked,
  templateKey,
  needsTrigger,
}: {
  blocked: boolean;
  templateKey: string | null;
  needsTrigger: boolean;
}) {
  if (needsTrigger) {
    return (
      <TooltipProvider delayDuration={200}>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              disabled
              className="inline-flex h-8 items-center gap-1.5 rounded-md px-3 text-[12px] font-semibold text-white"
              style={{
                background: "rgb(var(--admin-pill-warn-fg))",
                cursor: "not-allowed",
                boxShadow: "0 1px 2px rgb(var(--admin-pill-warn-fg) / 0.25)",
                opacity: 0.95,
              }}
            >
              <Zap size={12} />
              Configurar trigger
            </button>
          </TooltipTrigger>
          <TooltipContent side="top">Disponível em breve</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }
  if (blocked) {
    return (
      <TooltipProvider delayDuration={200}>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              disabled
              className="inline-flex h-8 items-center gap-1.5 rounded-md border border-admin-border bg-admin-surface-muted px-3 text-[12px] font-medium text-admin-text-tertiary"
              style={{ cursor: "not-allowed" }}
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
  if (!templateKey) {
    return (
      <TooltipProvider delayDuration={200}>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              disabled
              className="inline-flex h-8 items-center gap-1.5 rounded-md border border-admin-border bg-admin-surface-muted px-3 text-[12px] font-medium text-admin-text-tertiary"
              style={{ cursor: "not-allowed" }}
            >
              <Pencil size={12} />
              Editar
            </button>
          </TooltipTrigger>
          <TooltipContent side="top">Sem template editável</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }
  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Link
            to="/admin/automacoes/templates/$key"
            params={{ key: templateKey }}
            className="inline-flex h-8 items-center gap-1.5 rounded-md px-3 text-[12px] font-semibold text-white"
            style={{
              background: "rgb(var(--admin-button-dark))",
              boxShadow: "0 1px 2px rgb(var(--admin-button-dark) / 0.2)",
            }}
          >
            <Pencil size={12} />
            Editar
          </Link>
        </TooltipTrigger>
        <TooltipContent side="top">Abrir editor de template</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

function TimingStrip({ timing, instrumented }: { timing: FlowTiming; instrumented: boolean }) {
  const containerInfo =
    "mx-5 mt-3 flex flex-wrap items-center gap-x-1.5 gap-y-1 rounded-md px-3 py-2 text-[12px]";
  const bgInfo = { background: "rgb(var(--admin-pill-info-soft-bg))" };
  const bgWarn = {
    background: "rgb(var(--admin-pill-warn-soft-bg))",
    border: "1px solid rgb(var(--admin-pill-warn-soft-border))",
  };

  if (timing.kind === "undefined") {
    return (
      <div className={`${containerInfo} border`} style={bgWarn}>
        <AlertTriangle size={13} className="text-[rgb(var(--admin-pill-warn-fg))]" />
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
      <div className={containerInfo} style={bgInfo}>
        <Clock size={13} className="text-admin-info-500 shrink-0" />
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
      <div className={containerInfo} style={bgInfo}>
        <Clock size={13} className="text-admin-info-500 shrink-0" />
        <span className="text-admin-text-secondary">
          <strong className="font-semibold text-admin-text-primary">{timing.delayLabel}</strong>
          {" após "}
          <TriggerCode name={timing.eventName} />
          {timing.contextHint ? ` — ${timing.contextHint}` : ""}
          {!instrumented && <NotInstrumentedHint />}
        </span>
      </div>
    );
  }

  return (
    <div className={containerInfo} style={bgInfo}>
      <ArrowRightLeft size={13} className="text-admin-info-500 shrink-0" />
      <span className="text-admin-text-secondary">
        <strong className="font-semibold text-admin-text-primary">Imediato</strong>
        {" após o evento "}
        <TriggerCode name={timing.eventName} />
        {timing.contextHint ? ` — ${timing.contextHint}` : ""}
        {!instrumented && <NotInstrumentedHint />}
      </span>
    </div>
  );
}

function NotInstrumentedHint() {
  return (
    <span className="ml-1.5 inline-flex items-center gap-1 align-baseline text-[11px] text-[rgb(var(--admin-pill-warn-fg))]">
      <AlertCircle size={11} />
      evento ainda não emitido
    </span>
  );
}

function TriggerCode({ name }: { name: string }) {
  return (
    <code
      className="rounded px-1.5 py-0.5 font-mono text-[11px]"
      style={{
        background: "rgb(var(--admin-pill-info-bg))",
        color: "rgb(var(--admin-pill-info-fg))",
      }}
    >
      {name}
    </code>
  );
}

type Tone = "muted" | "warning" | "danger" | "success";
const TONE_TOKEN: Record<Tone, string> = {
  muted: "admin-pill-active-fg",
  warning: "admin-pill-warn-fg",
  danger: "admin-signal-500",
  success: "admin-pill-active-fg",
};

function Stat({ label, value, tone }: { label: string; value: number; tone: Tone }) {
  const color =
    value > 0
      ? `rgb(var(--${TONE_TOKEN[tone]}))`
      : "rgb(var(--admin-neutral-400))";
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
