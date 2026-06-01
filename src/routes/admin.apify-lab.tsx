import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { AdminAuthShell } from "@/components/admin/v2/admin-auth-shell";
import { adminFetch } from "@/lib/admin/fetch";

type WindowKind = "baseline" | "30d" | "60d" | "90d" | "365d";
type Segment = "medium" | "high" | "low";

interface LabRun {
  id: string;
  created_at: string;
  admin_email: string | null;
  profile_handle: string;
  profile_segment: string | null;
  window_kind: string;
  status: string;
  semantic_code: string | null;
  apify_run_id: string | null;
  posts_returned: number | null;
  newest_post_at: string | null;
  oldest_post_at: string | null;
  observed_days: number | null;
  duration_ms: number | null;
  estimated_cost_usd: number | string | null;
  actual_cost_usd: number | string | null;
  normalize_ok: boolean | null;
  notes: string | null;
  error_excerpt: string | null;
}

const ALL_WINDOWS: WindowKind[] = ["baseline", "30d", "60d", "90d", "365d"];

const SEGMENT_LABEL: Record<Segment, string> = {
  medium: "Médio (profissional)",
  high: "Alto (marca/criador)",
  low: "Baixo (esporádico)",
};

function fmtCost(v: number | string | null | undefined): string {
  if (v === null || v === undefined) return "—";
  const n = typeof v === "string" ? Number.parseFloat(v) : v;
  if (!Number.isFinite(n)) return "—";
  return `$${n.toFixed(4)}`;
}

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toISOString().slice(0, 10);
}

function fmtDateTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toISOString().replace("T", " ").slice(0, 16);
}

function fmtDuration(ms: number | null): string {
  if (ms === null || ms === undefined) return "—";
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function ApifyLabPage() {
  const [profiles, setProfiles] = useState<Record<Segment, string>>({
    medium: "",
    high: "",
    low: "",
  });
  const [singleHandle, setSingleHandle] = useState("");
  const [singleSegment, setSingleSegment] = useState<Segment>("medium");
  const [singleWindow, setSingleWindow] = useState<WindowKind>("baseline");
  const [runs, setRuns] = useState<LabRun[]>([]);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<string>("");

  async function loadRuns() {
    const res = await adminFetch("/api/admin/apify-lab");
    if (!res.ok) return;
    const json = (await res.json()) as { runs?: LabRun[] };
    setRuns(json.runs ?? []);
  }

  useEffect(() => {
    loadRuns().catch(console.error);
  }, []);

  async function runOne(
    handle: string,
    segment: Segment,
    window_kind: WindowKind,
  ): Promise<void> {
    const res = await adminFetch("/api/admin/apify-lab", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        profile_handle: handle,
        profile_segment: segment,
        window_kind,
      }),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`HTTP ${res.status}: ${text.slice(0, 120)}`);
    }
  }

  async function runMatrix() {
    const targets: Array<{ handle: string; segment: Segment }> = [];
    (Object.keys(profiles) as Segment[]).forEach((seg) => {
      const h = profiles[seg].trim().replace(/^@/, "");
      if (h) targets.push({ handle: h, segment: seg });
    });
    if (targets.length === 0) {
      alert("Preenche pelo menos um handle.");
      return;
    }
    if (
      !confirm(
        `Vais correr ${targets.length * ALL_WINDOWS.length} chamadas reais ao Apify. Continuar?`,
      )
    ) {
      return;
    }
    setBusy(true);
    try {
      let i = 0;
      const total = targets.length * ALL_WINDOWS.length;
      for (const t of targets) {
        for (const w of ALL_WINDOWS) {
          i += 1;
          setProgress(`[${i}/${total}] @${t.handle} · ${w}`);
          try {
            await runOne(t.handle, t.segment, w);
          } catch (err) {
            console.error("[apify-lab] run failed", err);
          }
          await loadRuns();
          await new Promise((r) => setTimeout(r, 2000));
        }
      }
      setProgress("Matriz concluída.");
    } finally {
      setBusy(false);
    }
  }

  async function runSingle() {
    const h = singleHandle.trim().replace(/^@/, "");
    if (!h) {
      alert("Indica um handle.");
      return;
    }
    setBusy(true);
    setProgress(`[1/1] @${h} · ${singleWindow}`);
    try {
      await runOne(h, singleSegment, singleWindow);
      await loadRuns();
      setProgress("Concluído.");
    } catch (err) {
      setProgress(`Erro: ${(err as Error).message}`);
    } finally {
      setBusy(false);
    }
  }

  const csv = useMemo(() => {
    const header = [
      "created_at",
      "profile",
      "segment",
      "window",
      "posts",
      "observed_days",
      "newest",
      "oldest",
      "estimated_cost_usd",
      "actual_cost_usd",
      "duration_ms",
      "status",
      "semantic_code",
      "normalize_ok",
      "apify_run_id",
      "notes",
      "error_excerpt",
    ];
    const lines = runs.map((r) =>
      [
        r.created_at,
        r.profile_handle,
        r.profile_segment ?? "",
        r.window_kind,
        r.posts_returned ?? "",
        r.observed_days ?? "",
        r.newest_post_at ?? "",
        r.oldest_post_at ?? "",
        r.estimated_cost_usd ?? "",
        r.actual_cost_usd ?? "",
        r.duration_ms ?? "",
        r.status,
        r.semantic_code ?? "",
        r.normalize_ok ?? "",
        r.apify_run_id ?? "",
        (r.notes ?? "").replace(/[\n,]/g, " "),
        (r.error_excerpt ?? "").replace(/[\n,]/g, " "),
      ].join(","),
    );
    return [header.join(","), ...lines].join("\n");
  }, [runs]);

  function downloadCsv() {
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `apify-lab-runs-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="min-h-screen bg-surface-base p-6 font-sans">
      <div className="mx-auto max-w-7xl space-y-6">
        <header>
          <h1 className="text-2xl font-semibold text-content-primary">
            Apify Lab — Janelas temporais
          </h1>
          <p className="mt-1 text-sm text-content-secondary">
            Teste controlado de <code className="font-mono">onlyPostsNewerThan</code>{" "}
            no actor <code className="font-mono">apify/instagram-scraper</code>.
            Cada execução gera uma chamada real e consome créditos reais —
            sujeita ao allowlist, kill-switch e cap diário.
          </p>
        </header>

        <section className="rounded-lg border border-amber-300/60 bg-amber-50 p-4 text-sm text-amber-900">
          <strong>Aviso:</strong> esta página corre o actor real do Apify
          contra os handles indicados. Garante que <code>APIFY_ENABLED=true</code>,
          que cada handle está em <code>APIFY_ALLOWLIST</code>, e que o cap
          diário (<code>APIFY_HARD_CAP_USD</code>) cobre a matriz completa.
          Nada é escrito em <code>report_snapshots</code>, <code>provider_call_logs</code>,
          <code>leads</code> ou pipelines de produção.
        </section>

        <section className="rounded-lg border border-border-default bg-surface-elevated p-5">
          <h2 className="text-base font-semibold text-content-primary">
            Matriz 3 × 5
          </h2>
          <p className="mt-1 text-xs text-content-tertiary">
            3 perfis × 5 janelas (baseline · 30d · 60d · 90d · 365d), sequencial
            com 2s de pausa entre chamadas.
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            {(Object.keys(profiles) as Segment[]).map((seg) => (
              <label key={seg} className="block text-sm">
                <span className="text-content-secondary">{SEGMENT_LABEL[seg]}</span>
                <input
                  type="text"
                  className="mt-1 w-full rounded border border-border-default bg-white px-2 py-1.5 font-mono text-sm"
                  placeholder="username"
                  value={profiles[seg]}
                  onChange={(e) =>
                    setProfiles((p) => ({ ...p, [seg]: e.target.value }))
                  }
                  disabled={busy}
                />
              </label>
            ))}
          </div>
          <div className="mt-4 flex items-center gap-3">
            <button
              type="button"
              onClick={runMatrix}
              disabled={busy}
              className="rounded bg-content-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              {busy ? "A correr…" : "Correr matriz completa"}
            </button>
            {progress ? (
              <span className="text-xs font-mono text-content-secondary">
                {progress}
              </span>
            ) : null}
          </div>
        </section>

        <section className="rounded-lg border border-border-default bg-surface-elevated p-5">
          <h2 className="text-base font-semibold text-content-primary">
            Teste individual
          </h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-4">
            <input
              type="text"
              placeholder="username"
              value={singleHandle}
              onChange={(e) => setSingleHandle(e.target.value)}
              disabled={busy}
              className="rounded border border-border-default bg-white px-2 py-1.5 font-mono text-sm"
            />
            <select
              value={singleSegment}
              onChange={(e) => setSingleSegment(e.target.value as Segment)}
              disabled={busy}
              className="rounded border border-border-default bg-white px-2 py-1.5 text-sm"
            >
              {(Object.keys(SEGMENT_LABEL) as Segment[]).map((s) => (
                <option key={s} value={s}>
                  {SEGMENT_LABEL[s]}
                </option>
              ))}
            </select>
            <select
              value={singleWindow}
              onChange={(e) => setSingleWindow(e.target.value as WindowKind)}
              disabled={busy}
              className="rounded border border-border-default bg-white px-2 py-1.5 text-sm"
            >
              {ALL_WINDOWS.map((w) => (
                <option key={w} value={w}>
                  {w}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={runSingle}
              disabled={busy}
              className="rounded border border-content-primary px-4 py-2 text-sm font-semibold text-content-primary disabled:opacity-50"
            >
              Correr um teste
            </button>
          </div>
        </section>

        <section className="rounded-lg border border-border-default bg-surface-elevated p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-content-primary">
              Histórico ({runs.length})
            </h2>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={loadRuns}
                className="rounded border border-border-default px-3 py-1.5 text-xs"
              >
                Refresh
              </button>
              <button
                type="button"
                onClick={downloadCsv}
                disabled={runs.length === 0}
                className="rounded border border-border-default px-3 py-1.5 text-xs disabled:opacity-50"
              >
                Export CSV
              </button>
            </div>
          </div>

          <div className="mt-3 overflow-x-auto">
            <table className="w-full font-mono text-xs">
              <thead>
                <tr className="border-b border-border-default text-left text-content-secondary">
                  <th className="py-2 pr-3">Quando</th>
                  <th className="py-2 pr-3">Perfil</th>
                  <th className="py-2 pr-3">Seg</th>
                  <th className="py-2 pr-3">Janela</th>
                  <th className="py-2 pr-3 text-right">Posts</th>
                  <th className="py-2 pr-3 text-right">Obs. days</th>
                  <th className="py-2 pr-3">Newest</th>
                  <th className="py-2 pr-3">Oldest</th>
                  <th className="py-2 pr-3 text-right">Cost real</th>
                  <th className="py-2 pr-3 text-right">Cost est.</th>
                  <th className="py-2 pr-3 text-right">Duração</th>
                  <th className="py-2 pr-3">Status</th>
                  <th className="py-2 pr-3">Norm.</th>
                  <th className="py-2 pr-3">Notas</th>
                </tr>
              </thead>
              <tbody>
                {runs.map((r) => (
                  <tr
                    key={r.id}
                    className="border-b border-border-default/60"
                  >
                    <td className="py-1.5 pr-3 whitespace-nowrap">
                      {fmtDateTime(r.created_at)}
                    </td>
                    <td className="py-1.5 pr-3">@{r.profile_handle}</td>
                    <td className="py-1.5 pr-3">{r.profile_segment ?? "—"}</td>
                    <td className="py-1.5 pr-3">{r.window_kind}</td>
                    <td className="py-1.5 pr-3 text-right">
                      {r.posts_returned ?? "—"}
                    </td>
                    <td className="py-1.5 pr-3 text-right">
                      {r.observed_days ?? "—"}
                    </td>
                    <td className="py-1.5 pr-3">{fmtDate(r.newest_post_at)}</td>
                    <td className="py-1.5 pr-3">{fmtDate(r.oldest_post_at)}</td>
                    <td className="py-1.5 pr-3 text-right">
                      {fmtCost(r.actual_cost_usd)}
                    </td>
                    <td className="py-1.5 pr-3 text-right text-content-tertiary">
                      {fmtCost(r.estimated_cost_usd)}
                    </td>
                    <td className="py-1.5 pr-3 text-right">
                      {fmtDuration(r.duration_ms)}
                    </td>
                    <td className="py-1.5 pr-3">
                      {r.status}
                      {r.semantic_code ? (
                        <span className="ml-1 text-content-tertiary">
                          ({r.semantic_code})
                        </span>
                      ) : null}
                    </td>
                    <td className="py-1.5 pr-3">
                      {r.normalize_ok === null
                        ? "—"
                        : r.normalize_ok
                          ? "ok"
                          : "fail"}
                    </td>
                    <td className="py-1.5 pr-3 max-w-xs truncate">
                      {r.error_excerpt ?? r.notes ?? ""}
                    </td>
                  </tr>
                ))}
                {runs.length === 0 ? (
                  <tr>
                    <td
                      colSpan={14}
                      className="py-6 text-center text-content-tertiary"
                    >
                      Sem execuções ainda.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}

export const Route = createFileRoute("/admin/apify-lab")({
  component: () => (
    <AdminAuthShell>
      <ApifyLabPage />
    </AdminAuthShell>
  ),
});