import { useEffect, useState, useCallback, useMemo } from "react";
import { createFileRoute } from "@tanstack/react-router";

import { AnalysisErrorState } from "@/components/product/analysis-error-state";
import { AnalysisSkeleton } from "@/components/product/analysis-skeleton";
import { ReportThemeWrapper } from "@/components/report/report-theme-wrapper";
import { ReportShell } from "@/components/report-redesign/report-shell";
import { useReportShareActions } from "@/components/report-share/use-report-share-actions";
import { Toaster } from "@/components/ui/sonner";
import { fetchPublicAnalysis } from "@/lib/analysis/client";
import {
  snapshotToReportData,
  type AdapterResult,
  type ReportBenchmarkInput,
  type SnapshotMetadata,
  type SnapshotPayload,
} from "@/lib/report/snapshot-to-report-data";

interface AnalyzeSearch {
  vs?: string;
}

export const Route = createFileRoute("/analyze/$username")({
  // SSR-disabled: the analysis fetch runs only in the browser to keep the
  // Apify boundary inside the server route and avoid SSR-time fetch loops.
  ssr: false,
  validateSearch: (search: Record<string, unknown>): AnalyzeSearch => ({
    vs: typeof search.vs === "string" ? search.vs : undefined,
  }),
  head: ({ params }) => {
    const handle = params.username.replace(/^@/, "");
    return {
      meta: [
        {
          title: `Análise de @${handle} · InstaBench`,
        },
        {
          name: "description",
          content: `Análise pública do perfil @${handle} no Instagram. Métricas, benchmark e comparação com concorrentes.`,
        },
        {
          property: "og:title",
          content: `Análise de @${handle} · InstaBench`,
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
        { children: `document.body.setAttribute("data-theme","light")` },
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
 * Mapeia códigos técnicos do pipeline (analyze + snapshot) em copy
 * editorial pt-PT. Garante que o utilizador nunca vê strings técnicas
 * (ex.: "APIFY_UPSTREAM_ERROR", "DATAFORSEO_RATE_LIMIT") propagadas
 * directamente do servidor.
 */
const ANALYSIS_ERROR_COPY: Record<string, string> = {
  INVALID_USERNAME:
    "Nome de utilizador inválido. Confirma e tenta novamente.",
  PROFILE_NOT_FOUND:
    "Não encontrámos este perfil no Instagram. Confirma o nome de utilizador.",
  PROFILE_NOT_ALLOWED:
    "Este perfil ainda não está disponível para análise pública.",
  PROVIDER_DISABLED:
    "Análise temporariamente indisponível. Tenta dentro de instantes.",
  UPSTREAM_FAILED:
    "Não foi possível concluir a análise. Tenta dentro de instantes.",
  UPSTREAM_UNAVAILABLE:
    "Serviço de análise temporariamente indisponível. Tenta dentro de instantes.",
  NETWORK_ERROR: "Falha de ligação. Tentar novamente.",
  // snapshot endpoint
  SNAPSHOT_NOT_FOUND:
    "Ainda não temos um relatório guardado para este perfil. Tenta novamente dentro de instantes.",
  PROFILE_PRIVATE:
    "Este perfil é privado. Só conseguimos analisar perfis públicos.",
};

const FALLBACK_ERROR_MESSAGE =
  "Não foi possível concluir a análise. Tenta novamente dentro de instantes.";

function resolveErrorMessage(errorCode?: string | null): string {
  if (!errorCode) return FALLBACK_ERROR_MESSAGE;
  const upper = errorCode.toUpperCase();
  return ANALYSIS_ERROR_COPY[upper] ?? FALLBACK_ERROR_MESSAGE;
}

type LoadState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | {
      status: "ready";
      result: AdapterResult;
      snapshotId: string;
      payload: SnapshotPayload;
    };

function AnalyzePage() {
  const { username } = Route.useParams();
  const { vs } = Route.useSearch();
  const cleaned = username.replace(/^@/, "");

  // Parse competitors from the `?vs=` query string. Capped at 2.
  const competitors = useMemo(() => {
    if (!vs) return [];
    return vs
      .split(",")
      .map((s: string) => s.trim().replace(/^@/, ""))
      .filter((s: string) => s.length > 0)
      .slice(0, 2);
  }, [vs]);

  const competitorsKey = competitors.join(",");

  const [state, setState] = useState<LoadState>({ status: "loading" });

  const load = useCallback(async () => {
    setState({ status: "loading" });
    // Step 1 — trigger the public analyze pipeline. This guarantees a fresh
    // snapshot is recolhida (or served from cache/stale) and persisted in
    // `analysis_snapshots` before we ask for the full payload.
    const analysis = await fetchPublicAnalysis(cleaned, competitors);
    if (!analysis.success) {
      setState({ status: "error", message: analysis.message });
      return;
    }

    // Step 2 — fetch the persisted snapshot (full payload + server-resolved
    // benchmark) and run the editorial adapter on the client.
    try {
      const res = await fetch(
        `/api/public/analysis-snapshot/${encodeURIComponent(cleaned)}`,
      );
      const body = (await res.json().catch(() => null)) as SnapshotResponse | null;
      if (!res.ok || !body?.success || !body.snapshot) {
        setState({
          status: "error",
          message:
            body?.message ??
            "Não foi possível carregar este relatório. Tentar novamente dentro de instantes.",
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
      setState({
        status: "ready",
        result,
        snapshotId: body.snapshot.id,
        payload,
      });
    } catch {
      setState({
        status: "error",
        message: "Falha de ligação. Tentar novamente.",
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cleaned, competitorsKey]);

  useEffect(() => {
    void load();
  }, [load]);

  if (state.status === "loading") {
    return <AnalysisSkeleton username={cleaned} />;
  }

  if (state.status === "error") {
    return (
      <AnalysisErrorState
        message={state.message}
        onRetry={() => void load()}
      />
    );
  }

  return (
    <AnalyzeReady
      result={state.result}
      snapshotId={state.snapshotId}
      payload={state.payload}
    />
  );
}

function AnalyzeReady({
  result,
  snapshotId,
  payload,
}: {
  result: AdapterResult;
  snapshotId: string;
  payload: SnapshotPayload;
}) {
  const shareActions = useReportShareActions({ snapshotId });
  return (
    <ReportThemeWrapper>
      <ReportShell
        result={result}
        snapshotId={snapshotId}
        payload={payload}
        actions={{
          onExportPdf: () => void shareActions.exportPdf(),
          onShare: () => void shareActions.share(),
          pdfBusy: shareActions.pdfBusy,
          shareBusy: shareActions.shareBusy,
          pdfDisabled: shareActions.pdfDisabled,
        }}
      />
      <Toaster />
    </ReportThemeWrapper>
  );
}
