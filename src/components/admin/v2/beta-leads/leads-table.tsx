/**
 * LeadsTable — vista tabular dos mesmos leads do KanbanBoard.
 *
 * Reutiliza `EnrichedLead` (não faz fetch). Cada linha abre o `LeadDetailSheet`
 * via `onOpenDetail`, partilhando o mesmo sheet com a vista Pipeline.
 */

import { useMemo } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Inbox } from "lucide-react";
import {
  KANBAN_COLUMNS,
  type EnrichedLead,
} from "@/lib/admin/kanban-columns";
import { interpretFeedback } from "@/lib/admin/feedback-intent";

interface LeadsTableProps {
  leads: EnrichedLead[];
  onOpenDetail: (lead: EnrichedLead) => void;
}

const STATUS_LABELS: Record<string, { label: string; color: string }> =
  Object.fromEntries(
    KANBAN_COLUMNS.map((c) => [c.key, { label: c.label, color: c.color }]),
  );

function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("pt-PT", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
  });
}

function StatusPill({ status }: { status: string }) {
  const meta = STATUS_LABELS[status];
  if (!meta) {
    return (
      <span className="text-[12px] text-admin-text-tertiary">{status}</span>
    );
  }
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium whitespace-nowrap"
      style={{
        backgroundColor: `${meta.color}1a`,
        color: meta.color,
      }}
    >
      <span
        className="h-1.5 w-1.5 rounded-full"
        style={{ backgroundColor: meta.color }}
      />
      {meta.label}
    </span>
  );
}

function FeedbackCell({ lead }: { lead: EnrichedLead }) {
  if (!lead.feedback) {
    return <span className="text-[12px] text-admin-text-tertiary">—</span>;
  }
  const intent = interpretFeedback(lead.feedback);
  const color =
    intent.accent === "revenue"
      ? "rgb(var(--admin-revenue-500))"
      : intent.accent === "expense"
        ? "rgb(var(--admin-expense-500))"
        : "rgb(var(--admin-neutral-600))";
  return (
    <span
      className="inline-flex items-center gap-1.5 text-[12px] font-medium tabular-nums"
      style={{ color }}
    >
      {lead.feedback.usefulness_score}/5
      <span className="text-[11px] font-normal text-admin-text-tertiary">
        · {intent.label}
      </span>
    </span>
  );
}

export function LeadsTable({ leads, onOpenDetail }: LeadsTableProps) {
  const sorted = useMemo(
    () =>
      [...leads].sort(
        (a, b) =>
          new Date(b.last_interaction).getTime() -
          new Date(a.last_interaction).getTime(),
      ),
    [leads],
  );

  if (sorted.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-admin-text-tertiary border border-[var(--color-admin-border)] rounded-xl bg-white">
        <Inbox size={24} className="mb-2 opacity-60" />
        <span className="text-[13px]">Sem contactos para mostrar.</span>
      </div>
    );
  }

  return (
    <div className="border border-[var(--color-admin-border)] rounded-xl bg-white overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="text-[11px] uppercase tracking-wider text-admin-text-tertiary">
              Nome
            </TableHead>
            <TableHead className="text-[11px] uppercase tracking-wider text-admin-text-tertiary">
              Email
            </TableHead>
            <TableHead className="text-[11px] uppercase tracking-wider text-admin-text-tertiary">
              Instagram
            </TableHead>
            <TableHead className="text-[11px] uppercase tracking-wider text-admin-text-tertiary">
              Estado
            </TableHead>
            <TableHead className="text-[11px] uppercase tracking-wider text-admin-text-tertiary">
              Último relatório
            </TableHead>
            <TableHead className="text-[11px] uppercase tracking-wider text-admin-text-tertiary">
              Último email
            </TableHead>
            <TableHead className="text-[11px] uppercase tracking-wider text-admin-text-tertiary">
              Feedback
            </TableHead>
            <TableHead className="text-[11px] uppercase tracking-wider text-admin-text-tertiary">
              Criado em
            </TableHead>
            <TableHead className="text-right text-[11px] uppercase tracking-wider text-admin-text-tertiary">
              Ações
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sorted.map((lead) => (
            <TableRow
              key={lead.id}
              className="cursor-pointer hover:bg-[var(--admin-board-column-bg)]"
              onClick={() => onOpenDetail(lead)}
            >
              <TableCell className="font-medium text-admin-text-primary text-[13px]">
                {lead.name || "—"}
              </TableCell>
              <TableCell className="text-[12px] text-admin-text-secondary">
                {lead.email}
              </TableCell>
              <TableCell className="text-[12px] text-admin-text-secondary">
                {lead.handle ? `@${lead.handle}` : "—"}
              </TableCell>
              <TableCell>
                <StatusPill status={lead.commercial_status} />
              </TableCell>
              <TableCell className="text-[12px] text-admin-text-secondary tabular-nums">
                {lead.report_request_id ? formatDate(lead.last_interaction) : "—"}
              </TableCell>
              <TableCell className="text-[12px] text-admin-text-secondary tabular-nums">
                {formatDate(lead.contacted_at)}
              </TableCell>
              <TableCell>
                <FeedbackCell lead={lead} />
              </TableCell>
              <TableCell className="text-[12px] text-admin-text-secondary tabular-nums">
                {formatDate(lead.created_at)}
              </TableCell>
              <TableCell className="text-right">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenDetail(lead);
                  }}
                >
                  Abrir
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
