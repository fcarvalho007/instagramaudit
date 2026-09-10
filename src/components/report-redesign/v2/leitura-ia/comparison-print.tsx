import { comparisonExportSections } from "@/lib/comparison-readings/export";
import { LeituraIaBox } from "./leitura-ia-box";
import { COMPARISON_METRICS } from "@/lib/comparison-readings/validate";
/** Print each account independently; sources are expanded before PDF capture. */
export function ComparisonPrint({ payload }: { payload: unknown }) {
  return (
    <div className="mx-auto max-w-6xl px-6">
      {comparisonExportSections(payload).map((entry) => (
        <section key={entry.competitor_handle} className="my-8 space-y-5 break-before-page">
          <h2 className="text-2xl font-semibold">
            {entry.model === "deterministic" ? "Experiências do perfil" : "Comparação com"} @
            {entry.competitor_handle} · {entry.window}
          </h2>
          <p>
            Publicações do período e interações observadas na recolha. Não permite reconstruir
            crescimento de seguidores, alcance ou vendas.
          </p>
          {entry.readings!.cards.map((card) => (
            <div key={card.card_id}>
              <LeituraIaBox
                reading={card}
                sourceLabel={entry.model === "deterministic" ? "Leitura dos dados" : "Leitura IA"}
              />
              {card.experiment && (
                <div className="border rounded-lg p-4 mt-3 text-sm">
                  <h3>Experiência proposta · prioridade {card.priority_rank}</h3>
                  <p>Hipótese: {card.experiment.hypothesis}</p>
                  <p>Execução: {card.experiment.execution}</p>
                  <p>
                    Parâmetros propostos: {card.experiment.duration_days} dias ·{" "}
                    {card.experiment.intended_posts} publicações · esforço {card.experiment.effort}.
                  </p>
                  <p>
                    Avaliar:{" "}
                    {COMPARISON_METRICS[`aggregates.${card.experiment.success_metric}`]?.label}.{" "}
                    {card.experiment.evaluation}
                  </p>
                </div>
              )}
            </div>
          ))}
        </section>
      ))}
    </div>
  );
}
