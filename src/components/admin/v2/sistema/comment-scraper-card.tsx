/**
 * Card de custos e estado do Comment Scraper (apify/instagram-comment-scraper).
 * Dados lidos de provider_call_logs — nenhuma estimativa externa.
 */

import { useQuery } from "@tanstack/react-query";
import { MessageCircleReply, AlertTriangle, XCircle } from "lucide-react";

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
  if (m.recent_failure_count >= 3) return { tone: "danger", label: "Falhas consecutivas" };
  if (m.last_run_status === "failure" || m.last_run_status === "error" ||
      m.last_run_status === "http_error" || m.last_run_status === "timeout" ||
      m.last_run_status === "config_error" || m.last_run_status === "network_error") {
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

interface WarningItem {
  tone: "amber" | "rose";
  message: string;
}

function buildWarnings(m: CommentScraperMetrics): WarningItem[] {
  const warnings: WarningItem[] = [];

  // Amber: null cost in recent runs
  if (m.null_cost_count > 0 && m.run_count > 0) {
    const pct = Math.round((m.null_cost_count / m.run_count) * 100);
    warnings.push({
      tone: "amber",
      message: `${m.null_cost_count} execução(ões) sem custo real (${pct}% dos runs). O custo pode estar subcontabilizado.`,
    });
  }

  // Amber: high comment volume (>500 per period)
  if (m.comments_returned > 500) {
    warnings.push({
      tone: "amber",
      message: `Volume elevado: ${m.comments_returned.toLocaleString("pt-PT")} comentários recolhidos no período.`,
    });
  }

  // Rose: last 3 runs all failed
  if (m.recent_failure_count >= 3) {
    warnings.push({
      tone: "rose",
      message: "As últimas 3 execuções falharam consecutivamente. Verificar configuração e limites do actor.",
    });
  }

  // Amber: avg cost per run exceeds target
  if (m.avg_cost_per_run != null && m.avg_cost_per_run > m.target_cost_usd) {
    warnings.push({
      tone: "amber",
      message: `Custo médio por run ($${m.avg_cost_per_run.toFixed(3)}) excede o alvo de $${m.target_cost_usd.toFixed(2)}.`,
    });
  }

  // Amber: runs above target cost
  if (m.runs_above_target > 0) {
    warnings.push({
      tone: "amber",
      message: `${m.runs_above_target} run(s) com custo real acima de $${m.target_cost_usd.toFixed(2)}.`,
    });
  }

  // Rose: runs above hard max
  if (m.runs_above_hard_max > 0) {
    warnings.push({
      tone: "rose",
      message: `${m.runs_above_hard_max} run(s) com custo real acima do hard cap de $${m.hard_max_cost_usd.toFixed(2)}. Investigar.`,
    });
  }

  // Rose: env was clamped (raw value > $0.20)
  if (m.env_was_clamped) {
    warnings.push({
      tone: "rose",
      message: `O valor do secret COMMENT_SCRAPER_MAX_CHARGE_USD excedia $${m.hard_max_cost_usd.toFixed(2)} e foi reduzido automaticamente.`,
    });
  }

  // Rose: many failures overall
  if (m.failure_count > 0 && m.failure_count >= m.run_count && m.run_count > 0) {
    warnings.push({
      tone: "rose",
      message: `Todas as ${m.failure_count + m.run_count} chamadas recentes resultaram em falha.`,
    });
  }

  return warnings;
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
  const warnings = buildWarnings(m);

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
        Custo adicional por análise quando a extração de comentários está
        ativa. Incluído no relatório gratuito.
      </p>

      {m.run_count === 0 && m.failure_count === 0 ? (
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
              sub={m.failure_count > 0 ? `+ ${m.failure_count} falha(s)` : "runs"}
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
            <p className="mt-3 text-[12px] text-admin-text-tertiary">
              Última execução: {fmtAgo(m.last_run_at)} ·{" "}
              {m.last_run_status === "ok" || m.last_run_status === "success"
                ? "sucesso"
                : m.last_run_status ?? "—"}
              {m.last_run_cost_usd != null
                ? ` · $${m.last_run_cost_usd.toFixed(4)}`
                : " · custo não disponível"}
              {" · "}
              {m.last_run_comments} coment.
            </p>
          )}
        </>
      )}

      {/* Warnings */}
      {warnings.length > 0 && (
        <div className="mt-4 flex flex-col gap-2">
          {warnings.map((w, i) => (
            <div
              key={i}
              className={`flex items-start gap-2 rounded-md px-3 py-2 text-[12px] ${
                w.tone === "rose"
                  ? "bg-admin-danger-50 text-admin-danger-700"
                  : "bg-admin-signal-50 text-admin-signal-700"
              }`}
            >
              {w.tone === "rose" ? (
                <XCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              ) : (
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              )}
              <span>{w.message}</span>
            </div>
          ))}
        </div>
      )}

      {/* Guardrails */}
      <div className="mt-4 border-t border-admin-border pt-3">
        <p className="m-0 text-eyebrow-sm text-admin-text-tertiary">
          CONFIGURAÇÃO DO ACTOR
        </p>
        <div className="mt-1.5 flex flex-wrap gap-x-6 gap-y-1 text-[12px] text-admin-text-secondary">
          <span>
            Actor:{" "}
            <span className="admin-code text-admin-text-primary">
              {m.actor}
            </span>
          </span>
          <span>
            Hard max:{" "}
            <span className="font-mono tabular-nums text-admin-text-primary">
              ${m.hard_max_cost_usd.toFixed(2)}
            </span>
            /run
          </span>
          <span>
            Alvo:{" "}
            <span className="font-mono tabular-nums text-admin-text-primary">
              ${m.target_cost_usd.toFixed(2)}
            </span>
            /análise
          </span>
          <span>
            Posts:{" "}
            <span className="font-mono tabular-nums text-admin-text-primary">
              {m.max_posts}
            </span>
            /análise (máx. 12)
          </span>
          <span>
            Resultados:{" "}
            <span className="font-mono tabular-nums text-admin-text-primary">
              {m.max_total_results}
            </span>
            /run (global)
          </span>
          <span>
            Replies:{" "}
            <span className={`font-medium ${m.include_replies ? "text-admin-revenue-700" : "text-admin-text-tertiary"}`}>
              {m.include_replies ? "sim" : "não"}
            </span>
          </span>
          <span>
            Timeout:{" "}
            <span className="font-mono tabular-nums text-admin-text-primary">
              {m.timeout_ms / 1000}s
            </span>
          </span>
          <span>
            Feature flag:{" "}
            <span
              className={`font-medium ${m.enabled ? "text-admin-revenue-700" : "text-admin-text-tertiary"}`}
            >
              {m.enabled ? "ativo" : "desativado"}
            </span>
          </span>
          <span>
            Seleção de posts:{" "}
            <span className="text-admin-text-primary">
              apenas posts do ator principal
            </span>
          </span>
        </div>
      </div>

      {/* Source note */}
      <p className="mt-3 text-[12px] text-admin-text-tertiary">
        Dados de provider_call_logs · actor = apify/instagram-comment-scraper · incluído no custo do relatório gratuito.
      </p>
    </AdminCard>
  );
}
