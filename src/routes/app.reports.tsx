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
  Info,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ProTrackingTeaser } from "@/components/app/pro-tracking-teaser";
import {
  getReportExpiresAt,
  isReportExpired,
  formatRetentionMessage,
} from "@/lib/report/retention";

export const Route = createFileRoute("/app/reports")({
  component: ReportsPage,
  head: () => ({
    meta: [
      { title: "Relatórios — AuditProfiles" },
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
  return { label: "Pendente", className: "bg-surface-muted text-content-secondary border-border-default/20", icon: Clock };
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
      return { label: "Sem PDF", className: "bg-surface-muted text-content-tertiary border-border-default/20" };
  }
}

function deriveDeliveryBadge(status: string, emailSentAt: string | null): { label: string; className: string; icon: typeof Mail } {
  if (status === "sent" && emailSentAt) {
    return { label: "Enviado", className: "bg-emerald-50 text-emerald-600 border-emerald-200/60", icon: MailCheck };
  }
  if (status === "failed") {
    return { label: "Envio falhou", className: "bg-red-50 text-red-500 border-red-200/60", icon: MailX };
  }
  return { label: "Não enviado", className: "bg-surface-muted text-content-tertiary border-border-default/20", icon: Mail };
}

/* ── Retention helpers ── */

type RetentionState = "available" | "expiring" | "expired";

interface Retention {
  expiresAt: Date;
  daysLeft: number;
  state: RetentionState;
}

const MS_PER_DAY = 86_400_000;

function deriveRetention(createdAtIso: string): Retention {
  const expiresAt = getReportExpiresAt(createdAtIso);
  const expired = isReportExpired(expiresAt);
  const diffMs = expiresAt.getTime() - Date.now();
  const daysLeft = Math.max(0, Math.ceil(diffMs / MS_PER_DAY));
  const state: RetentionState = expired
    ? "expired"
    : daysLeft <= 3
      ? "expiring"
      : "available";
  return { expiresAt, daysLeft, state };
}

function RetentionBadge({ retention }: { retention: Retention }) {
  if (retention.state === "expired") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-border-default/30 bg-surface-muted px-2 py-0.5 text-xs font-medium text-content-tertiary">
        <Clock className="size-2.5" />
        Expirado
      </span>
    );
  }
  if (retention.state === "expiring") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-amber-200/60 bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">
        <Clock className="size-2.5" />
        Expira em {retention.daysLeft} dia{retention.daysLeft === 1 ? "" : "s"}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200/60 bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
      <CheckCircle2 className="size-2.5" />
      Disponível
    </span>
  );
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
    <div className="rounded-xl border border-border-default/20 bg-white px-4 py-3 shadow-sm">
      <div className="flex items-center gap-2">
        <Icon className={`size-4 ${color}`} />
        <span className="text-xs font-medium text-content-tertiary">{label}</span>
      </div>
      <p className="mt-1 text-lg font-semibold text-content-primary">{value}</p>
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
  const snapshotIdForLink =
    report.reportSnapshotId ?? report.analysisSnapshotId ?? null;
  const hasSnapshot = !!snapshotIdForLink;
  const retention = deriveRetention(report.createdAt);
  const canOpenSnapshot = hasSnapshot && retention.state !== "expired";

  return (
    <div className="rounded-xl border border-border-default/20 bg-white p-4 shadow-sm transition-shadow hover:shadow-md sm:p-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-surface-muted">
            <FileText className="size-4 text-content-secondary" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-content-primary">
              @{report.instagramUsername}
            </p>
            <p className="mt-0.5 text-xs text-content-tertiary">
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
        <RetentionBadge retention={retention} />
        <span className={cn("inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium", pdf.className)}>
          <Download className="size-2.5" />
          {pdf.label}
        </span>
        <span className={cn("inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium", delivery.className)}>
          <DeliveryIcon className="size-2.5" />
          {delivery.label}
        </span>
      </div>

      {/* Retention metadata */}
      <p className="mt-2 text-xs text-content-tertiary">
        Gerado a {formatDate(report.createdAt)} · Expira a {formatDate(retention.expiresAt.toISOString())}
      </p>

      {/* Actions */}
      <div className="mt-4 flex flex-wrap gap-2">
        <Link
          to="/app/reports/$id"
          params={{ id: report.id }}
          className="inline-flex items-center gap-1.5 rounded-md border border-border-default/20 bg-white px-3 py-1.5 text-xs font-medium text-content-secondary transition-colors hover:bg-surface-muted hover:border-border-default/30"
        >
          Ver detalhe
        </Link>
        {canOpenSnapshot && (
          <Link
            to="/reports/$snapshotId"
            params={{ snapshotId: snapshotIdForLink as string }}
            className="inline-flex items-center gap-1.5 rounded-md border border-border-default/20 bg-white px-3 py-1.5 text-xs font-medium text-content-secondary transition-colors hover:bg-surface-muted hover:border-border-default/30"
          >
            <ExternalLink className="size-3" />
            Abrir relatório
          </Link>
        )}
        {hasSnapshot && retention.state === "expired" && (
          <Link
            to="/"
            title={formatRetentionMessage()}
            aria-label="Gerar nova análise"
            className="inline-flex items-center gap-1.5 rounded-md bg-content-primary px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-content-primary/90"
          >
            <Search className="size-3" />
            Gerar nova análise
          </Link>
        )}
      </div>

      {/* Email delivery timestamp */}
      {report.emailSentAt && (
        <p className="mt-3 text-xs text-content-tertiary">
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
      <h1 className="text-xl font-semibold tracking-tight text-content-primary">
        Relatórios
      </h1>
      <p className="mt-1 text-sm text-content-secondary">
        Análises pedidas e relatórios disponíveis para download.
      </p>

      {/* Retention notice */}
      {!loading && !error && (
        <div className="mt-5 flex items-start gap-3 rounded-xl border border-border-default/20 bg-surface-muted px-4 py-3">
          <Info className="mt-0.5 size-4 shrink-0 text-content-tertiary" />
          <p className="text-sm leading-relaxed text-content-secondary">
            Os relatórios ficam guardados durante 15 dias. Durante esse período, podes voltar a abrir exatamente a análise gerada, sem recalcular dados. Depois disso, removemos os dados antigos para manter o serviço sustentável e eficiente.
          </p>
        </div>
      )}

      {/* Stats */}
      {!loading && !error && reports.length > 0 && (
        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard label="Total" value={stats.total} icon={FileText} color="text-content-secondary" />
          <StatCard label="Prontos" value={stats.ready} icon={CheckCircle2} color="text-emerald-600" />
          <StatCard label="A processar" value={stats.processing} icon={Loader2} color="text-blue-600" />
          <StatCard label="A rever" value={stats.failed} icon={AlertTriangle} color="text-amber-600" />
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="mt-10 flex items-center justify-center">
          <Loader2 className="size-5 animate-spin text-content-tertiary" />
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
        <div className="mt-8 rounded-xl border border-border-default/20 bg-white p-8 text-center shadow-sm">
          <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-surface-muted">
            <Search className="size-5 text-content-tertiary" />
          </div>
          <h2 className="mt-4 text-sm font-semibold text-content-primary">
            Ainda não há relatórios
          </h2>
          <p className="mx-auto mt-2 max-w-xs text-[13px] leading-relaxed text-content-tertiary">
            Analisar um perfil público para começar a construir o histórico de análises.
          </p>
          <Link
            to="/"
            className="mt-5 inline-flex items-center gap-1.5 rounded-lg bg-content-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-content-primary/90"
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
