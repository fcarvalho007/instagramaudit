/**
 * GET /api/admin/automation-flow — visualização read-only dos fluxos beta.
 *
 * Devolve a definição declarativa dos fluxos do ciclo de vida + contagens
 * reais agregadas a partir de `leads.commercial_status` e `product_events`.
 * Sem providers, sem emails, sem alterações de estado.
 */

import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireAdminSession } from "@/lib/admin/session";
import {
  LIFECYCLE_STATUSES,
  type LifecycleStatus,
} from "@/lib/admin/lead-lifecycle";
import {
  EMAIL_TEMPLATES,
  type EmailTemplateKey,
} from "@/lib/admin/email-template-registry";
import {
  STAGE_DEFS,
  FLOW_DELAYS_MIN,
  FLOW_EVENTS,
  formatDelay,
  formatDuration,
  type AutomationFlow,
  type AutomationFlowResponse,
  type AutomationKpis,
  type FlowKey,
  type FlowStatus,
} from "@/lib/admin/automation-flow-types";

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

/** Subject estático extraído do template registry (sem renderizar HTML). */
function subjectFor(key: EmailTemplateKey | null): string | null {
  if (!key) return null;
  const entry = EMAIL_TEMPLATES.find((t) => t.key === key);
  if (!entry) return null;
  // Cada renderer expõe `.subject` como propriedade estática (fallback subject
  // genérico, sem variáveis interpoladas — ideal para UI do admin).
  const fn = entry.render as unknown as { subject?: string };
  return fn.subject ?? entry.shortDescription;
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

        // -------- Falhas (30d) -------------------------------------------------
        // Best-effort: hoje a única fonte fiável é
        // `report_requests.delivery_status='failed'`. Mantemos a janela
        // alinhada com o KPI ("últimos 30d") — antes era 7d e o tile mentia.
        let linkFailures30d = 0;
        try {
          const since = new Date(
            Date.now() - 30 * 24 * 60 * 60 * 1000,
          ).toISOString();
          const { count } = await supabaseAdmin
            .from("report_requests")
            .select("id", { count: "exact", head: true })
            .eq("delivery_status", "failed")
            .gte("updated_at", since);
          linkFailures30d = count ?? 0;
        } catch {
          linkFailures30d = 0;
        }

        // -------- Tempo médio até `report_generated` --------------------------
        // avg(pdf_generated_at - created_at) sobre últimos 30d. Se houver
        // menos de 3 amostras, devolvemos null (UI mostra "sem dados").
        let avgGenerationMs: number | null = null;
        try {
          const since30 = new Date(
            Date.now() - 30 * 24 * 60 * 60 * 1000,
          ).toISOString();
          const { data: timings } = await supabaseAdmin
            .from("report_requests")
            .select("created_at, pdf_generated_at")
            .gte("created_at", since30)
            .not("pdf_generated_at", "is", null)
            .limit(500);
          const deltas = (timings ?? [])
            .map((r) => {
              const a = r.created_at ? Date.parse(r.created_at) : NaN;
              const b = r.pdf_generated_at
                ? Date.parse(r.pdf_generated_at)
                : NaN;
              return Number.isFinite(a) && Number.isFinite(b) && b >= a
                ? b - a
                : null;
            })
            .filter((d): d is number => d !== null);
          if (deltas.length >= 3) {
            avgGenerationMs =
              deltas.reduce((s, n) => s + n, 0) / deltas.length;
          }
        } catch (e) {
          console.error("[automation-flow] avg generation query failed", e);
        }

        // -------- product_events (24h / 30d / 24-48h) -------------------------
        const allEventTypes = Array.from(
          new Set(Object.values(FLOW_EVENTS).flatMap((e) => e.types)),
        );
        const since24h = new Date(
          Date.now() - 24 * 60 * 60 * 1000,
        ).toISOString();
        const since30d = new Date(
          Date.now() - 30 * 24 * 60 * 60 * 1000,
        ).toISOString();
        const since48h = new Date(
          Date.now() - 48 * 60 * 60 * 1000,
        ).toISOString();
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

        // -------- Helpers de agregação por flow -------------------------------
        const eventStats = (key: FlowKey) => {
          const def = FLOW_EVENTS[key];
          const types = def.types;
          const last24hCount = types.reduce(
            (acc, t) => acc + (last24hByType[t] ?? 0),
            0,
          );
          let lastEventAt: string | null = null;
          for (const t of types) {
            const v = lastAtByType[t];
            if (v && (!lastEventAt || v > lastEventAt)) lastEventAt = v;
          }
          return {
            eventTypes: types,
            instrumented: def.instrumented,
            last24hCount,
            lastEventAt,
          };
        };

        const sentTotalFor = (key: FlowKey) =>
          FLOW_EVENTS[key].types.reduce(
            (acc, t) => acc + (total30dByType[t] ?? 0),
            0,
          );

        // -------- Declaração estática dos flows -------------------------------
        type FlowDecl = Omit<
          AutomationFlow,
          | "subject"
          | "eligibleCount"
          | "inFlightCount"
          | "completedLeads"
          | "sentEvents"
          | "eventTypes"
          | "instrumented"
          | "last24hCount"
          | "lastEventAt"
          | "failuresTotal"
          | "status"
        > & {
          /** Devolve as 5 contagens para este flow. */
          counts: () => {
            eligibleCount: number;
            inFlightCount: number;
            completedLeads: number | null;
          };
          /** Falhas atribuíveis a este flow nos últimos 30d. */
          failures: number;
          /** True se trigger implementado e instrumentado. */
          wired: boolean;
        };

        const decls: Array<FlowDecl & { key: FlowKey }> = [
          {
            key: "welcome_beta",
            title: "Boas-vindas à beta",
            description: "Bem-vindo à beta — o que esperar daqui.",
            trigger: { kind: "event", label: "subscribe" },
            action: { kind: "email", label: "Email \"boas-vindas à beta\"" },
            kind: "automatic",
            fromStatus: null,
            toStatus: null,
            visualKind: "email",
            extraTag: null,
            timing: {
              kind: "immediate",
              eventName: "subscribe",
              contextHint: "lead entra na lista beta",
            },
            templateKey: "welcome_beta",
            counts: () => ({
              eligibleCount: 0,
              inFlightCount: 0,
              completedLeads: null,
            }),
            failures: 0,
            stage: "99_legado",
            lifecycleBadges: ["legado"],
            wired: false,
          },
          {
            key: "pedido_recebido",
            title: "Pedido recebido",
            description: "Recebemos o teu pedido para @{{handle}}.",
            trigger: { kind: "form", label: "Submissão de pedido beta" },
            action: { kind: "manual", label: "Admin aprova e gera relatório" },
            kind: "automatic",
            fromStatus: null,
            toStatus: "novo_pedido",
            stage: "01_captacao",
            visualKind: "email",
            extraTag: null,
            timing: {
              kind: "immediate",
              eventName: "request_submitted",
              contextHint: "utilizador submete o formulário",
            },
            templateKey: "request_received",
            counts: () => ({
              eligibleCount: countEq("novo_pedido"),
              inFlightCount: 0,
              completedLeads: countAtLeast("em_analise"),
            }),
            failures: 0,
            wired: FLOW_EVENTS.pedido_recebido.instrumented,
            lifecycleBadges: ["activo", "transaccional"],
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
            stage: "01_captacao",
            visualKind: "system",
            extraTag: "no_email",
            timing: {
              kind: "average",
              averageMs: avgGenerationMs,
              averageLabel: formatDuration(avgGenerationMs),
              eventName: "beta_request_created",
            },
            templateKey: null,
            counts: () => ({
              eligibleCount: countEq("em_analise"),
              inFlightCount: 0,
              completedLeads: countAtLeast("relatorio_gerado"),
            }),
            failures: 0,
            wired: false, // bloco manual/sistema → status sempre "blocked"
            lifecycleBadges: ["bloqueado"],
          },
          {
            key: "report_saved",
            title: "Relatório guardado",
            description: "Confirma o save e mostra saldo de créditos.",
            trigger: { kind: "event", label: "report unlock" },
            action: { kind: "email", label: "Email \"relatório guardado\"" },
            kind: "automatic",
            fromStatus: null,
            toStatus: null,
            stage: "02_entrega",
            visualKind: "email",
            extraTag: "primary_delivery",
            timing: {
              kind: "immediate",
              eventName: "report_unlocked",
              contextHint: "lead-magnet sequence",
            },
            templateKey: "report_saved",
            counts: () => ({
              eligibleCount: 0,
              inFlightCount: 0,
              completedLeads: null,
            }),
            failures: 0,
            wired: FLOW_EVENTS.report_saved.instrumented,
            lifecycleBadges: ["activo", "transaccional"],
          },
          {
            key: "link_enviado",
            title: "Relatório pronto",
            description: "O teu relatório de @{{handle}} está disponível.",
            trigger: { kind: "manual", label: "Admin envia link" },
            action: { kind: "email", label: "Email \"relatório pronto\"" },
            kind: "manual",
            fromStatus: "relatorio_gerado",
            toStatus: "link_enviado",
            stage: "02_entrega",
            visualKind: "email",
            extraTag: "primary_delivery",
            timing: {
              kind: "immediate",
              eventName: "report_generated",
              contextHint: "link público gerado",
            },
            templateKey: "report_ready",
            counts: () => ({
              eligibleCount: countEq("relatorio_gerado"),
              inFlightCount: 0,
              completedLeads: countAtLeast("link_enviado"),
            }),
            failures: linkFailures30d,
            wired: FLOW_EVENTS.link_enviado.instrumented,
            lifecycleBadges: ["activo", "manual", "transaccional"],
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
            stage: "99_legado",
            visualKind: "email",
            extraTag: null,
            timing: {
              kind: "delay",
              eventName: "report_ready_sent",
              delayMinutes: FLOW_DELAYS_MIN.personal_area_saved,
              delayLabel: formatDelay(FLOW_DELAYS_MIN.personal_area_saved),
              contextHint: "confirma o arquivo",
            },
            templateKey: "personal_area_saved",
            counts: () => ({
              eligibleCount: 0,
              inFlightCount: 0,
              completedLeads: null,
            }),
            failures: 0,
            wired: FLOW_EVENTS.personal_area_saved.instrumented,
            lifecycleBadges: ["sem_trigger", "planeado"],
          },
          {
            key: "relatorio_visto",
            title: "Relatório visto",
            description:
              "Lead abriu o relatório. Sugerir pedido de feedback ao admin.",
            trigger: { kind: "event", label: "report_viewed" },
            action: { kind: "manual", label: "Sugerir pedido de feedback" },
            kind: "automatic",
            fromStatus: "link_enviado",
            toStatus: "relatorio_visto",
            stage: "02_entrega",
            visualKind: "report",
            extraTag: null,
            timing: {
              kind: "immediate",
              eventName: "report_viewed",
              contextHint: "lead abre o link público",
            },
            templateKey: null,
            counts: () => ({
              eligibleCount: countEq("link_enviado"),
              inFlightCount: 0,
              completedLeads: countAtLeast("relatorio_visto"),
            }),
            failures: 0,
            wired: FLOW_EVENTS.relatorio_visto.instrumented,
            lifecycleBadges: ["bloqueado"],
          },
          {
            key: "feedback_pedido",
            title: "Pedido de feedback",
            description: "O relatório de @{{handle}} foi útil?",
            trigger: { kind: "manual", label: "Admin pede feedback" },
            action: { kind: "wait", label: "Aguardar resposta do lead" },
            kind: "manual",
            fromStatus: "relatorio_visto",
            toStatus: "feedback_pedido",
            stage: "03_retencao",
            visualKind: "email",
            extraTag: null,
            timing: {
              kind: "delay",
              eventName: "report_viewed",
              delayMinutes: FLOW_DELAYS_MIN.feedback_pedido,
              delayLabel: formatDelay(FLOW_DELAYS_MIN.feedback_pedido),
              contextHint: "utilizador abriu o relatório",
            },
            templateKey: "feedback_request",
            counts: () => ({
              eligibleCount: countEq("relatorio_visto"),
              inFlightCount: countEq("feedback_pedido"),
              completedLeads: countAtLeast("feedback_recebido"),
            }),
            failures: 0,
            wired: FLOW_EVENTS.feedback_pedido.instrumented,
            lifecycleBadges: ["activo", "manual"],
            note: "Sem auto-trigger nesta fase. Opcional futuro: automático D+1.",
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
            stage: "99_legado",
            visualKind: "email",
            extraTag: null,
            timing: {
              kind: "delay",
              eventName: "report_ready_sent",
              delayMinutes: FLOW_DELAYS_MIN.report_summary,
              delayLabel: formatDelay(FLOW_DELAYS_MIN.report_summary),
              contextHint: "quem não abriu o relatório",
            },
            templateKey: "report_summary",
            counts: () => ({
              eligibleCount: 0,
              inFlightCount: 0,
              completedLeads: null,
            }),
            failures: 0,
            wired: false,
            lifecycleBadges: ["legado"],
          },
          {
            key: "feedback_recebido",
            title: "Feedback recebido",
            description:
              "Lead respondeu ao questionário. Classificar intenção comercial.",
            trigger: { kind: "event", label: "feedback_submitted" },
            action: { kind: "classify", label: "Classificar intenção comercial" },
            kind: "automatic",
            fromStatus: "feedback_pedido",
            toStatus: "feedback_recebido",
            stage: "04_conversao",
            visualKind: "report",
            extraTag: null,
            timing: {
              kind: "immediate",
              eventName: "feedback_submitted",
              contextHint: "classificar intenção comercial",
            },
            templateKey: null,
            counts: () => ({
              eligibleCount: countEq("feedback_recebido"),
              inFlightCount: 0,
              completedLeads: countAtLeast("interessado"),
            }),
            failures: 0,
            wired: FLOW_EVENTS.feedback_recebido.instrumented,
            lifecycleBadges: ["bloqueado"],
          },
          {
            key: "follow_up_comercial",
            title: "Follow-up comercial",
            description: "Próximos passos para o relatório completo.",
            trigger: { kind: "manual", label: "Admin envia follow-up" },
            action: { kind: "email", label: "Email \"follow-up comercial\"" },
            kind: "manual",
            fromStatus: "feedback_recebido",
            toStatus: "interessado",
            stage: "04_conversao",
            visualKind: "email",
            extraTag: null,
            timing: {
              kind: "immediate",
              eventName: "commercial_followup_sent",
              contextHint: "envio manual via admin",
            },
            templateKey: "commercial_followup",
            counts: () => ({
              eligibleCount: countIn(["interessado", "potencial_cliente"]),
              inFlightCount: 0,
              completedLeads: countEq("convertido"),
            }),
            failures: 0,
            wired: FLOW_EVENTS.follow_up_comercial.instrumented,
            lifecycleBadges: ["activo", "manual"],
            note: "Auto-trigger não activo nesta fase.",
          },
          {
            key: "payment_confirmed",
            title: "Pagamento confirmado",
            description: "Recibo + confirmação de acesso pago.",
            trigger: { kind: "event", label: "EuPago webhook · paid" },
            action: { kind: "email", label: "Email \"pagamento confirmado\"" },
            kind: "automatic",
            fromStatus: null,
            toStatus: null,
            stage: "05_pagamento",
            visualKind: "email",
            extraTag: null,
            timing: {
              kind: "immediate",
              eventName: "payment_succeeded",
              contextHint: "branch paid, fire-and-forget",
            },
            templateKey: "payment_confirmed",
            counts: () => ({
              eligibleCount: 0,
              inFlightCount: 0,
              completedLeads: null,
            }),
            failures: 0,
            wired: FLOW_EVENTS.payment_confirmed.instrumented,
            lifecycleBadges: ["activo", "transaccional", "kill_switch_off"],
            note: "Activar apenas em validação controlada antes de produção.",
          },
        ];

        const flows: AutomationFlow[] = decls.map((d) => {
          const counts = d.counts();
          const stats = eventStats(d.key);
          const sent = sentTotalFor(d.key);
          const status: FlowStatus =
            d.timing.kind === "undefined"
              ? "undefined"
              : d.visualKind !== "email"
                ? "blocked"
                : d.wired
                  ? "active"
                  : "preparing";
          return {
            key: d.key,
            title: d.title,
            description: d.description,
            trigger: d.trigger,
            action: d.action,
            kind: d.kind,
            fromStatus: d.fromStatus,
            toStatus: d.toStatus,
            stage: d.stage,
            visualKind: d.visualKind,
            extraTag: d.extraTag,
            timing: d.timing,
            templateKey: d.templateKey,
            subject: subjectFor(d.templateKey),
            eligibleCount: counts.eligibleCount,
            inFlightCount: counts.inFlightCount,
            completedLeads: counts.completedLeads,
            sentEvents: sent,
            eventTypes: stats.eventTypes,
            instrumented: stats.instrumented,
            last24hCount: stats.last24hCount,
            lastEventAt: stats.lastEventAt,
            failuresTotal: d.failures,
            status,
            lifecycleBadges: d.lifecycleBadges,
            note: d.note ?? null,
          };
        });

        // -------- KPIs --------------------------------------------------------
        const sentLast30d = flows.reduce((a, f) => a + f.sentEvents, 0);
        const sentYest = Object.values(yest24hByType).reduce(
          (a, n) => a + n,
          0,
        );
        const sentToday = Object.values(last24hByType).reduce(
          (a, n) => a + n,
          0,
        );
        // Breakdown that explicitly excludes legacy and kill-switch-off
        // from the "operational" headline, so the KPI doesn't lie.
        const legacyCount = flows.filter((f) => f.stage === "99_legado").length;
        const killSwitchOffCount = flows.filter((f) =>
          (f.lifecycleBadges ?? []).includes("kill_switch_off"),
        ).length;
        const manualCount = flows.filter(
          (f) =>
            f.stage !== "99_legado" &&
            (f.lifecycleBadges ?? []).includes("manual"),
        ).length;
        const operationalActiveCount = flows.filter(
          (f) =>
            f.status === "active" &&
            f.stage !== "99_legado" &&
            !(f.lifecycleBadges ?? []).includes("kill_switch_off"),
        ).length;
        // Leads que aguardam acção do admin = união (não soma) das fases
        // activas do lifecycle. Somar `eligibleCount` por flow duplicava
        // contagens entre flows que partilham as mesmas fases.
        const WAITING_STATUSES = new Set<string>([
          "novo_pedido",
          "em_analise",
          "relatorio_gerado",
          "relatorio_visto",
          "feedback_recebido",
        ]);
        const eligibleTotal = active.filter((s) =>
          WAITING_STATUSES.has(s),
        ).length;
        const failures30dCount = flows.reduce(
          (a, f) => a + f.failuresTotal,
          0,
        );
        const deliverabilityPct =
          sentLast30d > 0
            ? Math.round(
                (sentLast30d / (sentLast30d + failures30dCount)) * 1000,
              ) / 10
            : null;
        const kpis: AutomationKpis = {
          systemActive: {
            activeCount: operationalActiveCount,
            manualCount,
            killSwitchOffCount,
            legacyCount,
            totalCount: flows.length,
          },
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
          stages: STAGE_DEFS,
          kpis,
        };
        return jsonResponse(body);
      },
    },
  },
});
