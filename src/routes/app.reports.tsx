import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { getUserReports, type UserReport } from "@/server/reports.functions";
import {
  FileText,
  CheckCircle2,
  Loader2,
  AlertTriangle,
  Clock,
  ExternalLink,
  Download,
  Search,
  Mail,
  MailCheck,
  MailX,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ProTrackingTeaser } from "@/components/app/pro-tracking-teaser";

export const Route = createFileRoute("/app/reports")({
  component: ReportsPage,
  head: () => ({
    meta: [
      { title: "Relatórios — InstaBench" },
      { name: "robots", content: "noindex" },
    ],
  }),
});

/* ── Status helpers ── */

interface StatusBadge {
  label: string;
  className: string;
  icon: typeof CheckCircle2;
  spin?: boolean;
}

function deriveRequestStatus(r: UserReport): StatusBadge {
  if (r.requestStatus === "completed" && r.pdfStatus === "generated") {
    return { label: "Pronto", className: "bg-emerald-50 text-emerald-700 border-emerald-200/60", icon: CheckCircle2 };
  }
  if (
    r.requestStatus === "failed" ||
    r.pdfStatus === "failed" ||
    r.deliveryStatus === "failed"
  ) {
    return { label: "A rever", className: "bg-amber-50 text-amber-700 border-amber-200/60", icon: AlertTriangle };
  }
  if (
    r.requestStatus === "processing" ||
    r.pdfStatus === "generating" ||
    r.pdfStatus === "pending"
  ) {
    return { label: "A processar", className: "bg-blue-50 text-blue-600 border-blue-200/60", icon: Loader2, spin: true };
  }
  return { label: "Pendente", className: "bg-slate-50 text-slate-500 border-slate-200/60", icon: Clock };
}

function derivePdfBadge(status: string): { label: string; className: string } {
  switch (status) {
    case "generated":
      return { label: "PDF pronto", className: "bg-emerald-50 text-emerald-600 border-emerald-200/60" };
    case "generating":
      return { label: "A gerar PDF", className: "bg-blue-50 text-blue-500 border-blue-200/60" };
    case "failed":
      return { label: "PDF falhou", className: "bg-red-50 text-red-500 border-red-200/60" };
    default:
      return { label: "Sem PDF", className: "bg-slate-50 text-slate-400 border-slate-200/60" };
  }
}

function deriveDeliveryBadge(status: string, emailSentAt: string | null): { label: string; className: string; icon: typeof Mail } {
  if (status === "sent" && emailSentAt) {
    return { label: "Enviado", className: "bg-emerald-50 text-emerald-600 border-emerald-200/60", icon: MailCheck };
  }
  if (status === "failed") {
    return { label: "Envio falhou", className: "bg-red-50 text-red-500 border-red-200/60", icon: MailX };
  }
  return { label: "Não enviado", className: "bg-slate-50 text-slate-400 border-slate-200/60", icon: Mail };
}

function formatDate(iso: string) {
  try {
    return new Intl.DateTimeFormat("pt-PT", {
      day: "numeric",
      month: "short",
      year: "numeric",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

/* ── Stats bar ── */

interface Stats {
  total: number;
  ready: number;
  processing: number;
  failed: number;
}

function computeStats(reports: UserReport[]): Stats {
  let ready = 0;
  let processing = 0;
  let failed = 0;
  for (const r of reports) {
    if (r.requestStatus === "completed" && r.pdfStatus === "generated") ready++;
    else if (r.requestStatus === "failed" || r.pdfStatus === "failed" || r.deliveryStatus === "failed") failed++;
    else if (r.requestStatus === "processing" || r.pdfStatus === "generating" || r.pdfStatus === "pending") processing++;
  }
  return { total: reports.length, ready, processing, failed };
}

function StatCard({ label, value, icon: Icon, color }: { label: string; value: number; icon: React.ComponentType<{ className?: string }>; color: string }) {
  return (
    <div className="rounded-xl border border-slate-200/70 bg-white px-4 py-3 shadow-sm">
      <div className="flex items-center gap-2">
        <Icon className={`size-4 ${color}`} />
        <span className="text-xs font-medium text-slate-400">{label}</span>
      </div>
      <p className="mt-1 text-lg font-semibold text-slate-800">{value}</p>
    </div>
  );
}

/* ── Report card ── */

function ReportCard({ report }: { report: UserReport }) {
  const status = deriveRequestStatus(report);
  const StatusIcon = status.icon;
  const pdf = derivePdfBadge(report.pdfStatus);
  const delivery = deriveDeliveryBadge(report.deliveryStatus, report.emailSentAt);
  const DeliveryIcon = delivery.icon;
  const competitorCount = report.competitorUsernames.length;
  const hasSnapshot = !!report.analysisSnapshotId;

  return (
    <div className="rounded-xl border border-slate-200/70 bg-white p-4 shadow-sm transition-shadow hover:shadow-md sm:p-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-slate-100">
            <FileText className="size-4 text-slate-500" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-slate-900">
              @{report.instagramUsername}
            </p>
            <p className="mt-0.5 text-xs text-slate-400">
              {formatDate(report.createdAt)}
              {competitorCount > 0 && (
                <span className="ml-2">
                  · {competitorCount} concorrente{competitorCount > 1 ? "s" : ""}
                </span>
              )}
            </p>
          </div>
        </div>

        {/* Main status badge */}
        <span
          className={cn(
            "inline-flex shrink-0 items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium",
            status.className,
          )}
        >
          <StatusIcon className={cn("size-3", status.spin && "animate-spin")} />
          {status.label}
        </span>
      </div>

      {/* Secondary badges */}
      <div className="mt-3 flex flex-wrap gap-1.5">
        <span className={cn("inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium", pdf.className)}>
          <Download className="size-2.5" />
          {pdf.label}
        </span>
        <span className={cn("inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium", delivery.className)}>
          <DeliveryIcon className="size-2.5" />
          {delivery.label}
        </span>
      </div>

      {/* Actions */}
      <div className="mt-4 flex flex-wrap gap-2">
        <Link
          to="/app/reports/$id"
          params={{ id: report.id }}
          className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-50 hover:border-slate-300"
        >
          Ver detalhe
        </Link>
        {hasSnapshot && (
          <Link
            to="/analyze/$username"
            params={{ username: report.instagramUsername }}
            className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-50 hover:border-slate-300"
          >
            <ExternalLink className="size-3" />
            Abrir relatório
          </Link>
        )}
      </div>

      {/* Email delivery timestamp */}
      {report.emailSentAt && (
        <p className="mt-3 text-[11px] text-slate-400">
          Email enviado a {formatDate(report.emailSentAt)}
        </p>
      )}
    </div>
  );
}

/* ── Page ── */

function ReportsPage() {
  const [reports, setReports] = useState<UserReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const data = await getUserReports();
        if (!cancelled) setReports(data);
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "Não foi possível carregar os relatórios.",
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  const stats = computeStats(reports);

  return (
    <div>
      <h1 className="text-xl font-semibold tracking-tight text-slate-900">
        Relatórios
      </h1>
      <p className="mt-1 text-sm text-slate-500">
        Análises pedidas e relatórios disponíveis para download.
      </p>

      {/* Stats */}
      {!loading && !error && reports.length > 0 && (
        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard label="Total" value={stats.total} icon={FileText} color="text-slate-600" />
          <StatCard label="Prontos" value={stats.ready} icon={CheckCircle2} color="text-emerald-600" />
          <StatCard label="A processar" value={stats.processing} icon={Loader2} color="text-blue-600" />
          <StatCard label="A rever" value={stats.failed} icon={AlertTriangle} color="text-amber-600" />
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="mt-10 flex items-center justify-center">
          <Loader2 className="size-5 animate-spin text-slate-400" />
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-6 text-center">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && reports.length === 0 && (
        <div className="mt-8 rounded-xl border border-slate-200/70 bg-white p-8 text-center shadow-sm">
          <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-slate-100">
            <Search className="size-5 text-slate-400" />
          </div>
          <h2 className="mt-4 text-sm font-semibold text-slate-700">
            Ainda não há relatórios
          </h2>
          <p className="mx-auto mt-2 max-w-xs text-[13px] leading-relaxed text-slate-400">
            Analisar um perfil público para começar a construir o histórico de análises.
          </p>
          <Link
            to="/"
            className="mt-5 inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-800"
          >
            <Search className="size-3.5" />
            Analisar perfil
          </Link>
        </div>
      )}

      {/* PRO teaser */}
      {!loading && !error && (
        <div className="mt-4">
          <ProTrackingTeaser />
        </div>
      )}

      {/* Report list */}
      {!loading && !error && reports.length > 0 && (
        <div className="mt-5 space-y-3">
          {reports.map((r) => (
            <ReportCard key={r.id} report={r} />
          ))}
        </div>
      )}
    </div>
  );
}
