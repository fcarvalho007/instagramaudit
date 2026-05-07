/**
 * Actions dropdown for a single beta request row.
 */

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import {
  MoreHorizontal,
  CheckCircle,
  XCircle,
  Phone,
  Archive,
  ExternalLink,
  Copy,
  AtSign,
  Zap,
} from "lucide-react";
import { toast } from "sonner";

export interface BetaRequestRow {
  id: string;
  instagram_username: string;
  request_status: string;
  request_source: string;
  lead: {
    id: string;
    name: string | null;
    email: string | null;
    user_type: string | null;
    purpose: string | null;
    profile_ownership: string | null;
    source: string | null;
    company: string | null;
  } | null;
  pdf_status: string;
  analysis_snapshot_id: string | null;
  created_at: string;
  updated_at: string;
}

interface Props {
  row: BetaRequestRow;
  onStatusChange: (id: string, status: string, markContacted?: boolean) => void;
  onGenerateReport?: (row: BetaRequestRow) => void;
}

export function BetaRequestActions({ row, onStatusChange, onGenerateReport }: Props) {
  const copyEmail = () => {
    if (row.lead?.email) {
      navigator.clipboard.writeText(row.lead.email);
      toast.success("Email copiado");
    }
  };

  const copyHandle = () => {
    navigator.clipboard.writeText(row.instagram_username);
    toast.success("Handle copiado");
  };

  const openInstagram = () => {
    window.open(`https://www.instagram.com/${row.instagram_username}/`, "_blank");
  };

  const canGenerate =
    row.request_status === "approved" || row.request_status === "pending_review";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-7 w-7">
          <MoreHorizontal className="h-3.5 w-3.5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="text-xs min-w-[180px]">
        {canGenerate && onGenerateReport && (
          <>
            <DropdownMenuItem onClick={() => onGenerateReport(row)}>
              <Zap className="h-3 w-3 mr-1.5 text-amber-500" />
              Gerar relatório
            </DropdownMenuItem>
            <DropdownMenuSeparator />
          </>
        )}
        {row.request_status === "pending_review" && (
          <>
            <DropdownMenuItem onClick={() => onStatusChange(row.id, "approved")}>
              <CheckCircle className="h-3 w-3 mr-1.5 text-green-600" />
              Aprovar
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onStatusChange(row.id, "rejected")}>
              <XCircle className="h-3 w-3 mr-1.5 text-red-600" />
              Rejeitar
            </DropdownMenuItem>
          </>
        )}
        <DropdownMenuItem onClick={() => onStatusChange(row.id, row.request_status, true)}>
          <Phone className="h-3 w-3 mr-1.5" />
          Marcar contactado
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={openInstagram}>
          <ExternalLink className="h-3 w-3 mr-1.5" />
          Abrir Instagram
        </DropdownMenuItem>
        {row.lead?.email && (
          <DropdownMenuItem onClick={copyEmail}>
            <Copy className="h-3 w-3 mr-1.5" />
            Copiar email
          </DropdownMenuItem>
        )}
        <DropdownMenuItem onClick={copyHandle}>
          <AtSign className="h-3 w-3 mr-1.5" />
          Copiar handle
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => onStatusChange(row.id, "archived")}
          className="text-red-600"
        >
          <Archive className="h-3 w-3 mr-1.5" />
          Arquivar
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}