/**
 * LeadCard — individual card for the beta leads kanban.
 */

import { useState } from "react";
import { AdminCard } from "../admin-card";
import { AdminBadge } from "../admin-badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { MoreHorizontal, ExternalLink, Copy, Phone, Archive, MessageSquare } from "lucide-react";
import { toast } from "sonner";
import type { EnrichedLead } from "@/lib/admin/kanban-columns";
import { KANBAN_COLUMNS } from "@/lib/admin/kanban-columns";

interface LeadCardProps {
  lead: EnrichedLead;
  onUpdate: (id: string, updates: Record<string, unknown>) => void;
  onEditNotes: (lead: EnrichedLead) => void;
  onOpenDetail: (lead: EnrichedLead) => void;
}

const USER_TYPE_ACCENT: Record<string, "leads" | "revenue" | "expense" | "info" | "signal" | "neutral"> = {
  marca: "leads",
  agencia: "revenue",
  freelancer: "expense",
  criador: "info",
  estudante: "signal",
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
}

function reportStatusAccent(status: string | null): "info" | "revenue" | "signal" | "neutral" {
  if (!status) return "neutral";
  if (status === "completed" || status === "ready") return "revenue";
  if (status === "pending" || status === "pending_review") return "info";
  return "signal";
}

export function LeadCard({ lead, onUpdate, onEditNotes, onOpenDetail }: LeadCardProps) {
  const [statusChanging, setStatusChanging] = useState(false);

  const handleStatusChange = (newStatus: string) => {
    setStatusChanging(true);
    onUpdate(lead.id, { commercial_status: newStatus });
    setTimeout(() => setStatusChanging(false), 500);
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
  };

  return (
    <AdminCard
      className="!p-4 !rounded-xl cursor-pointer hover:shadow-[var(--shadow-admin-glass-active)] transition-shadow"
    >
      {/* Header: email + actions — clicking the card body opens detail */}
      <div
        className="flex items-start justify-between gap-2 mb-3"
        onClick={() => onOpenDetail(lead)}
      >
        <div className="min-w-0 cursor-pointer">
          <p className="admin-card-title m-0 truncate text-admin-text-primary" title={lead.name || lead.email}>
            {lead.name || lead.email}
          </p>
          <p className="admin-meta m-0 mt-0.5 truncate text-admin-text-secondary" title={lead.email}>
            {lead.email}
          </p>
          {lead.handle && (
            <p className="admin-meta m-0 mt-0.5 text-admin-text-tertiary">
              @{lead.handle}
            </p>
          )}
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="text-[13px]">
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
      <div className="flex flex-wrap gap-1.5 mb-3">
        {lead.user_type && (
          <AdminBadge
            variant={USER_TYPE_ACCENT[lead.user_type.toLowerCase()] ?? "neutral"}
          >
            {lead.user_type}
          </AdminBadge>
        )}
        {lead.report_status && (
          <AdminBadge variant={reportStatusAccent(lead.report_status)}>
            {lead.report_status}
          </AdminBadge>
        )}
      </div>

      {/* Purpose */}
      {lead.purpose && (
        <p className="admin-body m-0 mb-2 line-clamp-2 text-admin-text-secondary">
          {lead.purpose}
        </p>
      )}

      {/* Stats row */}
      <div className="flex items-center gap-2.5 admin-meta text-admin-text-tertiary mb-3">
        {lead.report_cost_usd != null && (
          <span className="admin-code tabular-nums">€{lead.report_cost_usd.toFixed(2)}</span>
        )}
        <span>{lead.report_views} views</span>
        <span title={lead.last_interaction}>{timeAgo(lead.last_interaction)}</span>
        {lead.contacted_at && <span title="Contactado">📞</span>}
      </div>

      {/* Notes preview */}
      {lead.internal_notes && (
        <p
          className="admin-meta m-0 italic truncate mb-3 text-admin-text-tertiary"
          title={lead.internal_notes}
        >
          {lead.internal_notes}
        </p>
      )}

      {/* Status selector */}
      <Select
        value={lead.commercial_status}
        onValueChange={handleStatusChange}
        disabled={statusChanging}
      >
        <SelectTrigger className="h-8 text-[13px] rounded-lg">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {KANBAN_COLUMNS.map((col) => (
            <SelectItem key={col.key} value={col.key} className="text-[13px]">
              {col.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </AdminCard>
  );
}