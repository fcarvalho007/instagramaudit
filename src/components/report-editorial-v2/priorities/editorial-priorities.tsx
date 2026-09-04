import { useMemo } from "react";

import type { AdapterResult, SnapshotPayload } from "@/lib/report/snapshot-to-report-data";
import type {
  PriorityCategory,
  PriorityLevel,
  PrioritySourceTag,
} from "@/lib/report/block02-diagnostic";

import { ReportBand } from "../primitives/report-band";
import { SectionIntro } from "../primitives/section-intro";
import { ObservationBlock } from "../primitives/observation-block";
import { EDITORIAL_V2_DISPLAY_NUMBERS } from "../section-metadata";
import { buildEditorialPrioritiesData } from "./priorities-data";

const CATEGORY_LABEL: Record<PriorityCategory, string> = {
  testar: "Testar",
  corrigir: "Corrigir",
  repetir: "Repetir",
  oportunidade: "Oportunidade",
};

const LEVEL_LABEL: Record<PriorityLevel, string> = {
  alta: "Prioridade alta",
  media: "Prioridade média",
  oportunidade: "Oportunidade",
};

const SOURCE_LABEL: Record<PrioritySourceTag, string> = {
  deterministic: "Regra",
  ai: "IA",
};

function displayNumber(index: number): string {
  return String(index + 1).padStart(2, "0");
}

/**
 * 07 — Prioridades de ação (Editorial V2).
 *
 * Apresentação pura da lista de prioridades já montada em produção. A
 * ordem, o dedupe, a contagem, a categoria, o nível, a evidência, o
 * `basedOn` e a proveniência vêm intactos do output público Pro. Nada é
 * gerado, recalculado, reordenado nem inventado aqui. O gate Pro é
 * decidido pelo shell, exactamente como em produção.
 */
export function EditorialPriorities({
  result,
  payload,
  commentIntelligenceFull,
}: {
  result: AdapterResult;
  payload?: SnapshotPayload;
  commentIntelligenceFull: boolean;
}) {
  const data = useMemo(
    () => buildEditorialPrioritiesData(result, payload, commentIntelligenceFull),
    [result, payload, commentIntelligenceFull],
  );

  const headingId = "ev2-prioridades";

  return (
    <ReportBand
      id="prioridades"
      labelledBy={headingId}
      context={
        <SectionIntro
          displayNumber={EDITORIAL_V2_DISPLAY_NUMBERS["prioridades"]}
          title="Onde concentrar a atenção a seguir"
          subtitle="Prioridades sugeridas pelos sinais observados neste relatório, na ordem recomendada pela análise. São hipóteses a testar, não garantias de resultado."
          headingId={headingId}
        />
      }
    >
      {data.empty ? (
        <p className="max-w-[62ch] text-[15px] leading-[1.65] text-[var(--ev2-ink-2)]">
          Não há sinais suficientes nesta janela para propor prioridades de
          acção defensáveis.
        </p>
      ) : (
        <ol className="flex list-none flex-col gap-[var(--ev2-s5)] p-0">
          {data.items.map((item, index) => {
            const evidence = item.evidence ?? [];
            const basedOn = item.basedOn ?? [];
            return (
              <li
                key={`${item.title}-${item.category}-${index}`}
                className="flex flex-col gap-[var(--ev2-s2)] border-t pt-[var(--ev2-s3)]"
                style={{ borderColor: "var(--ev2-hair)" }}
              >
                <div className="flex flex-wrap items-baseline gap-x-[var(--ev2-s2)] gap-y-[6px]">
                  <span
                    aria-hidden="true"
                    className="font-[family-name:var(--font-display)] text-[26px] leading-none tabular-nums text-[var(--ev2-ink-4)] lg:text-[30px]"
                  >
                    {displayNumber(index)}
                  </span>
                  {item.source ? (
                    <span className="ml-auto text-[11px] font-medium uppercase tracking-[0.14em] text-[var(--ev2-ink-4)]">
                      Origem: {SOURCE_LABEL[item.source]}
                    </span>
                  ) : null}
                </div>

                <h3 className="max-w-[34ch] font-[family-name:var(--font-display)] text-[22px] leading-[1.25] text-[var(--ev2-ink)] lg:text-[26px]">
                  {item.title}
                </h3>

                {item.category || item.level ? (
                  <div className="flex flex-wrap items-center gap-[8px]">
                    {item.category ? (
                      <span className="rounded-full border px-[10px] py-[3px] text-[12px] font-medium text-[var(--ev2-ink-2)]"
                        style={{ borderColor: "var(--ev2-hair-2)" }}
                      >
                        {CATEGORY_LABEL[item.category]}
                      </span>
                    ) : null}
                    {item.level ? (
                      <span className="text-[12px] text-[var(--ev2-ink-3)]">
                        {LEVEL_LABEL[item.level]}
                      </span>
                    ) : null}
                  </div>
                ) : null}

                {item.body ? (
                  <p className="max-w-[62ch] text-[15px] leading-[1.65] text-[var(--ev2-ink-2)]">
                    {item.body}
                  </p>
                ) : null}

                {evidence.length > 0 ? (
                  <ObservationBlock
                    statements={evidence.map((ev) =>
                      ev.value ? `${ev.label}: ${ev.value}` : ev.label,
                    )}
                  />
                ) : null}

                {basedOn.length > 0 ? (
                  <p className="text-[12px] leading-[1.6] text-[var(--ev2-ink-4)]">
                    Baseado em: {basedOn.join(" · ")}
                  </p>
                ) : null}
              </li>
            );
          })}
        </ol>
      )}
    </ReportBand>
  );
}
