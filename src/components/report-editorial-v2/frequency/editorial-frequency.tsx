import type { AdapterResult } from "@/lib/report/snapshot-to-report-data";

import { ReportBand } from "../primitives/report-band";
import { SectionIntro } from "../primitives/section-intro";
import { StatusPill } from "../primitives/status-pill";
import { MetricDisplay } from "../primitives/metric-display";
import { ObservationBlock } from "../primitives/observation-block";
import { ReadingBlock } from "../primitives/reading-block";
import { EDITORIAL_V2_DISPLAY_NUMBERS } from "../section-metadata";
import { useReveal } from "../overview/use-count-up";
import {
  buildEditorialFrequencyData,
  type EditorialFrequencyData,
} from "./frequency-data";

function dec1(n: number): string {
  return n.toFixed(1).replace(".", ",");
}

function listPt(items: readonly string[]): string {
  if (items.length <= 1) return items[0] ?? "";
  return `${items.slice(0, -1).join(", ")} e ${items[items.length - 1]}`;
}

function buildObservations(data: EditorialFrequencyData): string[] {
  const out: string[] = [];

  if (!data.hasWeekdayData) {
    out.push(
      `Não há publicações datadas no ${data.windowLabel} para distribuir por dia da semana.`,
    );
    return out;
  }

  out.push(
    `A amostra representada é de ${data.totalPosts} publicações (${data.windowLabel}).`,
  );

  const peakLabels = data.peakWeekdays.map(
    (d) => data.columns[d]?.long ?? "",
  );
  if (data.hasTie) {
    out.push(
      `A maior concentração está repartida por ${listPt(peakLabels)}, com ${data.maxPosts} publicações cada.`,
    );
  } else {
    out.push(
      `A maior concentração está em ${peakLabels[0]}, com ${data.maxPosts} publicações.`,
    );
  }

  if (data.silentWeekdays.length > 0) {
    const silentLabels = data.silentWeekdays.map(
      (d) => data.columns[d]?.long ?? "",
    );
    out.push(
      data.silentWeekdays.length === 1
        ? `Há 1 dia da semana sem publicações nesta amostra: ${silentLabels[0]}.`
        : `Há ${data.silentWeekdays.length} dias da semana sem publicações nesta amostra: ${listPt(silentLabels)}.`,
    );
  } else {
    out.push("Todos os dias da semana têm pelo menos uma publicação nesta amostra.");
  }

  if (data.sufficient) {
    out.push(
      `O ritmo medido é de ${dec1(data.weekly)} publicações por semana (${data.cadenceLabel}).`,
    );
  }

  return out;
}

function buildReading(data: EditorialFrequencyData): {
  hypothesis: string;
  confidence: "baixa" | "média" | "alta";
} {
  if (!data.sufficient || !data.hasWeekdayData) {
    return {
      hypothesis:
        "A amostra disponível ainda não permite avaliar o ritmo editorial com segurança. Antes de mudar a cadência, convém observar mais publicações nesta janela.",
      confidence: "baixa",
    };
  }
  if (data.silentWeekdays.length >= 4) {
    return {
      hypothesis:
        "A publicação está concentrada em poucos dias da semana. Uma distribuição mais regular pode aumentar o número de momentos de contacto — é uma hipótese simples a testar sem aumentar necessariamente o volume.",
      confidence: "média",
    };
  }
  if (data.hasTie) {
    return {
      hypothesis:
        "A distribuição está repartida por vários dias sem um padrão dominante. Estes dados descrevem quando se publica, não o desempenho de cada dia; testar horários fixos pode tornar o hábito mais previsível para a audiência.",
      confidence: "média",
    };
  }
  return {
    hypothesis:
      "A distribuição cobre a maior parte da semana. Manter esta regularidade tende a tornar o perfil mais previsível para quem segue — uma hipótese a confirmar cruzando com envolvimento e formatos.",
    confidence: "média",
  };
}

/**
 * Frequência editorial — Editorial V2 (Fase C).
 *
 * Apresentação pura: nenhuma regra de cadência nova, nenhum entitlement
 * adicional, nenhum pedido de rede. Todo o contexto (12 publicações, 30d,
 * 90d ou span observado) vem da cascata de cadência de produção.
 */
export function EditorialFrequency({ result }: { result: AdapterResult }) {
  const data = buildEditorialFrequencyData(result);
  const { ref, revealed } = useReveal<HTMLDivElement>();

  const observations = buildObservations(data);
  const reading = buildReading(data);

  const subtitle = data.sufficient
    ? `Nesta janela, o perfil publica ${data.cadenceLabel}. O gráfico mostra em que dias da semana essas publicações aconteceram.`
    : "O gráfico mostra em que dias da semana aconteceram as publicações disponíveis. A amostra ainda não permite avaliar o ritmo com segurança.";

  return (
    <ReportBand
      id="frequencia"
      labelledBy="ev2-frequencia-title"
      context={
        <div className="flex flex-col gap-[var(--ev2-s3)]">
          <SectionIntro
            displayNumber={EDITORIAL_V2_DISPLAY_NUMBERS["frequencia"]}
            title="Com que ritmo publicas"
            subtitle={subtitle}
            headingId="ev2-frequencia-title"
            headingLevel={2}
          />
          <div>
            <StatusPill tone={data.status.tone} label={data.status.label} />
          </div>
          <p className="max-w-[46ch] text-[13px] leading-[1.6] text-[var(--ev2-ink-3)]">
            {data.calculationNote}
          </p>
        </div>
      }
    >
      <div
        ref={ref}
        data-revealed={revealed ? "true" : "false"}
        className="flex flex-col gap-[var(--ev2-s4)] transition-[opacity,transform] duration-700 ease-[cubic-bezier(.16,1,.3,1)] motion-reduce:transition-none data-[revealed=false]:translate-y-[14px] data-[revealed=false]:opacity-0"
      >
        {/* A. Distribuição por dia da semana */}
        <div
          className="rounded-[10px] border p-[var(--ev2-s3)]"
          style={{
            background: "var(--ev2-surface)",
            borderColor: "var(--ev2-hair)",
          }}
        >
          <div className="flex flex-wrap items-end justify-between gap-[var(--ev2-s3)]">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--ev2-ink-3)]">
              Distribuição por dia da semana
            </p>
            {data.sufficient ? (
              <MetricDisplay
                label="Publicações por semana"
                value={dec1(data.weekly)}
              />
            ) : null}
          </div>

          {data.hasWeekdayData ? (
            <>
              <ul
                className="mt-[var(--ev2-s3)] grid grid-cols-7 items-end gap-[4px] sm:gap-[10px]"
                aria-label="Publicações por dia da semana"
              >
                {data.columns.map((col) => (
                  <li
                    key={col.weekday}
                    className="flex min-w-0 flex-col items-center gap-[6px]"
                  >
                    <span className="text-[12px] font-semibold tabular-nums text-[var(--ev2-ink-2)]">
                      {col.posts}
                    </span>
                    <div className="flex h-[76px] w-full items-end sm:h-[132px]">
                      <div
                        className="w-full rounded-[4px] transition-[height] duration-700 ease-[cubic-bezier(.16,1,.3,1)] motion-reduce:transition-none"
                        style={{
                          height:
                            col.posts === 0
                              ? "3px"
                              : `${Math.max(8, revealed ? col.heightPct : 0)}%`,
                          background:
                            col.posts === 0
                              ? "var(--ev2-hair-2)"
                              : col.isPeak
                                ? "var(--ev2-blue)"
                                : "var(--ev2-blue-3)",
                        }}
                      />
                    </div>
                    <span className="text-[11px] text-[var(--ev2-ink-3)] sm:text-[12px]">
                      {col.short}
                    </span>
                  </li>
                ))}
              </ul>
              <p className="mt-[var(--ev2-s2)] text-[12px] leading-[1.6] text-[var(--ev2-ink-4)]">
                {data.hasTie
                  ? "Vários dias partilham a maior concentração de publicações. O gráfico descreve quando se publicou, não o desempenho de cada dia."
                  : "O gráfico descreve a distribuição das publicações, não o desempenho de cada dia."}
              </p>
            </>
          ) : (
            <p className="mt-[var(--ev2-s3)] text-[14px] leading-[1.6] text-[var(--ev2-ink-3)]">
              Sem publicações datadas suficientes para mostrar a distribuição
              semanal nesta janela.
            </p>
          )}
        </div>

        {/* B. Observação */}
        <ObservationBlock statements={observations} />

        {/* C. Leitura */}
        <ReadingBlock
          hypothesis={reading.hypothesis}
          confidence={reading.confidence}
        />
      </div>
    </ReportBand>
  );
}
