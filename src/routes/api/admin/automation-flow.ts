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

export interface AutomationFlow {
  key:
    | "pedido_recebido"
    | "relatorio_pronto"
    | "relatorio_visto"
    | "feedback_pedido"
    | "feedback_recebido"
    | "follow_up_comercial";
  title: string;
  description: string;
  trigger: { kind: "form" | "event" | "manual"; label: string };
  action: { kind: "email" | "manual" | "wait" | "classify"; label: string };
  fromStatus: LifecycleStatus | null;
  toStatus: LifecycleStatus | null;
  eligibleCount: number;
  inFlightCount: number;
  completedCount: number;
}

export interface AutomationFlowResponse {
  success: boolean;
  generatedAt: string;
  totalActive: number;
  totalArchived: number;
  flows: AutomationFlow[];
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
            fromStatus: null,
            toStatus: "novo_pedido",
            eligibleCount: countEq("novo_pedido"),
            inFlightCount: 0,
            completedCount: countAtLeast("em_analise"),
          },
          {
            key: "relatorio_pronto",
            title: "Relatório pronto",
            description:
              "Snapshot gerado com sucesso. Falta enviar o link ao lead.",
            trigger: { kind: "event", label: "report_generated" },
            action: { kind: "email", label: "Enviar link do relatório" },
            fromStatus: "em_analise",
            toStatus: "link_enviado",
            eligibleCount: countEq("relatorio_gerado"),
            inFlightCount: countEq("em_analise"),
            completedCount: countAtLeast("link_enviado"),
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
            fromStatus: "link_enviado",
            toStatus: "relatorio_visto",
            eligibleCount: countEq("link_enviado"),
            inFlightCount: 0,
            completedCount: countAtLeast("relatorio_visto"),
          },
          {
            key: "feedback_pedido",
            title: "Feedback pedido",
            description:
              "Admin enviou pedido de feedback. Aguarda resposta do lead.",
            trigger: { kind: "manual", label: "Admin pede feedback" },
            action: { kind: "wait", label: "Aguardar resposta do lead" },
            fromStatus: "relatorio_visto",
            toStatus: "feedback_pedido",
            eligibleCount: countEq("relatorio_visto"),
            inFlightCount: countEq("feedback_pedido"),
            completedCount: countAtLeast("feedback_recebido"),
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
            fromStatus: "feedback_pedido",
            toStatus: "feedback_recebido",
            eligibleCount: countEq("feedback_recebido"),
            inFlightCount: 0,
            completedCount: countAtLeast("interessado"),
          },
          {
            key: "follow_up_comercial",
            title: "Follow-up comercial",
            description:
              "Lead com interesse alto ou médio. Próximo passo: chamada, demo ou proposta.",
            trigger: { kind: "manual", label: "Intenção alta/média" },
            action: { kind: "manual", label: "Follow-up comercial futuro" },
            fromStatus: "feedback_recebido",
            toStatus: "interessado",
            eligibleCount: countIn(["interessado", "potencial_cliente"]),
            inFlightCount: 0,
            completedCount: countEq("convertido"),
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