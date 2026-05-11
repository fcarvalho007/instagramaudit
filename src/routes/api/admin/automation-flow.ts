/**
 * GET /api/admin/automation-flow — visualização read-only dos fluxos beta.
 *
 * Devolve a definição estática dos 6 fluxos do ciclo de vida + contagens
 * reais agregadas a partir de `leads.commercial_status`. Sem providers,
 * sem emails, sem alterações de estado.
 */

import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireAdminSession } from "@/lib/admin/session";
import {
  LIFECYCLE_STATUSES,
  type LifecycleStatus,
} from "@/lib/admin/lead-lifecycle";
import type { EmailTemplateKey } from "@/lib/admin/email-template-registry";

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

const STATUS_INDEX: Record<string, number> = Object.fromEntries(
  LIFECYCLE_STATUSES.map((s, i) => [s, i]),
);

function idx(status: string | null | undefined): number {
  if (!status) return -1;
  const i = STATUS_INDEX[status];
  return i === undefined ? -1 : i;
}

export type FlowStage =
  | "00_onboarding"
  | "01_captacao"
  | "02_entrega"
  | "03_conversao";

export type FlowStatus = "active" | "blocked" | "undefined" | "preparing";

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
      delayLabel: string;
      contextHint?: string;
    }
  | { kind: "average"; averageLabel: string; eventName: string }
  | { kind: "undefined"; missingTrigger: string };

export interface AutomationFlow {
  key:
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
  title: string;
  description: string;
  trigger: { kind: "form" | "event" | "manual"; label: string };
  action: { kind: "email" | "manual" | "wait" | "classify"; label: string };
  kind: "automatic" | "manual";
  fromStatus: LifecycleStatus | null;
  toStatus: LifecycleStatus | null;
  eligibleCount: number;
  inFlightCount: number;
  completedCount: number;
  recentFailures: number;
  eventTypes: string[];
  last24hCount: number;
  lastEventAt: string | null;
  stage: FlowStage;
  visualKind: FlowVisualKind;
  status: FlowStatus;
  extraTag: FlowExtraTag;
  subject: string | null;
  timing: FlowTiming;
  templateKey: EmailTemplateKey | null;
  sentTotal: number;
  failuresTotal: number;
}

export interface AutomationKpis {
  systemActive: { activeCount: number; totalCount: number };
  sent: { last30d: number; deltaVsYesterday: number };
  waiting: { eligibleTotal: number; nextEtaMinutes: number | null };
  failures: { last30d: number; deliverabilityPct: number };
}

export interface AutomationFlowResponse {
  success: boolean;
  generatedAt: string;
  totalActive: number;
  totalArchived: number;
  flows: AutomationFlow[];
  kpis?: AutomationKpis;
  error?: string;
}

export const Route = createFileRoute("/api/admin/automation-flow")({
  server: {
    handlers: {
      GET: async () => {
        try {
          await requireAdminSession();
        } catch (res) {
          if (res instanceof Response) return res;
          throw res;
        }

        const { data: leads, error } = await supabaseAdmin
          .from("leads")
          .select("commercial_status");

        if (error) {
          console.error("[automation-flow] leads query failed", error);
          return jsonResponse(
            { success: false, error: error.message },
            500,
          );
        }

        const statuses = (leads ?? []).map(
          (l) => l.commercial_status ?? "novo_pedido",
        );
        const totalArchived = statuses.filter((s) => s === "arquivado").length;
        const active = statuses.filter((s) => s !== "arquivado");
        const totalActive = active.length;

        const countEq = (s: LifecycleStatus) =>
          active.filter((x) => x === s).length;
        const countAtLeast = (s: LifecycleStatus) => {
          const target = idx(s);
          return active.filter((x) => idx(x) >= target).length;
        };
        const countIn = (set: LifecycleStatus[]) => {
          const sset = new Set<string>(set);
          return active.filter((x) => sset.has(x)).length;
        };

        // Recent email failures (last 7d). Best-effort: failures are not
        // recorded as product_events today, so we read `report_requests`
        // delivery_status='failed' to detect link delivery problems.
        let linkFailures7d = 0;
        try {
          const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
          const { count } = await supabaseAdmin
            .from("report_requests")
            .select("id", { count: "exact", head: true })
            .eq("delivery_status", "failed")
            .gte("updated_at", since);
          linkFailures7d = count ?? 0;
        } catch {
          linkFailures7d = 0;
        }

        // Aggregate product_events: last24h count + most recent timestamp per type.
        const FLOW_EVENTS: Record<string, string[]> = {
          pedido_recebido: ["beta_request_created", "unlock_completed"],
          relatorio_gerado: ["report_generated"],
          link_enviado: ["report_link_sent"],
          relatorio_visto: ["report_viewed"],
          feedback_pedido: ["feedback_requested"],
          feedback_recebido: ["feedback_submitted"],
          follow_up_comercial: ["commercial_followup_sent"],
        };
        const allEventTypes = Array.from(
          new Set(Object.values(FLOW_EVENTS).flat()),
        );
        const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
        const last24hByType: Record<string, number> = {};
        const lastAtByType: Record<string, string | null> = {};
        try {
          const { data: recent24 } = await supabaseAdmin
            .from("product_events")
            .select("event_type")
            .in("event_type", allEventTypes)
            .gte("created_at", since24h);
          for (const row of recent24 ?? []) {
            const t = row.event_type as string;
            last24hByType[t] = (last24hByType[t] ?? 0) + 1;
          }
          // Last timestamp per type — single query, group in memory.
          const { data: latest } = await supabaseAdmin
            .from("product_events")
            .select("event_type, created_at")
            .in("event_type", allEventTypes)
            .order("created_at", { ascending: false })
            .limit(500);
          for (const row of latest ?? []) {
            const t = row.event_type as string;
            if (!lastAtByType[t]) lastAtByType[t] = row.created_at as string;
          }
        } catch (e) {
          console.error("[automation-flow] product_events aggregate failed", e);
        }

        const eventStats = (key: keyof typeof FLOW_EVENTS) => {
          const types = FLOW_EVENTS[key] ?? [];
          const last24hCount = types.reduce(
            (acc, t) => acc + (last24hByType[t] ?? 0),
            0,
          );
          let lastEventAt: string | null = null;
          for (const t of types) {
            const v = lastAtByType[t];
            if (v && (!lastEventAt || v > lastEventAt)) lastEventAt = v;
          }
          return { eventTypes: types, last24hCount, lastEventAt };
        };

        const flows: AutomationFlow[] = [
          {
            key: "pedido_recebido",
            title: "Pedido recebido",
            description:
              "Lead submeteu pedido beta. Aguarda aprovação manual e geração do relatório.",
            trigger: { kind: "form", label: "Submissão de pedido beta" },
            action: {
              kind: "manual",
              label: "Admin aprova e gera relatório",
            },
            kind: "automatic",
            fromStatus: null,
            toStatus: "novo_pedido",
            eligibleCount: countEq("novo_pedido"),
            inFlightCount: 0,
            completedCount: countAtLeast("em_analise"),
            recentFailures: 0,
            ...eventStats("pedido_recebido"),
          },
          {
            key: "relatorio_gerado",
            title: "Relatório gerado",
            description:
              "Admin gera o snapshot do relatório a partir do pedido em análise.",
            trigger: { kind: "event", label: "report_generated" },
            action: { kind: "manual", label: "Admin gera relatório" },
            kind: "manual",
            fromStatus: "em_analise",
            toStatus: "relatorio_gerado",
            eligibleCount: countEq("em_analise"),
            inFlightCount: 0,
            completedCount: countAtLeast("relatorio_gerado"),
            recentFailures: 0,
            ...eventStats("relatorio_gerado"),
          },
          {
            key: "link_enviado",
            title: "Link enviado",
            description:
              "Admin envia o link público do relatório para o email do lead.",
            trigger: { kind: "manual", label: "Admin envia link" },
            action: { kind: "email", label: "Email \"relatório pronto\"" },
            kind: "manual",
            fromStatus: "relatorio_gerado",
            toStatus: "link_enviado",
            eligibleCount: countEq("relatorio_gerado"),
            inFlightCount: 0,
            completedCount: countAtLeast("link_enviado"),
            recentFailures: linkFailures7d,
            ...eventStats("link_enviado"),
          },
          {
            key: "relatorio_visto",
            title: "Relatório visto",
            description:
              "Lead abriu o relatório. Sugerir pedido de feedback ao admin.",
            trigger: { kind: "event", label: "report_viewed" },
            action: {
              kind: "manual",
              label: "Sugerir pedido de feedback",
            },
            kind: "automatic",
            fromStatus: "link_enviado",
            toStatus: "relatorio_visto",
            eligibleCount: countEq("link_enviado"),
            inFlightCount: 0,
            completedCount: countAtLeast("relatorio_visto"),
            recentFailures: 0,
            ...eventStats("relatorio_visto"),
          },
          {
            key: "feedback_pedido",
            title: "Feedback pedido",
            description:
              "Admin enviou pedido de feedback. Aguarda resposta do lead.",
            trigger: { kind: "manual", label: "Admin pede feedback" },
            action: { kind: "wait", label: "Aguardar resposta do lead" },
            kind: "manual",
            fromStatus: "relatorio_visto",
            toStatus: "feedback_pedido",
            eligibleCount: countEq("relatorio_visto"),
            inFlightCount: countEq("feedback_pedido"),
            completedCount: countAtLeast("feedback_recebido"),
            recentFailures: 0,
            ...eventStats("feedback_pedido"),
          },
          {
            key: "feedback_recebido",
            title: "Feedback recebido",
            description:
              "Lead respondeu ao questionário. Classificar intenção comercial.",
            trigger: { kind: "event", label: "feedback_submitted" },
            action: {
              kind: "classify",
              label: "Classificar intenção comercial",
            },
            kind: "automatic",
            fromStatus: "feedback_pedido",
            toStatus: "feedback_recebido",
            eligibleCount: countEq("feedback_recebido"),
            inFlightCount: 0,
            completedCount: countAtLeast("interessado"),
            recentFailures: 0,
            ...eventStats("feedback_recebido"),
          },
          {
            key: "follow_up_comercial",
            title: "Follow-up comercial",
            description:
              "Lead com interesse alto ou médio. Próximo passo: chamada, demo ou proposta.",
            trigger: { kind: "manual", label: "Intenção alta/média" },
            action: { kind: "manual", label: "Follow-up comercial futuro" },
            kind: "manual",
            fromStatus: "feedback_recebido",
            toStatus: "interessado",
            eligibleCount: countIn(["interessado", "potencial_cliente"]),
            inFlightCount: 0,
            completedCount: countEq("convertido"),
            recentFailures: 0,
            ...eventStats("follow_up_comercial"),
          },
        ];

        const body: AutomationFlowResponse = {
          success: true,
          generatedAt: new Date().toISOString(),
          totalActive,
          totalArchived,
          flows,
        };
        return jsonResponse(body);
      },
    },
  },
});