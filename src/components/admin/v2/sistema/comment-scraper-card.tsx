/**
 * Card de custos e estado do Comment Scraper (apify/instagram-comment-scraper).
 * Dados lidos de provider_call_logs — nenhuma estimativa externa.
 */

import { useQuery } from "@tanstack/react-query";
import { MessageCircleReply } from "lucide-react";

import { AdminCard } from "@/components/admin/v2/admin-card";
import { AdminBadge } from "@/components/admin/v2/admin-badge";
import { KPICard } from "@/components/admin/v2/kpi-card";
import {
  SectionEmpty,
  SectionError,
  SectionSkeleton,
} from "@/components/admin/v2/section-state";
import { adminFetch } from "@/lib/admin/fetch";
import type { CommentScraperMetrics } from "@/lib/admin/system-queries.server";

async function fetchJson<T>(url: string): Promise<T> {
  const res = await adminFetch(url);
  if (!res.ok) throw new Error(`${url} → HTTP ${res.status}`);
  return (await res.json()) as T;
}

type StatusTone = "revenue" | "signal" | "neutral" | "danger";

function deriveStatus(m: CommentScraperMetrics): {
  tone: StatusTone;
  label: string;
} {
  if (!m.enabled) return { tone: "neutral", label: "Desativado" };
  if (m.last_run_status === "failure" || m.last_run_status === "error") {
    return { tone: "danger", label: "Falha recente" };
  }
  if (m.run_count === 0) return { tone: "signal", label: "Sem execuções" };
  return { tone: "revenue", label: "Operacional" };
}

function fmtAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  if (Number.isNaN(diff) || diff < 0) return "—";
  const hours = Math.floor(diff / (1000 * 60 * 60));
  if (hours < 1) return "< 1h";
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
}

export function CommentScraperCard() {
  const query = useQuery({
    queryKey: ["admin", "sistema", "comment-scraper"],
    queryFn: () =>
      fetchJson<CommentScraperMetrics>(
        "/api/admin/sistema/comment-scraper",
      ),
    refetchInterval: 60_000,
  });

  if (query.isLoading) {
    return (
      <AdminCard className="mt-4">
        <SectionSkeleton rows={2} rowHeight={72} />
      </AdminCard>
    );
  }

  if (query.error) {
    return (
      <AdminCard className="mt-4">
        <SectionError error={query.error} onRetry={() => query.refetch()} />
      </AdminCard>
    );
  }

  const m = query.data!;
  const status = deriveStatus(m);

  return (
    <AdminCard className="mt-4">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <MessageCircleReply className="h-4 w-4 text-admin-text-secondary" />
          <h3 className="m-0 text-[15px] font-medium text-admin-text-primary">
            Comentários Instagram
          </h3>
        </div>
        <AdminBadge variant={status.tone}>{status.label}</AdminBadge>
      </div>

      <p className="m-0 mb-4 text-[12px] text-admin-text-tertiary">
        Custo adicional por análise PRO quando a análise de comentários está
        ativa.
      </p>

      {m.run_count === 0 ? (
        <SectionEmpty message="Sem execuções registadas. A análise de comentários ainda não foi usada neste período." />
      ) : (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            <KPICard
              eyebrow="Custo total"
              value={`$${m.total_cost_usd.toFixed(2)}`}
              sub="últimos 30 dias"
              size="sm"
            />
            <KPICard
              eyebrow="Execuções"
              value={String(m.run_count)}
              sub="runs"
              size="sm"
            />
            <KPICard
              eyebrow="Comentários"
              value={m.comments_returned.toLocaleString("pt-PT")}
              sub="recolhidos"
              size="sm"
            />
            <KPICard
              eyebrow="Custo / run"
              value={
                m.avg_cost_per_run != null
                  ? `$${m.avg_cost_per_run.toFixed(3)}`
                  : "—"
              }
              sub="média"
              size="sm"
            />
            <KPICard
              eyebrow="Custo / 1K coment."
              value={
                m.avg_cost_per_1k_comments != null
                  ? `$${m.avg_cost_per_1k_comments.toFixed(3)}`
                  : "—"
              }
              sub={
                m.avg_cost_per_1k_comments == null
                  ? "dados insuficientes"
                  : "por mil"
              }
              size="sm"
            />
          </div>

          {/* Last run */}
          {m.last_run_at && (
            <p className="mt-3 text-[11px] text-admin-text-tertiary">
              Última execução: {fmtAgo(m.last_run_at)} ·{" "}
              {m.last_run_status === "ok" || m.last_run_status === "success"
                ? "sucesso"
                : m.last_run_status ?? "—"}
            </p>
          )}
        </>
      )}

      {/* Guardrails */}
      <div className="mt-4 border-t border-admin-border pt-3">
        <p className="m-0 text-eyebrow-sm text-admin-text-tertiary">
          GUARDRAILS
        </p>
        <div className="mt-1.5 flex flex-wrap gap-x-6 gap-y-1 text-[12px] text-admin-text-secondary">
          <span>
            Max charge:{" "}
            <span className="font-mono tabular-nums text-admin-text-primary">
              ${m.max_charge_usd.toFixed(2)}
            </span>
            /run
          </span>
          <span>
            Posts:{" "}
            <span className="font-mono tabular-nums text-admin-text-primary">
              {m.max_posts}
            </span>
            /análise
          </span>
          <span>
            Comentários:{" "}
            <span className="font-mono tabular-nums text-admin-text-primary">
              {m.max_comments_per_post}
            </span>
            /post
          </span>
          <span>
            Feature flag:{" "}
            <span
              className={`font-medium ${m.enabled ? "text-admin-revenue-700" : "text-admin-text-tertiary"}`}
            >
              {m.enabled ? "ativo" : "desativado"}
            </span>
          </span>
        </div>
      </div>

      {/* Source note */}
      <p className="mt-3 text-[11px] text-admin-text-tertiary">
        Os dados apresentados vêm dos logs de provider; não incluem estimativas
        externas.
      </p>
    </AdminCard>
  );
}