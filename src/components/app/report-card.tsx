import { Link } from "@tanstack/react-router";
import { FileText, ExternalLink, Download, Clock, CheckCircle2, AlertTriangle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ReportCardData {
  id: string;
  instagram_username: string;
  created_at: string;
  request_status: string;
  pdf_status: string;
  delivery_status: string;
  email_sent_at: string | null;
  analysis_snapshot_id: string | null;
  competitor_count: number;
}

function deriveStatus(r: ReportCardData) {
  if (r.request_status === "completed" && r.pdf_status === "generated") {
    return { label: "Pronto", color: "bg-emerald-50 text-emerald-700", icon: CheckCircle2 } as const;
  }
  if (
    r.request_status === "failed" ||
    r.pdf_status === "failed" ||
    r.delivery_status === "failed"
  ) {
    return { label: "A rever", color: "bg-amber-50 text-amber-700", icon: AlertTriangle } as const;
  }
  if (
    r.request_status === "processing" ||
    r.pdf_status === "generating" ||
    r.pdf_status === "pending"
  ) {
    return { label: "A processar", color: "bg-blue-50 text-blue-600", icon: Loader2 } as const;
  }
  return { label: "Pendente", color: "bg-slate-50 text-slate-500", icon: Clock } as const;
}

function formatDate(iso: string) {
  try {
    return new Intl.DateTimeFormat("pt-PT", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export function ReportCard({ report }: { report: ReportCardData }) {
  const status = deriveStatus(report);
  const StatusIcon = status.icon;
  const pdfReady = report.pdf_status === "generated";
  const hasSnapshot = !!report.analysis_snapshot_id;

  return (
    <div className="rounded-xl border border-slate-200/70 bg-white p-4 shadow-sm sm:p-5 transition-shadow hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-slate-100">
            <FileText className="size-4 text-slate-500" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-slate-900">
              @{report.instagram_username}
            </p>
            <p className="mt-0.5 text-xs text-slate-400">
              {formatDate(report.created_at)}
              {report.competitor_count > 0 && (
                <span className="ml-2">
                  · {report.competitor_count} concorrente{report.competitor_count > 1 ? "s" : ""}
                </span>
              )}
            </p>
          </div>
        </div>

        <span
          className={cn(
            "inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium",
            status.color,
          )}
        >
          <StatusIcon className={cn("size-3", status.label === "A processar" && "animate-spin")} />
          {status.label}
        </span>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <Link
          to="/app/reports/$id"
          params={{ id: report.id }}
          className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-50"
        >
          Ver detalhes
        </Link>
        {hasSnapshot && (
          <Link
            to="/analyze/$username"
            params={{ username: report.instagram_username }}
            className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-50"
          >
            <ExternalLink className="size-3" />
            Abrir relatório
          </Link>
        )}

        <button
          disabled={!pdfReady}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium transition-colors",
            pdfReady
              ? "border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 cursor-pointer"
              : "border-slate-100 bg-slate-50 text-slate-300 cursor-not-allowed",
          )}
          title={pdfReady ? "Descarregar PDF" : "PDF ainda não disponível"}
        >
          <Download className="size-3" />
          Descarregar PDF
        </button>
      </div>

      {report.email_sent_at && (
        <p className="mt-3 text-[11px] text-slate-400">
          Email enviado a {formatDate(report.email_sent_at)}
        </p>
      )}
    </div>
  );
}
