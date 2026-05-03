/**
 * "Últimas análises" — per-analysis cost breakdown for /admin/sistema.
 * Shows each fresh analysis with expandable provider call details.
 */

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { ChevronDown, ChevronRight, AlertTriangle, AlertCircle } from "lucide-react";
import { adminFetch } from "@/lib/admin/fetch";
import { AdminSectionHeader } from "@/components/admin/v2/admin-section-header";
import {
  SectionSkeleton,
  SectionError,
  SectionEmpty,
} from "@/components/admin/v2/section-state";

interface ProviderCall {
  id: string;
  provider: string;
  actor: string;
  status: string;
  estimated_cost_usd: number | null;
  actual_cost_usd: number | null;
  duration_ms: number | null;
  posts_returned: number;
  model: string | null;
  created_at: string;
}

interface AnalysisBreakdown {
  event_id: string;
  handle: string;
  created_at: string;
  data_source: string;
  outcome: string;
  snapshot_id: string | null;
  calls: ProviderCall[];
  totals: {
    estimated_usd: number;
    actual_usd: number | null;
    has_actual: boolean;
    call_count: number;
    apify_base_usd: number;
    comment_scraper_usd: number;
    openai_usd: number;
    dataforseo_usd: number;
    comment_scraper_status: "success" | "error" | "not_run";
    comments_returned: number;
  };
}

const COMMENT_HARD_MAX = 0.20;
const TOTAL_ANALYSIS_THRESHOLD = 0.05;

function fmt(v: number | null | undefined): string {
  if (v == null) return "—";
  return `$${v.toFixed(4)}`;
}

function CostCell({ value, warn, danger }: { value: number | null | undefined; warn?: boolean; danger?: boolean }) {
  const cls = danger
    ? "text-signal-error font-semibold"
    : warn
      ? "text-signal-warning font-semibold"
      : "text-foreground-secondary";
  return <span className={`font-mono text-xs ${cls}`}>{fmt(value)}</span>;
}

function ExpandedRow({ calls }: { calls: ProviderCall[] }) {
  return (
    <div className="bg-surface-secondary/50 rounded-lg p-2 sm:p-3 mt-1 mb-2 space-y-1 overflow-x-auto">
      <div className="grid grid-cols-[1fr_80px_80px_80px_60px_60px] gap-2 text-[10px] text-foreground-muted uppercase tracking-wider font-medium px-1 min-w-[420px]">
        <span>Actor</span>
        <span className="text-right">Est.</span>
        <span className="text-right">Real</span>
        <span className="text-right">Duração</span>
        <span className="text-right">Itens</span>
        <span className="text-right">Estado</span>
      </div>
      {calls.map((c) => (
        <div
          key={c.id}
          className="grid grid-cols-[1fr_80px_80px_80px_60px_60px] gap-2 text-xs px-1 py-0.5 rounded hover:bg-surface-elevated/30 min-w-[420px]"
        >
          <span className="text-foreground-secondary truncate" title={c.actor}>
            {c.actor}
            {c.model ? ` (${c.model})` : ""}
          </span>
          <span className="text-right font-mono text-foreground-secondary">{fmt(c.estimated_cost_usd)}</span>
          <span className={`text-right font-mono ${c.actual_cost_usd == null ? "text-signal-warning" : "text-foreground-secondary"}`}>
            {fmt(c.actual_cost_usd)}
          </span>
          <span className="text-right font-mono text-foreground-muted">
            {c.duration_ms != null ? `${(c.duration_ms / 1000).toFixed(1)}s` : "—"}
          </span>
          <span className="text-right font-mono text-foreground-muted">{c.posts_returned}</span>
          <span className={`text-right text-[10px] ${c.status === "success" ? "text-signal-success" : "text-signal-error"}`}>
            {c.status}
          </span>
        </div>
      ))}
    </div>
  );
}

function AnalysisRow({ a }: { a: AnalysisBreakdown }) {
  const [open, setOpen] = useState(false);
  const t = a.totals;

  const commentDanger = t.comment_scraper_status === "success" && t.comment_scraper_usd > COMMENT_HARD_MAX;
  const commentWarn = t.comment_scraper_status === "error" || (t.comment_scraper_status === "success" && !t.has_actual);
  const totalWarn = t.estimated_usd > TOTAL_ANALYSIS_THRESHOLD;

  return (
    <div className="border border-border-subtle rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full grid grid-cols-[1fr_80px_30px] sm:grid-cols-[1fr_100px_70px_70px_70px_70px_70px_30px] gap-1.5 sm:gap-2 items-center px-2 sm:px-3 py-2 text-left hover:bg-surface-elevated/20 transition-colors"
      >
        <div className="min-w-0">
          <span className="text-sm font-medium text-foreground-primary truncate block">@{a.handle}</span>
          <span className="text-[10px] text-foreground-muted">
            {new Date(a.created_at).toLocaleString("pt-PT", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
          </span>
        </div>
        <div className="text-right">
          <CostCell value={t.estimated_usd} warn={totalWarn} />
          {!t.has_actual && (
            <AlertTriangle size={10} className="inline ml-1 text-signal-warning" />
          )}
        </div>
        <div className="hidden sm:contents">
          <CostCell value={t.apify_base_usd} />
          <div className="text-right">
            <CostCell value={t.comment_scraper_status === "not_run" ? undefined : t.comment_scraper_usd} danger={commentDanger} warn={commentWarn} />
            {commentDanger && <AlertCircle size={10} className="inline ml-0.5 text-signal-error" />}
          </div>
          <CostCell value={t.openai_usd} />
          <CostCell value={t.dataforseo_usd} />
          <span className="text-right font-mono text-xs text-foreground-muted">{t.call_count}</span>
        </div>
        <span className="text-foreground-muted">
          {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </span>
      </button>
      {open && <ExpandedRow calls={a.calls} />}
    </div>
  );
}

export function AnalysisCostBreakdown() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["admin", "sistema", "analysis-cost-breakdown"],
    queryFn: async () => {
      const res = await adminFetch("/api/admin/analysis-cost-breakdown?limit=20");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return (await res.json()) as { analyses: AnalysisBreakdown[] };
    },
    refetchInterval: 60_000,
  });

  return (
    <section>
      <AdminSectionHeader
        title="Últimas análises — custo por perfil"
        subtitle="Decomposição de custo real por provedor em cada análise fresh"
        accent="expense"
      />

      {isLoading && <SectionSkeleton rows={4} rowHeight={40} message="A carregar análises…" />}

      {error && <SectionError error={error} />}

      {data && data.analyses.length === 0 && <SectionEmpty message="Nenhuma análise fresh registada." />}

      {data && data.analyses.length > 0 && (
        <div className="space-y-1">
          {/* Header */}
          <div className="hidden sm:grid grid-cols-[1fr_100px_70px_70px_70px_70px_70px_30px] gap-2 px-3 py-1 text-[10px] text-foreground-muted uppercase tracking-wider font-medium">
            <span>Perfil</span><span className="text-right">Total est.</span><span className="text-right">Apify</span><span className="text-right">Coment.</span><span className="text-right">OpenAI</span><span className="text-right">DFS</span><span className="text-right">Calls</span><span />
          </div>

          {data.analyses.map((a) => (
            <AnalysisRow key={a.event_id} a={a} />
          ))}

          {/* Legend */}
          <div className="hidden sm:flex gap-4 pt-2 text-[10px] text-foreground-muted">
            <span className="flex items-center gap-1">
              <AlertTriangle size={10} className="text-signal-warning" /> Custo real indisponível
            </span>
            <span className="flex items-center gap-1">
              <AlertCircle size={10} className="text-signal-error" /> Custo comentários &gt; $0.20
            </span>
          </div>
        </div>
      )}
    </section>
  );
}