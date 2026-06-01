import { useEffect, useState, useCallback, useMemo } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";

import { AnalysisErrorState } from "@/components/product/analysis-error-state";
import { AnalysisSkeleton } from "@/components/product/analysis-skeleton";
import { normalizeInstagramHandle } from "@/lib/instagram/normalize-handle";
import { ReportThemeWrapper } from "@/components/report/report-theme-wrapper";
import { ReportShellV2 } from "@/components/report-redesign/v2/report-shell-v2";
import { useReportShareActions } from "@/components/report-share/use-report-share-actions";
import { UnlockModal } from "@/components/product/unlock-modal";
import { OnboardingModal } from "@/components/onboarding/onboarding-modal";
import { Toaster } from "@/components/ui/sonner";
import { fetchPublicAnalysis } from "@/lib/analysis/client";
import { getPublishedFeatures } from "@/server/admin/variant-overrides.functions";
import type { VariantFeatures } from "@/lib/report/report-variant";
import { trackEvent } from "@/lib/tracking.functions";
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
  const { vs, previewLoading } = Route.useSearch();
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

  const [state, setState] = useState<LoadState>({ status: "loading" });
  // Fase 3: se o backend devolver ONBOARDING_REQUIRED (cookie em falta /
  // expirado), reabrimos o modal de onboarding em vez de mostrar 402.
  const [onboardingOpen, setOnboardingOpen] = useState(false);

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
    const MIN_DISPLAY_MS = 3000;
    const waitMin = () => {
      const remaining = MIN_DISPLAY_MS - (Date.now() - loadStart);
      return remaining > 0 ? new Promise<void>((r) => setTimeout(r, remaining)) : Promise.resolve();
    };

    // Step 1 — trigger the public analyze pipeline.
    const analysis = await fetchPublicAnalysis(cleaned, competitors);
    if (!analysis.success) {
      if (analysis.error_code === "ONBOARDING_REQUIRED") {
        setOnboardingOpen(true);
        setState({
          status: "error",
          message: resolveErrorMessage("ONBOARDING_REQUIRED"),
          errorCode: "ONBOARDING_REQUIRED",
        });
        return;
      }
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
  }, [cleaned, competitorsKey, tErrors, resolveErrorMessage]);

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
}: {
  result: AdapterResult;
  snapshotId: string;
  payload: SnapshotPayload;
  analyzedAtIso: string | null;
  expiresAtIso: string | null;
}) {
  const shareActions = useReportShareActions({ snapshotId });

  // Load published module visibility overrides (silent fallback to static defaults)
  const [featuresOverride, setFeaturesOverride] = useState<VariantFeatures | null>(null);
  useEffect(() => {
    getPublishedFeatures({ data: { variant: "public_mvp" } })
      .then((features) => setFeaturesOverride(features))
      .catch(() => { /* silent fallback — static defaults used */ });
  }, []);

  // UI-only unlock state (Phase 2): persisted in sessionStorage so that QA
  // reloads keep the unlocked view, but never hits backend / cookies.
  const [unlocked, setUnlocked] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    try {
      if (snapshotId && window.sessionStorage.getItem(`ib_unlock:${snapshotId}`) === "1") {
        return true;
      }
      // legacy global key (Phase 2 fallback)
      return window.sessionStorage.getItem("ib_unlock_preview") === "1";
    } catch {
      return false;
    }
  });
  const [unlockOpen, setUnlockOpen] = useState(false);

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
        handle: (payload as any).instagram_username ?? undefined,
        metadata: { variant: "public_mvp" },
      },
    }).catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [snapshotId]);

  return (
    <>
      <ReportShellV2
        result={result}
        snapshotId={snapshotId}
        payload={payload}
        analyzedAtIso={analyzedAtIso}
        expiresAtIso={expiresAtIso}
        variant="public_mvp"
        featuresOverride={featuresOverride}
        lockBoundary="engagement"
        unlocked={unlocked}
        premiumUnlocked={false}
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
