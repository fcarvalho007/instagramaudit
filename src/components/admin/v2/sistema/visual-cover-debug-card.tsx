/**
 * P07 Visual Cover Analysis — Admin Debug Card.
 * Compact diagnostic panel for the Sistema tab.
 */

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AdminCard } from "@/components/admin/v2/admin-card";
import { AdminBadge } from "@/components/admin/v2/admin-badge";
import { KPICard } from "@/components/admin/v2/kpi-card";
import {
  SectionError,
  SectionSkeleton,
} from "@/components/admin/v2/section-state";
import { adminFetch } from "@/lib/admin/fetch";
import type { AdminAccent } from "@/components/admin/v2/admin-tokens";

interface VisualCoverDebug {
  p07Status: string;
  openai: {
    enabled: boolean;
    testingMode: boolean;
    allowlist: string[];
    handleAllowed: boolean | null;
    apiKeySet: boolean;
  };
  snapshot: {
    id: string;
    created_at: string;
    has_visual_cover: boolean;
    overall_score: number | null;
    status: string | null;
    model: string | null;
    thumbnail_count: number | null;
  } | null;
  thumbnails: {
    total: number;
    urls: string[];
    allRaw: boolean;
  } | null;
  lastProviderCall: {
    id: string;
    created_at: string;
    status: string;
    model: string | null;
    http_status: number | null;
    duration_ms: number | null;
    prompt_tokens: number | null;
    completion_tokens: number | null;
    cost: number | null;
    error: string | null;
    handle: string;
  } | null;
}

const STATUS_BADGE: Record<string, { label: string; variant: AdminAccent }> = {
  not_attempted: { label: "Nunca executado", variant: "signal" },
  blocked_openai_gate: { label: "Bloqueado por config", variant: "danger" },
  allowed_not_executed: { label: "Permitido, não executou", variant: "signal" },
  executed_success: { label: "Sucesso", variant: "revenue" },
  executed_error: { label: "Erro na execução", variant: "danger" },
};

async function fetchDebug(handle: string): Promise<VisualCoverDebug> {
  const res = await adminFetch(
    `/api/admin/sistema/visual-cover-debug?handle=${encodeURIComponent(handle)}`,
  );
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return (await res.json()) as VisualCoverDebug;
}

async function forceRefresh(handle: string): Promise<{ expired_count: number }> {
  const res = await adminFetch("/api/admin/force-refresh", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ instagram_username: handle }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return (await res.json()) as { expired_count: number };
}

export function VisualCoverDebugCard() {
  const [handle, setHandle] = useState("frederico.m.carvalho");
  const [queryHandle, setQueryHandle] = useState("");
  const qc = useQueryClient();

  const debug = useQuery({
    queryKey: ["admin", "visual-cover-debug", queryHandle],
    queryFn: () => fetchDebug(queryHandle),
    enabled: queryHandle.length > 0,
  });

  const refreshMut = useMutation({
    mutationFn: () => forceRefresh(queryHandle),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "visual-cover-debug", queryHandle] });
    },
  });

  const d = debug.data;
  const badge = d ? STATUS_BADGE[d.p07Status] ?? STATUS_BADGE.not_attempted : null;

  return (
    <AdminCard accent="info">
      <h3 className="text-eyebrow text-admin-text-tertiary mb-3">
        P07 Visual Cover Analysis — Debug
      </h3>

      {/* Handle input */}
      <div className="flex gap-2 mb-4">
        <input
          type="text"
          value={handle}
          onChange={(e) => setHandle(e.target.value)}
          placeholder="instagram handle"
          className="flex-1 rounded-md border border-admin-border bg-admin-surface-muted px-3 py-1.5 text-[13px] text-admin-text-primary placeholder:text-admin-text-tertiary"
        />
        <button
          type="button"
          onClick={() => setQueryHandle(handle.trim().replace(/^@/, "").toLowerCase())}
          className="rounded-md bg-admin-info-700 px-3 py-1.5 text-[12px] font-medium text-white hover:bg-admin-info-700/80"
        >
          Diagnosticar
        </button>
      </div>

      {debug.isLoading && <SectionSkeleton rows={3} rowHeight={32} />}
      {debug.error && <SectionError error={debug.error} onRetry={() => debug.refetch()} />}

      {d && (
        <div className="space-y-3">
          {/* P07 Status */}
          <div className="flex items-center gap-2">
            <span className="text-[12px] text-admin-text-secondary">Estado P07:</span>
            <AdminBadge variant={badge!.variant}>{badge!.label}</AdminBadge>
          </div>

          {/* OpenAI Gate */}
          <div className="rounded-lg border border-admin-border bg-admin-surface-muted/40 p-3 space-y-1.5">
            <p className="text-eyebrow-sm text-admin-text-tertiary">OpenAI Gate</p>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[12px]">
              <span className="text-admin-text-tertiary">OPENAI_ENABLED</span>
              <span className={d.openai.enabled ? "text-admin-revenue-700 font-medium" : "text-admin-danger-700 font-medium"}>
                {d.openai.enabled ? "true" : "false"}
              </span>
              <span className="text-admin-text-tertiary">Testing mode</span>
              <span className="text-admin-text-primary">{d.openai.testingMode ? "ativo" : "inativo"}</span>
              <span className="text-admin-text-tertiary">API key</span>
              <span className={d.openai.apiKeySet ? "text-admin-revenue-700" : "text-admin-danger-700"}>
                {d.openai.apiKeySet ? "configurada" : "ausente"}
              </span>
              <span className="text-admin-text-tertiary">Handle permitido</span>
              <span className={d.openai.handleAllowed ? "text-admin-revenue-700 font-medium" : "text-admin-danger-700 font-medium"}>
                {d.openai.handleAllowed === null ? "—" : d.openai.handleAllowed ? "sim" : "não"}
              </span>
              <span className="text-admin-text-tertiary">Allowlist</span>
              <span className="text-admin-text-primary admin-code break-all">
                {d.openai.allowlist.length > 0 ? d.openai.allowlist.join(", ") : "(vazia)"}
              </span>
            </div>
          </div>

          {/* Snapshot */}
          {d.snapshot && (
            <div className="rounded-lg border border-admin-border bg-admin-surface-muted/40 p-3 space-y-1.5">
              <p className="text-eyebrow-sm text-admin-text-tertiary">Snapshot</p>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[12px]">
                <span className="text-admin-text-tertiary">visual_cover_analysis</span>
                <span className={d.snapshot.has_visual_cover ? "text-admin-revenue-700 font-medium" : "text-admin-danger-700 font-medium"}>
                  {d.snapshot.has_visual_cover ? "presente" : "ausente"}
                </span>
                {d.snapshot.has_visual_cover && (
                  <>
                    <span className="text-admin-text-tertiary">Score</span>
                    <span className="text-admin-text-primary font-mono">{d.snapshot.overall_score ?? "—"}</span>
                    <span className="text-admin-text-tertiary">Thumbnails analisados</span>
                    <span className="text-admin-text-primary">{d.snapshot.thumbnail_count ?? "—"}</span>
                  </>
                )}
                <span className="text-admin-text-tertiary">Criado</span>
                <span className="text-admin-text-primary admin-code">{d.snapshot.created_at}</span>
              </div>
            </div>
          )}

          {/* Thumbnails */}
          {d.thumbnails && (
            <div className="rounded-lg border border-admin-border bg-admin-surface-muted/40 p-3 space-y-1.5">
              <p className="text-eyebrow-sm text-admin-text-tertiary">Thumbnails ({d.thumbnails.total})</p>
              <div className="text-[12px] text-admin-text-secondary space-y-0.5">
                {d.thumbnails.urls.map((u, i) => (
                  <p key={i} className="font-mono break-all">{u}</p>
                ))}
              </div>
              <p className="text-[12px] text-admin-text-tertiary">
                {d.thumbnails.allRaw ? "URLs diretas (raw)" : "Contém URLs proxy"}
              </p>
            </div>
          )}

          {/* Last provider call */}
          {d.lastProviderCall ? (
            <div className="rounded-lg border border-admin-border bg-admin-surface-muted/40 p-3 space-y-1.5">
              <p className="text-eyebrow-sm text-admin-text-tertiary">Última chamada OpenAI (visual)</p>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[12px]">
                <span className="text-admin-text-tertiary">Estado</span>
                <span className="text-admin-text-primary">{d.lastProviderCall.status}</span>
                <span className="text-admin-text-tertiary">Modelo</span>
                <span className="text-admin-text-primary font-mono">{d.lastProviderCall.model ?? "—"}</span>
                <span className="text-admin-text-tertiary">Tokens</span>
                <span className="text-admin-text-primary font-mono">
                  {d.lastProviderCall.prompt_tokens ?? 0} + {d.lastProviderCall.completion_tokens ?? 0}
                </span>
                <span className="text-admin-text-tertiary">Custo</span>
                <span className="text-admin-text-primary font-mono">
                  {d.lastProviderCall.cost != null ? `$${Number(d.lastProviderCall.cost).toFixed(4)}` : "—"}
                </span>
                {d.lastProviderCall.error && (
                  <>
                    <span className="text-admin-text-tertiary">Erro</span>
                    <span className="text-admin-danger-700 text-[12px] break-all">{d.lastProviderCall.error}</span>
                  </>
                )}
              </div>
            </div>
          ) : (
            <p className="text-[12px] text-admin-text-tertiary italic">
              Nenhuma chamada OpenAI registada para visual-cover-analysis.
            </p>
          )}

          {/* Force refresh action */}
          <div className="pt-2 border-t border-admin-border">
            <button
              type="button"
              onClick={() => refreshMut.mutate()}
              disabled={refreshMut.isPending || !queryHandle}
              className="rounded-md bg-admin-expense-700 px-3 py-1.5 text-[12px] font-medium text-white hover:bg-admin-expense-700/80 disabled:opacity-50"
            >
              {refreshMut.isPending ? "A expirar cache…" : "Forçar refresh (expira cache do handle)"}
            </button>
            {refreshMut.isSuccess && (
              <p className="mt-1 text-[12px] text-admin-revenue-700">
                Cache expirado. A próxima análise fará chamada fresh com visual cover.
              </p>
            )}
            <p className="mt-1 text-[12px] text-admin-text-tertiary">
              Após expirar, visita /analyze/{queryHandle || "handle"} para desencadear nova análise com P07.
            </p>
          </div>
        </div>
      )}
    </AdminCard>
  );
}
