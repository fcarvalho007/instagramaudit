/**
 * Tipos partilhados + constantes do fluxo de automações beta.
 *
 * Fonte única consumida pela API `/api/admin/automation-flow` e pelos
 * componentes em `src/components/admin/v2/automacoes/*`. Antes os tipos
 * viviam dentro do ficheiro de rota da API, o que obrigava o frontend a
 * importar de `routes/api/...` (frágil) e duplicava taxonomia da stage no FE.
 */

import type { LifecycleStatus } from "@/lib/admin/lead-lifecycle";
import type { EmailTemplateKey } from "@/lib/admin/email-template-registry";

// ---------------------------------------------------------------------------
// Stages
// ---------------------------------------------------------------------------

export type FlowStage =
  | "00_onboarding"
  | "01_captacao"
  | "02_entrega"
  | "03_retencao"
  | "04_conversao"
  | "05_pagamento"
  | "99_legado";

export interface StageDef {
  key: FlowStage;
  number: string;
  eyebrow: string;
  title: string;
  /** Texto curto exibido por baixo do título da stage. */
  description?: string;
  /** Token CSS (sem `--`) para a cor principal da stage. */
  tokenColor: string;
  /** Token CSS (sem `--`) para o background da stage. */
  tokenBg: string;
}

export const STAGE_DEFS: readonly StageDef[] = [
  {
    key: "00_onboarding",
    number: "00",
    eyebrow: "Onboarding · Beta",
    title: "Entrada na plataforma",
    description: "Boas-vindas e acesso. Mostrado só se existirem fluxos activos.",
    tokenColor: "admin-stage-onboarding",
    tokenBg: "admin-stage-onboarding-bg",
  },
  {
    key: "01_captacao",
    number: "01",
    eyebrow: "Captação",
    title: "Pedido recebido até relatório gerado",
    description: "Antes do relatório ficar disponível para o lead.",
    tokenColor: "admin-stage-captacao",
    tokenBg: "admin-stage-captacao-bg",
  },
  {
    key: "02_entrega",
    number: "02",
    eyebrow: "Entrega",
    title: "Relatório guardado e consumido",
    description:
      "Entrega do relatório ao lead. `report_saved` é o email principal; `report_ready` é a variante manual / signed URL.",
    tokenColor: "admin-stage-entrega",
    tokenBg: "admin-stage-entrega-bg",
  },
  {
    key: "03_retencao",
    number: "03",
    eyebrow: "Retenção",
    title: "Pedido de feedback",
    description: "Após valor entregue, validar utilidade.",
    tokenColor: "admin-stage-retencao",
    tokenBg: "admin-stage-retencao-bg",
  },
  {
    key: "04_conversao",
    number: "04",
    eyebrow: "Conversão",
    title: "Follow-up comercial manual",
    description: "Conversão para o relatório completo — manual nesta fase.",
    tokenColor: "admin-stage-conversao",
    tokenBg: "admin-stage-conversao-bg",
  },
  {
    key: "05_pagamento",
    number: "05",
    eyebrow: "Pagamento",
    title: "Confirmação de pagamento",
    description: "Branch paid do EuPago — transaccional.",
    tokenColor: "admin-stage-pagamento",
    tokenBg: "admin-stage-pagamento-bg",
  },
  {
    key: "99_legado",
    number: "99",
    eyebrow: "Legado · desactivado",
    title: "Mantidos para auditoria",
    description: "Não disparam em produção — substituídos por fluxos activos.",
    tokenColor: "admin-stage-legado",
    tokenBg: "admin-stage-legado-bg",
  },
] as const;

// ---------------------------------------------------------------------------
// Flow shape
// ---------------------------------------------------------------------------

export type FlowKey =
  | "welcome_beta"
  | "pedido_recebido"
  | "relatorio_gerado"
  | "link_enviado"
  | "report_saved"
  | "personal_area_saved"
  | "relatorio_visto"
  | "feedback_pedido"
  | "report_summary"
  | "feedback_recebido"
  | "follow_up_comercial"
  | "payment_confirmed";

/**
 * Estado operacional do fluxo. Independente do número de envios — depende
 * apenas de `wired` (trigger implementado) na declaração estática.
 */
export type FlowStatus = "active" | "blocked" | "preparing" | "undefined";

export type FlowVisualKind = "email" | "system" | "report";

export type FlowExtraTag =
  | "primary_delivery"
  | "no_email"
  | "blocked"
  | null;

/**
 * Etiquetas operacionais adicionais mostradas em cima do cartão.
 * Aditivo a `FlowStatus` — descrevem como o fluxo opera, não substituem o
 * estado principal.
 */
export type LifecycleBadge =
  | "activo"
  | "manual"
  | "transaccional"
  | "kill_switch_off"
  | "planeado"
  | "bloqueado"
  | "legado"
  | "sem_trigger";

export const LIFECYCLE_BADGE_LABELS: Record<LifecycleBadge, string> = {
  activo: "Activo",
  manual: "Manual",
  transaccional: "Transaccional",
  kill_switch_off: "Kill-switch OFF",
  planeado: "Planeado",
  bloqueado: "Bloqueado",
  legado: "Legado",
  sem_trigger: "Sem trigger",
};

export type FlowTiming =
  | { kind: "immediate"; eventName: string; contextHint?: string }
  | {
      kind: "delay";
      eventName: string;
      delayMinutes: number;
      delayLabel: string;
      contextHint?: string;
    }
  | {
      kind: "average";
      eventName: string;
      averageMs: number | null;
      averageLabel: string;
    }
  | { kind: "undefined"; missingTrigger: string };

export interface AutomationFlow {
  key: FlowKey;
  title: string;
  description: string;
  trigger: { kind: "form" | "event" | "manual"; label: string };
  action: { kind: "email" | "manual" | "wait" | "classify"; label: string };
  kind: "automatic" | "manual";
  fromStatus: LifecycleStatus | null;
  toStatus: LifecycleStatus | null;

  /** Leads na pool de elegíveis (lifecycle). */
  eligibleCount: number;
  /** Leads com este passo a aguardar resposta. */
  inFlightCount: number;
  /**
   * Leads que ultrapassaram este passo no funil de status comercial.
   * Para flows que não são gates de status (welcome_beta, personal_area_saved,
   * report_summary, etc.), este campo é `null` — usa-se `sentEvents` em vez.
   */
  completedLeads: number | null;
  /** Eventos de produto observados (last 30d). Usado por flows automáticos. */
  sentEvents: number;

  eventTypes: string[];
  /** True quando a app já emite os eventos listados em `eventTypes`. */
  instrumented: boolean;

  last24hCount: number;
  lastEventAt: string | null;

  stage: FlowStage;
  visualKind: FlowVisualKind;
  status: FlowStatus;
  extraTag: FlowExtraTag;

  /** Subject do email (vem do template registry). `null` se não for email. */
  subject: string | null;
  timing: FlowTiming;
  templateKey: EmailTemplateKey | null;

  /** Falhas atribuídas a este fluxo nas últimas 30d. */
  failuresTotal: number;

  /**
   * Conjunto de etiquetas operacionais mostradas no cartão. Aditivo —
   * cartões sem este campo continuam a mostrar só o `StatusPill` clássico.
   */
  lifecycleBadges?: LifecycleBadge[];

  /**
   * Nota operacional curta, mostrada por baixo do timing-strip do cartão.
   * Usada para clarificar estado (ex.: kill-switch, sem auto-trigger).
   */
  note?: string | null;
}

export interface AutomationKpis {
  systemActive: {
    activeCount: number;
    /** Wired flows whose lifecycleBadges include "manual". */
    manualCount: number;
    /** Flows whose lifecycleBadges include "kill_switch_off". */
    killSwitchOffCount: number;
    /** Flows in the legacy stage (`99_legado`). */
    legacyCount: number;
    totalCount: number;
  };
  sent: { last30d: number; deltaVsYesterday: number };
  waiting: { eligibleTotal: number; nextEtaMinutes: number | null };
  failures: { last30d: number; deliverabilityPct: number | null };
}

export interface AutomationFlowResponse {
  success: boolean;
  generatedAt: string;
  totalActive: number;
  totalArchived: number;
  flows: AutomationFlow[];
  stages: readonly StageDef[];
  kpis?: AutomationKpis;
  error?: string;
}

// ---------------------------------------------------------------------------
// Delays declarativos
// ---------------------------------------------------------------------------

/** Atrasos centralizados (em minutos). Fonte única para `timing.delay*`. */
export const FLOW_DELAYS_MIN = {
  personal_area_saved: 5,
  feedback_pedido: 48 * 60,
  report_summary: 7 * 24 * 60,
} as const;

export function formatDelay(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  if (minutes < 1440) {
    const h = minutes / 60;
    return Number.isInteger(h) ? `${h}h` : `${h.toFixed(1)}h`;
  }
  const d = minutes / 1440;
  return Number.isInteger(d) ? `${d} dias` : `${d.toFixed(1)} dias`;
}

export function formatDuration(ms: number | null): string {
  if (ms == null || !Number.isFinite(ms) || ms <= 0) return "sem dados";
  const min = Math.round(ms / 60000);
  if (min < 60) return `~${min} min em média`;
  const h = min / 60;
  if (h < 24) {
    return Number.isInteger(h)
      ? `~${h}h em média`
      : `~${h.toFixed(1)}h em média`;
  }
  const d = h / 24;
  return Number.isInteger(d)
    ? `~${d} dias em média`
    : `~${d.toFixed(1)} dias em média`;
}

// ---------------------------------------------------------------------------
// Eventos por fluxo
// ---------------------------------------------------------------------------

export interface FlowEventDef {
  /** Eventos `product_events.event_type` agregados para este fluxo. */
  types: string[];
  /** True se algum lugar da app escreve estes eventos hoje. */
  instrumented: boolean;
}

export const FLOW_EVENTS: Record<FlowKey, FlowEventDef> = {
  welcome_beta: { types: ["beta_welcome_email_sent"], instrumented: true },
  pedido_recebido: { types: ["beta_request_created"], instrumented: true },
  relatorio_gerado: { types: ["report_generated"], instrumented: true },
  link_enviado: { types: ["report_link_sent"], instrumented: true },
  report_saved: { types: ["report_saved_email_sent"], instrumented: true },
  personal_area_saved: {
    // Sem evento dedicado em product_events. O envio é registado pelo
    // template `personal_area_saved` mas não dispara um *_sent agregável.
    types: ["personal_area_saved_sent"],
    instrumented: false,
  },
  relatorio_visto: { types: ["report_viewed"], instrumented: true },
  feedback_pedido: { types: ["feedback_requested"], instrumented: true },
  report_summary: { types: ["report_summary_email_sent"], instrumented: true },
  feedback_recebido: { types: ["feedback_submitted"], instrumented: true },
  follow_up_comercial: {
    types: ["commercial_followup_sent"],
    instrumented: true,
  },
  payment_confirmed: {
    types: ["payment_confirmation_email_sent"],
    instrumented: true,
  },
};