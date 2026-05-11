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
  | "03_conversao";

export interface StageDef {
  key: FlowStage;
  number: string;
  eyebrow: string;
  title: string;
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
    title: "Boas-vindas e acesso à plataforma",
    tokenColor: "admin-stage-onboarding",
    tokenBg: "admin-stage-onboarding-bg",
  },
  {
    key: "01_captacao",
    number: "01",
    eyebrow: "Captação",
    title: "Pedido recebido até relatório pronto",
    tokenColor: "admin-stage-captacao",
    tokenBg: "admin-stage-captacao-bg",
  },
  {
    key: "02_entrega",
    number: "02",
    eyebrow: "Entrega",
    title: "Notificação, consumo e arquivo",
    tokenColor: "admin-stage-entrega",
    tokenBg: "admin-stage-entrega-bg",
  },
  {
    key: "03_conversao",
    number: "03",
    eyebrow: "Conversão",
    title: "Validação de utilidade e oportunidade comercial",
    tokenColor: "admin-stage-conversao",
    tokenBg: "admin-stage-conversao-bg",
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
  | "personal_area_saved"
  | "relatorio_visto"
  | "feedback_pedido"
  | "report_summary"
  | "feedback_recebido"
  | "follow_up_comercial";

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
}

export interface AutomationKpis {
  systemActive: { activeCount: number; totalCount: number };
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
  welcome_beta: { types: ["welcome_beta_sent"], instrumented: false },
  pedido_recebido: { types: ["beta_request_created"], instrumented: true },
  relatorio_gerado: { types: ["report_generated"], instrumented: true },
  link_enviado: { types: ["report_link_sent"], instrumented: true },
  personal_area_saved: {
    types: ["personal_area_saved_sent"],
    instrumented: false,
  },
  relatorio_visto: { types: ["report_viewed"], instrumented: true },
  feedback_pedido: { types: ["feedback_requested"], instrumented: true },
  report_summary: { types: ["report_summary_sent"], instrumented: false },
  feedback_recebido: { types: ["feedback_submitted"], instrumented: true },
  follow_up_comercial: {
    types: ["commercial_followup_sent"],
    instrumented: true,
  },
};