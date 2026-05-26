/**
 * PriorityFollowups — leads que precisam de ação humana agora.
 *
 * Lê `/api/admin/follow-ups` (read-only). Mostra até 30 itens ordenados
 * por idade do gatilho. Cada linha tem nome, email, handle, idade e
 * sugestão. Botão "Abrir lead" leva ao Kanban com o lead pré-selecionado.
 */

import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { AdminCard } from "../admin-card";
import { AdminSectionHeader } from "../admin-section-header";
import { AdminBadge } from "../admin-badge";
import { adminFetch } from "@/lib/admin/fetch";

type Rule =
  | "link_nao_visto"
  | "feedback_nao_pedido"
  | "feedback_nao_respondido"
  | "intencao_sem_followup"
  | "email_falhou";

interface FollowUpItem {
  leadId: string;
  name: string;
  email: string;
  handle: string | null;
  commercialStatus: string;
  rule: Rule;
  reason: string;
  suggestion: string;
  triggerAt: string;
  ageHours: number;
}

interface FollowUpsResponse {
  success: boolean;
  generatedAt: string;
  total: number;
  items: FollowUpItem[];
  error?: string;
}

const RULE_LABEL: Record<Rule, string> = {
  link_nao_visto: "Link não visto",
  feedback_nao_pedido: "Feedback por pedir",
  feedback_nao_respondido: "Feedback sem resposta",
  intencao_sem_followup: "Intenção sem follow-up",
  email_falhou: "Email falhou",
};

const RULE_ACCENT: Record<Rule, "signal" | "info" | "danger" | "neutral"> = {
  link_nao_visto: "signal",
  feedback_nao_pedido: "info",
  feedback_nao_respondido: "signal",
  intencao_sem_followup: "info",
  email_falhou: "danger",
};

function formatAge(hours: number): string {
  if (hours < 1) return "<1h";
  if (hours < 24) return `${Math.floor(hours)}h`;
  return `${Math.floor(hours / 24)}d`;
}

async function fetchFollowUps(): Promise<FollowUpsResponse> {
  const res = await adminFetch("/api/admin/follow-ups");
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return (await res.json()) as FollowUpsResponse;
}

export function PriorityFollowups() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["admin", "follow-ups"],
    queryFn: fetchFollowUps,
    staleTime: 30_000,
  });

  return (
    <section className="flex flex-col gap-4">
      <AdminSectionHeader
        title="Follow-ups prioritários"
        subtitle="leads que precisam de ação"
        accent="signal"
        info="Leads com gatilhos de inatividade ou intenção comercial sem follow-up. Apenas sinaliza — nenhuma ação automática."
      />
      <AdminCard>
        {isLoading ? (
          <FollowUpsSkeleton />
        ) : error || !data?.success ? (
          <p className="text-[13px] text-admin-text-tertiary">
            Não foi possível carregar a lista de follow-ups.
          </p>
        ) : data.items.length === 0 ? (
          <p className="text-[13px] text-admin-text-tertiary">
            Sem follow-ups pendentes — todas as leads ativas estão em dia.
          </p>
        ) : (
          <FollowUpsList items={data.items} total={data.total} />
        )}
      </AdminCard>
    </section>
  );
}

function FollowUpsList({ items, total }: { items: FollowUpItem[]; total: number }) {
  return (
    <div className="flex flex-col">
      {total > items.length && (
        <p className="mb-2 text-[11px] text-admin-text-tertiary">
          A mostrar os {items.length} mais antigos de {total} pendentes.
        </p>
      )}
      <ul className="flex flex-col divide-y divide-admin-border">
        {items.map((it) => (
          <li
            key={`${it.leadId}-${it.rule}`}
            className="flex flex-col gap-2 py-2.5 sm:flex-row sm:items-center sm:gap-3"
          >
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="truncate text-[13px] font-medium text-admin-text-primary">
                  {it.name}
                </span>
                <AdminBadge variant={RULE_ACCENT[it.rule]}>
                  {RULE_LABEL[it.rule]}
                </AdminBadge>
                <span className="text-[11px] tabular-nums text-admin-text-tertiary">
                  · {formatAge(it.ageHours)}
                </span>
              </div>
              <p className="mt-0.5 truncate text-[12px] text-admin-text-secondary">
                {it.email}
                {it.handle && (
                  <>
                    {" · "}
                    <span className="text-admin-text-tertiary">@{it.handle}</span>
                  </>
                )}
              </p>
              <p className="mt-0.5 text-[11px] text-admin-text-tertiary line-clamp-2">
                {it.reason} {it.suggestion}
              </p>
            </div>
            <Link
              to="/admin/leads"
              search={{ lead: it.leadId } as never}
              className="shrink-0 self-start rounded-md border border-admin-border px-2.5 py-1 text-[12px] font-medium text-admin-text-secondary hover:bg-admin-surface-elevated hover:text-admin-text-primary transition-colors sm:self-center"
            >
              Abrir lead
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

function FollowUpsSkeleton() {
  return (
    <div className="flex flex-col gap-3">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3">
          <div className="h-9 flex-1 rounded bg-admin-surface-elevated" />
          <div className="h-7 w-16 shrink-0 rounded bg-admin-surface-elevated" />
        </div>
      ))}
    </div>
  );
}