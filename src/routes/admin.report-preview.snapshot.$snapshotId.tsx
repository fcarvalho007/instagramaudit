/**
 * /admin/report-preview/snapshot/:snapshotId — pré-visualização de um
 * snapshot específico por id.
 *
 * Espelha `/admin/report-preview/$username` mas garante que se renderiza
 * exactamente a linha listada no painel "Relatórios". Útil porque
 * `analysis_snapshots` faz upsert por `cache_key`: a "última snapshot do
 * username" pode divergir do que estava na tabela quando o admin clicou.
 *
 * Acesso: mesmo gate de /admin (Google + allowlist).
 * NÃO chama Apify, NÃO regenera, NÃO altera a snapshot.
 * `noindex, nofollow`.
 */

import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { ReportThemeWrapper } from "@/components/report/report-theme-wrapper";
import { ReportPage } from "@/components/report/report-page";
import { AdminGate } from "@/components/admin/admin-gate";
import { Toaster } from "@/components/ui/sonner";
import { supabase } from "@/integrations/supabase/client";
import { adminFetch } from "@/lib/admin/fetch";
import {
  snapshotToReportData,
  type AdapterResult,
  type SnapshotPayload,
  type SnapshotMetadata,
  type ReportBenchmarkInput,
} from "@/lib/report/snapshot-to-report-data";

export const Route = createFileRoute(
  "/admin/report-preview/snapshot/$snapshotId",
)({
  component: AdminSnapshotPreviewPage,
  head: () => ({
    meta: [
      { title: "Pré-visualização de snapshot · Admin · InstaBench" },
      { name: "robots", content: "noindex, nofollow" },
    ],
    scripts: [
      // Pré-hidratação: paleta clara antes do primeiro paint em hard reloads.
      { children: `document.body.setAttribute("data-theme","light")` },
    ],
  }),
});

type AuthState = "checking" | "signed_out" | "denied" | "in";

const UNSET: unique symbol = Symbol("unset");
type EvaluatedToken = string | null | typeof UNSET;

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
      snapshotMeta: {
        id: string;
        instagram_username: string;
        created_at: string;
        updated_at: string;
      };
    };

function AdminSnapshotPreviewPage() {
  const { snapshotId } = Route.useParams();
  const [authState, setAuthState] = useState<AuthState>("checking");
  const [deniedEmail, setDeniedEmail] = useState<string | null>(null);
  const lastEvaluatedTokenRef = useRef<EvaluatedToken>(UNSET);
  const [load, setLoad] = useState<LoadState>({ kind: "idle" });

  // ---------- Admin gate (mesma lógica do /admin) ----------
  useEffect(() => {
    let cancelled = false;

    async function evaluate(token: string | null) {
      if (lastEvaluatedTokenRef.current === token) return;
      lastEvaluatedTokenRef.current = token;
      if (!token) {
        if (!cancelled) {
          setAuthState("signed_out");
          setDeniedEmail(null);
        }
        return;
      }
      try {
        const res = await fetch("/api/admin/whoami", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const body = (await res.json().catch(() => ({}))) as {
          allowed?: boolean;
          email?: string | null;
        };
        if (cancelled) return;
        if (body.allowed) {
          setAuthState("in");
          setDeniedEmail(null);
        } else {
          setDeniedEmail(body.email ?? null);
          setAuthState("denied");
          await supabase.auth.signOut().catch(() => null);
        }
      } catch {
        if (!cancelled) setAuthState("signed_out");
      }
    }

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      void evaluate(session?.access_token ?? null);
    });
    void supabase.auth.getSession().then(({ data }) => {
      void evaluate(data.session?.access_token ?? null);
    });

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  // ---------- Load snapshot por id assim que o admin entra ----------
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
          setLoad({
            kind: "error",
            message: body.message ?? `Erro ${res.status}`,
          });
          return;
        }
        if (!body.snapshot) {
          setLoad({ kind: "missing" });
          return;
        }
        const result = snapshotToReportData({
          payload: body.snapshot.payload ?? {},
          meta: body.snapshot.meta ?? undefined,
        });
        setLoad({
          kind: "ready",
          result,
          snapshotMeta: {
            id: body.snapshot.id,
            instagram_username: body.snapshot.instagram_username,
            created_at: body.snapshot.created_at,
            updated_at: body.snapshot.updated_at,
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

  async function handleLogout() {
    await supabase.auth.signOut().catch(() => null);
    lastEvaluatedTokenRef.current = UNSET;
    setAuthState("signed_out");
    setDeniedEmail(null);
  }

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
        <AdminGate />
        <Toaster />
      </>
    );
  }

  if (authState === "denied") {
    return (
      <>
        <div className="flex min-h-screen items-center justify-center bg-surface-base px-4">
          <div className="w-full max-w-sm space-y-6 rounded-xl border border-border-subtle bg-surface-elevated p-8 shadow-xl">
            <div className="space-y-2">
              <p className="font-mono text-xs uppercase tracking-[0.18em] text-content-tertiary">
                InstaBench · Admin
              </p>
              <h1 className="font-display text-2xl text-content-primary">
                Acesso restrito
              </h1>
              <p className="text-sm text-content-secondary">
                {deniedEmail
                  ? `A conta ${deniedEmail} não está autorizada a aceder ao backoffice.`
                  : "Esta conta Google não está autorizada a aceder ao backoffice."}
              </p>
            </div>
            <Button
              type="button"
              className="w-full"
              onClick={() => {
                lastEvaluatedTokenRef.current = UNSET;
                setAuthState("signed_out");
              }}
            >
              Entrar com outra conta
            </Button>
          </div>
        </div>
        <Toaster />
      </>
    );
  }

  return (
    <ReportThemeWrapper>
      <AdminPreviewChrome
        snapshotId={snapshotId}
        load={load}
        onLogout={handleLogout}
      />
    </ReportThemeWrapper>
  );
}

interface ChromeProps {
  snapshotId: string;
  load: LoadState;
  onLogout: () => void;
}

function AdminPreviewChrome({ snapshotId, load, onLogout }: ChromeProps) {
  return (
    <div className="bg-surface-base min-h-screen">
      <AdminBanner snapshotId={snapshotId} load={load} onLogout={onLogout} />
      {load.kind === "loading" || load.kind === "idle" ? (
        <PreviewMessage
          title="A carregar snapshot…"
          body={`A obter o snapshot ${snapshotId}.`}
        />
      ) : load.kind === "missing" ? (
        <PreviewMessage
          title="Snapshot não encontrado."
          body={`O snapshot ${snapshotId} já não existe (pode ter sido eliminado pela retenção de 5 dias) ou nunca existiu.`}
        />
      ) : load.kind === "error" ? (
        <PreviewMessage
          title="Não foi possível carregar o snapshot."
          body={load.message}
          tone="danger"
        />
      ) : (
        <>
          <ReportPage data={load.result.data} />
          <CoverageNotice load={load} />
        </>
      )}
      <AdminFooterNotice />
    </div>
  );
}

function AdminBanner({ snapshotId, load, onLogout }: ChromeProps) {
  const ready = load.kind === "ready" ? load : null;
  const generated = ready
    ? new Date(ready.snapshotMeta.created_at).toLocaleString("pt-PT", {
        dateStyle: "medium",
        timeStyle: "short",
      })
    : null;
  const updated = ready
    ? new Date(ready.snapshotMeta.updated_at).toLocaleString("pt-PT", {
        dateStyle: "medium",
        timeStyle: "short",
      })
    : null;
  const handle = ready?.snapshotMeta.instagram_username ?? null;
  return (
    <div className="border-b border-border-default/40 bg-surface-secondary">
      <div className="mx-auto flex max-w-7xl flex-col gap-3 px-6 py-3 md:flex-row md:items-center md:justify-between">
        <div className="space-y-1">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-content-tertiary">
            InstaBench · Admin · Pré-visualização por snapshot
          </p>
          <p className="text-sm text-content-primary">
            {handle ? <>@{handle}</> : <>snapshot</>}
            <span className="ml-2 font-mono text-xs text-content-tertiary">
              · id {snapshotId.slice(0, 8)}…
            </span>
            {generated ? (
              <span className="ml-2 text-content-tertiary">
                · gerado {generated}
              </span>
            ) : null}
            {updated ? (
              <span className="ml-2 text-content-tertiary">
                · actualizado {updated}
              </span>
            ) : null}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to="/admin"
            className="rounded-md border border-border-default/40 px-3 py-1.5 text-xs font-medium text-content-primary transition-colors hover:border-border-strong/60"
          >
            Voltar ao cockpit
          </Link>
          <Button variant="outline" size="sm" onClick={onLogout}>
            Terminar sessão
          </Button>
        </div>
      </div>
      <div className="border-t border-border-subtle/30 bg-tint-warning/40">
        <div className="mx-auto max-w-7xl px-6 py-2">
          <p className="font-mono text-[11px] uppercase tracking-wide text-signal-warning">
            Relatório disponível durante 5 dias após a última actualização ·
            visível apenas a administradores · não indexável
          </p>
        </div>
      </div>
    </div>
  );
}

function CoverageNotice({ load }: { load: Extract<LoadState, { kind: "ready" }> }) {
  const c = load.result.coverage;
  const lines: string[] = [];
  if (c.postsAvailable < 30) {
    lines.push(
      `Apenas ${c.postsAvailable} publicações disponíveis (janela de ${c.windowDays} dias). Heatmap, evolução temporal e dias da semana são derivados desta amostra reduzida.`,
    );
  }
  if (c.benchmark === "placeholder") {
    lines.push(
      "Benchmarks por escalão e por formato ainda não estão ligados — os marcadores aparecem a 0%.",
    );
  }
  if (c.competitors === "empty") {
    lines.push("Concorrentes não recolhidos neste snapshot — só o perfil analisado é mostrado.");
  }
  if (!c.hasAiInsights) {
    lines.push("Insights de IA ainda não gerados para este snapshot.");
  }
  if (lines.length === 0) return null;
  return (
    <div className="mx-auto max-w-7xl px-6 pb-10">
      <div className="rounded-xl border border-border-default/40 bg-surface-secondary p-5 shadow-card">
        <p className="font-mono text-[10px] uppercase tracking-wider text-content-tertiary">
          Limitações conhecidas deste snapshot
        </p>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-content-secondary">
          {lines.map((l) => (
            <li key={l}>{l}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function PreviewMessage({
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
    <div className="mx-auto max-w-3xl px-6 py-16">
      <div className={`rounded-xl border p-8 shadow-card ${toneClasses}`}>
        <h1 className="font-display text-2xl text-content-primary">{title}</h1>
        <p className="mt-3 text-sm text-content-secondary">{body}</p>
      </div>
    </div>
  );
}

function AdminFooterNotice() {
  return (
    <footer className="border-t border-border-subtle/30 bg-surface-secondary">
      <div className="mx-auto max-w-7xl px-6 py-4">
        <p className="font-mono text-[11px] uppercase tracking-wide text-content-tertiary">
          Pré-visualização administrativa · Relatório disponível durante 5 dias após a última actualização
        </p>
      </div>
    </footer>
  );
}