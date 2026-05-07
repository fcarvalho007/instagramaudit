/**
 * Admin card — Test profile status panel (rendered in Sistema).
 * Redesigned with avatar circles, PRONTO/PARCIAL badges, dual buttons,
 * cache breakdown dots, and "+ Adicionar perfil" header.
 */

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMutation } from "@tanstack/react-query";
import {
  getExecutionMode,
  getTestProfileStatuses,
  expireSnapshotForHandle,
  type TestProfileStatus,
} from "@/server/admin/execution-mode.functions";
import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { ExternalLink, RefreshCw, Clock, Plus, DollarSign, Zap, CheckCircle2, XCircle, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { adminFetch } from "@/lib/admin/fetch";
import type { RuntimeCheck } from "@/lib/admin/system-queries.server";

/* ── Error mapping ── */

interface RefreshErrorBody {
  success?: boolean;
  error?: string;
  error_code?: string;
  preflight_blocked?: string;
  details?: string;
  restore_warning?: string | null;
}

const PREFLIGHT_MESSAGES: Record<string, string> = {
  internal_token_missing:
    "INTERNAL_API_TOKEN não está configurado. Configura o segredo antes de atualizar dados.",
  apify_disabled:
    "APIFY_ENABLED não está ativo. Ativa o fornecedor antes de atualizar dados.",
  allowlist:
    "Este perfil não está autorizado para atualização. Adiciona-o à allowlist.",
  concurrent_refresh:
    "Já existe uma atualização em curso para este perfil.",
};

function mapRefreshError(status: number, body: RefreshErrorBody | null): string {
  if (status === 401 || status === 403) {
    return "Sessão admin inválida ou expirada. Inicia sessão novamente.";
  }
  if (status === 503) {
    return "Servidor indisponível. Tenta dentro de instantes.";
  }
  if (body?.preflight_blocked && PREFLIGHT_MESSAGES[body.preflight_blocked]) {
    return PREFLIGHT_MESSAGES[body.preflight_blocked];
  }
  if (body?.error_code === "provider_failure" || status === 502) {
    return "O fornecedor falhou ao obter dados. A cache anterior foi mantida.";
  }
  if (body?.error_code === "snapshot_save_failed") {
    return "Os dados foram obtidos, mas não foi possível guardar o snapshot.";
  }
  if (body?.error) {
    return body.error;
  }
  return "Falha na atualização. Verifica os logs para mais detalhes.";
}

/* ── Last attempt state ── */

interface LastAttempt {
  timestamp: Date;
  success: boolean;
  reason?: string;
}

const STATUS_ITEMS: Array<{
  key: keyof Pick<
    TestProfileStatus,
    "hasCachedReport" | "hasCaptionSemantic" | "hasCommentIntelligence" | "hasVisualCover" | "hasInsightsV1" | "hasInsightsV2" | "hasMarketSignals"
  >;
  label: string;
  short: string;
}> = [
  { key: "hasCachedReport", label: "Report cache", short: "Report" },
  { key: "hasInsightsV1", label: "Insights v1", short: "Insights v1" },
  { key: "hasInsightsV2", label: "Insights v2", short: "Insights v2" },
  { key: "hasCaptionSemantic", label: "Legendas IA", short: "Legendas" },
  { key: "hasVisualCover", label: "Capas visuais", short: "Capas" },
  { key: "hasMarketSignals", label: "Market signals", short: "Mercado" },
  { key: "hasCommentIntelligence", label: "Comentários", short: "Comentários" },
];

/* ── Avatar with gradient ── */
function ProfileAvatar({ handle }: { handle: string }) {
  const initials = handle
    .split(".")
    .map((s) => s[0]?.toUpperCase() ?? "")
    .slice(0, 2)
    .join("");

  return (
    <div
      className="flex items-center justify-center shrink-0 rounded-full text-white font-semibold text-[13px]"
      style={{
        width: 42,
        height: 42,
        background: "linear-gradient(135deg, #1D9E75, #378ADD)",
      }}
    >
      {initials || "?"}
    </div>
  );
}

/* ── Pre-flight status helpers ── */

async function fetchRuntimeChecks(): Promise<RuntimeCheck[]> {
  const res = await adminFetch("/api/admin/sistema/runtime-checks");
  if (!res.ok) return [];
  return (await res.json()) as RuntimeCheck[];
}

function PreflightStrip({
  handle,
  profile,
}: {
  handle: string;
  profile: TestProfileStatus;
}) {
  const { data: checks } = useQuery({
    queryKey: ["admin", "sistema", "runtime-checks"],
    queryFn: fetchRuntimeChecks,
    staleTime: 30_000,
  });

  const find = (name: string) => checks?.find((c) => c.name === name);
  const tokenOk = find("INTERNAL_API_TOKEN")?.status === "ok" ||
    // fallback: if no explicit check, check general token check
    Boolean(checks?.some((c) => c.name.toLowerCase().includes("internal") && c.status === "ok"));
  const apifyOk = find("APIFY_ENABLED")?.status === "ok";
  const allowlistCheck = find("Modo de teste Apify");
  const allowlistOk = allowlistCheck?.status === "ok";
  const cacheValid = profile.hasCachedReport;
  const cacheExpired = profile.snapshotExpiresAt
    ? new Date(profile.snapshotExpiresAt).getTime() < Date.now()
    : false;

  const items: Array<{ label: string; ok: boolean; detail: string }> = [
    {
      label: "Token interno",
      ok: tokenOk,
      detail: tokenOk ? "configurado" : "em falta",
    },
    {
      label: "Apify",
      ok: apifyOk,
      detail: apifyOk ? "ativo" : "inativo",
    },
    {
      label: "Allowlist",
      ok: allowlistOk,
      detail: allowlistOk ? "autorizado" : "não autorizado",
    },
    {
      label: "Cache",
      ok: cacheValid && !cacheExpired,
      detail: !cacheValid ? "sem dados" : cacheExpired ? "expirada" : "válida",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-3 text-[12px]">
      {items.map((item) => (
        <div key={item.label} className="flex items-center gap-1.5">
          {item.ok ? (
            <CheckCircle2 size={12} className="text-emerald-600 shrink-0" />
          ) : (
            <XCircle size={12} className="text-red-500 shrink-0" />
          )}
          <span className="text-admin-text-secondary font-medium">
            {item.label}:
          </span>
          <span
            className={
              item.ok ? "text-admin-text-tertiary" : "text-red-600 font-medium"
            }
          >
            {item.detail}
          </span>
        </div>
      ))}
    </div>
  );
}

function ProfileRow({ p }: { p: TestProfileStatus }) {
  const qc = useQueryClient();
  const [expiring, setExpiring] = useState(false);
  const [refreshConfirmOpen, setRefreshConfirmOpen] = useState(false);
  const [lastAttempt, setLastAttempt] = useState<LastAttempt | null>(null);

  const { data: modeData } = useQuery({
    queryKey: ["admin", "execution-mode"],
    queryFn: () => getExecutionMode(),
    staleTime: 10_000,
  });
  const isCacheOnly = (modeData?.mode ?? "cache_only") === "cache_only";

  const refreshMutation = useMutation({
    mutationFn: async () => {
      const res = await adminFetch("/api/admin/refresh-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ handle: p.handle }),
      });

      let body: RefreshErrorBody | null = null;
      try {
        body = (await res.json()) as RefreshErrorBody;
      } catch {
        // Non-JSON response (e.g. HTML 503 page)
      }

      if (!res.ok || !body?.success) {
        const msg = body
          ? mapRefreshError(res.status, body)
          : res.status === 503
            ? "Servidor indisponível. Tenta dentro de instantes."
            : `Resposta inesperada do servidor (HTTP ${res.status}).`;
        throw new Error(msg);
      }

      return body as { success: boolean; restore_warning?: string | null; details?: string };
    },
    onSuccess: (data) => {
      toast.success(`Dados atualizados com sucesso para @${p.handle}`);
      if (data.restore_warning) {
        toast.warning(data.restore_warning);
      }
      setLastAttempt({ timestamp: new Date(), success: true });
      qc.invalidateQueries({ queryKey: ["admin", "test-profiles"] });
      qc.invalidateQueries({ queryKey: ["admin", "execution-mode"] });
    },
    onError: (err: Error) => {
      toast.error(err.message);
      setLastAttempt({ timestamp: new Date(), success: false, reason: err.message });
      qc.invalidateQueries({ queryKey: ["admin", "execution-mode"] });
    },
  });

  const handleForceRefresh = async () => {
    setExpiring(true);
    try {
      await expireSnapshotForHandle({ data: { handle: p.handle } });
      qc.invalidateQueries({ queryKey: ["admin", "test-profiles"] });
    } finally {
      setExpiring(false);
    }
  };

  const expiresIn = p.snapshotExpiresAt
    ? Math.max(0, Math.round((new Date(p.snapshotExpiresAt).getTime() - Date.now()) / (1000 * 60 * 60)))
    : null;

  const allComplete = STATUS_ITEMS.every((s) => p[s.key]);
  const someComplete = STATUS_ITEMS.some((s) => p[s.key]);

  return (
    <div
      className="rounded-xl border bg-white p-4"
      style={{ borderColor: "#E5E3D9" }}
    >
      {/* Row 1: Avatar + info + actions */}
      <div className="flex items-center gap-3">
        <ProfileAvatar handle={p.handle} />

        <div className="flex flex-col gap-0.5 min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[14px] font-semibold text-admin-text-primary">
              @{p.handle}
            </span>
            {allComplete ? (
              <span
                className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[12px] font-semibold uppercase tracking-wider"
                style={{ backgroundColor: "#E8F5EE", color: "#1D9E75" }}
              >
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                  <path d="M2 5l2 2 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Pronto
              </span>
            ) : someComplete ? (
              <span
                className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[12px] font-semibold uppercase tracking-wider"
                style={{ backgroundColor: "#FFF3E0", color: "#BA7517" }}
              >
                <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ backgroundColor: "#BA7517" }} />
                Parcial
              </span>
            ) : null}
          </div>
          <div className="flex items-center gap-3 text-[12px] text-admin-text-tertiary">
            {p.latestFreshCostTotal != null && (
              <span className="inline-flex items-center gap-1">
                <DollarSign size={10} />
                <span className="font-mono tabular-nums">${p.latestFreshCostTotal.toFixed(3)}</span>
                <span>custo cache</span>
              </span>
            )}
            {expiresIn !== null && (
              <span className="inline-flex items-center gap-1">
                <Clock size={10} />
                expira em {expiresIn}h
              </span>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setRefreshConfirmOpen(true)}
            disabled={refreshMutation.isPending}
            className="inline-flex items-center gap-1.5 rounded-lg border px-3.5 py-2 text-[12px] font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            style={{
              borderColor: "rgba(55,114,229,0.3)",
              color: "#3772E5",
              backgroundColor: "rgba(55,114,229,0.05)",
            }}
            title="Busca dados novos ao fornecedor e volta a cache_only automaticamente."
          >
            <Zap size={12} className={refreshMutation.isPending ? "animate-pulse" : ""} />
            {refreshMutation.isPending ? "A atualizar…" : "Atualizar agora"}
          </button>
          <Link
            to="/analyze/$username"
            params={{ username: p.handle }}
            className="inline-flex items-center gap-1.5 rounded-lg border px-3.5 py-2 text-[12px] font-medium text-admin-text-secondary hover:bg-admin-surface-muted hover:text-admin-text-primary transition-colors"
            style={{ borderColor: "#E5E3D9" }}
          >
            <ExternalLink size={12} />
            Abrir relatório
          </Link>
          <button
            type="button"
            onClick={handleForceRefresh}
            disabled={isCacheOnly || expiring}
            className="inline-flex items-center gap-1.5 rounded-lg border px-3.5 py-2 text-[12px] font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            style={{
              borderColor: isCacheOnly ? "#E5E3D9" : "rgba(186,117,23,0.3)",
              color: isCacheOnly ? "#888780" : "#BA7517",
              backgroundColor: isCacheOnly ? "transparent" : "rgba(186,117,23,0.05)",
            }}
            title={
              isCacheOnly
                ? "Troca para \"Buscar dados novos\" para ativar esta ação."
                : "Expira o snapshot e força análise nova na próxima visita."
            }
          >
            <RefreshCw size={12} className={expiring ? "animate-spin" : ""} />
            {expiring ? "A processar…" : "Buscar novo"}
          </button>
        </div>
      </div>

      {/* Row 2: Cache breakdown chips */}
      <div className="flex items-center gap-1.5 flex-wrap mt-3 pl-[54px]">
        {/* Last attempt indicator */}
        {lastAttempt && (
          <div
            className="flex items-center gap-1.5 w-full mb-1 text-[12px]"
          >
            {lastAttempt.success ? (
              <CheckCircle2 size={12} className="text-emerald-600 shrink-0" />
            ) : (
              <AlertTriangle size={12} className="text-amber-600 shrink-0" />
            )}
            <span className="text-admin-text-tertiary">
              Última tentativa:{" "}
              {lastAttempt.timestamp.toLocaleTimeString("pt-PT", {
                hour: "2-digit",
                minute: "2-digit",
              })}
              {" — "}
              {lastAttempt.success ? (
                <span className="text-emerald-600 font-medium">sucesso</span>
              ) : (
                <span className="text-red-600 font-medium">
                  falhou
                  {lastAttempt.reason && (
                    <span className="text-admin-text-tertiary font-normal">
                      {" "}· {lastAttempt.reason}
                    </span>
                  )}
                </span>
              )}
            </span>
          </div>
        )}
        <span className="text-[12px] text-admin-text-tertiary uppercase tracking-wider font-medium mr-1">
          Em cache:
        </span>
        {STATUS_ITEMS.map((s) => {
          const ok = p[s.key];
          return (
            <span
              key={s.key}
              className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[12px] font-medium"
              style={{
                backgroundColor: ok ? "#E8F5EE" : "#F3F2EE",
                color: ok ? "#1D9E75" : "#888780",
              }}
              title={s.label}
            >
              <span
                className="h-1.5 w-1.5 rounded-full shrink-0"
                style={{
                  backgroundColor: ok ? "#1D9E75" : "transparent",
                  border: ok ? "none" : "1.5px solid #C4C3BC",
                }}
              />
              {s.short}
            </span>
          );
        })}
      </div>

      {/* Confirm dialog for one-shot refresh */}
      <AlertDialog open={refreshConfirmOpen} onOpenChange={setRefreshConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Atualizar dados agora?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2 text-sm">
                <p>
                  Vai buscar dados novos ao fornecedor para <strong>@{p.handle}</strong>.
                </p>
                <PreflightStrip handle={p.handle} profile={p} />
                <p className="text-admin-text-tertiary">
                  Custo estimado: ~$0.02–0.05 USD
                </p>
                <p className="text-admin-text-tertiary">
                  O sistema volta a <em>cache_only</em> automaticamente após a operação.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => refreshMutation.mutate()}
            >
              Atualizar agora
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export function TestProfilesCard() {
  const { data, isLoading } = useQuery({
    queryKey: ["admin", "test-profiles"],
    queryFn: () => getTestProfileStatuses(),
    staleTime: 30_000,
  });

  const profiles = data?.profiles ?? [];
  const readyCount = profiles.filter((p) =>
    STATUS_ITEMS.every((s) => p[s.key])
  ).length;

  const firstExpiry = profiles
    .map((p) => p.snapshotExpiresAt)
    .filter(Boolean)
    .sort()[0];
  const cacheHours = firstExpiry
    ? Math.max(0, Math.round((new Date(firstExpiry).getTime() - Date.now()) / (1000 * 60 * 60)))
    : null;

  return (
    <div className="flex flex-col gap-3">
      {/* Header with counter and add button */}
      <div className="flex items-center justify-between">
        <p className="text-[12px] font-semibold text-admin-text-secondary uppercase tracking-wider flex items-center gap-1.5">
          <span className="text-admin-text-tertiary">◎</span>
          Perfis de teste
        </p>
        <div className="flex items-center gap-3">
          {profiles.length > 0 && (
            <span className="text-[12px] text-admin-text-tertiary">
              {readyCount} perfis prontos
              {cacheHours != null && <> · cache válida {cacheHours}h</>}
            </span>
          )}
          <button
            type="button"
            className="inline-flex items-center gap-1 rounded-md border px-2.5 py-1 text-[12px] font-medium text-admin-text-secondary hover:bg-admin-surface-muted transition-colors"
            style={{ borderColor: "#E5E3D9" }}
          >
            <Plus size={12} />
            Adicionar perfil
          </button>
        </div>
      </div>

      {isLoading && (
        <p className="text-[12px] text-admin-text-tertiary">A carregar...</p>
      )}
      <div className="flex flex-col gap-3">
        {profiles.map((p) => (
          <ProfileRow key={p.handle} p={p} />
        ))}
      </div>
    </div>
  );
}
