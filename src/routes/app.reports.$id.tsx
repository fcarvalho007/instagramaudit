import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import {
  ArrowLeft,
  FileText,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Loader2,
  Download,
  ExternalLink,
  RefreshCw,
  Mail,
  Calendar,
} from "lucide-react";
import { getOwnedReport, getReportPdfUrl } from "@/server/reports.functions";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app/reports/$id")({
  component: ReportDetailPage,
  head: () => ({
    meta: [
      { title: "Detalhe do relatório — InstaBench" },
      { name: "robots", content: "noindex" },
    ],
  }),
});

type Report = Awaited<ReturnType<typeof getOwnedReport>>;

function statusBadge(r: Report) {
  if (r.request_status === "completed" && r.pdf_status === "generated") {
    return { label: "Pronto", color: "bg-emerald-50 text-emerald-700", Icon: CheckCircle2 } as const;
  }
  if (r.request_status === "failed" || r.pdf_status === "failed" || r.delivery_status === "failed") {
    return { label: "A rever", color: "bg-amber-50 text-amber-700", Icon: AlertTriangle } as const;
  }
  if (r.request_status === "processing" || r.pdf_status === "generating" || r.pdf_status === "pending") {
    return { label: "A processar", color: "bg-blue-50 text-blue-600", Icon: Loader2 } as const;
  }
  return { label: "Pendente", color: "bg-slate-50 text-slate-500", Icon: Clock } as const;
}

function fmtDate(iso: string | null) {
  if (!iso) return null;
  try {
    return new Intl.DateTimeFormat("pt-PT", {
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function ReportDetailPage() {
  const { id } = Route.useParams();
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    setLoading(true);
    setError(null);
    getOwnedReport({ data: { reportId: id } })
      .then((r) => {
        setReport(r);
        setLoading(false);
      })
      .catch((e) => {
        const msg = e instanceof Error ? e.message : String(e);
        if (msg.includes("NOT_FOUND")) {
          setError("Relatório não encontrado ou sem permissão de acesso.");
        } else {
          setError(msg || "Erro ao carregar o relatório.");
        }
        setLoading(false);
      });
  }, [id]);

  const handleDownloadPdf = useCallback(async () => {
    if (!report) return;
    setDownloading(true);
    try {
      const { url } = await getReportPdfUrl({ data: { reportId: report.id } });
      window.open(url, "_blank");
    } catch {
      alert("Não foi possível gerar o link de download.");
    } finally {
      setDownloading(false);
    }
  }, [report]);

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="size-5 animate-spin text-slate-400" />
      </div>
    );
  }

  if (error || !report) {
    return (
      <div>
        <BackLink />
        <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-8 text-center">
          <AlertTriangle className="mx-auto size-8 text-red-400" />
          <p className="mt-3 text-sm text-red-600">{error}</p>
        </div>
      </div>
    );
  }

  const badge = statusBadge(report);
  const pdfReady = report.pdf_status === "generated";
  const hasSnapshot = !!report.analysis_snapshot_id;
  const competitors = Array.isArray(report.competitor_usernames)
    ? (report.competitor_usernames as string[])
    : [];

  const timeline = [
    { label: "Pedido criado", date: fmtDate(report.created_at), done: true },
    {
      label: "PDF gerado",
      date: pdfReady ? fmtDate(report.updated_at) : null,
      done: pdfReady,
      failed: report.pdf_status === "failed",
    },
    {
      label: "Email enviado",
      date: fmtDate(report.email_sent_at),
      done: !!report.email_sent_at,
      failed: report.has_email_error,
    },
  ];

  return (
    <div className="space-y-5">
      <BackLink />

      {/* Header card */}
      <div className="rounded-xl border border-slate-200/70 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-slate-100">
              <FileText className="size-5 text-slate-500" />
            </div>
            <div className="min-w-0">
              <h1 className="truncate text-lg font-semibold text-slate-900">
                @{report.instagram_username}
              </h1>
              <p className="mt-0.5 text-xs text-slate-400">
                {fmtDate(report.created_at)}
                {competitors.length > 0 && (
                  <span className="ml-2">
                    · {competitors.length} concorrente{competitors.length > 1 ? "s" : ""}
                  </span>
                )}
              </p>
            </div>
          </div>
          <span
            className={cn(
              "inline-flex shrink-0 items-center gap-1.5 self-start rounded-full px-3 py-1 text-xs font-medium sm:self-center",
              badge.color,
            )}
          >
            <badge.Icon
              className={cn(
                "size-3.5",
                badge.label === "A processar" && "animate-spin",
              )}
            />
            {badge.label}
          </span>
        </div>

        {competitors.length > 0 && (
          <div className="mt-4 border-t border-slate-100 pt-3">
            <p className="text-xs font-medium uppercase tracking-wider text-slate-400">
              Concorrentes
            </p>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {competitors.map((c) => (
                <span
                  key={c}
                  className="rounded-md bg-slate-100 px-2 py-0.5 text-xs text-slate-600"
                >
                  @{String(c)}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Timeline card */}
      <div className="rounded-xl border border-slate-200/70 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-700">Progresso</h2>
        <ol className="mt-4 space-y-4">
          {timeline.map((step, i) => (
            <li key={i} className="flex gap-3">
              <div className="flex flex-col items-center">
                <div
                  className={cn(
                    "flex size-6 items-center justify-center rounded-full",
                    step.failed
                      ? "bg-amber-100"
                      : step.done
                        ? "bg-emerald-100"
                        : "bg-slate-100",
                  )}
                >
                  {step.failed ? (
                    <AlertTriangle className="size-3 text-amber-600" />
                  ) : step.done ? (
                    <CheckCircle2 className="size-3 text-emerald-600" />
                  ) : (
                    <Clock className="size-3 text-slate-400" />
                  )}
                </div>
                {i < timeline.length - 1 && (
                  <div className="mt-1 h-full w-px bg-slate-200" />
                )}
              </div>
              <div className="pb-1">
                <p className="text-sm font-medium text-slate-700">{step.label}</p>
                {step.date && (
                  <p className="mt-0.5 text-xs text-slate-400">{step.date}</p>
                )}
              </div>
            </li>
          ))}
        </ol>
      </div>

      {/* PDF card */}
      <div className="rounded-xl border border-slate-200/70 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-700">PDF</h2>

        {pdfReady && (
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              onClick={handleDownloadPdf}
              disabled={downloading}
              className="inline-flex items-center gap-1.5 rounded-md border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-medium text-blue-700 transition-colors hover:bg-blue-100 disabled:opacity-60"
            >
              {downloading ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Download className="size-3.5" />
              )}
              Descarregar PDF
            </button>
          </div>
        )}

        {report.pdf_status === "generating" || report.pdf_status === "pending" ? (
          <p className="mt-3 text-sm text-slate-500">
            <Loader2 className="mr-1.5 inline size-3.5 animate-spin" />
            O PDF está a ser gerado…
          </p>
        ) : null}

        {report.pdf_status === "failed" && (
          <p className="mt-3 text-sm text-amber-600">
            {report.pdf_error_hint || "Ocorreu um erro ao gerar o PDF."}
          </p>
        )}

        {report.pdf_status === "not_generated" && (
          <p className="mt-3 text-sm text-slate-400">
            O PDF ainda não foi gerado.
          </p>
        )}

        <div className="mt-4">
          <button
            disabled
            className="inline-flex items-center gap-1.5 rounded-md border border-slate-100 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-300 cursor-not-allowed"
          >
            <RefreshCw className="size-3" />
            Regenerar PDF — em breve
          </button>
        </div>
      </div>

      {/* Actions card */}
      {hasSnapshot && (
        <div className="rounded-xl border border-slate-200/70 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-700">Relatório web</h2>
          <div className="mt-3">
            <Link
              to="/analyze/$username"
              params={{ username: report.instagram_username }}
              className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50"
            >
              <ExternalLink className="size-3.5" />
              Abrir relatório
            </Link>
          </div>
        </div>
      )}

      {/* Error info card */}
      {(report.has_pdf_error || report.has_email_error) && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-5">
          <h2 className="text-sm font-semibold text-amber-800">
            Informação sobre erros
          </h2>
          {report.has_pdf_error && (
            <p className="mt-2 text-sm text-amber-700">
              {report.pdf_error_hint}
            </p>
          )}
          {report.has_email_error && (
            <p className="mt-2 text-sm text-amber-700">
              Ocorreu um erro ao enviar o email. Podes descarregar o PDF diretamente se estiver disponível.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function BackLink() {
  return (
    <Link
      to="/app/reports"
      className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 transition-colors"
    >
      <ArrowLeft className="size-3.5" />
      Voltar aos relatórios
    </Link>
  );
}
