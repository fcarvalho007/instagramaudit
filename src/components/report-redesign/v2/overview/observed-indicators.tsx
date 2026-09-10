import type { SnapshotPayload } from "@/lib/report/snapshot-to-report-data";
import { computeCadence } from "@/lib/report/cadence";
const format = (value: unknown, suffix = "") =>
  typeof value === "number" && Number.isFinite(value)
    ? new Intl.NumberFormat("pt-PT", { maximumFractionDigits: 2 }).format(value) + suffix
    : "Indisponível";
export function ObservedIndicators({ payload }: { payload?: SnapshotPayload }) {
  const end = Date.parse(payload?.analysis_window_end ?? "");
  const cadence = Number.isFinite(end) ? computeCadence(payload?.posts ?? [], { now: end }) : null;
  const coverage = payload?.collection_coverage;
  const observed =
    payload?.posts?.length &&
    !payload.posts.some(
      (p) =>
        (p as { likes_observed?: boolean; comments_observed?: boolean }).likes_observed === false ||
        (p as { comments_observed?: boolean }).comments_observed === false,
    ) &&
    (payload.profile?.followers_count ?? 0) > 0;
  return (
    <section
      aria-label="Indicadores observados"
      className="rounded-xl border border-border-default p-5 bg-surface-primary"
    >
      <h3 className="text-sm font-semibold text-content-primary">Indicadores observados</h3>
      <dl className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
        {[
          [
            "Envolvimento por seguidores",
            format(observed ? payload?.content_summary?.average_engagement_rate : null, "%"),
          ],
          ["Cadência observada", format(cadence?.sufficient ? cadence.weekly : null, "/semana")],
          [
            "Cobertura",
            `${format(coverage?.post_count ?? payload?.content_summary?.posts_analyzed)} publicações · ${coverage?.status === "complete" ? "período completo" : coverage?.status === "partial" ? "parcial" : "amostra"}`,
          ],
        ].map(([label, value]) => (
          <div key={label}>
            <dt className="text-xs text-content-secondary">{label}</dt>
            <dd className="text-xl font-semibold text-content-primary mt-1">{value}</dd>
          </div>
        ))}
      </dl>
      <p className="text-xs text-content-secondary mt-4">
        Média de (gostos + comentários) ÷ seguidores na recolha. Estes indicadores descrevem a
        amostra; não medem autoridade, alcance, vendas ou qualidade global. A cadência não tem um
        ideal universal.
      </p>
      <p className="text-xs text-content-secondary mt-2">
        Benchmarks com fórmulas, agregações ou populações diferentes não determinam classificações.
      </p>
    </section>
  );
}
