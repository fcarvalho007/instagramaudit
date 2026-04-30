import {
  AlertTriangle,
  Gauge,
  Layers,
  TrendingDown,
  type LucideIcon,
} from "lucide-react";

import type { AdapterResult } from "@/lib/report/snapshot-to-report-data";
import { cn } from "@/lib/utils";

import { REDESIGN_TOKENS } from "../report-tokens";

interface Props {
  result: AdapterResult;
}

const FORMAT_PT: Record<string, string> = {
  Carousels: "Carrosséis",
  Carousel: "Carrosséis",
  Sidecar: "Carrosséis",
  Carrosséis: "Carrosséis",
  Reels: "Reels",
  Reel: "Reels",
  Images: "Imagens",
  Image: "Imagens",
  Imagens: "Imagens",
};

type Tone = "warn" | "bad" | "neutral";

interface Signal {
  key: string;
  icon: LucideIcon;
  title: string;
  body: string;
  tone: Tone;
}

/**
 * Linha "O que merece atenção primeiro" (Phase 1B.1G).
 *
 * Devolve até 3 sinais derivados apenas do `AdapterResult` actual.
 * Cada sinal só dispara quando os dados são suficientes — sem
 * placeholders, sem inventar valores.
 */
export function ReportOverviewAttentionRow({ result }: Props) {
  const signals = computeSignals(result).slice(0, 3);
  if (signals.length === 0) return null;

  return (
    <section
      aria-label="O que merece atenção primeiro"
      className="space-y-4"
    >
      <div className="flex items-center gap-2">
        <AlertTriangle
          className="h-4 w-4 text-amber-600"
          aria-hidden="true"
        />
        <h3 className={REDESIGN_TOKENS.eyebrow}>
          O que merece atenção primeiro
        </h3>
      </div>

      <div
        className={cn(
          "grid grid-cols-1 gap-3 md:gap-4",
          signals.length >= 3
            ? "sm:grid-cols-2 lg:grid-cols-3"
            : signals.length === 2
              ? "sm:grid-cols-2"
              : "sm:grid-cols-1",
        )}
      >
        {signals.map((s) => (
          <SignalCard key={s.key} signal={s} />
        ))}
      </div>
    </section>
  );
}

function SignalCard({ signal }: { signal: Signal }) {
  const Icon = signal.icon;
  const toneCls =
    signal.tone === "bad"
      ? {
          accent: "border-l-rose-300",
          icon: "bg-rose-50 text-rose-600 ring-rose-100",
          dot: "bg-rose-500",
        }
      : signal.tone === "warn"
        ? {
            accent: "border-l-amber-300",
            icon: "bg-amber-50 text-amber-600 ring-amber-100",
            dot: "bg-amber-500",
          }
        : {
            accent: "border-l-slate-200",
            icon: "bg-slate-100 text-slate-600 ring-slate-200",
            dot: "bg-slate-400",
          };

  return (
    <article
      className={cn(
        "rounded-2xl border border-slate-200 border-l-2 bg-white p-3.5 md:p-4 flex items-start gap-3 min-w-0",
        "shadow-[0_1px_2px_rgba(15,23,42,0.03)]",
        toneCls.accent,
      )}
    >
      <span
        className={cn(
          "inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ring-1",
          toneCls.icon,
        )}
        aria-hidden="true"
      >
        <Icon className="h-3.5 w-3.5" />
      </span>
      <div className="min-w-0 space-y-1">
        <h4 className="flex items-center gap-2 font-display text-[0.95rem] font-semibold tracking-tight text-slate-900 leading-snug">
          <span
            aria-hidden="true"
            className={cn("size-1.5 rounded-full shrink-0", toneCls.dot)}
          />
          <span className="min-w-0">{signal.title}</span>
        </h4>
        <p className="text-[12.5px] text-slate-600 leading-relaxed">
          {signal.body}
        </p>
      </div>
    </article>
  );
}

// ─── Signal computation ──────────────────────────────────────────────

function computeSignals(result: AdapterResult): Signal[] {
  const k = result.data.keyMetrics;
  const benchmarkOk =
    result.coverage.benchmark === "real" && k.engagementBenchmark > 0;

  const out: Signal[] = [];

  // 1 · Engagement gap
  if (benchmarkOk && k.engagementDeltaPct <= -10) {
    const tone: Tone = k.engagementDeltaPct <= -25 ? "bad" : "warn";
    out.push({
      key: "engagement-gap",
      icon: TrendingDown,
      title: "Envolvimento abaixo da referência",
      body: `O perfil está em ${formatPct(k.engagementRate)}, abaixo da referência de ${formatPct(k.engagementBenchmark)}.`,
      tone,
    });
  }

  // 2 · Cadence vs response — só quando há benchmark e ritmo é alto
  if (
    benchmarkOk &&
    k.postingFrequencyWeekly >= 5 &&
    k.engagementDeltaPct <= -25
  ) {
    out.push({
      key: "cadence-vs-response",
      icon: Gauge,
      title: "Ritmo elevado, resposta baixa",
      body: `Há cerca de ${formatRhythm(k.postingFrequencyWeekly)} publicações por semana, mas a resposta média ainda é fraca.`,
      tone: "warn",
    });
  }

  // 3 · Format concentration
  const breakdown = result.data.formatBreakdown ?? [];
  const nonZero = breakdown.filter((b) => (b.sharePct || 0) > 0).length;
  const formatLabel = FORMAT_PT[k.dominantFormat] ?? k.dominantFormat;
  if (
    formatLabel &&
    (k.dominantFormatShare >= 70 || (nonZero === 1 && k.dominantFormatShare > 0))
  ) {
    out.push({
      key: "format-concentration",
      icon: Layers,
      title: "Dependência de um formato",
      body: `A amostra está muito concentrada em ${formatLabel} (${k.dominantFormatShare}% das publicações analisadas).`,
      tone: "warn",
    });
  }

  return out;
}

// ─── Helpers ─────────────────────────────────────────────────────────

function formatPct(n: number): string {
  if (!Number.isFinite(n)) return "0,00%";
  return `${n.toFixed(2).replace(".", ",")}%`;
}

function formatRhythm(n: number): string {
  if (!Number.isFinite(n)) return "0";
  return n.toFixed(1).replace(".", ",");
}
