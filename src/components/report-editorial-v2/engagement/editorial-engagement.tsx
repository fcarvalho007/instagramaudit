import type { AdapterResult } from "@/lib/report/snapshot-to-report-data";

import { ReportBand } from "../primitives/report-band";
import { SectionIntro } from "../primitives/section-intro";
import { StatusPill } from "../primitives/status-pill";
import { MetricDisplay } from "../primitives/metric-display";
import { ObservationBlock } from "../primitives/observation-block";
import { ReadingBlock } from "../primitives/reading-block";
import { EDITORIAL_V2_DISPLAY_NUMBERS } from "../section-metadata";
import { useReveal } from "../overview/use-count-up";
import { buildEditorialEngagementData } from "./engagement-data";

function pct(n: number): string {
  if (!Number.isFinite(n)) return "0,00%";
  return `${n.toFixed(2).replace(".", ",")}%`;
}

function dec1(n: number): string {
  return n.toFixed(1).replace(".", ",");
}

/**
 * Engagement — Editorial V2 (Fase B).
 *
 * Apresentação pura: nenhuma fórmula nova, nenhum entitlement adicional,
 * nenhum pedido de rede. Toda a informação vem das props de produção.
 */
export function EditorialEngagement({ result }: { result: AdapterResult }) {
  const data = buildEditorialEngagementData(result);
  const { ref, revealed } = useReveal<HTMLDivElement>();

  const scaleMax = Math.max(data.rate, data.benchmark, 0.01);
  const profileWidth = Math.min(100, (data.rate / scaleMax) * 100);

  const sampleNote = data.windowLabel
    ? `Média das ${data.postsAnalyzed} publicações analisadas (${data.windowLabel}): interacções por publicação a dividir pelos seguidores.`
    : `Média das ${data.postsAnalyzed} publicações analisadas: interacções por publicação a dividir pelos seguidores.`;

  const observations: string[] = [
    `A taxa de engagement do perfil nesta janela é ${pct(data.rate)}.`,
  ];
  if (data.hasBenchmark) {
    observations.push(
      `A referência do escalão ${data.tierLabel}${data.tierRange ? ` (${data.tierRange})` : ""} é ${pct(data.benchmark)}.`,
      data.deltaPct >= 0
        ? `A diferença face à referência é +${dec1(Math.abs(data.deltaPct))}%.`
        : `A diferença face à referência é −${dec1(Math.abs(data.deltaPct))}%.`,
    );
  } else {
    observations.push(
      "Não existe referência publicada para este escalão nesta análise, pelo que não é mostrada comparação.",
    );
  }
  observations.push(
    `Em média, ${dec1(data.perThousand)} interacções por cada 1 000 seguidores.`,
  );

  const reading = data.hasBenchmark
    ? data.deltaPct <= -10
      ? "Os dados sugerem que o alcance conquistado nesta janela está a converter menos interacções do que é habitual em perfis do mesmo escalão. Isto pode indicar temas, formatos ou horários pouco alinhados com a audiência — uma hipótese a testar nas secções seguintes."
      : data.deltaPct >= 10
        ? "Os dados sugerem que esta audiência reage acima do habitual para o escalão. Uma hipótese a testar é que os temas e formatos actuais estão bem ajustados a quem já segue o perfil."
        : "Os dados sugerem um comportamento próximo do habitual para o escalão. Nenhuma leitura forte é possível apenas a partir deste indicador; convém cruzar com ritmo, formatos e publicações-chave."
    : "Sem referência de escalão, os dados só permitem ler a evolução do próprio perfil. Uma hipótese a testar é comparar esta taxa com janelas anteriores antes de tirar conclusões.";

  return (
    <ReportBand
      id="engagement"
      labelledBy="ev2-engagement-title"
      context={
        <div className="flex flex-col gap-[var(--ev2-s3)]">
          <SectionIntro
            displayNumber={EDITORIAL_V2_DISPLAY_NUMBERS["engagement"]}
            title="Quantas pessoas reagem ao que publicas"
            subtitle="O engagement mede a proporção de seguidores que reage a cada publicação — gostos e comentários a dividir pelo número de seguidores."
            headingId="ev2-engagement-title"
            headingLevel={2}
          />
          <div>
            <StatusPill tone={data.status.tone} label={data.status.label} />
          </div>
          <p className="max-w-[46ch] text-[13px] leading-[1.6] text-[var(--ev2-ink-3)]">
            {sampleNote}
            {data.datasetVersion
              ? ` Referência: dataset ${data.datasetVersion}.`
              : ""}
          </p>
        </div>
      }
    >
      <div
        ref={ref}
        data-revealed={revealed ? "true" : "false"}
        className="flex flex-col gap-[var(--ev2-s4)] transition-[opacity,transform] duration-700 ease-[cubic-bezier(.16,1,.3,1)] motion-reduce:transition-none data-[revealed=false]:translate-y-[14px] data-[revealed=false]:opacity-0"
      >
        {/* A. Comparação principal */}
        <div
          className="rounded-[10px] border p-[var(--ev2-s3)]"
          style={{
            background: "var(--ev2-surface)",
            borderColor: "var(--ev2-hair)",
          }}
        >
          <div className="flex flex-col gap-[var(--ev2-s3)] sm:flex-row sm:items-end sm:gap-[var(--ev2-s5)]">
            <MetricDisplay
              label="Este perfil"
              value={pct(data.rate)}
              size="lg"
              note={`${dec1(data.perThousand)} interacções por cada 1 000 seguidores`}
            />
            {data.hasBenchmark ? (
              <>
                <span className="text-[13px] uppercase tracking-[0.14em] text-[var(--ev2-ink-4)] sm:pb-[14px]">
                  contra
                </span>
                <MetricDisplay
                  label="Referência do escalão"
                  value={pct(data.benchmark)}
                  note={
                    data.tierRange
                      ? `${data.tierLabel} · ${data.tierRange}`
                      : data.tierLabel
                  }
                />
              </>
            ) : null}
          </div>
        </div>

        {/* B. Comparação de escalão — banda única disponível sem I/O extra */}
        {data.tierBands.length > 0 ? (
          <div
            className="rounded-[10px] border p-[var(--ev2-s3)]"
            style={{
              background: "var(--ev2-surface)",
              borderColor: "var(--ev2-hair)",
            }}
          >
            <p className="mb-[var(--ev2-s2)] text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--ev2-ink-3)]">
              Referência por escalão
            </p>
            <ul className="flex flex-col gap-[var(--ev2-s2)]">
              {data.tierBands.map((band) => {
                const width = Math.min(100, (band.value / scaleMax) * 100);
                return (
                  <li key={band.label} className="flex flex-col gap-[6px]">
                    <div className="flex flex-wrap items-baseline justify-between gap-[8px]">
                      <span className="text-[13px] text-[var(--ev2-ink-2)]">
                        {band.label}
                        {band.isCurrent ? (
                          <span
                            className="ml-[8px] rounded-full px-[8px] py-[2px] text-[12px] font-medium"
                            style={{
                              color: "var(--ev2-blue)",
                              background: "var(--ev2-blue-4)",
                            }}
                          >
                            Estás aqui
                          </span>
                        ) : null}
                      </span>
                      <span className="ev2-tabular text-[13px] text-[var(--ev2-ink-2)]">
                        {pct(band.value)}
                      </span>
                    </div>
                    <div
                      className="h-[8px] w-full overflow-hidden rounded-full"
                      style={{ background: "var(--ev2-hair)" }}
                    >
                      <div
                        className="h-full rounded-full transition-[width] duration-700 ease-[cubic-bezier(.16,1,.3,1)] motion-reduce:transition-none"
                        style={{
                          width: revealed ? `${width}%` : "0%",
                          background: "var(--ev2-ink-4)",
                        }}
                      />
                    </div>
                  </li>
                );
              })}

              <li className="flex flex-col gap-[6px]">
                <div className="flex flex-wrap items-baseline justify-between gap-[8px]">
                  <span className="text-[13px] font-medium text-[var(--ev2-ink)]">
                    Este perfil
                  </span>
                  <span className="ev2-tabular text-[13px] text-[var(--ev2-ink)]">
                    {pct(data.rate)}
                  </span>
                </div>
                <div
                  className="h-[8px] w-full overflow-hidden rounded-full"
                  style={{ background: "var(--ev2-hair)" }}
                >
                  <div
                    className="h-full rounded-full transition-[width] duration-700 ease-[cubic-bezier(.16,1,.3,1)] motion-reduce:transition-none"
                    style={{
                      width: revealed ? `${profileWidth}%` : "0%",
                      background: "var(--ev2-blue)",
                    }}
                  />
                </div>
              </li>
            </ul>
          </div>
        ) : null}

        {/* C. Observação */}
        <div
          className="rounded-[10px] border p-[var(--ev2-s3)]"
          style={{
            background: "var(--ev2-surface)",
            borderColor: "var(--ev2-hair)",
          }}
        >
          <ObservationBlock statements={observations} />
        </div>

        {/* D. Leitura */}
        <ReadingBlock hypothesis={reading} confidence="média" />
      </div>
    </ReportBand>
  );
}
