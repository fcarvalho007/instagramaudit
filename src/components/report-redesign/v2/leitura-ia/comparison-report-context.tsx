import { readProfileExperiments } from "@/lib/comparison-readings/profile-experiments";
import { ComparisonSources } from "./comparison-sources";
import { createContext, useContext, useState, type ReactNode } from "react";
import { selectComparisonReadings, type ComparisonReadingsLookup } from "./use-comparison-readings";
import { COMPARISON_METRICS } from "@/lib/comparison-readings/validate";
import type { ComparisonReadingCardId, CardReading } from "@/lib/comparison-readings/types";
import { LeituraIaBox } from "./leitura-ia-box";
import { trackEvent } from "@/lib/tracking.functions";

type ContextValue = {
  active: boolean;
  enhanced: boolean;
  profileCards: CardReading[];
  handles: string[];
  selected: string;
  select: (handle: string) => void;
  readings: ComparisonReadingsLookup | null;
  window: string;
};
const Context = createContext<ContextValue>({
  active: false,
  enhanced: false,
  profileCards: [],
  handles: [],
  selected: "",
  select: () => {},
  readings: null,
  window: "baseline",
});
export const useComparisonReport = () => useContext(Context);
export function ComparisonReportProvider({
  payload,
  enabled,
  children,
}: {
  payload?: unknown;
  enabled: boolean;
  children: ReactNode;
}) {
  const p = (payload ?? {}) as Record<string, unknown>;
  const handles = (Array.isArray(p.competitors) ? p.competitors : [])
    .flatMap((c: { success?: boolean; profile?: { username?: string } }) =>
      c?.success !== false && c?.profile?.username
        ? [String(c.profile.username).toLowerCase()]
        : [],
    )
    .slice(0, 2);
  const [requested, setRequested] = useState("");
  const selected = handles.includes(requested) ? requested : (handles[0] ?? "");
  const active = enabled && p.comparison_version === 2 && handles.length > 0;
  const window = typeof p.analysis_window === "string" ? p.analysis_window : "baseline";
  const readings = active ? selectComparisonReadings(payload, selected, window) : null;
  const select = (handle: string) => {
    setRequested(handle);
    trackEvent({
      data: { eventType: "comparison_selected", metadata: { competitor_handle: handle, window } },
    }).catch(() => {});
  };
  return (
    <Context.Provider
      value={{
        active,
        enhanced: enabled && p.comparison_version === 2,
        profileCards: enabled ? readProfileExperiments(payload) : [],
        handles,
        selected,
        select,
        readings,
        window,
      }}
    >
      {children}
    </Context.Provider>
  );
}
export function ComparisonSelector() {
  const c = useComparisonReport();
  if (!c.active) return null;
  return (
    <section
      aria-label="Selecionar comparação"
      className="rounded-xl border border-border-default bg-surface-primary p-5 my-5"
    >
      <p className="text-sm font-semibold text-content-primary">Comparação direta</p>
      <div className="flex flex-wrap gap-2 mt-3" role="group" aria-label="Concorrente selecionado">
        {c.handles.map((handle) => (
          <button
            key={handle}
            type="button"
            aria-pressed={c.selected === handle}
            onClick={() => c.select(handle)}
            className={`rounded-lg border px-4 py-2 text-sm ${c.selected === handle ? "border-accent-primary bg-tint-primary text-accent-primary" : "border-border-default text-content-secondary"}`}
          >
            @{handle}
          </button>
        ))}
      </div>
      <p className="text-xs text-content-secondary mt-3">
        {c.window === "baseline"
          ? "Últimas publicações"
          : c.window === "30d"
            ? "Publicações dos últimos 30 dias"
            : "Publicações dos últimos 90 dias"}
        . Interações observadas na recolha; não representam crescimento histórico ou resultados
        comerciais.
      </p>
      {c.readings?.evidencePack && (
        <div className="text-xs text-content-secondary mt-3 space-y-1">
          {(["primary", "competitor"] as const).map((side) => {
            const profile = c.readings!.evidencePack![side] as {
              handle?: string;
              collection_coverage?: {
                requested_start?: string;
                requested_end?: string;
                observed_start?: string;
                observed_end?: string;
                post_count?: number;
                limit?: number;
                status?: string;
              };
              aggregates?: { eligible_posts?: number };
              sampled_posts?: unknown[];
            };
            const cv = profile?.collection_coverage;
            const date = (v?: string) =>
              v ? new Date(v).toLocaleDateString("pt-PT", { timeZone: "UTC" }) : "indisponível";
            return (
              <p key={side}>
                @{profile?.handle}: {cv?.post_count ?? profile?.aggregates?.eligible_posts ?? "—"}{" "}
                publicações · cobertura{" "}
                {cv?.status === "complete"
                  ? "completa"
                  : cv?.status === "partial"
                    ? "parcial"
                    : "da amostra"}{" "}
                · {date(cv?.observed_start)} a {date(cv?.observed_end)} ·{" "}
                {profile?.sampled_posts?.length ?? 0} exemplos analisados. Limite por conta:{" "}
                {cv?.limit ?? "—"}.
              </p>
            );
          })}
        </div>
      )}
      {!c.readings && (
        <p role="status" className="text-sm text-content-secondary mt-3">
          A leitura comparativa ainda não está disponível para esta conta e período. Os dados do
          perfil mantêm-se acessíveis.
        </p>
      )}
    </section>
  );
}
export function ComparisonReadingPanel({ cardId }: { cardId: ComparisonReadingCardId }) {
  const c = useComparisonReport();
  if (!c.active) return null;
  return (
    <div className="my-5">
      <LeituraIaBox reading={c.readings?.byCard[cardId]} />
    </div>
  );
}
export function ComparisonExperiments() {
  const c = useComparisonReport();
  if (!c.enhanced) return null;
  const cards = c.active
    ? Object.values(c.readings?.byCard ?? {})
        .filter((v): v is CardReading => !!v?.experiment && !!v.priority_rank)
        .sort((a, b) => a.priority_rank! - b.priority_rank!)
        .slice(0, 3)
    : c.profileCards;
  return (
    <section className="space-y-4 my-6" aria-label="Prioridades da comparação">
      <h3 className="text-lg font-semibold text-content-primary">
        {c.active
          ? "Experiências fundamentadas na comparação"
          : "Experiências fundamentadas no perfil"}
      </h3>
      {!cards.length ? (
        <p className="text-sm text-content-secondary">
          A evidência disponível ainda não permite propor experiências comparativas com segurança.
        </p>
      ) : (
        cards.map((card) => {
          const e = card.experiment!;
          return (
            <article
              className="rounded-xl border border-border-default bg-surface-primary p-5"
              key={card.card_id}
            >
              <h4 className="font-semibold text-content-primary">
                {card.priority_rank}. {card.headline}
              </h4>
              <p className="text-sm text-content-secondary mt-2">Hipótese: {e.hypothesis}</p>
              <p className="text-sm text-content-secondary mt-2">Execução: {e.execution}</p>
              <p className="text-xs text-content-secondary mt-2">
                Parâmetros propostos: {e.duration_days} dias · {e.intended_posts} publicações ·
                esforço {e.effort === "medio" ? "médio" : e.effort}.
              </p>
              <p className="text-sm text-content-secondary mt-2">
                Avaliar: {COMPARISON_METRICS[`aggregates.${e.success_metric}`]?.label}.{" "}
                {e.evaluation}
              </p>
              <p className="text-xs text-content-tertiary mt-2">
                Comparar períodos equivalentes após a execução. A variação observada não prova
                causalidade.
              </p>
              <ComparisonSources reading={card} />
            </article>
          );
        })
      )}
    </section>
  );
}
