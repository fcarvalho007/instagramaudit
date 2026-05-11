/**
 * LeadCard — individual card for the beta leads kanban.
 */

import { AdminBadge } from "../admin-badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  DropdownMenuPortal,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { MoreHorizontal, ExternalLink, Copy, Phone, Archive, MessageSquare, Lightbulb, ArrowRightLeft, PhoneCall } from "lucide-react";
import { toast } from "sonner";
import type { EnrichedLead } from "@/lib/admin/kanban-columns";
import { KANBAN_COLUMNS } from "@/lib/admin/kanban-columns";
import { suggestNextLeadAction } from "@/lib/admin/lead-lifecycle";
import { interpretFeedback } from "@/lib/admin/feedback-intent";
import { USER_TYPE_LABELS, type UserType } from "@/lib/unlock-flow";
import { LEAD_MAGNET_DISPLAY } from "@/lib/admin/lead-magnet-display";

interface LeadCardProps {
  lead: EnrichedLead;
  onUpdate: (id: string, updates: Record<string, unknown>) => void;
  onEditNotes: (lead: EnrichedLead) => void;
  onOpenDetail: (lead: EnrichedLead) => void;
}

const USER_TYPE_ACCENT: Record<string, "leads" | "revenue" | "expense" | "info" | "signal" | "neutral"> = {
  brand: "leads",
  agency: "revenue",
  consultant: "expense",
  creator: "info",
  student: "signal",
  ecommerce: "revenue",
  other: "neutral",
};

const REPORT_STATUS_LABELS: Record<string, { label: string; accent: "info" | "revenue" | "signal" | "neutral" }> = {
  pending: { label: "Em fila", accent: "info" },
  processing: { label: "A processar", accent: "info" },
  ready: { label: "Pronto", accent: "revenue" },
  completed: { label: "Pronto", accent: "revenue" },
  failed: { label: "Falhou", accent: "signal" },
};

function displayName(lead: EnrichedLead): string {
  const n = lead.name?.trim();
  return n && n.length > 0 ? n : "Sem nome";
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
}

export function LeadCard({ lead, onUpdate, onEditNotes, onOpenDetail }: LeadCardProps) {
  const nextAction = suggestNextLeadAction(lead);
  const feedbackIntent = lead.feedback ? interpretFeedback(lead.feedback) : null;
  const reportStatus = lead.report_status
    ? REPORT_STATUS_LABELS[lead.report_status] ?? null
    : null;
  const userTypeKey = lead.user_type?.toLowerCase() ?? null;
  const userTypeLabel = userTypeKey
    ? USER_TYPE_LABELS[userTypeKey as UserType] ?? lead.user_type
    : null;
  const lmDisplay = lead.lead_magnet
    ? LEAD_MAGNET_DISPLAY[lead.lead_magnet.status]
    : null;

  const handleStatusChange = (newStatus: string) => {
    onUpdate(lead.id, { commercial_status: newStatus });
  };

  const handleCopyLink = () => {
    const url = `${window.location.origin}/analyze/${lead.handle}`;
    navigator.clipboard.writeText(url);
    toast.success("Link copiado");
  };

  const handleMarkContacted = () => {
    onUpdate(lead.id, { mark_contacted: true });
    toast.success("Marcado como contactado");
  };

  const handleArchive = () => {
    onUpdate(lead.id, { commercial_status: "arquivado" });
    toast.success("Lead arquivado");
  };

  return (
    <div
      onClick={() => onOpenDetail(lead)}
      className="group bg-white rounded-[10px] border border-[var(--color-admin-border)] p-3 cursor-pointer transition-all hover:-translate-y-px"
      style={{
        boxShadow: "var(--admin-board-card-shadow)",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.boxShadow = "var(--admin-board-card-shadow-hover)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = "var(--admin-board-card-shadow)";
      }}
    >
      {/* Header: name + actions */}
      <div
        className="flex items-start justify-between gap-2 mb-2"
      >
        <div className="min-w-0">
          <p className="m-0 truncate text-[13px] font-medium text-admin-text-primary" title={displayName(lead)}>
            {displayName(lead)}
          </p>
          <p className="m-0 mt-0.5 truncate text-[12px] text-admin-text-secondary" title={lead.email}>
            {lead.email}
          </p>
          {lead.handle && (
            <p className="m-0 mt-0.5 text-[12px] text-admin-text-tertiary truncate">
              @{lead.handle}
            </p>
          )}
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 shrink-0"
              onClick={(e) => e.stopPropagation()}
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className="text-[13px]"
            onClick={(e) => e.stopPropagation()}
          >
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>
                <ArrowRightLeft className="h-3.5 w-3.5 mr-2" />
                Mover para…
              </DropdownMenuSubTrigger>
              <DropdownMenuPortal>
                <DropdownMenuSubContent className="text-[13px] max-h-[320px] overflow-y-auto">
                  <DropdownMenuLabel className="text-[11px] uppercase tracking-wider text-admin-text-tertiary">
                    Estado comercial
                  </DropdownMenuLabel>
                  {KANBAN_COLUMNS.map((col) => (
                    <DropdownMenuItem
                      key={col.key}
                      onClick={() => handleStatusChange(col.key)}
                      disabled={col.key === lead.commercial_status}
                    >
                      <span
                        className="inline-block w-2 h-2 rounded-full mr-2 shrink-0"
                        style={{ backgroundColor: col.color }}
                      />
                      {col.label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuSubContent>
              </DropdownMenuPortal>
            </DropdownMenuSub>
            <DropdownMenuSeparator />
            {lead.handle && (
              <DropdownMenuItem
                onClick={() =>
                  window.open(`/analyze/${lead.handle}`, "_blank")
                }
              >
                <ExternalLink className="h-3.5 w-3.5 mr-2" />
                Abrir relatório
              </DropdownMenuItem>
            )}
            {lead.handle && (
              <DropdownMenuItem onClick={handleCopyLink}>
                <Copy className="h-3.5 w-3.5 mr-2" />
                Copiar link
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onClick={handleMarkContacted}>
              <Phone className="h-3.5 w-3.5 mr-2" />
              Marcar contactado
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onEditNotes(lead)}>
              <MessageSquare className="h-3.5 w-3.5 mr-2" />
              Editar notas
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={handleArchive}
              className="text-red-600"
            >
              <Archive className="h-3.5 w-3.5 mr-2" />
              Arquivar
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Badges row */}
      <div className="flex flex-wrap gap-1.5 mb-2">
        {userTypeLabel && (
          <AdminBadge variant={USER_TYPE_ACCENT[userTypeKey ?? ""] ?? "neutral"}>
            {userTypeLabel}
          </AdminBadge>
        )}
        {reportStatus && (
          <AdminBadge variant={reportStatus.accent}>{reportStatus.label}</AdminBadge>
        )}
        {lead.feedback && (
          <span title={`Score ${lead.feedback.usefulness_score}/5`}>
            <AdminBadge variant="info">
              ★ {lead.feedback.usefulness_score}/5
            </AdminBadge>
          </span>
        )}
        {feedbackIntent && feedbackIntent.intent !== "sem" && (
          <span title={feedbackIntent.nextAction}>
            <AdminBadge variant={feedbackIntent.accent}>
              {feedbackIntent.label}
            </AdminBadge>
          </span>
        )}
        {lmDisplay && lead.lead_magnet && lead.lead_magnet.status !== "none" && (
          <span
            title={`${lmDisplay.hint}${
              lead.lead_magnet.last_event_at
                ? ` · última: ${new Date(lead.lead_magnet.last_event_at).toLocaleDateString("pt-PT")}`
                : ""
            }`}
          >
            <AdminBadge variant={lmDisplay.variant}>{lmDisplay.label}</AdminBadge>
          </span>
        )}
      </div>

      {/* Purpose */}
      {lead.purpose && (
        <p className="m-0 mb-2 text-[12px] line-clamp-2 text-admin-text-secondary">
          {lead.purpose}
        </p>
      )}

      {/* Stats row */}
      <div className="flex items-center gap-2.5 text-[12px] text-admin-text-tertiary">
        {lead.report_cost_usd != null && (
          <span className="tabular-nums" title="Custo provider (USD)">
            ${lead.report_cost_usd.toFixed(2)}
          </span>
        )}
        <span>{lead.report_views} views</span>
        <span title={lead.last_interaction}>{timeAgo(lead.last_interaction)}</span>
        {lead.contacted_at && (
          <PhoneCall
            size={12}
            className="text-admin-text-tertiary"
            aria-label={`Contactado em ${new Date(lead.contacted_at).toLocaleDateString("pt-PT")}`}
          />
        )}
      </div>

      {/* Next action hint */}
      {nextAction.severity !== "info" && (
        <div
          className="mt-2 pt-2 border-t border-[var(--color-admin-border)] flex items-start gap-1.5 text-[12px] text-admin-text-secondary"
          title="Próxima ação sugerida"
        >
          <Lightbulb size={12} className="shrink-0 mt-0.5 text-admin-text-tertiary" />
          <span className="line-clamp-2">{nextAction.label}</span>
        </div>
      )}
    </div>
  );
}