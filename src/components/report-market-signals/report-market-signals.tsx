/**
 * "Procura de mercado associada ao perfil" — premium public report section.
 *
 * Two render entry points:
 *
 *  - `<ReportMarketSignals />` — the inner block (cards + chart + chips).
 *    Returns null when the section should disappear silently.
 *
 *  - `<ReportMarketSignalsSection />` — wraps the inner block in a
 *    `ReportSectionFrame` so the report shell does not have to render an
 *    empty header when the section is hidden (disabled/blocked).
 *
 * Data sourcing strategy:
 *
 *  1. If the snapshot already carries `market_signals_free` (cache hit at
 *     persist time), use it immediately — zero network, zero provider cost.
 *  2. Otherwise call `/api/market-signals` once. The endpoint itself is
 *     gated by kill-switch + allowlist + plan caps + 24h cache, so this
 *     call is cheap and returns a tagged envelope with a graceful status.
 *
 * Provider logic, allowlist, kill-switch and persistence layer remain
 * untouched — this component is purely a presentation/orchestration layer.
 */
import { useEffect, useMemo, useState } from "react";
import type { GoogleTrendsResult } from "@/lib/dataforseo/endpoints/google-trends";
import { ReportSectionFrame } from "@/components/report-redesign/report-section-frame";
import { MarketSignalsChart } from "./market-signals-chart";
import { marketSignalsCopy } from "./market-signals-copy";
import { MarketStatsStrip, type MarketStat } from "./market-stats-strip";

// ============================================================================
// Public types
// ============================================================================

type Plan = "free" | "paid";

type EnvelopeStatus =
  | "ready"
  | "partial"
  | "disabled"
  | "blocked"
  | "error"
  | "timeout"
  | "no_keywords";

interface MarketSignalsResponse {
  status: EnvelopeStatus;
  plan: Plan;
  keywords?: string[];
  trends?: GoogleTrendsResult | null;
  queries_used?: number;
  queries_cap?: number;
  trends_usable_keywords?: string[];
  trends_dropped_keywords?: string[];
}

/** Loose shape of the persisted summary stored in the snapshot. */
interface CachedSummaryLike {
  status?: unknown;
  plan?: unknown;
  keywords?: unknown;
  trends?: unknown;
  trends_usable_keywords?: unknown;
  trends_dropped_keywords?: unknown;
  queries_used?: unknown;
  queries_cap?: unknown;
}

interface ReportMarketSignalsProps {
  snapshotId: string;
  plan?: Plan;
  /**
   * Optional persisted summary already present in the snapshot under
   * `normalized_payload.market_signals_free`. When provided the component
   * skips the network call entirely.
   */
  cachedSummary?: unknown;
}

type FetchState =
  | { status: "loading" }
  | { status: "hidden" }
  | { status: "empty"; tone: "no_keywords" | "soft" }
  | { status: "ready"; data: MarketSignalsResponse };

// ============================================================================
// Pure helpers
// ============================================================================

const VALID_STATUSES: ReadonlySet<EnvelopeStatus> = new Set([
  "ready",
  "partial",
  "disabled",
  "blocked",
  "error",
  "timeout",
  "no_keywords",
]);

/** Narrow validation of a cached summary into a public-shape envelope. */
function cachedToResponse(
  raw: unknown,
  fallbackPlan: Plan,
): MarketSignalsResponse | null {
  if (!raw || typeof raw !== "object") return null;
  const c = raw as CachedSummaryLike;
  const status =
    typeof c.status === "string" && VALID_STATUSES.has(c.status as EnvelopeStatus)
      ? (c.status as EnvelopeStatus)
      : null;
  if (!status) return null;
  const plan: Plan = c.plan === "paid" ? "paid" : fallbackPlan;
  const keywords = Array.isArray(c.keywords)
    ? (c.keywords.filter((k) => typeof k === "string") as string[])
    : [];
  const usable = Array.isArray(c.trends_usable_keywords)
    ? (c.trends_usable_keywords.filter((k) => typeof k === "string") as string[])
    : [];
  const dropped = Array.isArray(c.trends_dropped_keywords)
    ? (c.trends_dropped_keywords.filter((k) => typeof k === "string") as string[])
    : [];
  const trends =
    c.trends && typeof c.trends === "object"
      ? (c.trends as GoogleTrendsResult)
      : null;
  return {
    status,
    plan,
    keywords,
    trends,
    trends_usable_keywords: usable,
    trends_dropped_keywords: dropped,
    queries_used: typeof c.queries_used === "number" ? c.queries_used : 0,
    queries_cap: typeof c.queries_cap === "number" ? c.queries_cap : 0,
  };
}

/** Pick the keyword with the highest mean across non-null values. */
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

type Trend = "up" | "down" | "flat";

/**
 * Compare the mean of the second half vs the first half of the strongest
 * series. ≥+10% → "up"; ≤-10% → "down"; otherwise "flat". Returns null
 * when the series is too short or empty.
 */
function computeTrend(
  trends: GoogleTrendsResult | null | undefined,
  keyword: string | null,
): { trend: Trend; pointCount: number } | null {
  if (!trends || !keyword) return null;
  const graph = trends.items?.find(
    (it) => Array.isArray(it.keywords) && Array.isArray(it.data),
  );
  if (!graph?.keywords || !graph.data) return null;
  const idx = graph.keywords.indexOf(keyword);
  if (idx < 0) return null;
  const values: number[] = [];
  for (const row of graph.data) {
    const v = row.values?.[idx];
    if (typeof v === "number" && Number.isFinite(v)) values.push(v);
  }
  if (values.length < 4) return { trend: "flat", pointCount: values.length };
  const half = Math.floor(values.length / 2);
  const first = values.slice(0, half);
  const second = values.slice(values.length - half);
  const mean = (xs: number[]) =>
    xs.reduce((a, b) => a + b, 0) / Math.max(xs.length, 1);
  const m1 = mean(first);
  const m2 = mean(second);
  if (m1 <= 0)
    return { trend: m2 > 0 ? "up" : "flat", pointCount: values.length };
  const ratio = (m2 - m1) / m1;
  const trend: Trend = ratio >= 0.1 ? "up" : ratio <= -0.1 ? "down" : "flat";
  return { trend, pointCount: values.length };
}

function composeSuggestion(
  strongest: string | null,
  trend: Trend | null,
): string {
  if (!strongest) {
    return "Continuar a explorar temas com procura mensurável fora do Instagram.";
  }
  if (trend === "up") {
    return `Existe procura crescente por «${strongest}». Reforçar conteúdo sobre este tema nas próximas semanas.`;
  }
  if (trend === "down") {
    return `A procura por «${strongest}» tem perdido força. Avaliar diversificação de temas.`;
  }
  return `«${strongest}» mantém procura estável fora do Instagram. Consolidar autoridade neste tema.`;
}

// ============================================================================
// Sub-components
// ============================================================================

function MetricCard({
  eyebrow,
  value,
  hint,
  accent,
}: {
  eyebrow: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  accent?: "neutral" | "positive" | "warning";
}) {
  const accentDot =
    accent === "positive"
      ? "bg-emerald-500"
      : accent === "warning"
        ? "bg-amber-500"
        : "bg-slate-300";
  return (
    <div className="rounded-2xl border border-slate-200/70 bg-white p-5 md:p-6 min-w-0 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_-12px_rgba(15,23,42,0.08)]">
      <div className="flex items-center gap-2">
        <span aria-hidden="true" className={`inline-block h-1.5 w-1.5 rounded-full ${accentDot}`} />
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-slate-500">
          {eyebrow}
        </p>
      </div>
      <div className="mt-3 font-display text-2xl md:text-[28px] leading-tight tracking-tight text-slate-900 break-words">
        {value}
      </div>
      {hint ? (
        <p className="mt-2 text-[13px] text-slate-600 leading-relaxed break-words">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-28 rounded-2xl border border-slate-200/70 bg-slate-100/50 animate-pulse"
          />
        ))}
      </div>
      <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-slate-500">
        {marketSignalsCopy.loading}
      </p>
    </div>
  );
}

function EmptyCard({ message }: { message: string }) {
  return (
    <div className="rounded-2xl border border-slate-200/70 bg-white p-6 md:p-8 space-y-2 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
      <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-slate-500">
        Sem dados nesta análise
      </p>
      <p className="text-sm md:text-[15px] text-slate-600 leading-relaxed max-w-2xl">
        {message}
      </p>
    </div>
  );
}

// ============================================================================
// Inner component
// ============================================================================

export function ReportMarketSignals({
  snapshotId,
  plan = "free",
  cachedSummary,
}: ReportMarketSignalsProps) {
  const initial: FetchState = useMemo(() => {
    const fromCache = cachedToResponse(cachedSummary, plan);
    if (!fromCache) return { status: "loading" };
    if (fromCache.status === "disabled" || fromCache.status === "blocked") {
      return { status: "hidden" };
    }
    if (
      fromCache.status === "no_keywords"
    ) {
      return { status: "empty", tone: "no_keywords" };
    }
    if (fromCache.status === "timeout" || fromCache.status === "error") {
      return { status: "empty", tone: "soft" };
    }
    return { status: "ready", data: fromCache };
  }, [cachedSummary, plan]);

  const [state, setState] = useState<FetchState>(initial);

  useEffect(() => {
    setState(initial);
  }, [initial]);

  useEffect(() => {
    // Skip network entirely when the snapshot already provided data.
    if (initial.status !== "loading") return;
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
          setState({ status: "empty", tone: "soft" });
          return;
        }
        if (body.status === "disabled" || body.status === "blocked") {
          setState({ status: "hidden" });
          return;
        }
        if (body.status === "no_keywords") {
          setState({ status: "empty", tone: "no_keywords" });
          return;
        }
        if (body.status === "timeout" || body.status === "error") {
          setState({ status: "empty", tone: "soft" });
          return;
        }
        setState({ status: "ready", data: body });
      } catch {
        if (!cancelled) setState({ status: "empty", tone: "soft" });
      }
    }
    void run();
    return () => {
      cancelled = true;
    };
  }, [initial.status, snapshotId, plan]);

  if (state.status === "hidden") return null;
  if (state.status === "loading") return <LoadingSkeleton />;
  if (state.status === "empty") {
    return (
      <EmptyCard
        message={
          state.tone === "no_keywords"
            ? marketSignalsCopy.empty.noKeywords
            : marketSignalsCopy.empty.soft
        }
      />
    );
  }

  // status === "ready"
  const { data } = state;
  const usable = data.trends_usable_keywords ?? [];
  const dropped = data.trends_dropped_keywords ?? [];
  const trends = data.trends ?? null;
  const strongest = pickStrongestKeyword(trends, usable);

  // Defensive collapse to no-keywords when there is no usable signal at all.
  if (usable.length === 0 || !trends || !strongest) {
    return <EmptyCard message={marketSignalsCopy.empty.noKeywords} />;
  }

  const trendInfo = computeTrend(trends, strongest);
  const trend: Trend = trendInfo?.trend ?? "flat";
  const pointCount = trendInfo?.pointCount ?? 0;
  const showChart = pointCount >= 6;
  const trendAccent: "positive" | "warning" | "neutral" =
    trend === "up" ? "positive" : trend === "down" ? "warning" : "neutral";
  const used = data.queries_used ?? 0;
  const cap = data.queries_cap ?? 0;
  const quotaWord = used === 1 ? marketSignalsCopy.quotaSingular : marketSignalsCopy.quotaPlural;

  return (
    <div className="space-y-6">
      <MarketStatsStrip
        items={[
          {
            eyebrow: marketSignalsCopy.cards.strongest,
            value: <span className="text-blue-700">{strongest}</span>,
            hint: "Tema com maior volume de pesquisa pública entre os detetados.",
          },
          {
            eyebrow: marketSignalsCopy.cards.keywords,
            value: `${usable.length}`,
            hint:
              dropped.length > 0
                ? `${usable.length} com sinal · ${dropped.length} sem volume relevante`
                : "Todas as palavras-chave detetadas têm volume mensurável.",
          },
          {
            eyebrow: marketSignalsCopy.cards.trend,
            value: marketSignalsCopy.trendLabels[trend],
            accent: trendAccent,
            hint:
              trend === "up"
                ? "A procura tem aumentado nas últimas semanas."
                : trend === "down"
                  ? "A procura tem perdido força nas últimas semanas."
                  : "A procura mantém-se equilibrada ao longo do período.",
          },
          {
            eyebrow: marketSignalsCopy.cards.suggestion,
            value: (
              <span className="text-[15px] md:text-base font-sans font-normal leading-relaxed text-slate-700">
                {composeSuggestion(strongest, trend)}
              </span>
            ),
          } satisfies MarketStat,
        ]}
      />

      {showChart ? (
        <div className="rounded-2xl border border-slate-200/70 bg-white p-5 md:p-6 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-slate-500 mb-3">
            Evolução do interesse de pesquisa
          </p>
          <MarketSignalsChart trends={trends} usableKeywords={usable} />
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-2 min-w-0">
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-slate-500">
            {marketSignalsCopy.chipsUsableLabel}
          </p>
          <div className="flex flex-wrap gap-2">
            {usable.map((kw) => (
              <span
                key={kw}
                className="inline-flex items-center rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-mono text-blue-700"
              >
                {kw}
              </span>
            ))}
          </div>
        </div>
        {dropped.length > 0 ? (
          <div className="space-y-2 min-w-0">
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-slate-500">
              {marketSignalsCopy.chipsDroppedLabel}
            </p>
            <div className="flex flex-wrap gap-2">
              {dropped.map((kw) => (
                <span
                  key={kw}
                  className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-mono text-slate-500"
                >
                  {kw}
                </span>
              ))}
            </div>
          </div>
        ) : null}
      </div>

      {cap > 0 ? (
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-slate-500">
          {used}/{cap} {quotaWord}
        </p>
      ) : null}
    </div>
  );
}

// ============================================================================
// Section wrapper — frame + inner block, hides itself when block returns null
// ============================================================================

/**
 * Lightweight visibility probe: re-uses the same logic as the inner
 * component to decide whether the section frame should render at all.
 * This avoids leaving a "Procura de mercado" header pendurado above an
 * empty slot in `disabled` / `blocked` states (silent hide requirement).
 *
 * The probe is conservative: when the cached summary is missing (so the
 * inner component will fetch), we still render the frame so the loading
 * skeleton has its title — only a *cached* hidden state collapses the
 * whole section. After a fetch resolves to hidden, the inner component
 * returns null and only the frame remains; that is intentional and
 * acceptable because, in practice, hidden states are stable per snapshot.
 */
function shouldHideFromCache(cached: unknown): boolean {
  if (!cached || typeof cached !== "object") return false;
  const status = (cached as { status?: unknown }).status;
  return status === "disabled" || status === "blocked";
}

interface ReportMarketSignalsSectionProps extends ReportMarketSignalsProps {}

export function ReportMarketSignalsSection(
  props: ReportMarketSignalsSectionProps,
) {
  if (shouldHideFromCache(props.cachedSummary)) return null;
  return (
    <ReportSectionFrame
      eyebrow={marketSignalsCopy.eyebrow}
      title={marketSignalsCopy.title}
      subtitle={marketSignalsCopy.subtitle}
      tone="soft-cyan"
      ariaLabel={marketSignalsCopy.title}
    >
      <ReportMarketSignals {...props} />
    </ReportSectionFrame>
  );
}
