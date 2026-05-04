import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ReportCard, type ReportCardData } from "@/components/app/report-card";
import { FileText, CheckCircle2, Loader2, AlertTriangle, Sparkles } from "lucide-react";
import { Link } from "@tanstack/react-router";

export const Route = createFileRoute("/app/reports")({
  component: ReportsPage,
  head: () => ({
    meta: [
      { title: "Os meus relatórios — InstaBench" },
      { name: "robots", content: "noindex" },
    ],
  }),
});

interface Stats {
  total: number;
  ready: number;
  processing: number;
  failed: number;
}

function computeStats(reports: ReportCardData[]): Stats {
  let ready = 0;
  let processing = 0;
  let failed = 0;

  for (const r of reports) {
    if (r.request_status === "completed" && r.pdf_status === "generated") {
      ready++;
    } else if (
      r.request_status === "failed" ||
      r.pdf_status === "failed" ||
      r.delivery_status === "failed"
    ) {
      failed++;
    } else if (
      r.request_status === "processing" ||
      r.pdf_status === "generating" ||
      r.pdf_status === "pending"
    ) {
      processing++;
    }
  }

  return { total: reports.length, ready, processing, failed };
}

function ReportsPage() {
  const [reports, setReports] = useState<ReportCardData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);

      const { data, error: queryError } = await supabase
        .from("report_requests")
        .select(
          "id, instagram_username, created_at, request_status, pdf_status, delivery_status, email_sent_at, analysis_snapshot_id, competitor_usernames",
        )
        .order("created_at", { ascending: false });

      if (queryError) {
        setError("Não foi possível carregar os relatórios.");
        setLoading(false);
        return;
      }

      const mapped: ReportCardData[] = (data ?? []).map((r) => ({
        id: r.id,
        instagram_username: r.instagram_username,
        created_at: r.created_at,
        request_status: r.request_status,
        pdf_status: r.pdf_status,
        delivery_status: r.delivery_status,
        email_sent_at: r.email_sent_at,
        analysis_snapshot_id: r.analysis_snapshot_id,
        competitor_count: Array.isArray(r.competitor_usernames)
          ? (r.competitor_usernames as string[]).length
          : 0,
      }));

      setReports(mapped);
      setLoading(false);
    }

    load();
  }, []);

  const stats = computeStats(reports);

  return (
    <div>
      <h1 className="text-xl font-semibold tracking-tight text-slate-900">
        Os teus relatórios
      </h1>
      <p className="mt-1 text-sm text-slate-500">
        Consulta as análises pedidas e descarrega os relatórios disponíveis.
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

      {/* Empty */}
      {!loading && !error && reports.length === 0 && (
        <div className="mt-6 rounded-xl border border-slate-200/70 bg-white p-8 text-center shadow-sm">
          <FileText className="mx-auto size-8 text-slate-300" />
          <p className="mt-3 text-sm font-medium text-slate-600">
            Ainda não existem relatórios guardados.
          </p>
          <p className="mt-1 text-xs text-slate-400">
            Pede uma análise pública e usa o mesmo email para a associar à tua conta.
          </p>
        </div>
      )}

      {/* PRO teaser — always visible */}
      {!loading && !error && (
        <div className="mt-4 rounded-xl border border-dashed border-slate-200 bg-slate-50/50 p-5">
          <div className="flex gap-3">
            <Sparkles className="mt-0.5 size-4 shrink-0 text-violet-400" />
            <div>
              <p className="text-[13px] font-medium text-slate-600">
                Tracking contínuo — disponível em breve
              </p>
              <p className="mt-1 text-[13px] leading-relaxed text-slate-400">
                Os planos Pro e Agency vão incluir tracking diário, evolução temporal e alertas
                de crescimento. A tua conta está preparada para quando ativares.
              </p>
              <Link
                to="/app/plan"
                className="mt-2 inline-block text-[13px] font-medium text-blue-500 hover:text-blue-600"
              >
                Ver planos →
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* List */}
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

function StatCard({
  label,
  value,
  icon: Icon,
  color,
}: {
  label: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}) {
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
