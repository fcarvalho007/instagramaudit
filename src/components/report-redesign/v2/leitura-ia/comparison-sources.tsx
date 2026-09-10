import { publicationUrl } from "@/lib/comparison-readings/publication-url";
import type { CardReading } from "@/lib/comparison-readings/types";
import { COMPARISON_METRICS } from "@/lib/comparison-readings/validate";
import { trackEvent } from "@/lib/tracking.functions";
export function ComparisonSources({ reading }: { reading: CardReading }) {
  if (!reading.evidence_points.length && !reading.sources.length) return null;
  const track = () =>
    trackEvent({
      data: { eventType: "comparison_evidence_opened", metadata: { card: reading.card_id } },
    }).catch(() => {});
  return (
    <details
      className="mt-3 text-sm text-content-secondary comparison-evidence"
      onToggle={(e) => {
        if (e.currentTarget.open) track();
      }}
    >
      <summary className="cursor-pointer text-accent-primary">Ver evidências e publicações</summary>
      {!!reading.evidence_points.length && (
        <div className="overflow-x-auto mt-3">
          <table className="w-full text-xs text-left">
            <thead>
              <tr>
                <th className="p-2">Indicador</th>
                <th className="p-2">Perfil</th>
                <th className="p-2">Concorrente</th>
              </tr>
            </thead>
            <tbody>
              {reading.evidence_points.map((e) => {
                const unit = COMPARISON_METRICS[e.field]?.unit ?? "";
                const format = (v: string | number | null) =>
                  v === null
                    ? "Indisponível"
                    : typeof v === "number"
                      ? `${new Intl.NumberFormat("pt-PT", { maximumFractionDigits: 2 }).format(v)}${unit}`
                      : v;
                return (
                  <tr key={e.field}>
                    <td className="p-2">{e.label}</td>
                    <td className="p-2">{format(e.primary_value)}</td>
                    <td className="p-2">{format(e.competitor_value)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      {reading.sources.map((source, i) => (
        <figure
          className="mt-3 border-l-2 border-border-default pl-3"
          key={`${source.side}:${source.post_id}:${i}`}
        >
          <blockquote>“{source.quote}”</blockquote>
          <figcaption className="text-xs mt-1">
            {source.side === "primary" ? "Perfil" : "Concorrente"}
            {source.date
              ? ` · ${new Date(source.date).toLocaleDateString("pt-PT", { timeZone: "UTC" })}`
              : ""}
            {publicationUrl(source.permalink) && (
              <a
                href={publicationUrl(source.permalink)!}
                target="_blank"
                rel="noopener noreferrer"
                className="text-accent-primary ml-2"
              >
                Abrir publicação
              </a>
            )}
          </figcaption>
        </figure>
      ))}
    </details>
  );
}
