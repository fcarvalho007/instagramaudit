import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";

import { AnalysisErrorState } from "@/components/product/analysis-error-state";
import { AnalysisSkeleton } from "@/components/product/analysis-skeleton";
import { normalizeInstagramHandle } from "@/lib/instagram/normalize-handle";
import "@/styles/analyze-header-collapse.css";
import { ReportThemeWrapper } from "@/components/report/report-theme-wrapper";
import { ReportShellV2 } from "@/components/report-redesign/v2/report-shell-v2";
import { useReportShareActions } from "@/components/report-share/use-report-share-actions";
import { UnlockModal } from "@/components/product/unlock-modal";
import { InstantAuditBar } from "@/components/product/instant-audit-bar";
import { ConversionSheet } from "@/components/conversion/conversion-sheet";
import type {
  ConversionEntryPoint,
  UnlockStatusCode,
} from "@/lib/leads/lead-capture";
import { DeepenAnalysisCta } from "@/components/product/deepen-analysis-cta";
import { ReportEndCta } from "@/components/product/report-end-cta";
import { OnboardingModal } from "@/components/onboarding/onboarding-modal";
import { Toaster } from "@/components/ui/sonner";
import { fetchPublicAnalysis } from "@/lib/analysis/client";
import { getPublishedFeatures } from "@/lib/admin/variant-overrides.functions";
import type { VariantFeatures } from "@/lib/report/report-variant";
import { trackEvent } from "@/lib/tracking.functions";
import {
  trackAnonymousEvent,
  observeScrollMilestones,
} from "@/lib/analytics/anonymous-funnel";
import {
  getMyReportEntitlement,
  consumeReportUnlockForSnapshot,
} from "@/lib/payments/entitlements.functions";
import { enqueueReportForCurrentSnapshot } from "@/lib/rpc/reports.functions";
import { supabase } from "@/integrations/supabase/client";
import {
  snapshotToReportData,
  type AdapterResult,
  type ReportBenchmarkInput,
  type SnapshotMetadata,
  type SnapshotPayload,
} from "@/lib/report/snapshot-to-report-data";

interface AnalyzeSearch {
  vs?: string;
  previewLoading?: number;
  /** Pro-only public window. Defaults to baseline. */
  w?: "30d" | "90d";
}

// Module-level dedup: sobrevive a re-mounts dentro do mesmo SPA load,
// e o sessionStorage estende a proteção a refreshes do mesmo tab.
const TRACKED_SNAPSHOTS = new Set<string>();
const TRACKED_STORAGE_KEY = "ib:tracked_report_views";

function hasTrackedSnapshot(snapshotId: string): boolean {
  if (TRACKED_SNAPSHOTS.has(snapshotId)) return true;
  if (typeof window === "undefined") return false;
  try {
    const raw = window.sessionStorage.getItem(TRACKED_STORAGE_KEY);
    const arr = raw ? (JSON.parse(raw) as string[]) : [];
    if (Array.isArray(arr) && arr.includes(snapshotId)) {
      TRACKED_SNAPSHOTS.add(snapshotId);
      return true;
    }
  } catch {
    /* ignore */
  }
  return false;
}

function markSnapshotTracked(snapshotId: string): void {
  TRACKED_SNAPSHOTS.add(snapshotId);
  if (typeof window === "undefined") return;
  try {
    const raw = window.sessionStorage.getItem(TRACKED_STORAGE_KEY);
    const arr = raw ? (JSON.parse(raw) as string[]) : [];
    const list = Array.isArray(arr) ? arr : [];
    if (!list.includes(snapshotId)) {
      list.push(snapshotId);
      window.sessionStorage.setItem(
        TRACKED_STORAGE_KEY,
        JSON.stringify(list.slice(-50)),
      );
    }
  } catch {
    /* ignore */
  }
}

export const Route = createFileRoute("/analyze/$username")({
  // SSR-disabled: the analysis fetch runs only in the browser to keep the
  // Apify boundary inside the server route and avoid SSR-time fetch loops.
  ssr: false,
  beforeLoad: () => {
    // Flip to light theme immediately on SPA navigation, before the
    // component mounts, to avoid a dark→light flash.
    if (typeof document !== "undefined") {
      document.body.setAttribute("data-theme", "light");
      document.body.setAttribute("data-report-view", "true");
    }
  },
  validateSearch: (search: Record<string, unknown>): AnalyzeSearch => ({
    vs: typeof search.vs === "string" ? search.vs : undefined,
    previewLoading: Number(search.previewLoading) === 1 ? 1 : undefined,
    w: search.w === "30d" || search.w === "90d" ? search.w : undefined,
  }),
  head: ({ params }) => {
    const handle = params.username.replace(/^@/, "");
    return {
      meta: [
        {
          title: `Análise de @${handle} · AuditProfiles`,
        },
        {
          name: "description",
          content: `Análise pública do perfil @${handle} no Instagram. Métricas, benchmark e comparação com concorrentes.`,
        },
        {
          property: "og:title",
          content: `Análise de @${handle} · AuditProfiles`,
        },
        {
          property: "og:description",
          content: `Análise pública do perfil @${handle} no Instagram. Métricas, benchmark e comparação com concorrentes.`,
        },
      ],
      scripts: [
        // Pré-hidratação: paleta clara antes do primeiro paint em hard reloads,
        // espelhando o comportamento do `/report/example` para evitar flicker
        // dark→light na entrada por SSR-off.
        { children: `document.body&&document.body.setAttribute("data-theme","light")` },
      ],
    };
  },
  component: AnalyzePage,
});

interface SnapshotResponse {
  success: boolean;
  snapshot?: {
    id: string;
    instagram_username: string;
    payload: SnapshotPayload;
    meta: SnapshotMetadata;
    created_at: string;
    updated_at: string;
    benchmark?: ReportBenchmarkInput;
  } | null;
  error_code?: string;
  message?: string;
}

/**
 * Maps server error codes to localized user-facing copy via i18n `errors`
 * namespace. Guarantees the user never sees raw technical strings
 * (e.g. "APIFY_UPSTREAM_ERROR") propagated from the server.
 */
function useResolveErrorMessage() {
  const { t } = useTranslation("errors");
  return useCallback(
    (errorCode?: string | null): string => {
      const upper = errorCode ? errorCode.toUpperCase() : "FALLBACK";
      const key = t(upper, { defaultValue: "" });
      return key && key !== upper ? key : t("FALLBACK");
    },
    [t],
  );
}

type LoadState =
  | { status: "loading" }
  | { status: "error"; message: string; errorCode?: string }
  | {
      status: "ready";
      result: AdapterResult;
      snapshotId: string;
      payload: SnapshotPayload;
      analyzedAtIso: string | null;
      expiresAtIso: string | null;
    };

function AnalyzePage() {
  const { username } = Route.useParams();
  const { vs, previewLoading, w } = Route.useSearch();
  const cleaned = normalizeInstagramHandle(username);
  const { t: tAnalyze } = useTranslation("analyze");
  const { t: tErrors } = useTranslation("errors");
  const resolveErrorMessage = useResolveErrorMessage();

  // Sync document.title / meta description with current language at runtime,
  // without changing the SSR head() (which stays in pt-PT canonical).
  useEffect(() => {
    const handle = cleaned;
    const title = tAnalyze("meta.title", { handle });
    const description = tAnalyze("meta.description", { handle });
    document.title = title;
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) metaDesc.setAttribute("content", description);
    const ogTitle = document.querySelector('meta[property="og:title"]');
    if (ogTitle) ogTitle.setAttribute("content", title);
    const ogDesc = document.querySelector('meta[property="og:description"]');
    if (ogDesc) ogDesc.setAttribute("content", description);
  }, [cleaned, tAnalyze]);

  // Clean up report-view body attribute when leaving the page
  useEffect(() => {
    document.body.setAttribute("data-report-view", "true");
    return () => {
      document.body.removeAttribute("data-report-view");
    };
  }, []);

  // Dev-only: freeze on the loader for visual QA
  const forceLoader = previewLoading === 1;

  // Parse competitors from the `?vs=` query string. Capped at 2.
  const competitors = useMemo(() => {
    if (!vs) return [];
    return vs
      .split(",")
      .map((s: string) => normalizeInstagramHandle(s))
      .filter((s: string) => s.length > 0)
      .slice(0, 2);
  }, [vs]);

  const competitorsKey = competitors.join(",");
  const windowKind: "baseline" | "30d" | "90d" = w ?? "baseline";

  const [state, setState] = useState<LoadState>({ status: "loading" });
  // Fase 3: se o backend devolver ONBOARDING_REQUIRED (cookie em falta /
  // expirado), reabrimos o modal de onboarding em vez de mostrar 402.
  const [onboardingOpen, setOnboardingOpen] = useState(false);
  // Marca-se a `true` logo após `/api/onboarding/start` devolver ok=true.
  // Se o `load()` seguinte voltar a receber ONBOARDING_REQUIRED, é sinal
  // de que o cookie `lead_session` não foi guardado pelo browser (típico
  // em iframes terceiros com cookies particionados). Em vez de reabrir o
  // modal silenciosamente em loop, mostramos um erro acionável.
  const justOnboardedRef = useRef(false);

  const load = useCallback(async () => {
    setState({ status: "loading" });
    const loadStart = Date.now();

    // Defensive: se o param da URL não corresponde a um handle válido após
    // normalização, falha imediatamente sem chamar a API.
    if (!cleaned) {
      setState({
        status: "error",
        message: resolveErrorMessage("INVALID_USERNAME"),
        errorCode: "INVALID_USERNAME",
      });
      return;
    }

    // Minimum skeleton display: 3s — gives the user a sense of structured
    // progress and lets the layout settle. Fresh Apify runs take 7-20s, so
    // the floor only affects cache hits (~200-700ms).
    // Ronda 3 — o piso existe apenas para o layout assentar; cache hits
    // (~200-700ms) já não são artificialmente atrasados.
    const MIN_DISPLAY_MS = 800;
    const waitMin = () => {
      const remaining = MIN_DISPLAY_MS - (Date.now() - loadStart);
      return remaining > 0 ? new Promise<void>((r) => setTimeout(r, remaining)) : Promise.resolve();
    };

    trackAnonymousEvent("anonymous_analysis_started", {
      handle: cleaned,
      dedupeKey: `${cleaned}:${windowKind ?? "baseline"}`,
    });

    // Step 1 — trigger the public analyze pipeline.
    const analysis = await fetchPublicAnalysis(cleaned, competitors, {
      window: windowKind,
    });
    if (!analysis.success) {
      if (analysis.error_code === "ONBOARDING_REQUIRED") {
        if (justOnboardedRef.current) {
          // Acabámos de submeter onboarding com sucesso mas o backend
          // não vê o cookie. Não vale a pena reabrir o modal — ia
          // entrar em loop. Mostra estado de erro com retry manual.
          justOnboardedRef.current = false;
          setState({
            status: "error",
            message: resolveErrorMessage("ONBOARDING_SESSION_LOST"),
            errorCode: "ONBOARDING_SESSION_LOST",
          });
          return;
        }
        setOnboardingOpen(true);
        setState({
          status: "error",
          message: resolveErrorMessage("ONBOARDING_REQUIRED"),
          errorCode: "ONBOARDING_REQUIRED",
        });
        return;
      }
      trackAnonymousEvent("anonymous_analysis_failed", {
        handle: cleaned,
        metadata: { error_code: analysis.error_code ?? "UNKNOWN" },
        dedupeKey: `${cleaned}:${analysis.error_code ?? "UNKNOWN"}`,
      });
      setState({
        status: "error",
        message: resolveErrorMessage(analysis.error_code),
        errorCode: analysis.error_code,
      });
      return;
    }

    // Step 2 — fetch the persisted snapshot.
    try {
      const res = await fetch(
        `/api/public/analysis-snapshot/${encodeURIComponent(cleaned)}`,
      );
      const body = (await res.json().catch(() => null)) as SnapshotResponse | null;
      if (!res.ok || !body?.success || !body.snapshot) {
        setState({
          status: "error",
          message: resolveErrorMessage(body?.error_code),
            errorCode: body?.error_code,
        });
        return;
      }
      const payload = body.snapshot.payload ?? {};
      const result = snapshotToReportData({
        payload,
        meta: body.snapshot.meta ?? undefined,
        benchmark: body.snapshot.benchmark,
        isAdminPreview: false,
      });

      await waitMin();

      trackAnonymousEvent("anonymous_analysis_success", {
        handle: cleaned,
        snapshotId: body.snapshot.id,
        dedupeKey: body.snapshot.id,
      });
      trackAnonymousEvent("instant_audit_viewed", {
        handle: cleaned,
        snapshotId: body.snapshot.id,
        dedupeKey: body.snapshot.id,
      });

      setState({
        status: "ready",
        result,
        snapshotId: body.snapshot.id,
        payload,
        analyzedAtIso:
          body.snapshot.meta?.generated_at ?? body.snapshot.updated_at ?? null,
        expiresAtIso: (body.snapshot as { expires_at?: string | null }).expires_at ?? null,
      });
    } catch {
      setState({
        status: "error",
        message: tErrors("NETWORK_FETCH"),
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cleaned, competitorsKey, windowKind, tErrors, resolveErrorMessage]);

  useEffect(() => {
    if (forceLoader) return;
    void load();
  }, [load, forceLoader]);

  return (
    <ReportThemeWrapper>
      {/* Negative margins cancel AppShell pt-8 pb-24 so the loading/error
          screens sit flush — no phantom spacing or ghost layout. */}
      <div className="-mt-8 -mb-24">
        {state.status === "loading" && (
          <AnalysisSkeleton username={cleaned} />
        )}
        {state.status === "error" && (
          <AnalysisErrorState
            message={state.message}
            errorCode={state.errorCode}
            onRetry={() => void load()}
          />
        )}
        {state.status === "ready" && (
          <AnalyzeReady
            result={state.result}
            snapshotId={state.snapshotId}
            payload={state.payload}
            analyzedAtIso={state.analyzedAtIso}
            expiresAtIso={state.expiresAtIso}
            competitors={competitors}
          />
        )}
      </div>
      <Toaster />
      <OnboardingModal
        open={onboardingOpen}
        onOpenChange={setOnboardingOpen}
        handle={cleaned}
        onSuccess={() => {
          setOnboardingOpen(false);
          justOnboardedRef.current = true;
          void load();
        }}
      />
    </ReportThemeWrapper>
  );
}

function AnalyzeReady({
  result,
  snapshotId,
  payload,
  analyzedAtIso,
  expiresAtIso,
  competitors,
}: {
  result: AdapterResult;
  snapshotId: string;
  payload: SnapshotPayload;
  analyzedAtIso: string | null;
  expiresAtIso: string | null;
  competitors: string[];
}) {
  const shareActions = useReportShareActions({ snapshotId });

  // Onboarding-first flow: chegar a este componente já implica
  // `lead_session` cookie válido (o servidor devolve ONBOARDING_REQUIRED
  // caso contrário em `/api/analyze-public-v1`). Logo, todos os
  // utilizadores que vêem o relatório estão "subscritos" (conta gratuita
  // criada) e têm direito a Bloco 1 completo — sem LockGatePremium,
  // sem StickyUnlockBar. O UnlockModal só permanece como fallback para
  // fluxos legados que entrem com o snapshot já cacheado em outro tab.
  const [unlocked, setUnlocked] = useState<boolean>(true);
  const [unlockOpen, setUnlockOpen] = useState(false);

  // Premium real: entitlement `report_full_9` para o lead da sessão.
  // Default fail-closed a false; flip-on apenas depois do servidor confirmar.
  const [premiumUnlocked, setPremiumUnlocked] = useState<boolean>(false);
  const [packBalance, setPackBalance] = useState<number>(0);
  const [consuming, setConsuming] = useState(false);
  const [consumeError, setConsumeError] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    getMyReportEntitlement({ data: { snapshotId } })
      .then((r) => {
        if (cancelled) return;
        if (r.premiumUnlocked) setPremiumUnlocked(true);
        setPackBalance(r.packBalance ?? 0);
      })
      .catch(() => {
        /* fail-closed: mantém free */
      });
    return () => {
      cancelled = true;
    };
  }, [snapshotId]);

  // Rede de segurança: se houver utilizador autenticado e este snapshot
  // ainda não tem report_request associado, enfileira-o para que apareça
  // em /app/reports com PDF + email. Idempotente — server faz o lookup.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data } = await supabase.auth.getUser();
        const username =
          ((payload as { instagram_username?: string })?.instagram_username) ||
          null;
        if (!username) return;
        // Se o user ainda não tem sessão, grava o handle em localStorage
        // para que `/signup` ou OAuth callback possa enfileirar o report
        // após o registo concluir. Idempotente.
        if (!data.user) {
          try {
            if (typeof window !== "undefined") {
              window.localStorage.setItem("ib:intent_handle", username);
            }
          } catch {
            /* localStorage indisponível */
          }
          return;
        }
        if (cancelled) return;
        await enqueueReportForCurrentSnapshot({
          data: {
            snapshotId,
            instagramUsername: username,
            competitors,
          },
        });
        // Limpa intent_handle: o snapshot já está enfileirado para este user.
        try {
          if (typeof window !== "undefined") {
            window.localStorage.removeItem("ib:intent_handle");
          }
        } catch {
          /* noop */
        }
      } catch {
        /* fail-soft */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [snapshotId, payload, competitors]);

  const handleConsumePackUnlock = async () => {
    if (consuming || premiumUnlocked || packBalance < 1) return;
    setConsuming(true);
    setConsumeError(null);
    try {
      const username =
        ((payload as any)?.instagram_username as string | undefined) ?? undefined;
      const res = await consumeReportUnlockForSnapshot({
        data: { snapshotId, instagramUsername: username },
      });
      if (res.ok) {
        setPremiumUnlocked(true);
        if ("balanceAfter" in res && typeof res.balanceAfter === "number") {
          setPackBalance(res.balanceAfter);
        }
      } else if (res.reason === "insufficient") {
        setConsumeError("Já não tens relatórios Pro disponíveis no pack.");
        setPackBalance(0);
      } else {
        setConsumeError("Sessão expirada. Inicia sessão e tenta de novo.");
      }
    } catch {
      setConsumeError("Não foi possível usar o desbloqueio. Tenta de novo.");
    } finally {
      setConsuming(false);
    }
  };

  // Rota pública usa SEMPRE `public_mvp`. Pro adiciona conteúdo premium
  // dentro dos blocos 01/02 (e gates de competitor/janela 30d/90d/créditos)
  // via `premiumUnlocked` — não através da variant. Blocos 03–06 são
  // lab-only e ficam `hidden` em qualquer contexto público. As variantes
  // `pro_preview`/`internal_lab` só são consumidas pelas rotas de admin
  // (`/admin/report-lab`, `/admin/report-preview/...`).
  const effectiveVariant: "public_mvp" = "public_mvp";

  // Load published module visibility overrides (silent fallback to static
  // defaults). Refetch quando a variant efectiva muda.
  const [featuresOverride, setFeaturesOverride] = useState<VariantFeatures | null>(null);
  useEffect(() => {
    let cancelled = false;
    setFeaturesOverride(null);
    getPublishedFeatures({ data: { variant: effectiveVariant } })
      .then((features) => {
        if (!cancelled) setFeaturesOverride(features);
      })
      .catch(() => { /* silent fallback — static defaults used */ });
    return () => {
      cancelled = true;
    };
  }, [effectiveVariant]);

  // Track report view (fire-and-forget). Guarded por module-level Set +
  // sessionStorage para sobreviver a StrictMode double-invokes, remounts entre
  // route changes e refreshes dentro do mesmo tab.
  useEffect(() => {
    if (!snapshotId) return;
    if (hasTrackedSnapshot(snapshotId)) return;
    markSnapshotTracked(snapshotId);
    trackEvent({
      data: {
        eventType: "report_viewed",
        snapshotId,
        handle:
          (payload as { profile?: { username?: string } })?.profile?.username ??
          undefined,
        metadata: { variant: effectiveVariant },
      },
    }).catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [snapshotId]);

  // Ronda 3 — marcos de scroll da Auditoria Instantânea (uma vez por snapshot).
  const auditHandle =
    (payload as { profile?: { username?: string } })?.profile?.username ??
    (payload as { instagram_username?: string })?.instagram_username ??
    "";
  useEffect(() => {
    if (!snapshotId) return;
    return observeScrollMilestones({ handle: auditHandle, snapshotId });
  }, [snapshotId, auditHandle]);

  // Ronda 4 — motor único de conversão pós-valor.
  const [conversionOpen, setConversionOpen] = useState(false);
  const [entryPoint, setEntryPoint] =
    useState<ConversionEntryPoint>("save_audit");
  const [unlockStatus, setUnlockStatus] = useState<UnlockStatusCode | null>(
    null,
  );
  /** Nível 1: email já capturado nesta sessão (ou desbloqueio já pedido). */
  const leadCaptured = unlockStatus !== null;

  const [livePayload, setLivePayload] = useState<{
    result: AdapterResult;
    payload: SnapshotPayload;
  } | null>(null);

  const openConversion = useCallback((point: ConversionEntryPoint) => {
    setEntryPoint(point);
    setConversionOpen(true);
  }, []);

  // Depois do desbloqueio, refrescamos o snapshot sem reload integral.
  const handleUnlockStarted = useCallback(() => {
    setUnlockStatus("pending");
    if (!auditHandle) return;
    let attempts = 0;
    const timer = window.setInterval(() => {
      attempts += 1;
      void (async () => {
        try {
          const res = await fetch(
            `/api/public/analysis-snapshot/${encodeURIComponent(auditHandle)}`,
          );
          const body = (await res.json().catch(() => null)) as
            | SnapshotResponse
            | null;
          const nextPayload = body?.snapshot?.payload;
          if (
            nextPayload &&
            (nextPayload as { comment_intelligence?: unknown })
              .comment_intelligence
          ) {
            setLivePayload({
              payload: nextPayload,
              result: snapshotToReportData({
                payload: nextPayload,
                meta: body?.snapshot?.meta ?? undefined,
                benchmark: body?.snapshot?.benchmark,
                isAdminPreview: false,
              }),
            });
            setUnlockStatus("already_available");
            trackAnonymousEvent("comment_intelligence_success", {
              handle: auditHandle,
              snapshotId,
              dedupeKey: snapshotId,
            });
            window.clearInterval(timer);
          }
        } catch {
          /* poll silencioso */
        }
      })();
      if (attempts >= 20) window.clearInterval(timer);
    }, 9000);
  }, [auditHandle, snapshotId]);

  const shownPayload = livePayload?.payload ?? payload;
  const shownResult = livePayload?.result ?? result;

  return (
    <>
      {/* Nível 0: cabeçalho informativo. O único CTA visível ao visitante
          anónimo é o "Aprofundar gratuitamente" (DeepenAnalysisCta). */}
      <InstantAuditBar
        handle={auditHandle}
        snapshotId={snapshotId}
        {...(leadCaptured ? { onConvert: () => openConversion("save_audit") } : {})}
      />
      {!premiumUnlocked && packBalance > 0 ? (
        <div className="mb-4 rounded-xl border border-accent-primary/40 bg-accent-primary/5 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-content-primary">
              Tens {packBalance} relatório{packBalance === 1 ? "" : "s"} Pro disponíve{packBalance === 1 ? "l" : "is"} no teu pack.
            </p>
            <p className="mt-0.5 text-xs text-content-secondary">
              Desbloqueia este relatório agora — fica associado a este perfil para sempre.
            </p>
            {consumeError ? (
              <p role="alert" className="mt-1 text-xs text-signal-error">
                {consumeError}
              </p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={handleConsumePackUnlock}
            disabled={consuming}
            className="shrink-0 rounded-lg bg-accent-primary px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-accent-primary/90 disabled:opacity-60"
          >
            {consuming ? "A desbloquear…" : "Usar 1 relatório Pro"}
          </button>
        </div>
      ) : null}
      <ReportShellV2
        result={shownResult}
        snapshotId={snapshotId}
        payload={shownPayload}
        analyzedAtIso={analyzedAtIso}
        expiresAtIso={expiresAtIso}
        variant={effectiveVariant}
        featuresOverride={featuresOverride}
        lockBoundary="engagement"
        unlocked={unlocked}
        leadCaptured={leadCaptured}
        // Estado real: derivado de `lead_entitlements` (product `report_full_9`)
        // via `getMyReportEntitlement`. Fail-closed em erro/sessão ausente.
        premiumUnlocked={premiumUnlocked}
        competitorHandles={competitors}
        // Lead-capture flow ONLY (UnlockModal). Premium CTAs vão pelo
        // PremiumCtaProvider dentro do shell — não passam por aqui.
        onUnlockClick={() => setUnlockOpen(true)}
        actions={{
          onExportPdf: () => {
            void shareActions.exportPdf();
          },
          onShare: () => void shareActions.share(),
          pdfBusy: shareActions.pdfBusy,
          shareBusy: shareActions.shareBusy,
          pdfDisabled: shareActions.pdfDisabled,
        }}
      />
      <DeepenAnalysisCta
        handle={auditHandle}
        snapshotId={snapshotId}
        unlockStatus={unlockStatus}
        onConvert={() => openConversion("comment_intelligence")}
      />
      <ConversionSheet
        open={conversionOpen}
        onOpenChange={setConversionOpen}
        entryPoint={entryPoint}
        handle={auditHandle}
        snapshotId={snapshotId}
        onUnlockStarted={handleUnlockStarted}
      />
      <UnlockModal
        open={unlockOpen}
        onOpenChange={setUnlockOpen}
        snapshotId={snapshotId}
        instagramUsername={
          (payload as any).instagram_username ??
          (payload as any).profile?.username ??
          ""
        }
        onUnlock={(result) => {
          try {
            if (snapshotId) {
              window.sessionStorage.setItem(`ib_unlock:${snapshotId}`, "1");
              window.sessionStorage.setItem(
                `ib_unlock_lead:${snapshotId}`,
                result.leadId,
              );
            }
          } catch {
            /* ignore */
          }
          setUnlocked(true);
          // Pequena confirmação visual: scroll suave + flash subtil
          // no primeiro bloco previamente bloqueado quando o utilizador
          // fecha o modal de sucesso.
          window.setTimeout(() => {
            const target =
              document.getElementById("report-locked-section") ??
              document.querySelector<HTMLElement>("[data-locked-anchor]");
            if (!target) return;
            target.scrollIntoView({ behavior: "smooth", block: "start" });
            target.classList.add("ring-2", "ring-primary/40", "ring-offset-4", "ring-offset-surface-base", "rounded-2xl", "transition-all");
            window.setTimeout(() => {
              target.classList.remove("ring-2", "ring-primary/40", "ring-offset-4", "ring-offset-surface-base");
            }, 1400);
          }, 350);
        }}
      />
    </>
  );
}
