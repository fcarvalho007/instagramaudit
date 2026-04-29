/**
 * "Sinais de Mercado" — public report section.
 *
 * Fetches `/api/market-signals` for the given snapshot and renders an
 * editorial summary of Google Trends signals. Non-blocking: never breaks
 * the report if the call fails or returns a non-usable status.
 *
 * Shown only when status === "ready" | "partial". Hidden for "disabled",
 * "blocked", "error", "timeout", "no_keywords".
 */
import { useEffect, useState } from "react";
import type { GoogleTrendsResult } from "@/lib/dataforseo/endpoints/google-trends";
import { MarketSignalsChart } from "./market-signals-chart";
import { marketSignalsCopy } from "./market-signals-copy";

type Plan = "free" | "paid";

interface MarketSignalsResponse {
  status:
    | "ready"
    | "partial"
    | "disabled"
    | "blocked"
    | "error"
    | "timeout"
    | "no_keywords";
  plan: Plan;
  keywords?: string[];
  trends?: GoogleTrendsResult | null;
  queries_used?: number;
  queries_cap?: number;
  trends_usable_keywords?: string[];
  trends_dropped_keywords?: string[];
}

interface ReportMarketSignalsProps {
  snapshotId: string;
  plan?: Plan;
}

type FetchState =
  | { status: "loading" }
  | { status: "hidden" }
  | { status: "empty"; reason: string }
  | { status: "ready"; data: MarketSignalsResponse };

/**
 * Computes the "strongest" keyword: highest mean of non-null values across
 * the time series. Returns null when no usable signal exists.
 */
function pickStrongestKeyword(
  trends: GoogleTrendsResult | null | undefined,
  usable: string[],
): string | null {
  if (!trends || usable.length === 0) return null;
  const graph = trends.items?.find(
    (it) => Array.isArray(it.keywords) && Array.isArray(it.data),
  );
  if (!graph?.keywords || !graph.data) return null;

  const usableSet = new Set(usable);
  const totals = new Map<string, { sum: number; count: number }>();
  graph.keywords.forEach((kw) => {
    if (usableSet.has(kw)) totals.set(kw, { sum: 0, count: 0 });
  });
  for (const row of graph.data) {
    graph.keywords.forEach((kw, i) => {
      const slot = totals.get(kw);
      if (!slot) return;
      const v = row.values?.[i];
      if (typeof v === "number" && Number.isFinite(v)) {
        slot.sum += v;
        slot.count += 1;
      }
    });
  }
  let best: { kw: string; mean: number } | null = null;
  for (const [kw, { sum, count }] of totals) {
    if (count === 0) continue;
    const mean = sum / count;
    if (!best || mean > best.mean) best = { kw, mean };
  }
  return best?.kw ?? null;
}

export function ReportMarketSignals({
  snapshotId,
  plan = "free",
}: ReportMarketSignalsProps) {
  const [state, setState] = useState<FetchState>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;
    async function run() {
      try {
        const res = await fetch("/api/market-signals", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ snapshotId, plan }),
        });
        const body = (await res.json().catch(
          () => null,
        )) as MarketSignalsResponse | null;
        if (cancelled) return;
        if (!body) {
          setState({
            status: "empty",
            reason: "Sem ligação aos sinais de pesquisa neste momento.",
          });
          return;
        }
        if (body.status === "ready" || body.status === "partial") {
          setState({ status: "ready", data: body });
        } else {
          setState({
            status: "empty",
            reason: emptyReasonFor(body.status),
          });
        }
      } catch {
        if (!cancelled)
          setState({
            status: "empty",
            reason: "Sem ligação aos sinais de pesquisa neste momento.",
          });
      }
    }
    void run();
    return () => {
      cancelled = true;
    };
  }, [snapshotId, plan]);

  if (state.status === "hidden") return null;

  if (state.status === "loading") {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-border-subtle/40 bg-surface-secondary/30 px-4 py-4">
        <span
          aria-hidden="true"
          className="inline-block h-2 w-2 animate-pulse rounded-full bg-content-tertiary"
        />
        <p className="font-mono text-xs text-content-tertiary">
          {marketSignalsCopy.loading}
        </p>
      </div>
    );
  }

  if (state.status === "empty") {
    return (
      <div className="rounded-xl border border-border-subtle/40 bg-surface-secondary/30 p-5 md:p-6 space-y-2">
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-content-tertiary">
          Sem dados nesta análise
        </p>
        <p className="text-sm text-content-secondary leading-relaxed">
          {state.reason}
        </p>
      </div>
    );
  }

  const { data } = state;
  const usable = data.trends_usable_keywords ?? [];
  const dropped = data.trends_dropped_keywords ?? [];
  const trends = data.trends ?? null;
  const strongest = pickStrongestKeyword(trends, usable);
  const used = data.queries_used ?? 0;
  const cap = data.queries_cap ?? 0;
  const quotaWord =
    used === 1 ? marketSignalsCopy.quotaLabelSingular : marketSignalsCopy.quotaLabelPlural;

  // Defensive: if for any reason there are no usable keywords at this point,
  // mostra um estado vazio compacto em vez de desaparecer silenciosamente.
  if (usable.length === 0 || !trends) {
    return (
      <div className="rounded-xl border border-border-subtle/40 bg-surface-secondary/30 p-5 md:p-6 space-y-2">
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-content-tertiary">
          Sem dados nesta análise
        </p>
        <p className="text-sm text-content-secondary leading-relaxed">
          Os temas detectados no perfil ainda não têm volume de pesquisa
          suficiente para uma leitura fiável.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="space-y-6 rounded-2xl border border-border-subtle/40 bg-surface-base/70 p-5 md:p-6">
        {strongest ? (
          <p className="font-display text-xl md:text-2xl text-content-primary leading-snug tracking-tight">
            Tema com mais procura:{" "}
            <span className="text-accent-primary">{strongest}</span>
          </p>
        ) : null}
        <MarketSignalsChart trends={trends} usableKeywords={usable} />
        <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {usable.length > 0 && (
            <div className="space-y-1 min-w-0">
              <dt className="font-mono text-[10px] uppercase tracking-[0.18em] text-content-tertiary">
                Temas com sinal de procura
              </dt>
              <dd className="text-sm text-content-secondary break-words">
                {usable.join(", ")}
              </dd>
            </div>
          )}
          {dropped.length > 0 && (
            <div className="space-y-1 min-w-0">
              <dt className="font-mono text-[10px] uppercase tracking-[0.18em] text-content-tertiary">
                {marketSignalsCopy.droppedLabel}
              </dt>
              <dd className="text-sm text-content-secondary break-words">
                {dropped.join(", ")}
              </dd>
            </div>
          )}
        </dl>
        {cap > 0 && (
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-content-tertiary">
            {used}/{cap} {quotaWord}
          </p>
        )}
      </div>
      <p className="text-xs text-content-tertiary leading-relaxed">
        {marketSignalsCopy.footer}
      </p>
    </div>
  );
}

function emptyReasonFor(status: MarketSignalsResponse["status"]): string {
  switch (status) {
    case "no_keywords":
      return "Não foram detectados temas com sinal de pesquisa relevante neste perfil.";
    case "disabled":
      return "Os sinais de pesquisa estão desactivados nesta análise.";
    case "blocked":
      return "Quota de sinais de pesquisa atingida para esta análise.";
    case "timeout":
      return "Os sinais de pesquisa demoraram demasiado a responder.";
    case "error":
    default:
      return "Sem ligação aos sinais de pesquisa neste momento.";
  }
}
