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
          welcome_beta: ["welcome_beta_sent"],
          pedido_recebido: ["beta_request_created", "unlock_completed"],
          relatorio_gerado: ["report_generated"],
          link_enviado: ["report_link_sent"],
          personal_area_saved: ["personal_area_saved_sent"],
          relatorio_visto: ["report_viewed"],
          feedback_pedido: ["feedback_requested"],
          report_summary: ["report_summary_sent"],
          feedback_recebido: ["feedback_submitted"],
          follow_up_comercial: ["commercial_followup_sent"],
        };
        const allEventTypes = Array.from(
          new Set(Object.values(FLOW_EVENTS).flat()),
        );
        const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
        const since30d = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
        const since48h = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
        const last24hByType: Record<string, number> = {};
        const total30dByType: Record<string, number> = {};
        const yest24hByType: Record<string, number> = {};
        const lastAtByType: Record<string, string | null> = {};
        try {
          const { data: recent30d } = await supabaseAdmin
            .from("product_events")
            .select("event_type, created_at")
            .in("event_type", allEventTypes)
            .gte("created_at", since30d);
          for (const row of recent30d ?? []) {
            const t = row.event_type as string;
            const at = row.created_at as string;
            total30dByType[t] = (total30dByType[t] ?? 0) + 1;
            if (at >= since24h) {
              last24hByType[t] = (last24hByType[t] ?? 0) + 1;
            } else if (at >= since48h) {
              yest24hByType[t] = (yest24hByType[t] ?? 0) + 1;
            }
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

        const sentTotalFor = (key: keyof typeof FLOW_EVENTS) =>
          (FLOW_EVENTS[key] ?? []).reduce(
            (acc, t) => acc + (total30dByType[t] ?? 0),
            0,
          );

        const flows: AutomationFlow[] = [
          {
            key: "welcome_beta",
            title: "Boas-vindas à beta",
            description: "Bem-vindo à beta — o que esperar daqui.",
            trigger: { kind: "event", label: "subscribe" },
            action: { kind: "email", label: "Email \"boas-vindas à beta\"" },
            kind: "automatic",
            fromStatus: null,
            toStatus: null,
            eligibleCount: 0,
            inFlightCount: 0,
            completedCount: sentTotalFor("welcome_beta"),
            recentFailures: 0,
            ...eventStats("welcome_beta"),
            stage: "00_onboarding",
            visualKind: "email",
            status: sentTotalFor("welcome_beta") > 0 ? "active" : "preparing",
            extraTag: null,
            subject: "Bem-vindo à beta — o que esperar daqui",
            timing: {
              kind: "immediate",
              eventName: "subscribe",
              contextHint: "lead entra na lista beta",
            },
            templateKey: "welcome_beta",
            sentTotal: sentTotalFor("welcome_beta"),
            failuresTotal: 0,
          },
          {
            key: "pedido_recebido",
            title: "Pedido recebido",
            description:
              "Recebemos o teu pedido para @{{handle}}.",
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
            stage: "01_captacao",
            visualKind: "email",
            status: "active",
            extraTag: null,
            subject: "Recebemos o teu pedido para @{{handle}}",
            timing: {
              kind: "immediate",
              eventName: "request_submitted",
              contextHint: "utilizador submete o formulário",
            },
            templateKey: "request_received",
            sentTotal: sentTotalFor("pedido_recebido"),
            failuresTotal: 0,
          },
          {
            key: "relatorio_gerado",
            title: "Geração do relatório",
            description:
              "Snapshot dos dados públicos do Instagram — cria o relatório no servidor.",
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
            stage: "01_captacao",
            visualKind: "system",
            status: "blocked",
            extraTag: "no_email",
            subject: null,
            timing: {
              kind: "average",
              averageLabel: "~6 horas em média",
              eventName: "request_received",
            },
            templateKey: null,
            sentTotal: 0,
            failuresTotal: 0,
          },
          {
            key: "link_enviado",
            title: "Relatório pronto",
            description:
              "O teu relatório de @{{handle}} está disponível.",
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
            stage: "02_entrega",
            visualKind: "email",
            status: "active",
            extraTag: "primary_delivery",
            subject: "O teu relatório de @{{handle}} está disponível",
            timing: {
              kind: "immediate",
              eventName: "report_generated",
              contextHint: "link público gerado",
            },
            templateKey: "report_ready",
            sentTotal: sentTotalFor("link_enviado"),
            failuresTotal: linkFailures7d,
          },
          {
            key: "personal_area_saved",
            title: "Área pessoal guardada",
            description: "O relatório foi guardado na tua área pessoal.",
            trigger: { kind: "event", label: "report_ready_sent" },
            action: { kind: "email", label: "Email \"área pessoal guardada\"" },
            kind: "automatic",
            fromStatus: null,
            toStatus: null,
            eligibleCount: 0,
            inFlightCount: 0,
            completedCount: sentTotalFor("personal_area_saved"),
            recentFailures: 0,
            ...eventStats("personal_area_saved"),
            stage: "02_entrega",
            visualKind: "email",
            status:
              sentTotalFor("personal_area_saved") > 0 ? "active" : "preparing",
            extraTag: null,
            subject: "O relatório foi guardado na tua área pessoal",
            timing: {
              kind: "delay",
              eventName: "report_ready_sent",
              delayLabel: "5 minutos",
              contextHint: "confirma o arquivo",
            },
            templateKey: "personal_area_saved",
            sentTotal: sentTotalFor("personal_area_saved"),
            failuresTotal: 0,
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
            stage: "02_entrega",
            visualKind: "report",
            status: "active",
            extraTag: null,
            subject: null,
            timing: {
              kind: "immediate",
              eventName: "report_viewed",
              contextHint: "lead abre o link público",
            },
            templateKey: null,
            sentTotal: 0,
            failuresTotal: 0,
          },
          {
            key: "feedback_pedido",
            title: "Pedido de feedback",
            description:
              "O relatório de @{{handle}} foi útil?",
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
            stage: "03_conversao",
            visualKind: "email",
            status: "active",
            extraTag: null,
            subject: "O relatório de @{{handle}} foi útil?",
            timing: {
              kind: "delay",
              eventName: "report_viewed",
              delayLabel: "48 horas",
              contextHint: "utilizador abriu o relatório",
            },
            templateKey: "feedback_request",
            sentTotal: sentTotalFor("feedback_pedido"),
            failuresTotal: 0,
          },
          {
            key: "report_summary",
            title: "Resumo do relatório",
            description:
              "Resumo da análise de @{{handle}} · 3 conclusões em 60s.",
            trigger: { kind: "event", label: "report_ready_sent" },
            action: { kind: "email", label: "Email \"resumo do relatório\"" },
            kind: "automatic",
            fromStatus: null,
            toStatus: null,
            eligibleCount: 0,
            inFlightCount: 0,
            completedCount: sentTotalFor("report_summary"),
            recentFailures: 0,
            ...eventStats("report_summary"),
            stage: "03_conversao",
            visualKind: "email",
            status:
              sentTotalFor("report_summary") > 0 ? "active" : "preparing",
            extraTag: null,
            subject: "Resumo da análise de @{{handle}} · 3 conclusões em 60s",
            timing: {
              kind: "delay",
              eventName: "report_ready_sent",
              delayLabel: "7 dias",
              contextHint: "quem não abriu o relatório",
            },
            templateKey: "report_summary",
            sentTotal: sentTotalFor("report_summary"),
            failuresTotal: 0,
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
            stage: "03_conversao",
            visualKind: "report",
            status: "active",
            extraTag: null,
            subject: null,
            timing: {
              kind: "immediate",
              eventName: "feedback_submitted",
              contextHint: "classificar intenção comercial",
            },
            templateKey: null,
            sentTotal: 0,
            failuresTotal: 0,
          },
          {
            key: "follow_up_comercial",
            title: "Follow-up comercial",
            description:
              "Próximos passos para o relatório completo.",
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
            stage: "03_conversao",
            visualKind: "email",
            status: "undefined",
            extraTag: null,
            subject: "Próximos passos para o relatório completo",
            timing: { kind: "undefined", missingTrigger: "checkout_started" },
            templateKey: "commercial_followup",
            sentTotal: sentTotalFor("follow_up_comercial"),
            failuresTotal: 0,
          },
        ];

        // Aggregate KPIs
        const sentLast30d = flows.reduce((a, f) => a + f.sentTotal, 0);
        const sentYest = Object.values(yest24hByType).reduce(
          (a, n) => a + n,
          0,
        );
        const sentToday = Object.values(last24hByType).reduce(
          (a, n) => a + n,
          0,
        );
        const activeFlows = flows.filter(
          (f) => f.status === "active" || f.status === "blocked",
        ).length;
        const eligibleTotal = flows.reduce((a, f) => a + f.eligibleCount, 0);
        const failures30dCount = linkFailures7d; // best-effort
        const deliverabilityPct =
          sentLast30d + failures30dCount > 0
            ? Math.round(
                (sentLast30d / (sentLast30d + failures30dCount)) * 1000,
              ) / 10
            : 100;
        const kpis: AutomationKpis = {
          systemActive: { activeCount: activeFlows, totalCount: flows.length },
          sent: { last30d: sentLast30d, deltaVsYesterday: sentToday - sentYest },
          waiting: { eligibleTotal, nextEtaMinutes: null },
          failures: { last30d: failures30dCount, deliverabilityPct },
        };

        const body: AutomationFlowResponse = {
          success: true,
          generatedAt: new Date().toISOString(),
          totalActive,
          totalArchived,
          flows,
          kpis,
        };
        return jsonResponse(body);
      },
    },
  },
});