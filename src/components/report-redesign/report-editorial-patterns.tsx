/**
 * Block 02 · Diagnóstico — grelha de até 4 cards diagnósticos.
 *
 * O cabeçalho da secção é fornecido pelo `ReportBlockSection` no shell
 * (`02 · DIAGNÓSTICO · O que explica estes resultados?`), por isso este
 * componente NÃO renderiza o seu próprio header — só a grelha de cards.
 *
 * Selecção dos cards (regra anti-duplicação com a Leitura IA acima e
 * com o Block 01 abaixo):
 *
 *   1. Distância face à referência (engagement gap vs benchmark)
 *   2. Procura externa pelos temas (market demand / content fit)
 *   3. Concentração de formato (dominant format > limite)
 *   4. Sinais de conversa (mentions/collabs lift) OU fallback editorial
 *      (comprimento de legenda / faixa de hashtags)
 *
 * Nunca renderiza o cartão de "Tendência de envolvimento" nem cadência
 * — esses já vivem na Leitura IA / Block 01. Copy 100 % pt-PT, sem
 * tokens técnicos (`keyword`, `lift`, `engagement_pct`, `payload`).
 */

import {
  TrendingDown,
  TrendingUp,
  Search,
  Layers,
  MessageCircle,
  Type,
  Hash,
} from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";
import type { EditorialPatterns } from "@/lib/report/editorial-patterns";
import type { ReportData } from "@/components/report/report-mock-data";

import { ReportFramedBlock } from "./report-framed-block";
import { REDESIGN_TOKENS } from "./report-tokens";

interface Props {
  patterns: EditorialPatterns;
  keyMetrics: ReportData["keyMetrics"];
}

type SignalTone = "blue" | "amber" | "rose" | "emerald";

interface DiagnosticCardData {
  key: string;
  icon: ReactNode;
  tone: SignalTone;
  eyebrow: string;
  title: string;
  primary: string;
  body: ReactNode;
}

const TONE_CLASSES: Record<
  SignalTone,
  { dot: string; iconBg: string; icon: string; primary: string }
> = {
  blue: {
    dot: "bg-blue-500",
    iconBg: "bg-blue-50 ring-blue-100",
    icon: "text-blue-600",
    primary: "text-slate-900",
  },
  amber: {
    dot: "bg-amber-500",
    iconBg: "bg-amber-50 ring-amber-100",
    icon: "text-amber-600",
    primary: "text-slate-900",
  },
  rose: {
    dot: "bg-rose-500",
    iconBg: "bg-rose-50 ring-rose-100",
    icon: "text-rose-600",
    primary: "text-rose-700",
  },
  emerald: {
    dot: "bg-emerald-500",
    iconBg: "bg-emerald-50 ring-emerald-100",
    icon: "text-emerald-600",
    primary: "text-emerald-700",
  },
};

export function ReportEditorialPatterns({ patterns, keyMetrics }: Props) {
  const cards = selectDiagnosticCards(patterns, keyMetrics).slice(0, 4);

  return (
    <ReportFramedBlock
      tone="canvas"
      ariaLabel="Cartões de diagnóstico"
    >
      {cards.length === 0 ? (
        <p className="text-sm text-slate-500">
          Ainda não há sinais suficientes para um diagnóstico estruturado.
          A próxima análise poderá revelar padrões mais sólidos.
        </p>
      ) : (
        <div
          className={cn(
            "grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5",
            "auto-rows-fr",
          )}
        >
          {cards.map((c, idx) => (
            <DiagnosticCard key={c.key} index={idx + 1} card={c} />
          ))}
        </div>
      )}
    </ReportFramedBlock>
  );
}

// ─────────────────────────────────────────────────────────────────────
// Card subcomponent
// ─────────────────────────────────────────────────────────────────────

function DiagnosticCard({
  index,
  card,
}: {
  index: number;
  card: DiagnosticCardData;
}) {
  const tone = TONE_CLASSES[card.tone];
  return (
    <article
      className={cn(
        "h-full flex flex-col gap-3",
        "rounded-2xl border border-slate-200/70 bg-white",
        "p-5 md:p-6",
        "shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_-16px_rgba(15,23,42,0.08)]",
      )}
    >
      <div className="flex items-center gap-2.5">
        <span
          aria-hidden="true"
          className={cn("size-1.5 rounded-full shrink-0", tone.dot)}
        />
        <span className="text-eyebrow-sm text-slate-500">
          {card.eyebrow}
        </span>
        <span className="ml-auto font-mono text-[10px] tabular-nums text-slate-400">
          {String(index).padStart(2, "0")} / 04
        </span>
      </div>

      <div className="flex items-start gap-3">
        <div
          className={cn(
            "shrink-0 inline-flex h-9 w-9 items-center justify-center rounded-lg ring-1",
            tone.iconBg,
          )}
        >
          <span className={tone.icon} aria-hidden>
            {card.icon}
          </span>
        </div>
        <h3
          className={cn(
            "font-display text-[1.05rem] md:text-[1.125rem] font-semibold leading-snug tracking-tight text-slate-900",
            "min-w-0",
          )}
        >
          {card.title}
        </h3>
      </div>

      <p
        className={cn(
          "font-display text-[1.5rem] md:text-[1.625rem] font-semibold tracking-tight leading-none tabular-nums",
          tone.primary,
        )}
      >
        {card.primary}
      </p>

      <p className="text-sm text-slate-600 leading-relaxed mt-auto">
        {card.body}
      </p>
    </article>
  );
}

// ─────────────────────────────────────────────────────────────────────
// Selection logic (pure)
// ─────────────────────────────────────────────────────────────────────

function selectDiagnosticCards(
  p: EditorialPatterns,
  km: ReportData["keyMetrics"],
): DiagnosticCardData[] {
  const out: DiagnosticCardData[] = [];

  // 1. Distância face à referência
  const gap = buildEngagementGapCard(km);
  if (gap) out.push(gap);

  // 2. Procura externa pelos temas
  const market = buildMarketDemandCard(p.marketDemandContentFit);
  if (market) out.push(market);

  // 3. Concentração de formato
  const format = buildFormatConcentrationCard(km);
  if (format) out.push(format);

  // 4. Sinais de conversa OU fallback editorial
  const conv = buildConversationCard(p.mentionsCollabsLift);
  if (conv) {
    out.push(conv);
  } else {
    const cap = buildCaptionCard(p.captionLengthBuckets);
    if (cap) out.push(cap);
    else {
      const tags = buildHashtagsCard(p.hashtagSweetSpot);
      if (tags) out.push(tags);
    }
  }

  return out;
}

function buildEngagementGapCard(
  km: ReportData["keyMetrics"],
): DiagnosticCardData | null {
  if (!km.engagementBenchmark || km.engagementBenchmark <= 0) return null;

  const delta = km.engagementDeltaPct ?? 0;
  const above = delta >= 0;
  const sign = above ? "+" : "−";
  const tone: SignalTone =
    delta <= -20 ? "rose" : delta < 0 ? "amber" : "emerald";
  const Icon = above ? TrendingUp : TrendingDown;

  const title = above
    ? "Envolvimento acima da referência"
    : "Envolvimento abaixo da referência";

  return {
    key: "engagement-gap",
    icon: <Icon className="size-5" aria-hidden />,
    tone,
    eyebrow: "Comparação",
    title,
    primary: `${sign}${Math.abs(delta).toFixed(1).replace(".", ",")} %`,
    body: (
      <>
        O envolvimento médio observado é {formatPct(km.engagementRate)} face à
        referência de {formatPct(km.engagementBenchmark)} para perfis
        comparáveis.
      </>
    ),
  };
}

function buildMarketDemandCard(
  m: EditorialPatterns["marketDemandContentFit"],
): DiagnosticCardData | null {
  if (!m.available || m.coverage === null) return null;

  const coveragePct = Math.round(m.coverage * 100);
  const lowCoverage = coveragePct < 40;
  const tone: SignalTone = lowCoverage ? "blue" : "emerald";

  const title = lowCoverage
    ? "Há procura externa por temas ainda pouco cobertos"
    : "O conteúdo cobre bem os temas com procura externa";

  const missingLine =
    lowCoverage && m.missingTop.length > 0 ? (
      <span className="block mt-1.5 text-slate-500">
        Por explorar: {m.missingTop.slice(0, 3).join(", ")}.
      </span>
    ) : null;

  return {
    key: "market-demand",
    icon: <Search className="size-5" aria-hidden />,
    tone,
    eyebrow: "Procura externa",
    title,
    primary: `${coveragePct} %`,
    body: (
      <>
        {m.matchedKeywords} de {m.marketKeywordsTotal} temas com procura
        externa aparecem nas legendas e hashtags.
        {missingLine}
      </>
    ),
  };
}

function buildFormatConcentrationCard(
  km: ReportData["keyMetrics"],
): DiagnosticCardData | null {
  const share = km.dominantFormatShare ?? 0;
  if (!km.dominantFormat || share <= 0) return null;

  const high = share >= 60;
  const tone: SignalTone = high ? "amber" : "blue";
  const formatLabel = humanFormatLabel(km.dominantFormat);

  const title = high
    ? `O conteúdo está concentrado em ${formatLabel.toLowerCase()}`
    : `Formato dominante: ${formatLabel.toLowerCase()}`;

  return {
    key: "format-concentration",
    icon: <Layers className="size-5" aria-hidden />,
    tone,
    eyebrow: "Mistura de formatos",
    title,
    primary: `${Math.round(share)} %`,
    body: high ? (
      <>
        A maioria das publicações analisadas é em {formatLabel.toLowerCase()}.
        Diversificar para outros formatos pode alargar o alcance e equilibrar
        a leitura do perfil.
      </>
    ) : (
      <>
        {formatLabel} representa a maior fatia das publicações analisadas, sem
        chegar a uma dependência clara de um único formato.
      </>
    ),
  };
}

function buildConversationCard(
  m: EditorialPatterns["mentionsCollabsLift"],
): DiagnosticCardData | null {
  if (!m.available) return null;

  const total = m.withCount + m.withoutCount;
  if (total <= 0) return null;

  const sharePct = Math.round((m.withCount / total) * 100);
  const lowConversation = sharePct < 25;
  const tone: SignalTone = lowConversation ? "amber" : "blue";

  const title = lowConversation
    ? "Faltam sinais de conversa"
    : "Há conversa e colaboração no perfil";

  return {
    key: "conversation",
    icon: <MessageCircle className="size-5" aria-hidden />,
    tone,
    eyebrow: "Diálogo",
    title,
    primary: `${sharePct} %`,
    body: lowConversation ? (
      <>
        Apenas {m.withCount} de {total} publicações analisadas mencionam
        outras contas ou indicam colaborações. Mais conversa e parcerias
        tendem a aumentar o alcance e a credibilidade percebida.
      </>
    ) : (
      <>
        {m.withCount} de {total} publicações analisadas mencionam outras
        contas ou indicam colaborações — um sinal saudável de conversa
        editorial.
      </>
    ),
  };
}

function buildCaptionCard(
  c: EditorialPatterns["captionLengthBuckets"],
): DiagnosticCardData | null {
  if (!c.available || !c.bestBucket) return null;
  const best = c.buckets.find((x) => x.label === c.bestBucket);
  if (!best) return null;
  return {
    key: "caption",
    icon: <Type className="size-5" aria-hidden />,
    tone: "blue",
    eyebrow: "Linguagem",
    title: `As legendas ${best.label.toLowerCase().replace(/\s*\(.*\)/, "")} são as que mais respondem`,
    primary: best.label.replace(/\s*\(.*\)/, ""),
    body: (
      <>
        Envolvimento médio de {formatPct(best.avgEngagementPct)} em {best.count}
        {" "}publicações analisadas.
      </>
    ),
  };
}

function buildHashtagsCard(
  h: EditorialPatterns["hashtagSweetSpot"],
): DiagnosticCardData | null {
  if (!h.available || !h.bestBucket) return null;
  const best = h.buckets.find((x) => x.label === h.bestBucket);
  if (!best) return null;
  return {
    key: "hashtags",
    icon: <Hash className="size-5" aria-hidden />,
    tone: "blue",
    eyebrow: "Hashtags",
    title: `Faixa de ${best.label} hashtags é a que mais responde`,
    primary: `${best.label}`,
    body: (
      <>
        Envolvimento médio de {formatPct(best.avgEngagementPct)} em {best.count}
        {" "}publicações analisadas.
      </>
    ),
  };
}

// ─────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────

function formatPct(n: number): string {
  if (!Number.isFinite(n)) return "—";
  return `${n.toFixed(2).replace(".", ",")} %`;
}

function humanFormatLabel(raw: string): string {
  const map: Record<string, string> = {
    Reels: "Reels",
    Carousels: "Carrosséis",
    Carrosseis: "Carrosséis",
    Carrosséis: "Carrosséis",
    Imagens: "Imagens",
    Image: "Imagens",
    Photo: "Imagens",
    Photos: "Imagens",
    Video: "Vídeo",
  };
  return map[raw] ?? raw;
}