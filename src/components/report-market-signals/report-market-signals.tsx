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
import { Container } from "@/components/layout/container";
import { ReportSection } from "@/components/report/report-section";
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
          setState({ status: "hidden" });
          return;
        }
        if (body.status === "ready" || body.status === "partial") {
          setState({ status: "ready", data: body });
        } else {
          setState({ status: "hidden" });
        }
      } catch {
        if (!cancelled) setState({ status: "hidden" });
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
      <Container size="xl">
        <div className="py-6 md:py-8">
          <ReportSection
            label={marketSignalsCopy.eyebrow}
            title={marketSignalsCopy.loadingTitle}
          >
            <div className="flex items-center gap-3 rounded-lg border border-border-subtle/40 bg-surface-secondary/40 px-4 py-4">
              <span
                aria-hidden="true"
                className="inline-block h-2 w-2 animate-pulse rounded-full bg-content-tertiary"
              />
              <p className="font-mono text-xs text-content-tertiary">
                {marketSignalsCopy.loading}
              </p>
            </div>
          </ReportSection>
        </div>
      </Container>
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
  // hide instead of showing a hollow chart.
  if (usable.length === 0 || !trends) return null;

  return (
    <Container size="xl">
      <div className="py-6 md:py-8">
        <ReportSection
          label={marketSignalsCopy.eyebrow}
          title={marketSignalsCopy.title}
          subtitle={marketSignalsCopy.intro}
        >
          <div className="space-y-6 rounded-xl border border-border-subtle/40 bg-surface-secondary/30 p-5 md:p-6">
            <MarketSignalsChart trends={trends} usableKeywords={usable} />

            <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {strongest && (
                <div className="space-y-1">
                  <dt className="font-mono text-[10px] uppercase tracking-[0.18em] text-content-tertiary">
                    {marketSignalsCopy.strongestLabel}
                  </dt>
                  <dd className="font-display text-lg text-content-primary">
                    {strongest}
                  </dd>
                </div>
              )}
              {dropped.length > 0 && (
                <div className="space-y-1">
                  <dt className="font-mono text-[10px] uppercase tracking-[0.18em] text-content-tertiary">
                    {marketSignalsCopy.droppedLabel}
                  </dt>
                  <dd className="text-sm text-content-secondary">
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
        </ReportSection>
      </div>
    </Container>
  );
}
