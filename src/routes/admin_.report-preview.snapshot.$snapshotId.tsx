/**
 * /admin/report-preview/snapshot/:snapshotId — pré-visualização de um
 * snapshot específico por id, em ECRÃ COMPLETO.
 *
 * Espelha `/admin/report-preview/:username` mas garante que se renderiza
 * exactamente o snapshot indicado.
 *
 * Acesso: mesmo gate de /admin (Google + allowlist).
 * NÃO chama Apify, NÃO regenera, NÃO altera a snapshot.
 * `noindex, nofollow`.
 */

import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { ReportThemeWrapper } from "@/components/report/report-theme-wrapper";
import { ReportShellV2 } from "@/components/report-redesign/v2/report-shell-v2";
import { AdminGate } from "@/components/admin/admin-gate";
import { Toaster } from "@/components/ui/sonner";
import { adminFetch } from "@/lib/admin/fetch";
import { readAdminEmail } from "@/lib/admin/simple-gate";
import {
  snapshotToReportData,
  type AdapterResult,
  type SnapshotPayload,
  type SnapshotMetadata,
  type ReportBenchmarkInput,
} from "@/lib/report/snapshot-to-report-data";

export const Route = createFileRoute(
  "/admin_/report-preview/snapshot/$snapshotId",
)({
  component: AdminSnapshotPreviewPage,
  head: () => ({
    meta: [
      { title: "Pré-visualização de snapshot · Admin · AuditProfiles" },
      { name: "robots", content: "noindex, nofollow" },
    ],
    scripts: [
      { children: `document.body.setAttribute("data-theme","light")` },
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
    updated_at: string;
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
      payload: SnapshotPayload;
      snapshotMeta: {
        id: string;
        instagram_username: string;
        created_at: string;
        expires_at: string | null;
      };
    };

function AdminSnapshotPreviewPage() {
  const { snapshotId } = Route.useParams();
  const navigate = useNavigate();
  const [authState, setAuthState] = useState<AuthState>("checking");
  const [load, setLoad] = useState<LoadState>({ kind: "idle" });

  useEffect(() => {
    setAuthState(readAdminEmail() ? "in" : "signed_out");
  }, []);

  useEffect(() => {
    if (authState !== "in") return;
    let cancelled = false;
    setLoad({ kind: "loading" });
    (async () => {
      try {
        const res = await adminFetch(
          `/api/admin/snapshot-by-id/${encodeURIComponent(snapshotId)}`,
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
          payload: body.snapshot.payload ?? {},
          snapshotMeta: {
            id: body.snapshot.id,
            instagram_username: body.snapshot.instagram_username,
            created_at: body.snapshot.created_at,
            expires_at: body.snapshot.expires_at ?? null,
          },
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
  }, [authState, snapshotId]);

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
        <button
          type="button"
          onClick={() => navigate({ to: "/admin/relatorios" })}
          className="fixed top-3 right-3 z-50 inline-flex items-center gap-1.5 rounded-full border border-border-default/50 bg-white/90 px-3 py-1.5 text-[12px] font-medium text-content-secondary shadow-sm backdrop-blur-sm transition-colors hover:border-border-strong/60 hover:text-content-primary print:hidden"
          aria-label="Sair da pré-visualização"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Sair da pré-visualização
        </button>
        {load.kind === "loading" || load.kind === "idle" ? (
          <CenteredMessage
            title="A carregar snapshot…"
            body={`A obter o snapshot ${snapshotId}.`}
          />
        ) : load.kind === "missing" ? (
          <CenteredMessage
            title="Snapshot não encontrado."
            body={`O snapshot ${snapshotId} já não existe (pode ter sido eliminado pela retenção) ou nunca existiu.`}
          />
        ) : load.kind === "error" ? (
          <CenteredMessage
            title="Não foi possível carregar o snapshot."
            body={load.message}
            tone="danger"
          />
        ) : (
          <ReportShellV2
            result={load.result}
            snapshotId={load.snapshotMeta.id}
            payload={load.payload}
            analyzedAtIso={load.snapshotMeta.created_at}
            expiresAtIso={load.snapshotMeta.expires_at}
            variant="internal_lab"
            premiumUnlocked
            unlocked
            actions={{}}
          />
        )}
      </div>
    </ReportThemeWrapper>
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
