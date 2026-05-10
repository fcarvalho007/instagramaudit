/**
 * AutomationNode — cartão de um passo do fluxo de automação beta.
 *
 * Read-only. Mostra trigger, ação, estado destino e três contagens.
 */

import { AdminCard } from "../admin-card";
import {
  getLifecycleMeta,
  type LifecycleStatus,
} from "@/lib/admin/lead-lifecycle";

type TriggerKind = "form" | "event" | "manual";
type ActionKind = "email" | "manual" | "wait" | "classify";

interface AutomationNodeProps {
  title: string;
  description: string;
  trigger: { kind: TriggerKind; label: string };
  action: { kind: ActionKind; label: string };
  kind: "automatic" | "manual";
  toStatus: LifecycleStatus | null;
  eligibleCount: number;
  inFlightCount: number;
  completedCount: number;
  recentFailures?: number;
  last24hCount?: number;
  lastEventAt?: string | null;
}

const TRIGGER_LABEL: Record<TriggerKind, string> = {
  form: "Formulário",
  event: "Evento",
  manual: "Manual",
};

const TRIGGER_COLOR: Record<TriggerKind, string> = {
  form: "#3772E5",
  event: "#7664E4",
  manual: "#888780",
};

const ACTION_LABEL: Record<ActionKind, string> = {
  email: "Email",
  manual: "Ação manual",
  wait: "Aguardar",
  classify: "Classificar",
};

const ACTION_COLOR: Record<ActionKind, string> = {
  email: "#185FA5",
  manual: "#BA7517",
  wait: "#888780",
  classify: "#0E9488",
};

export function AutomationNode({
  title,
  description,
  trigger,
  action,
  kind,
  toStatus,
  eligibleCount,
  inFlightCount,
  completedCount,
  recentFailures = 0,
  last24hCount = 0,
  lastEventAt = null,
}: AutomationNodeProps) {
  const meta = toStatus ? getLifecycleMeta(toStatus) : null;
  const kindColor = kind === "automatic" ? "#0E9488" : "#BA7517";
  const kindLabel = kind === "automatic" ? "Automático" : "Manual";

  return (
    <AdminCard variant="accent-left" accent="leads">
      <div className="flex flex-col gap-3">
        {/* Tag row */}
        <div className="flex flex-wrap items-center gap-2">
          <span
            className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em]"
            style={{
              backgroundColor: `${kindColor}1A`,
              color: kindColor,
            }}
          >
            {kindLabel}
          </span>
          <Tag color={TRIGGER_COLOR[trigger.kind]} prefix="Trigger">
            {TRIGGER_LABEL[trigger.kind]} · {trigger.label}
          </Tag>
          <Tag color={ACTION_COLOR[action.kind]} prefix="Ação">
            {ACTION_LABEL[action.kind]}
          </Tag>
          {meta && (
            <span
              className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium tracking-tight"
              style={{
                backgroundColor: `${meta.color}1A`,
                color: meta.color,
              }}
            >
              → {meta.label}
            </span>
          )}
          {recentFailures > 0 && (
            <span
              className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold"
              style={{
                backgroundColor: "#D85A301A",
                color: "#D85A30",
              }}
            >
              {recentFailures} falha{recentFailures === 1 ? "" : "s"} recente{recentFailures === 1 ? "" : "s"} (7d)
            </span>
          )}
        </div>

        {/* Title + description */}
        <div className="flex flex-col gap-1">
          <h3
            className="m-0 text-[16px] font-medium leading-tight text-admin-text-primary sm:text-[17px]"
          >
            {title}
          </h3>
          <p className="m-0 text-[13px] leading-snug text-admin-text-secondary">
            {description}
          </p>
          <p className="m-0 text-[12px] text-admin-text-tertiary">
            {action.label}
          </p>
          {(lastEventAt || last24hCount > 0) && (
            <p className="m-0 text-[11px] text-admin-text-tertiary">
              {lastEventAt && (
                <>Última atividade: {formatRelative(lastEventAt)}</>
              )}
              {lastEventAt && last24hCount > 0 && <> · </>}
              {last24hCount > 0 && (
                <>24h: {last24hCount} evento{last24hCount === 1 ? "" : "s"}</>
              )}
            </p>
          )}
        </div>

        {/* Counts */}
        <div className="grid grid-cols-3 gap-2 sm:gap-3">
          <Metric
            label="Elegíveis"
            value={eligibleCount}
            tone={eligibleCount > 0 ? "action" : "neutral"}
          />
          <Metric
            label="Em curso"
            value={inFlightCount}
            tone="wait"
          />
          <Metric
            label="Concluídos"
            value={completedCount}
            tone="done"
          />
        </div>
      </div>
    </AdminCard>
  );
}

function Tag({
  color,
  prefix,
  children,
}: {
  color: string;
  prefix: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className="inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[11px] tracking-tight"
      style={{
        borderColor: `${color}55`,
        backgroundColor: `${color}10`,
        color,
      }}
    >
      <span className="font-semibold uppercase tracking-[0.08em] text-[10px]">
        {prefix}
      </span>
      <span className="font-normal">{children}</span>
    </span>
  );
}

type MetricTone = "action" | "wait" | "done" | "neutral";

const TONE_COLOR: Record<MetricTone, string> = {
  action: "#D85A30",
  wait: "#BA7517",
  done: "#1D9E75",
  neutral: "#888780",
};

function Metric({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: MetricTone;
}) {
  const color = TONE_COLOR[tone];
  return (
    <div
      className="rounded-lg border px-3 py-2"
      style={{
        borderColor: "rgb(var(--admin-border-rgb) / 0.5)",
        backgroundColor:
          value > 0 ? `${color}0D` : "rgb(var(--admin-surface-elevated-rgb) / 0.6)",
      }}
    >
      <div className="text-[10px] uppercase tracking-[0.1em] text-admin-text-tertiary">
        {label}
      </div>
      <div
        className="text-[20px] font-semibold tabular-nums leading-none"
        style={{ color: value > 0 ? color : "#888780", marginTop: 4 }}
      >
        {value}
      </div>
    </div>
  );
}