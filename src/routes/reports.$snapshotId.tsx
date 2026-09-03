/**
 * /reports/$snapshotId — abertura de relatório histórico pelo snapshot exacto.
 *
 * Rota pública, mas `noindex, nofollow`. Carrega o snapshot via
 * `/api/public/report-snapshot/by-id/:id`, que lê primeiro de
 * `report_snapshots` (imutável) e cai para `analysis_snapshots` apenas
 * quando o id pertence a um snapshot legacy. NÃO chama Apify, OpenAI ou
 * DataForSEO. NÃO regenera. NÃO escreve.
 */

import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AlertTriangle, Search, Clock } from "lucide-react";
import { useTranslation } from "react-i18next";

import { AnalysisSkeleton } from "@/components/product/analysis-skeleton";
import { ReportThemeWrapper } from "@/components/report/report-theme-wrapper";
import { ReportPresentation } from "@/components/report-editorial-v2/report-presentation";
import {
  parseReportDesign,
  type ReportDesign,
} from "@/components/report-editorial-v2/report-presentation-props";
import {
  snapshotToReportData,
  type AdapterResult,
  type SnapshotPayload,
  type ReportBenchmarkInput,
} from "@/lib/report/snapshot-to-report-data";
import {
  getReportExpiresAt,
  isReportExpired,
  REPORT_RETENTION_DAYS,
} from "@/lib/report/retention";

export const Route = createFileRoute("/reports/$snapshotId")({
  ssr: false,
  beforeLoad: () => {
    if (typeof document !== "undefined") {
      document.body.setAttribute("data-theme", "light");
      document.body.setAttribute("data-report-view", "true");
    }
  },
  // Variante de apresentação (`?report_design=editorial_v2`). Só afecta a
  // camada visual: dados, gating e entitlements permanecem iguais.
  validateSearch: (search: Record<string, unknown>): { report_design?: ReportDesign } => ({
    report_design: parseReportDesign(search.report_design),
  }),
  head: () => ({
    meta: [
      { title: "Relatório · AuditProfiles" },
      { name: "robots", content: "noindex, nofollow" },
    ],
    scripts: [
      { children: `document.body&&document.body.setAttribute("data-theme","light")` },
    ],
  }),
  component: SnapshotReportPage,
});

interface SnapshotResponse {
  success: boolean;
  snapshot?: {
    id: string;
    instagram_username: string;
    payload?: SnapshotPayload;
    meta?: { generated_at?: string; instagram_username?: string };
    created_at: string;
    updated_at?: string;
    expires_at: string | null;
    expired?: boolean;
    benchmark?: ReportBenchmarkInput;
    source?: "report_snapshot" | "legacy_analysis_snapshot";
  } | null;
  error_code?: string;
  message?: string;
}

type LoadState =
  | { status: "loading" }
  | { status: "not_found" }
  | { status: "expired"; handle: string }
  | { status: "error"; message: string }
  | {
      status: "ready";
      result: AdapterResult;
      snapshotId: string;
      payload: SnapshotPayload;
      handle: string;
      analyzedAtIso: string | null;
      expiresAtIso: string | null;
    };

function SnapshotReportPage() {
  const { snapshotId } = Route.useParams();
  const [state, setState] = useState<LoadState>({ status: "loading" });
  const { t } = useTranslation("errors");
  const { t: tReport } = useTranslation("report");

  // Sync document.title with current language (SSR head stays in PT canonical).
  useEffect(() => {
    const title = tReport("snapshot.metaTitle");
    document.title = title;
  }, [tReport]);

  const { report_design } = Route.useSearch();

  useEffect(() => {
    document.body.setAttribute("data-report-view", "true");
    return () => {
      document.body.removeAttribute("data-report-view");
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    setState({ status: "loading" });
    (async () => {
      try {
        const res = await fetch(
          `/api/public/report-snapshot/by-id/${encodeURIComponent(snapshotId)}`,
        );
        const body = (await res.json().catch(() => null)) as SnapshotResponse | null;
        if (cancelled) return;

        if (res.status === 404 || body?.error_code === "SNAPSHOT_NOT_FOUND") {
          setState({ status: "not_found" });
          return;
        }
        if (!res.ok || !body?.success || !body.snapshot) {
          setState({
            status: "error",
            message: body?.message ?? t("snapshot.loadFailed"),
          });
          return;
        }

        const snap = body.snapshot;
        const expiresAtIso =
          snap.expires_at ?? getReportExpiresAt(snap.created_at).toISOString();

        if (snap.expired === true || isReportExpired(expiresAtIso)) {
          setState({ status: "expired", handle: snap.instagram_username });
          return;
        }

        const payload = snap.payload ?? {};
        const result = snapshotToReportData({
          payload,
          meta: snap.meta ?? undefined,
          benchmark: snap.benchmark,
          isAdminPreview: false,
        });

        setState({
          status: "ready",
          result,
          snapshotId: snap.id,
          payload,
          handle: snap.instagram_username,
          analyzedAtIso: snap.meta?.generated_at ?? snap.created_at,
          expiresAtIso,
        });
      } catch (e) {
        if (cancelled) return;
        setState({
          status: "error",
          message: e instanceof Error ? e.message : t("snapshot.networkFailed"),
        });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [snapshotId, t]);

  return (
    <ReportThemeWrapper>
      <div className="-mt-8 -mb-24">
        {state.status === "loading" && <AnalysisSkeleton username="" />}
        {state.status === "not_found" && <NotFoundState />}
        {state.status === "expired" && <ExpiredState handle={state.handle} />}
        {state.status === "error" && <ErrorState message={state.message} />}
        {state.status === "ready" && (
          <ReportPresentation
            design={report_design}
            result={state.result}
            snapshotId={state.snapshotId}
            payload={state.payload}
            analyzedAtIso={state.analyzedAtIso}
            expiresAtIso={state.expiresAtIso}
            variant="public_mvp"
            actions={{}}
          />
        )}
      </div>
    </ReportThemeWrapper>
  );
}

function EmptyShell({
  icon: Icon,
  title,
  body,
  cta,
  tone = "neutral",
}: {
  icon: typeof Clock;
  title: string;
  body: string;
  cta: { label: string; to: string };
  tone?: "neutral" | "danger";
}) {
  const { t } = useTranslation("errors");
  const toneClasses =
    tone === "danger"
      ? "border-signal-danger/30 bg-tint-danger/40"
      : "border-border-default/40 bg-surface-secondary";
  return (
    <div className="bg-surface-base min-h-screen">
      <div className="mx-auto max-w-2xl px-6 py-20">
        <div className={`rounded-xl border p-8 text-center shadow-card ${toneClasses}`}>
          <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-surface-muted">
            <Icon className="size-5 text-content-secondary" />
          </div>
          <h1 className="mt-4 font-display text-2xl text-content-primary">
            {title}
          </h1>
          <p className="mt-3 text-sm text-content-secondary">{body}</p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
            <Link
              to={cta.to}
              className="inline-flex items-center gap-1.5 rounded-lg bg-content-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-content-primary/90"
            >
              <Search className="size-3.5" />
              {cta.label}
            </Link>
            <Link
              to="/app/reports"
              className="inline-flex items-center gap-1.5 rounded-md border border-border-default/40 bg-white px-4 py-2 text-sm font-medium text-content-secondary transition-colors hover:bg-surface-muted"
            >
              {t("snapshot.ctaBackToReports")}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

function NotFoundState() {
  const { t } = useTranslation("errors");
  return (
    <EmptyShell
      icon={AlertTriangle}
      title={t("snapshot.notFoundTitle")}
      body={t("snapshot.notFoundBody")}
      cta={{ label: t("snapshot.ctaAnalyzeNew"), to: "/" }}
    />
  );
}

function ExpiredState({ handle }: { handle: string }) {
  const { t } = useTranslation("errors");
  const { t: tReport } = useTranslation("report");
  const retention = tReport("snapshot.retentionMessage", {
    days: REPORT_RETENTION_DAYS,
  });
  const suffix = t("snapshot.expiredBodySuffix", { handle });
  return (
    <EmptyShell
      icon={Clock}
      title={t("snapshot.expiredTitle")}
      body={`${retention} ${suffix}`}
      cta={{ label: t("snapshot.ctaNewReport"), to: "/" }}
    />
  );
}

function ErrorState({ message }: { message: string }) {
  const { t } = useTranslation("errors");
  return (
    <EmptyShell
      icon={AlertTriangle}
      title={t("snapshot.errorTitle")}
      body={message}
      cta={{ label: t("snapshot.ctaAnalyzeNew"), to: "/" }}
      tone="danger"
    />
  );
}