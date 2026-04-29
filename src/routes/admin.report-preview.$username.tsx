/**
 * /admin/report-preview/:username — pré-visualização administrativa do
 * relatório real gerado a partir de `analysis_snapshots.normalized_payload`.
 *
 * - Acesso restrito: mesma lógica do gate de /admin (Google Sign-in + allowlist).
 * - NÃO chama Apify, NÃO regenera, NÃO altera a snapshot.
 * - Renderiza o mesmo layout do mock (`/report/example`) substituindo apenas
 *   a fonte de dados via <ReportPage data={...} />.
 * - Usa o mesmo `ReportThemeWrapper` (paleta clara) do exemplo.
 * - `noindex, nofollow`.
 */

import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { ReportThemeWrapper } from "@/components/report/report-theme-wrapper";
import { ReportPage } from "@/components/report/report-page";
import { AdminGate } from "@/components/admin/admin-gate";
import { Toaster } from "@/components/ui/sonner";
import { adminFetch } from "@/lib/admin/fetch";
import { clearAdminEmail, readAdminEmail } from "@/lib/admin/simple-gate";
import {
  snapshotToReportData,
  type AdapterResult,
  type SnapshotPayload,
  type SnapshotMetadata,
  type ReportBenchmarkInput,
} from "@/lib/report/snapshot-to-report-data";

export const Route = createFileRoute("/admin/report-preview/$username")({
  component: AdminReportPreviewPage,
  head: () => ({
    meta: [
      { title: "Pré-visualização de relatório · Admin · InstaBench" },
      { name: "robots", content: "noindex, nofollow" },
    ],
    scripts: [
      // Pré-hidratação: paleta clara antes do primeiro paint em hard reloads.
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
  | { kind: "ready"; result: AdapterResult; snapshotMeta: { created_at: string } };

function AdminReportPreviewPage() {
  const { username } = Route.useParams();
  const [authState, setAuthState] = useState<AuthState>("checking");
  const [load, setLoad] = useState<LoadState>({ kind: "idle" });

  // ---------- Admin gate simples (localStorage) ----------
  useEffect(() => {
    setAuthState(readAdminEmail() ? "in" : "signed_out");
  }, []);

  // ---------- Load snapshot once admin is in ----------
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
          benchmark: body.snapshot.benchmark,
        });
        setLoad({
          kind: "ready",
          result,
          snapshotMeta: { created_at: body.snapshot.created_at },
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

  async function handleLogout() {
    clearAdminEmail();
    setAuthState("signed_out");
  }

  // ---------- Auth states ----------
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

  // ---------- Authorized: render preview ----------
  return (
    <ReportThemeWrapper>
      <AdminPreviewChrome
        username={username}
        load={load}
        onLogout={handleLogout}
      />
    </ReportThemeWrapper>
  );
}

interface ChromeProps {
  username: string;
  load: LoadState;
  onLogout: () => void;
}

function AdminPreviewChrome({ username, load, onLogout }: ChromeProps) {
  return (
    <div className="bg-surface-base min-h-screen">
      <AdminBanner username={username} load={load} onLogout={onLogout} />
      {load.kind === "loading" || load.kind === "idle" ? (
        <PreviewMessage
          title="A carregar snapshot…"
          body={`A obter o relatório mais recente para @${username}.`}
        />
      ) : load.kind === "missing" ? (
        <PreviewMessage
          title="Ainda não existe relatório para este perfil."
          body={`Não existe nenhum snapshot guardado para @${username}. Corre uma análise primeiro a partir do cockpit ou da página /analyze/${username}.`}
        />
      ) : load.kind === "error" ? (
        <PreviewMessage
          title="Não foi possível carregar o snapshot."
          body={load.message}
          tone="danger"
        />
      ) : (
        <>
          <CoverageStrip load={load} />
          <ReportPage data={load.result.data} />
          <CoverageNotice load={load} />
        </>
      )}
      <AdminFooterNotice />
    </div>
  );
}

function AdminBanner({ username, load, onLogout }: ChromeProps) {
  const generated =
    load.kind === "ready"
      ? new Date(load.snapshotMeta.created_at).toLocaleString("pt-PT", {
          dateStyle: "medium",
          timeStyle: "short",
        })
      : null;
  return (
    <div className="border-b border-border-default/40 bg-surface-secondary">
      <div className="mx-auto flex max-w-7xl flex-col gap-3 px-6 py-3 md:flex-row md:items-center md:justify-between">
        <div className="space-y-1">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-content-tertiary">
            InstaBench · Admin · Pré-visualização de relatório real
          </p>
          <p className="text-sm text-content-primary">
            @{username}
            {generated ? (
              <span className="ml-2 text-content-tertiary">
                · snapshot de {generated}
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
            Relatório disponível durante 5 dias após geração ·
            visível apenas a administradores · não indexável
          </p>
        </div>
      </div>
    </div>
  );
}

function CoverageNotice({ load }: { load: Extract<LoadState, { kind: "ready" }> }) {
  const c = load.result.coverage;
  const meta = load.result.data.meta;
  const lines: string[] = [];
  lines.push(
    c.windowDays > 0
      ? `Amostra real: ${c.postsAvailable} publicações · janela aproximada de ${c.windowDays} dias.`
      : `Amostra real: ${c.postsAvailable} publicações.`,
  );
  if (c.postsAvailable < 30) {
    lines.push(
      "Heatmap, evolução temporal e dias da semana derivam desta amostra reduzida — leitura indicativa, não estatística.",
    );
  }
  if (c.benchmark === "real") {
    const v = meta?.benchmarkDatasetVersion;
    lines.push(
      v
        ? `Benchmarks reais ligados (dataset ${v}) — leitura comparável com o escalão.`
        : "Benchmarks reais ligados — leitura comparável com o escalão.",
    );
  } else if (c.benchmark === "placeholder") {
    lines.push(
      "Benchmarks por escalão e por formato sem dados — marcadores aparecem a 0%.",
    );
  } else if (c.benchmark === "partial") {
    lines.push(
      "Benchmarks parcialmente ligados — alguns formatos podem aparecer sem referência.",
    );
  }
  if (c.competitors === "empty") {
    lines.push(
      "Concorrentes não recolhidos — secção ocultada nesta pré-visualização.",
    );
  }
  if (!c.hasAiInsights) {
    lines.push(
      "Insights de IA ainda não gerados — a secção mostra estado vazio.",
    );
  }
  if (meta?.viewsAvailable === false) {
    lines.push(
      "Sem visualizações de Reels neste snapshot — série ocultada no gráfico temporal.",
    );
  }
  lines.push(
    "Miniaturas e avatar usam gradientes editoriais — não há proxy de imagens do Instagram.",
  );
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

function CoverageStrip({ load }: { load: Extract<LoadState, { kind: "ready" }> }) {
  const c = load.result.coverage;
  const benchmarkChip =
    c.benchmark === "real"
      ? { tone: "success" as const, value: "Reais" }
      : c.benchmark === "partial"
        ? { tone: "warning" as const, value: "Parciais" }
        : { tone: "neutral" as const, value: "Indisponíveis" };
  const competitorsChip =
    c.competitors === "empty"
      ? { tone: "neutral" as const, value: "Em falta" }
      : { tone: "success" as const, value: "Presentes" };
  const aiChip = c.hasAiInsights
    ? { tone: "success" as const, value: "Gerados" }
    : { tone: "neutral" as const, value: "Por gerar" };
  const windowValue = c.windowDays > 0 ? `${c.windowDays} dias` : "amostra";
  const sampleCaption = load.result.data.meta?.sampleCaption;

  return (
    <div className="mx-auto max-w-7xl px-6 pt-6">
      <div className="rounded-xl border border-border-default/40 bg-surface-secondary p-4 shadow-card">
        <p className="font-mono text-[10px] uppercase tracking-wider text-content-tertiary">
          Cobertura deste snapshot
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <CoverageChip label="Publicações" value={String(c.postsAvailable)} tone="neutral" />
          <CoverageChip label="Janela observada" value={windowValue} tone="neutral" />
          <CoverageChip label="Benchmarks" value={benchmarkChip.value} tone={benchmarkChip.tone} />
          <CoverageChip label="Concorrentes" value={competitorsChip.value} tone={competitorsChip.tone} />
          <CoverageChip label="Insights IA" value={aiChip.value} tone={aiChip.tone} />
        </div>
        {sampleCaption ? (
          <p className="mt-3 text-xs text-content-secondary">{sampleCaption}</p>
        ) : null}
      </div>
    </div>
  );
}

function CoverageChip({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "success" | "warning" | "neutral";
}) {
  const toneClasses =
    tone === "success"
      ? "border-signal-success/30 bg-tint-success text-signal-success"
      : tone === "warning"
        ? "border-signal-warning/30 bg-tint-warning text-signal-warning"
        : "border-border-default/40 bg-surface-base text-content-secondary";
  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 ${toneClasses}`}
    >
      <span className="font-mono text-[10px] uppercase tracking-wider opacity-70">
        {label}
      </span>
      <span className="font-mono text-xs font-semibold">{value}</span>
    </span>
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
          Pré-visualização administrativa · Relatório disponível durante 5 dias após geração
        </p>
      </div>
    </footer>
  );
}
