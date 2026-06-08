import { CompareCardShell } from "./compare-card-shell";
import type { ReportCompetitorBreakdownEntry } from "@/components/report/report-mock-data";
import { normaliseFormatKey } from "@/lib/report/format-keys";
import { cn } from "@/lib/utils";

interface Props {
  primaryHandle: string;
  primaryAvatarUrl?: string | null;
  primaryFullName?: string | null;
  primaryVerified?: boolean;
  primary: {
    engagementRate: number;
    postingFrequencyWeekly: number;
    dominantFormat: string;
    /** Counts of formats with >= 10% share (diversity proxy). */
    formatBreakdown: Array<{ format: string; sharePct: number }>;
    bio: string | null;
    externalUrls: string[];
  };
  competitor: ReportCompetitorBreakdownEntry;
}

type Side = "primary" | "competitor" | "tie" | "missing";

interface Dimension {
  key: string;
  winner: Side;
  /** Magnitude of advantage, used for ranking. */
  magnitude: number;
  primaryWins: string;
  competitorWins: string;
  /** Action phrasing for the "opportunity" row when competitor wins. */
  opportunity: string;
}

function fmtPct(n: number): string {
  if (!Number.isFinite(n)) return "—";
  return `${n.toLocaleString("pt-PT", { maximumFractionDigits: 1, minimumFractionDigits: 1 })} %`;
}

function fmtWeekly(n: number): string {
  if (!Number.isFinite(n) || n <= 0) return "—";
  return n.toLocaleString("pt-PT", { maximumFractionDigits: 1 });
}

function countDiverseFormats(
  primary: Props["primary"]["formatBreakdown"],
): number {
  return primary.filter((f) => (f.sharePct ?? 0) >= 10).length;
}

function countDiverseFormatsCompetitor(
  stats: ReportCompetitorBreakdownEntry["formatStats"],
): number {
  if (!stats) return 0;
  let n = 0;
  for (const v of Object.values(stats)) {
    if (typeof v?.share_pct === "number" && v.share_pct >= 10) n++;
  }
  return n;
}

function buildDimensions(
  primary: Props["primary"],
  competitor: ReportCompetitorBreakdownEntry,
): Dimension[] {
  const dims: Dimension[] = [];

  // --- Engagement ---
  const erP = primary.engagementRate;
  const erC = competitor.averageEngagementRate;
  if (Number.isFinite(erP) && Number.isFinite(erC) && erP > 0 && erC > 0) {
    const delta = erP - erC;
    const mag = Math.abs(delta);
    const winner: Side = mag < 0.5 ? "tie" : delta > 0 ? "primary" : "competitor";
    dims.push({
      key: "engagement",
      winner,
      magnitude: mag,
      primaryWins: `Mantém maior taxa de envolvimento (${fmtPct(erP)} vs ${fmtPct(erC)}).`,
      competitorWins: `Gera mais envolvimento por publicação (${fmtPct(erC)} vs ${fmtPct(erP)}).`,
      opportunity: `Trabalhar ganchos e CTA para aproximar a taxa de envolvimento de ${fmtPct(erC)}.`,
    });
  } else {
    dims.push({
      key: "engagement",
      winner: "missing",
      magnitude: 0,
      primaryWins: "",
      competitorWins: "",
      opportunity: "",
    });
  }

  // --- Cadence ---
  const cP = primary.postingFrequencyWeekly;
  const cC = competitor.estimatedPostsPerWeek;
  if (Number.isFinite(cP) && Number.isFinite(cC) && cP > 0 && cC > 0) {
    const delta = cP - cC;
    const mag = Math.abs(delta);
    const winner: Side = mag < 0.5 ? "tie" : delta > 0 ? "primary" : "competitor";
    dims.push({
      key: "cadence",
      winner,
      magnitude: mag,
      primaryWins: `Publica com mais regularidade (${fmtWeekly(cP)} vs ${fmtWeekly(cC)} por semana).`,
      competitorWins: `Publica com maior frequência (${fmtWeekly(cC)} vs ${fmtWeekly(cP)} por semana).`,
      opportunity: `Aumentar cadência para ${fmtWeekly(cC)} publicações por semana.`,
    });
  } else {
    dims.push({
      key: "cadence",
      winner: "missing",
      magnitude: 0,
      primaryWins: "",
      competitorWins: "",
      opportunity: "",
    });
  }

  // --- Format mix (diversity) ---
  const divP = countDiverseFormats(primary.formatBreakdown);
  const divC = countDiverseFormatsCompetitor(competitor.formatStats);
  if (divP > 0 && divC > 0) {
    const delta = divP - divC;
    const mag = Math.abs(delta);
    const winner: Side = mag < 1 ? "tie" : delta > 0 ? "primary" : "competitor";
    const domP = primary.dominantFormat;
    const domC = competitor.dominantFormat;
    dims.push({
      key: "format",
      winner,
      magnitude: mag,
      primaryWins: `Mix de formatos mais diversificado (${divP} formatos com peso relevante).`,
      competitorWins: `Mix de formatos mais diversificado (${divC} formatos com peso relevante).`,
      opportunity:
        normaliseFormatKey(domC) && normaliseFormatKey(domC) !== normaliseFormatKey(domP)
          ? `Testar mais ${domC} para equilibrar a dependência de ${domP}.`
          : `Diversificar formatos para reduzir a dependência de ${domP}.`,
    });
  } else {
    dims.push({
      key: "format",
      winner: "missing",
      magnitude: 0,
      primaryWins: "",
      competitorWins: "",
      opportunity: "",
    });
  }

  // --- Bio / outbound path ---
  const bioP = (primary.bio ?? "").trim().length;
  const bioC = (competitor.bio ?? "").trim().length;
  const linksP = primary.externalUrls.length;
  const linksC = competitor.externalUrls.length;
  const hasBioSignal = bioP > 0 || bioC > 0;
  const hasLinkSignal = linksP > 0 || linksC > 0;
  if (hasBioSignal || hasLinkSignal) {
    const scoreP = (bioP > 0 ? 1 : 0) + linksP;
    const scoreC = (bioC > 0 ? 1 : 0) + linksC;
    const delta = scoreP - scoreC;
    const mag = Math.abs(delta);
    const winner: Side = mag < 1 ? "tie" : delta > 0 ? "primary" : "competitor";
    dims.push({
      key: "bio",
      winner,
      magnitude: mag,
      primaryWins:
        linksP > 0
          ? `Caminho de conversão claro na bio (${linksP} ${linksP === 1 ? "link" : "links"} ativos).`
          : `Bio descritiva e ativa.`,
      competitorWins:
        linksC > 0
          ? `Caminho de conversão mais claro na bio (${linksC} ${linksC === 1 ? "link" : "links"} ativos).`
          : `Bio mais completa e descritiva.`,
      opportunity:
        linksC > 0 && linksP === 0
          ? `Adicionar um link na bio para abrir um caminho de conversão.`
          : `Reforçar a bio com proposta de valor clara e link ativo.`,
    });
  } else {
    dims.push({
      key: "bio",
      winner: "missing",
      magnitude: 0,
      primaryWins: "",
      competitorWins: "",
      opportunity: "",
    });
  }

  return dims;
}

const EMPTY_ROW = "Sem sinal suficiente nesta amostra.";

function pickBest(dims: Dimension[], side: "primary" | "competitor"): Dimension | null {
  const ranked = dims
    .filter((d) => d.winner === side)
    .sort((a, b) => b.magnitude - a.magnitude);
  return ranked[0] ?? null;
}

function pickOpportunity(dims: Dimension[]): Dimension | null {
  // Biggest competitor advantage = highest priority opportunity.
  const competitorWins = dims
    .filter((d) => d.winner === "competitor")
    .sort((a, b) => b.magnitude - a.magnitude);
  if (competitorWins[0]) return competitorWins[0];
  // Fallback: any dimension where competitor has real data and we don't
  // — left implicit in `missing`, so just return null.
  return null;
}

/**
 * Pro-only deterministic side-by-side editorial diagnostic. Uses only
 * fields already present in ReportData / competitor breakdown — no AI,
 * no provider calls. Returns null when no dimension has signal on both
 * sides.
 */
export function CompetitorEditorialDiagnostic({
  primaryHandle,
  primaryAvatarUrl,
  primaryFullName,
  primaryVerified,
  primary,
  competitor,
}: Props) {
  const dims = buildDimensions(primary, competitor);
  const hasAnySignal = dims.some((d) => d.winner !== "missing");
  if (!hasAnySignal) return null;

  const bestPrimary = pickBest(dims, "primary");
  const bestCompetitor = pickBest(dims, "competitor");
  const opportunity = pickOpportunity(dims);

  const rows: Array<{ eyebrow: string; tone: "primary" | "competitor" | "neutral"; text: string }> = [
    {
      eyebrow: "O que este perfil faz melhor",
      tone: "primary",
      text: bestPrimary ? bestPrimary.primaryWins : EMPTY_ROW,
    },
    {
      eyebrow: "O que o concorrente faz melhor",
      tone: "competitor",
      text: bestCompetitor ? bestCompetitor.competitorWins : EMPTY_ROW,
    },
    {
      eyebrow: "Oportunidade prioritária",
      tone: "neutral",
      text: opportunity
        ? opportunity.opportunity
        : bestCompetitor
          ? bestCompetitor.opportunity || EMPTY_ROW
          : EMPTY_ROW,
    },
  ];

  return (
    <CompareCardShell
      title="Diagnóstico editorial comparativo"
      windowAligned={competitor.windowAligned}
      primary={{
        handle: primaryHandle,
        avatarUrl: primaryAvatarUrl ?? null,
        isVerified: Boolean(primaryVerified),
        displayName: primaryFullName ?? null,
      }}
      competitor={{
        handle: competitor.username,
        avatarUrl: competitor.avatarUrl ?? null,
        isVerified: competitor.isVerified,
        displayName: competitor.displayName,
      }}
    >
      <ul className="flex flex-col gap-4">
        {rows.map((row) => (
          <li
            key={row.eyebrow}
            className={cn(
              "relative rounded-xl border border-border-default/70 bg-white px-4 py-3 sm:px-5 sm:py-4",
              "shadow-[0_1px_2px_-1px_rgba(15,23,42,0.04)]",
            )}
          >
            <span
              aria-hidden="true"
              className={cn(
                "absolute inset-y-0 left-0 w-[3px] rounded-l-xl",
                row.tone === "primary"
                  ? "bg-accent-primary"
                  : row.tone === "competitor"
                    ? "bg-compare-competitor"
                    : "bg-border-default",
              )}
            />
            <p
              className={cn(
                "text-eyebrow-sm mb-1.5",
                row.tone === "primary"
                  ? "text-accent-primary"
                  : row.tone === "competitor"
                    ? "text-compare-competitor"
                    : "text-content-tertiary",
              )}
            >
              {row.eyebrow}
            </p>
            <p className="text-sm sm:text-[15px] text-content-secondary leading-relaxed">
              {row.text}
            </p>
          </li>
        ))}
      </ul>
    </CompareCardShell>
  );
}