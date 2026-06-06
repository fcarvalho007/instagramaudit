/**
 * Admin card — Test profile status panel (rendered in Sistema).
 * Redesigned with avatar circles, PRONTO/PARCIAL badges, dual buttons,
 * cache breakdown dots, and "+ Adicionar perfil" header.
 */

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMutation } from "@tanstack/react-query";
import {
  getTestProfileStatuses,
  getExecutionMode,
  setExecutionMode,
  type TestProfileStatus,
} from "@/lib/admin/execution-mode.functions";
import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ExternalLink, RefreshCw, Clock, Plus, DollarSign, Zap, CheckCircle2, XCircle, AlertTriangle, Lock, Database } from "lucide-react";
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

/* ── Error mapping ── */

interface RefreshErrorBody {
  success?: boolean;
  error?: string;
  error_code?: string;
  preflight_blocked?: string;
  provider_error_code?: string;
  provider_message?: string;
  run_id?: string;
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

const ERROR_CODE_MESSAGES: Record<string, string> = {
  internal_fetch_failed:
    "Falha de rede interna. O servidor não conseguiu contactar o endpoint de análise. Tenta na versão publicada.",
  internal_parse_failed:
    "Resposta inesperada do servidor (não-JSON).",
  UPSTREAM_FAILED:
    "O fornecedor de dados falhou ao processar o pedido.",
  UPSTREAM_UNAVAILABLE:
    "Serviço de análise temporariamente indisponível.",
  PROFILE_NOT_FOUND:
    "Perfil não encontrado no Instagram.",
  PROVIDER_DISABLED:
    "O fornecedor de dados está desativado.",
  CACHE_ONLY_NO_DATA:
    "Sem snapshot disponível em modo cache-only.",
  PROFILE_NOT_ALLOWED:
    "Este perfil não está autorizado para análise.",
  provider_failure:
    "O fornecedor falhou ao obter dados. A cache anterior foi mantida.",
  snapshot_save_failed:
    "Os dados foram obtidos, mas não foi possível guardar o snapshot.",
};

/** Apify-specific semantic codes from the provider adapter. */
const PROVIDER_ERROR_MESSAGES: Record<string, string> = {
  apify_token_missing:
    "APIFY_TOKEN não está configurado. Configura o segredo antes de atualizar.",
  apify_token_invalid:
    "APIFY_TOKEN foi rejeitado pela Apify (401). Verifica se o token é válido.",
  apify_actor_failed:
    "O actor Apify terminou com erro. Verifica o estado do actor no painel Apify.",
  apify_dataset_empty:
    "O actor Apify terminou sem devolver dados (dataset vazio).",
  apify_timeout:
    "O actor Apify excedeu o tempo limite. O perfil pode ser demasiado grande ou o serviço estar lento.",
  apify_http_error:
    "Erro HTTP ao comunicar com a Apify.",
  apify_parse_failed:
    "A resposta da Apify não pôde ser interpretada (formato inesperado).",
  apify_network_error:
    "Falha de rede ao contactar a Apify.",
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
  // Provider-specific semantic code (most specific)
  if (body?.provider_error_code && PROVIDER_ERROR_MESSAGES[body.provider_error_code]) {
    const base = PROVIDER_ERROR_MESSAGES[body.provider_error_code];
    const extra: string[] = [];
    if (body.run_id) extra.push(`Run: ${body.run_id}`);
    if (body.details && !body.details.includes("APIFY_TOKEN")) {
      extra.push(body.details);
    }
    return extra.length > 0 ? `${base} (${extra.join(" · ")})` : base;
  }

  // Structured error code from analyze-public-v1
  if (body?.error_code && ERROR_CODE_MESSAGES[body.error_code]) {
    const base = ERROR_CODE_MESSAGES[body.error_code];
    if (body.details && !body.details.includes("APIFY_TOKEN")) {
      return `${base} (${body.details})`;
    }
    return base;
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

/* ── Preflight types ── */

interface PreflightCheck {
  key: string;
  label: string;
  status: "ok" | "fail" | "warn";
  message: string;
}

interface PreflightResult {
  can_refresh: boolean;
  blocking_reason: string | null;
  estimated_cost_usd: string;
  checks: PreflightCheck[];
  cache_status: {
    has_snapshot: boolean;
    expired: boolean;
    expires_at: string | null;
  };
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

/* ── Time formatting helpers (pt-PT) ── */

function formatRelative(target: Date, now: Date): string {
  const diffMs = target.getTime() - now.getTime();
  const future = diffMs > 0;
  const abs = Math.abs(diffMs);
  const sec = Math.round(abs / 1000);
  const min = Math.round(sec / 60);
  const hr = Math.floor(min / 60);
  const remMin = min % 60;
  const day = Math.floor(hr / 24);
  const remHr = hr % 24;

  let label: string;
  if (sec < 60) label = `${sec} s`;
  else if (min < 60) label = `${min} min`;
  else if (hr < 24) label = remMin > 0 ? `${hr} h ${remMin} min` : `${hr} h`;
  else label = remHr > 0 ? `${day} d ${remHr} h` : `${day} d`;

  return future ? `daqui a ${label}` : `há ${label}`;
}

const ABS_SHORT = new Intl.DateTimeFormat("pt-PT", {
  day: "2-digit",
  month: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});
const ABS_FULL = new Intl.DateTimeFormat("pt-PT", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
});

function formatAbsoluteShort(d: Date) {
  return ABS_SHORT.format(d);
}
function formatAbsoluteFull(d: Date) {
  return ABS_FULL.format(d);
}

/** Forces re-render every `intervalMs` so relative labels stay live. */
function useNow(intervalMs = 30_000) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}

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

async function fetchPreflight(handle: string): Promise<PreflightResult> {
  const res = await adminFetch(
    `/api/admin/refresh-profile-preflight?handle=${encodeURIComponent(handle)}`,
  );
  if (!res.ok) {
    throw new Error(`Preflight HTTP ${res.status}`);
  }
  return (await res.json()) as PreflightResult;
}

function PreflightChecklist({ checks }: { checks: PreflightCheck[] }) {
  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-3 text-[12px]">
      {checks.map((c) => (
        <div key={c.key} className="flex items-center gap-1.5">
          {c.status === "ok" ? (
            <CheckCircle2 size={12} className="text-emerald-600 shrink-0" />
          ) : c.status === "warn" ? (
            <AlertTriangle size={12} className="text-amber-500 shrink-0" />
          ) : (
            <XCircle size={12} className="text-red-500 shrink-0" />
          )}
          <span className="text-admin-text-secondary font-medium">
            {c.label}:
          </span>
          <span
            className={
              c.status === "ok"
                ? "text-admin-text-tertiary"
                : c.status === "warn"
                  ? "text-amber-600"
                  : "text-red-600 font-medium"
            }
          >
            {c.message}
          </span>
        </div>
      ))}
    </div>
  );
}

function ProfileRow({ p }: { p: TestProfileStatus }) {
  const qc = useQueryClient();
  const [refreshConfirmOpen, setRefreshConfirmOpen] = useState(false);
  const [lastAttempt, setLastAttempt] = useState<LastAttempt | null>(null);
  const now = useNow();

  // Read current execution mode — block "Atualizar agora" in cache_only.
  const { data: modeData } = useQuery({
    queryKey: ["admin", "execution-mode"],
    queryFn: () => getExecutionMode(),
    staleTime: 10_000,
  });
  const isCacheOnlyMode = (modeData?.mode ?? "cache_only") === "cache_only";

  // Mutation to switch mode → fresh (used by the "Mudar e atualizar" shortcut).
  const switchModeMutation = useMutation({
    mutationFn: () => setExecutionMode({ data: { mode: "fresh" } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "execution-mode"] });
    },
  });

  // Preflight query — only runs when modal opens
  const {
    data: preflight,
    isLoading: preflightLoading,
    refetch: refetchPreflight,
  } = useQuery({
    queryKey: ["admin", "preflight", p.handle],
    queryFn: () => fetchPreflight(p.handle),
    enabled: refreshConfirmOpen,
    staleTime: 5_000,
  });

  // Also fetch preflight lazily for the row status badge
  const { data: rowPreflight } = useQuery({
    queryKey: ["admin", "preflight", p.handle],
    queryFn: () => fetchPreflight(p.handle),
    staleTime: 30_000,
  });

  const canRefresh = preflight?.can_refresh ?? true;

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
      qc.refetchQueries({ queryKey: ["admin", "test-profiles"] });
      qc.invalidateQueries({ queryKey: ["admin", "preflight", p.handle] });
    },
    onError: (err: Error) => {
      toast.error(err.message);
      setLastAttempt({ timestamp: new Date(), success: false, reason: err.message });
      qc.invalidateQueries({ queryKey: ["admin", "preflight", p.handle] });
    },
  });

  const lastUpdate = p.latestSnapshotDate ? new Date(p.latestSnapshotDate) : null;
  const expiresAt = p.snapshotExpiresAt ? new Date(p.snapshotExpiresAt) : null;
  const isExpired = expiresAt ? expiresAt.getTime() <= now.getTime() : false;

  const allComplete = STATUS_ITEMS.every((s) => p[s.key]);
  const someComplete = STATUS_ITEMS.some((s) => p[s.key]);

  return (
    <div
      className="rounded-xl border bg-white p-4"
      style={{ borderColor: "#E5E3D9" }}
    >
      {/* Row 1: Avatar + info + actions */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex items-start sm:items-center gap-3 min-w-0 flex-1 w-full">
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
          <div className="flex items-center gap-x-3 gap-y-1 flex-wrap text-[12px] text-admin-text-tertiary">
            {p.latestFreshCostTotal != null && (
              <span className="inline-flex items-center gap-1">
                <DollarSign size={10} />
                <span className="font-mono tabular-nums">${p.latestFreshCostTotal.toFixed(3)}</span>
                <span>custo cache</span>
              </span>
            )}
            {lastUpdate ? (
              <span
                className="inline-flex items-center gap-1"
                title={`Última atualização: ${formatAbsoluteFull(lastUpdate)}`}
              >
                <RefreshCw size={10} />
                <span>Atualizado {formatRelative(lastUpdate, now)}</span>
                <span className="text-admin-text-tertiary/70">·</span>
                <span className="font-mono tabular-nums">{formatAbsoluteShort(lastUpdate)}</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1">
                <RefreshCw size={10} />
                Sem cache · nunca atualizado
              </span>
            )}
            {expiresAt && (
              <span
                className="inline-flex items-center gap-1"
                title={
                  isExpired
                    ? `Cache expirou em ${formatAbsoluteFull(expiresAt)}`
                    : `Cache válida até ${formatAbsoluteFull(expiresAt)}`
                }
                style={isExpired ? { color: "#BA7517" } : undefined}
              >
                <Clock size={10} />
                {isExpired ? (
                  <span>Pronto para atualizar</span>
                ) : (
                  <span>
                    Expira em {Math.max(1, Math.ceil((expiresAt.getTime() - now.getTime()) / 86_400_000))} dias
                  </span>
                )}
                <span className="text-admin-text-tertiary/70">·</span>
                <span className="font-mono tabular-nums">
                  {isExpired ? `expirou ${formatAbsoluteShort(expiresAt)}` : `válida até ${formatAbsoluteShort(expiresAt)}`}
                </span>
              </span>
            )}
            {/* Row-level refresh readiness badge */}
            {rowPreflight && (
              <span
                className="inline-flex items-center gap-1"
                style={{
                  color: rowPreflight.can_refresh ? "#1D9E75" : "#BA7517",
                }}
              >
                {rowPreflight.can_refresh ? (
                  <>
                    <CheckCircle2 size={10} />
                    <span>Pronto para atualizar</span>
                  </>
                ) : refreshMutation.isPending ? (
                  <>
                    <RefreshCw size={10} className="animate-spin" />
                    <span>Atualização em curso</span>
                  </>
                ) : (
                  <>
                    <AlertTriangle size={10} />
                    <span>Bloqueado: {rowPreflight.blocking_reason}</span>
                  </>
                )}
              </span>
            )}
          </div>
          </div>
        </div>

        {/* Actions */}
        <div className="grid grid-cols-2 sm:flex sm:items-center gap-2 sm:shrink-0 w-full sm:w-auto">
          {isCacheOnlyMode ? (
            <button
              type="button"
              onClick={async () => {
                // Atalho de 1 clique: muda para fresh e abre o diálogo de preflight.
                toast.info("A mudar para modo \u201cBuscar dados novos\u201d\u2026");
                try {
                  await switchModeMutation.mutateAsync();
                  toast.success("Modo alterado. A abrir confirmação\u2026");
                  setRefreshConfirmOpen(true);
                  refetchPreflight();
                } catch (err) {
                  toast.error(
                    `Falhou a mudar o modo: ${(err as Error).message}`,
                  );
                }
              }}
              disabled={switchModeMutation.isPending || refreshMutation.isPending}
              className="inline-flex items-center justify-center gap-1.5 rounded-lg border px-3.5 py-2 text-[12px] font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed w-full sm:w-auto whitespace-nowrap"
              style={{
                borderColor: "rgba(186,117,23,0.35)",
                color: "#BA7517",
                backgroundColor: "rgba(186,117,23,0.06)",
              }}
              title="Muda o modo de execução para \u201cBuscar dados novos\u201d e abre a confirmação de atualização."
            >
              <Lock size={12} />
              {switchModeMutation.isPending
                ? "A mudar modo\u2026"
                : "Mudar e atualizar"}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                setRefreshConfirmOpen(true);
                refetchPreflight();
              }}
              disabled={refreshMutation.isPending}
              className="inline-flex items-center justify-center gap-1.5 rounded-lg border px-3.5 py-2 text-[12px] font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed w-full sm:w-auto whitespace-nowrap"
              style={{
                borderColor: "rgba(55,114,229,0.3)",
                color: "#3772E5",
                backgroundColor: "rgba(55,114,229,0.05)",
              }}
              title="Busca dados novos ao fornecedor e volta a cache_only automaticamente."
            >
              <Zap size={12} className={refreshMutation.isPending ? "animate-pulse" : ""} />
              {refreshMutation.isPending ? "A atualizar\u2026" : "Atualizar agora"}
            </button>
          )}
          {p.latestSnapshotId && !isExpired ? (
            <Link
              to="/admin_/report-preview/snapshot/$snapshotId"
              params={{ snapshotId: p.latestSnapshotId }}
              className="inline-flex items-center justify-center gap-1.5 rounded-lg border px-3.5 py-2 text-[12px] font-medium text-admin-text-secondary hover:bg-admin-surface-muted hover:text-admin-text-primary transition-colors w-full sm:w-auto whitespace-nowrap"
              style={{ borderColor: "#E5E3D9" }}
              title="Abre a snapshot guardada — sem chamadas ao fornecedor."
            >
              <ExternalLink size={12} />
              Abrir relatório
            </Link>
          ) : (
            <button
              type="button"
              disabled
              className="inline-flex items-center justify-center gap-1.5 rounded-lg border px-3.5 py-2 text-[12px] font-medium text-admin-text-tertiary cursor-not-allowed opacity-60 w-full sm:w-auto whitespace-nowrap"
              style={{ borderColor: "#E5E3D9" }}
              title={
                isExpired
                  ? "Cache expirada — usa Atualizar agora para gerar nova snapshot."
                  : "Sem snapshot guardada — usa Atualizar agora."
              }
            >
              <ExternalLink size={12} />
              Abrir relatório
            </button>
          )}
        </div>
      </div>

      {/* Row 2: Cache breakdown chips */}
      <div className="flex items-center gap-1.5 flex-wrap mt-3 pl-0 sm:pl-[54px]">
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
            <span
              className="text-admin-text-tertiary"
              title={`Última tentativa: ${formatAbsoluteFull(lastAttempt.timestamp)}`}
            >
              Última tentativa {formatRelative(lastAttempt.timestamp, now)}
              {" · "}
              <span className="font-mono tabular-nums">
                {formatAbsoluteShort(lastAttempt.timestamp)}
              </span>
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
                {preflightLoading ? (
                  <p className="text-admin-text-tertiary text-[12px]">A verificar pré-condições…</p>
                ) : preflight ? (
                  <>
                    <PreflightChecklist checks={preflight.checks} />
                    {!preflight.can_refresh && preflight.blocking_reason && (
                      <div
                        className="flex items-center gap-2 mt-2 rounded-lg px-3 py-2 text-[12px] font-medium"
                        style={{ backgroundColor: "#FFF3E0", color: "#BA7517" }}
                      >
                        <AlertTriangle size={14} className="shrink-0" />
                        <span>Bloqueado: {preflight.blocking_reason}</span>
                      </div>
                    )}
                  </>
                ) : null}
                <p className="text-admin-text-tertiary">
                  Custo estimado: {preflight?.estimated_cost_usd ?? "~$0.02–0.05"} USD
                </p>
                <p className="text-admin-text-tertiary">
                  O sistema volta a <em>cache_only</em> automaticamente após a operação.
                </p>
                <p className="text-admin-text-tertiary">
                  Utilizadores públicos não podem acionar esta ação.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => refreshMutation.mutate()}
              disabled={!canRefresh || preflightLoading}
              className={!canRefresh ? "opacity-50 cursor-not-allowed" : ""}
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
  const { data: modeData } = useQuery({
    queryKey: ["admin", "execution-mode"],
    queryFn: () => getExecutionMode(),
    staleTime: 10_000,
  });
  const isCacheOnlyMode = (modeData?.mode ?? "cache_only") === "cache_only";
  const now = useNow();

  const profiles = data?.profiles ?? [];
  const readyCount = profiles.filter((p) =>
    STATUS_ITEMS.every((s) => p[s.key])
  ).length;

  const futureExpiries = profiles
    .map((p) => p.snapshotExpiresAt)
    .filter((d): d is string => !!d)
    .map((d) => new Date(d))
    .filter((d) => d.getTime() > now.getTime())
    .sort((a, b) => a.getTime() - b.getTime());
  const nextExpiry = futureExpiries[0] ?? null;

  let headerSummary: string;
  if (profiles.length === 0) {
    headerSummary = "Sem perfis configurados";
  } else if (nextExpiry) {
    headerSummary = `${readyCount} prontos · próxima expiração ${formatRelative(nextExpiry, now)}`;
  } else {
    headerSummary = `${readyCount} prontos · todas as caches expiradas`;
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Header with counter and add button */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <p className="text-[12px] font-semibold text-admin-text-secondary uppercase tracking-wider flex items-center gap-1.5 whitespace-nowrap">
          <span className="text-admin-text-tertiary">◎</span>
          Perfis de teste
        </p>
        <div className="flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto">
          {/* Modo de execução ativo — visível no contexto da lista */}
          <span
            className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[12px] font-semibold whitespace-nowrap"
            style={{
              backgroundColor: isCacheOnlyMode ? "#E8F5EE" : "#FFF3E0",
              color: isCacheOnlyMode ? "#1D9E75" : "#BA7517",
            }}
            title={
              isCacheOnlyMode
                ? "Modo cache_only: análises só leem snapshots guardados, sem chamadas pagas."
                : "Modo fresh: análises podem chamar Apify, OpenAI e DataForSEO (com custos)."
            }
          >
            {isCacheOnlyMode ? <Database size={11} /> : <Zap size={11} />}
            {isCacheOnlyMode ? "Modo: guardados · $0" : "Modo: novos · $$"}
          </span>
          <span
            className="text-[12px] text-admin-text-tertiary leading-snug"
            title={
              nextExpiry
                ? `Próxima expiração: ${formatAbsoluteFull(nextExpiry)}`
                : undefined
            }
          >
            {headerSummary}
          </span>
          <button
            type="button"
            className="inline-flex items-center gap-1 rounded-md border px-2.5 py-1 text-[12px] font-medium text-admin-text-secondary hover:bg-admin-surface-muted transition-colors whitespace-nowrap shrink-0"
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
