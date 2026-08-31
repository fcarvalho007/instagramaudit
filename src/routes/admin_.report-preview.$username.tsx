/**
 * /admin/report-preview/:username — pré-visualização administrativa
 * em ECRÃ COMPLETO, idêntica à vista do cliente.
 *
 * - URL: `/admin/report-preview/:username` (segment com `_` final escapa
 *   ao layout `admin.tsx`, mantendo o URL público).
 * - Acesso restrito: mesmo gate de admin (Google Sign-in + allowlist).
 * - NÃO chama Apify, NÃO regenera, NÃO altera a snapshot.
 * - Sem sidebar, sem banner admin, sem coverage strip.
 *   Apenas o `ReportShellV2` + um pill discreto "Sair da pré-visualização".
 * - `noindex, nofollow`.
 */

import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, FlaskConical } from "lucide-react";
import { cn } from "@/lib/utils";
import { ReportThemeWrapper } from "@/components/report/report-theme-wrapper";
import { ReportShellV2 } from "@/components/report-redesign/v2/report-shell-v2";
import { AdminGate } from "@/components/admin/admin-gate";
import { Toaster } from "@/components/ui/sonner";
import { adminFetch } from "@/lib/admin/fetch";
import { readAdminEmail } from "@/lib/admin/simple-gate";
import { zodValidator, fallback } from "@tanstack/zod-adapter";
import { z } from "zod";
import type { ReportVariant, VariantFeatures } from "@/lib/report/report-variant";
import { getDraftFeatures, getPublishedFeatures } from "@/lib/admin/variant-overrides.functions";
import {
  snapshotToReportData,
  type AdapterResult,
  type SnapshotPayload,
  type SnapshotMetadata,
  type ReportBenchmarkInput,
} from "@/lib/report/snapshot-to-report-data";

const VALID_VARIANTS = ["public_mvp", "internal_lab", "pro_preview"] as const;

/** Estado comercial do leitor: a = anónimo, b = email capturado, c = Pro. */
const VALID_STATES = ["a", "b", "c"] as const;
type CommercialState = (typeof VALID_STATES)[number];

const previewSearchSchema = z.object({
  variant: fallback(z.enum(VALID_VARIANTS), "public_mvp").default("public_mvp"),
  draft: fallback(z.boolean(), false).default(false),
  state: fallback(z.enum(VALID_STATES), "a").default("a"),
});

/** Traduz o estado comercial nas props que o `ReportShellV2` já aceita. */
function shellPropsForState(state: CommercialState) {
  return {
    leadCaptured: state !== "a",
    premiumUnlocked: state === "c",
    lockBoundary: state === "c" ? null : ("engagement" as const),
  };
}

export const Route = createFileRoute("/admin_/report-preview/$username")({
  validateSearch: zodValidator(previewSearchSchema),
  component: AdminReportPreviewPage,
  head: () => ({
    meta: [
      { title: "Pré-visualização de relatório · Admin · AuditProfiles" },
      { name: "robots", content: "noindex, nofollow" },
    ],
    scripts: [
      { children: `document.body&&document.body.setAttribute("data-theme","light")` },
    ],
  }),
});

type AuthState = "checking" | "signed_out" | "in";

interface SnapshotResponse {
  success: boolean;
  snapshot: {
    id: string;
    instagram_username: string;
    payload: SnapshotPayload;
    meta: SnapshotMetadata;
    created_at: string;
    expires_at: string | null;
    benchmark?: ReportBenchmarkInput;
  } | null;
  error_code?: string;
  message?: string;
}

type LoadState =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "missing" }
  | { kind: "error"; message: string }
  | {
      kind: "ready";
      result: AdapterResult;
      snapshotId: string;
      payload: SnapshotPayload;
      createdAt: string;
      expiresAt: string | null;
    };

function AdminReportPreviewPage() {
  const { username } = Route.useParams();
  const { variant, draft, state } = Route.useSearch();
  const [authState, setAuthState] = useState<AuthState>("checking");
  const [load, setLoad] = useState<LoadState>({ kind: "idle" });
  const [featuresOverride, setFeaturesOverride] = useState<VariantFeatures | null>(null);

  // Só a variante pública tem estados comerciais; as internas são sempre Pro.
  const effectiveState: CommercialState = variant === "public_mvp" ? state : "c";
  const shellState = shellPropsForState(effectiveState);

  useEffect(() => {
    setAuthState(readAdminEmail() ? "in" : "signed_out");
  }, []);

  useEffect(() => {
    if (authState !== "in") return;
    (async () => {
      try {
        const features = draft
          ? await getDraftFeatures({ data: { variant } })
          : await getPublishedFeatures({ data: { variant } });
        setFeaturesOverride(features);
      } catch {
        setFeaturesOverride(null);
      }
    })();
  }, [authState, variant, draft]);

  useEffect(() => {
    if (authState !== "in") return;
    let cancelled = false;
    setLoad({ kind: "loading" });
    (async () => {
      try {
        const res = await adminFetch(
          `/api/admin/snapshot/${encodeURIComponent(username.toLowerCase())}`,
        );
        const body = (await res.json().catch(() => ({}))) as SnapshotResponse;
        if (cancelled) return;
        if (!res.ok || !body.success) {
          setLoad({ kind: "error", message: body.message ?? `Erro ${res.status}` });
          return;
        }
        if (!body.snapshot) {
          setLoad({ kind: "missing" });
          return;
        }
        const result = snapshotToReportData({
          payload: body.snapshot.payload ?? {},
          meta: body.snapshot.meta ?? undefined,
          benchmark: body.snapshot.benchmark,
        });
        setLoad({
          kind: "ready",
          result,
          snapshotId: body.snapshot.id,
          payload: body.snapshot.payload ?? {},
          createdAt: body.snapshot.created_at,
          expiresAt: body.snapshot.expires_at ?? null,
        });
      } catch (e) {
        if (cancelled) return;
        setLoad({
          kind: "error",
          message: e instanceof Error ? e.message : "Erro desconhecido.",
        });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [authState, username]);

  if (authState === "checking") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface-base text-content-secondary">
        A verificar sessão…
      </div>
    );
  }

  if (authState === "signed_out") {
    return (
      <>
        <AdminGate onSuccess={() => setAuthState("in")} />
        <Toaster />
      </>
    );
  }

  return (
    <ReportThemeWrapper>
      <div className="min-h-screen bg-surface-base">
        <ExitPreviewPill username={username} variant={variant} state={effectiveState} />
        {variant === "internal_lab" ? <LabFullPreviewBanner /> : null}
        {load.kind === "loading" || load.kind === "idle" ? (
          <CenteredMessage
            title="A carregar relatório…"
            body={`A obter o relatório mais recente para @${username}.`}
          />
        ) : load.kind === "missing" ? (
          <CenteredMessage
            title="Ainda não existe relatório para este perfil."
            body={`Não há snapshot guardado para @${username}. Corre uma análise primeiro no cockpit ou em /analyze/${username}.`}
          />
        ) : load.kind === "error" ? (
          <CenteredMessage
            title="Não foi possível carregar o relatório."
            body={load.message}
            tone="danger"
          />
        ) : (
          <ReportShellV2
            result={load.result}
            snapshotId={load.snapshotId}
            payload={load.payload}
            analyzedAtIso={load.createdAt}
            expiresAtIso={load.expiresAt}
            variant={variant}
            featuresOverride={featuresOverride}
            premiumUnlocked={shellState.premiumUnlocked}
            unlocked={shellState.premiumUnlocked}
            leadCaptured={shellState.leadCaptured}
            lockBoundary={shellState.lockBoundary}
            isAdminPreview={true}
            actions={{}}
          />
        )}
      </div>
    </ReportThemeWrapper>
  );
}

function ExitPreviewPill({
  username,
  variant,
}: {
  username: string;
  variant: ReportVariant;
}) {
  const navigate = useNavigate();
  const variantLabel: Record<ReportVariant, { label: string; className: string }> = {
    public_mvp: {
      label: "PÚBLICO",
      className: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    },
    pro_preview: {
      label: "PRO",
      className: "bg-[rgb(var(--accent-soft-pale))] text-[rgb(var(--accent-violet-deep))] ring-[rgb(var(--accent-soft))]",
    },
    internal_lab: {
      label: "INTERNAL · LAB",
      className: "bg-amber-50 text-amber-700 ring-amber-200",
    },
  };
  const meta = variantLabel[variant];
  return (
    <div className="fixed top-3 right-3 z-50 flex items-center gap-2 print:hidden">
      <span
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] ring-1 shadow-sm backdrop-blur-sm",
          meta.className,
        )}
        aria-label={`Variante: ${meta.label}`}
      >
        {variant === "internal_lab" ? (
          <FlaskConical className="h-3 w-3" aria-hidden="true" />
        ) : null}
        {meta.label}
      </span>
      <button
        type="button"
        onClick={() =>
          navigate({
            to: "/admin/report-lab",
            search: { profile: username, variant },
          })
        }
        className="inline-flex items-center gap-1.5 rounded-full border border-border-default/50 bg-white/90 px-3 py-1.5 text-[12px] font-medium text-content-secondary shadow-sm backdrop-blur-sm transition-colors hover:border-border-strong/60 hover:text-content-primary"
        aria-label="Sair da pré-visualização"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Sair da pré-visualização
      </button>
    </div>
  );
}

function CenteredMessage({
  title,
  body,
  tone = "neutral",
}: {
  title: string;
  body: string;
  tone?: "neutral" | "danger";
}) {
  const toneClasses =
    tone === "danger"
      ? "border-signal-danger/30 bg-tint-danger/40"
      : "border-border-default/40 bg-surface-secondary";
  return (
    <div className="mx-auto max-w-3xl px-6 py-24">
      <div className={`rounded-xl border p-8 shadow-card ${toneClasses}`}>
        <h1 className="font-display text-2xl text-content-primary">{title}</h1>
        <p className="mt-3 text-sm text-content-secondary">{body}</p>
      </div>
    </div>
  );
}

function LabFullPreviewBanner() {
  return (
    <div className="border-b border-amber-200 bg-amber-50/70 px-5 py-3 print:hidden">
      <div className="mx-auto max-w-[1520px] flex flex-col gap-1 md:flex-row md:items-center md:justify-between md:gap-4">
        <p className="text-eyebrow-sm font-semibold text-amber-800">
          LAB INTERNO · FULL PREVIEW
        </p>
        <p className="text-xs text-amber-800/80 leading-relaxed">
          Este modo mostra blocos experimentais e não representa a versão comercial.
        </p>
      </div>
    </div>
  );
}
