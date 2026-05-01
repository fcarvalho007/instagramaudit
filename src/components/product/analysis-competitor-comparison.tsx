import { cn } from "@/lib/utils";
import { formatFollowers, formatPercent } from "@/lib/mock-analysis";
import type {
  CompetitorAnalysis,
  PublicAnalysisContentSummary,
  PublicAnalysisProfile,
} from "@/lib/analysis/types";

interface AnalysisCompetitorComparisonProps {
  primary: {
    profile: PublicAnalysisProfile;
    content_summary: PublicAnalysisContentSummary;
  };
  competitors: CompetitorAnalysis[];
}

type MetricKey =
  | "engagement"
  | "frequency"
  | "format"
  | "likes"
  | "comments";

interface MetricRow {
  key: MetricKey;
  label: string;
  // Higher is better, except for "format" which is qualitative.
  comparable: boolean;
  format: (s: PublicAnalysisContentSummary) => string;
  value: (s: PublicAnalysisContentSummary) => number;
}

const METRICS: MetricRow[] = [
  {
    key: "engagement",
    label: "Envolvimento médio",
    comparable: true,
    format: (s) => formatPercent(s.average_engagement_rate),
    value: (s) => s.average_engagement_rate,
  },
  {
    key: "frequency",
    label: "Frequência semanal",
    comparable: true,
    format: (s) => s.estimated_posts_per_week.toFixed(1).replace(".", ","),
    value: (s) => s.estimated_posts_per_week,
  },
  {
    key: "likes",
    label: "Média de gostos",
    comparable: true,
    format: (s) => s.average_likes.toLocaleString("pt-PT"),
    value: (s) => s.average_likes,
  },
  {
    key: "comments",
    label: "Média de comentários",
    comparable: true,
    format: (s) => s.average_comments.toLocaleString("pt-PT"),
    value: (s) => s.average_comments,
  },
  {
    key: "format",
    label: "Formato dominante",
    comparable: false,
    format: (s) => s.dominant_format,
    value: () => 0,
  },
];

interface SuccessEntry {
  username: string;
  displayName: string;
  followers: number;
  isPrimary: boolean;
  summary: PublicAnalysisContentSummary;
}

function SectionHeader() {
  return (
    <header className="flex flex-col gap-1">
      <span className="text-eyebrow-sm text-[0.625rem] text-content-tertiary">
        Comparação
      </span>
      <h2
        id="competitors-heading"
        className="font-display text-lg font-medium text-content-primary tracking-tight"
      >
        Comparação com concorrentes
      </h2>
    </header>
  );
}

function EmptyState() {
  return (
    <section
      aria-labelledby="competitors-heading"
      className="rounded-xl border border-border-subtle bg-surface-secondary p-5 md:p-6 space-y-3"
    >
      <SectionHeader />
      <p className="font-sans text-sm text-content-secondary leading-relaxed">
        Comparação com concorrentes disponível até 2 perfis. Adicionar{" "}
        <code className="font-mono text-xs text-content-primary">
          ?vs=username
        </code>{" "}
        ao endereço — ou{" "}
        <code className="font-mono text-xs text-content-primary">
          ?vs=user1,user2
        </code>{" "}
        — para comparar desempenho directo entre perfis.
      </p>
    </section>
  );
}

function FailureCard({ entry }: { entry: Extract<CompetitorAnalysis, { success: false }> }) {
  return (
    <div className="rounded-lg border border-border-subtle bg-surface-elevated p-4 space-y-1">
      <div className="flex items-center gap-2">
        <span
          aria-hidden="true"
          className="size-1.5 rounded-full bg-content-tertiary"
        />
        <span className="font-sans text-xs text-content-secondary">
          @{entry.username}
        </span>
      </div>
      <p className="font-sans text-xs text-content-tertiary leading-relaxed">
        {entry.message}
      </p>
    </div>
  );
}

export function AnalysisCompetitorComparison({
  primary,
  competitors,
}: AnalysisCompetitorComparisonProps) {
  if (competitors.length === 0) {
    return <EmptyState />;
  }

  const successEntries: SuccessEntry[] = [
    {
      username: primary.profile.username,
      displayName: primary.profile.display_name,
      followers: primary.profile.followers_count,
      isPrimary: true,
      summary: primary.content_summary,
    },
    ...competitors
      .filter((c): c is Extract<CompetitorAnalysis, { success: true }> => c.success)
      .map((c) => ({
        username: c.profile.username,
        displayName: c.profile.display_name,
        followers: c.profile.followers_count,
        isPrimary: false,
        summary: c.content_summary,
      })),
  ];

  const failureEntries = competitors.filter(
    (c): c is Extract<CompetitorAnalysis, { success: false }> => !c.success,
  );

  // Determine the best entry per comparable metric (highest value).
  const bestByMetric = new Map<MetricKey, string>();
  for (const metric of METRICS) {
    if (!metric.comparable) continue;
    let bestUsername = "";
    let bestValue = -Infinity;
    for (const entry of successEntries) {
      const v = metric.value(entry.summary);
      if (v > bestValue) {
        bestValue = v;
        bestUsername = entry.username;
      }
    }
    if (bestValue > 0) bestByMetric.set(metric.key, bestUsername);
  }

  const partialNote =
    failureEntries.length > 0
      ? "A comparação foi apresentada com os dados disponíveis."
      : null;

  return (
    <section
      aria-labelledby="competitors-heading"
      className="rounded-xl border border-border-subtle bg-surface-secondary p-5 md:p-6 space-y-5"
    >
      <SectionHeader />

      {/* Profile column headers + metric rows */}
      <div className="overflow-x-auto -mx-5 md:-mx-6 px-5 md:px-6">
        <div
          className="grid gap-3 md:gap-4 min-w-[28rem]"
          style={{
            gridTemplateColumns: `minmax(8.5rem, 1.4fr) repeat(${successEntries.length}, minmax(7rem, 1fr))`,
          }}
        >
          {/* Header row */}
          <div aria-hidden="true" />
          {successEntries.map((entry) => (
            <div
              key={`head-${entry.username}`}
              className={cn(
                "flex flex-col gap-0.5 pb-2 border-b",
                entry.isPrimary
                  ? "border-accent-violet/30"
                  : "border-border-subtle",
              )}
            >
              <span
                className={cn(
                  "text-eyebrow-sm text-[0.625rem]",
                  entry.isPrimary
                    ? "text-accent-luminous"
                    : "text-content-tertiary",
                )}
              >
                {entry.isPrimary ? "Perfil analisado" : "Concorrente"}
              </span>
              <span className="font-sans text-sm font-medium text-content-primary truncate">
                @{entry.username}
              </span>
              <span className="font-mono text-[0.625rem] text-content-tertiary">
                {formatFollowers(entry.followers)} seguidores
              </span>
            </div>
          ))}

          {/* Metric rows */}
          {METRICS.map((metric) => (
            <Row
              key={metric.key}
              metric={metric}
              entries={successEntries}
              bestUsername={bestByMetric.get(metric.key)}
            />
          ))}
        </div>
      </div>

      {failureEntries.length > 0 ? (
        <div className="space-y-2 pt-1">
          {partialNote ? (
            <p className="font-sans text-xs text-content-tertiary">
              {partialNote}
            </p>
          ) : null}
          <div className="grid gap-2 sm:grid-cols-2">
            {failureEntries.map((entry) => (
              <FailureCard key={`fail-${entry.username}`} entry={entry} />
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}

interface RowProps {
  metric: MetricRow;
  entries: SuccessEntry[];
  bestUsername: string | undefined;
}

function Row({ metric, entries, bestUsername }: RowProps) {
  return (
    <>
      <div className="flex items-center">
        <span className="text-eyebrow-sm text-[0.625rem] text-content-tertiary">
          {metric.label}
        </span>
      </div>
      {entries.map((entry) => {
        const isBest =
          metric.comparable &&
          bestUsername === entry.username &&
          entries.length > 1;
        return (
          <div
            key={`${metric.key}-${entry.username}`}
            className="flex items-center"
          >
            <span
              className={cn(
                "font-sans text-sm tabular-nums",
                isBest
                  ? "text-accent-luminous font-medium"
                  : "text-content-primary",
              )}
            >
              {metric.format(entry.summary)}
            </span>
          </div>
        );
      })}
    </>
  );
}
