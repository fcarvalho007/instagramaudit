import { useMemo } from "react";

import type { AdapterResult, SnapshotPayload } from "@/lib/report/snapshot-to-report-data";

import { ReportBand } from "../primitives/report-band";
import { SectionIntro } from "../primitives/section-intro";
import { StatusPill } from "../primitives/status-pill";
import { ObservationBlock } from "../primitives/observation-block";
import { ReadingBlock } from "../primitives/reading-block";
import { EDITORIAL_V2_DISPLAY_NUMBERS } from "../section-metadata";
import {
  buildEditorialDiagnosisData,
  type DiagnosisThreadSource,
} from "./diagnosis-data";

const SOURCE_LABEL: Record<DiagnosisThreadSource, string> = {
  regra: "Regra",
  ia: "IA",
  regra_ia: "Regra + IA",
};

/**
 * 06 — Diagnóstico editorial (Editorial V2).
 *
 * Apresentação pura das saídas de diagnóstico já produzidas em produção.
 * Não gera diagnóstico, não faz fetch e não introduz regras novas. O
 * gating Pro é decidido pelo shell, exactamente como em produção.
 */
export function EditorialDiagnosis({
  result,
  payload,
}: {
  result: AdapterResult;
  payload?: SnapshotPayload;
}) {
  const data = useMemo(
    () => buildEditorialDiagnosisData(result, payload),
    [result, payload],
  );

  const headingId = "ev2-diagnostico-editorial";

  return (
    <ReportBand
      id="diagnostico-editorial"
      labelledBy={headingId}
      context={
        <SectionIntro
          displayNumber={EDITORIAL_V2_DISPLAY_NUMBERS["diagnostico-editorial"]}
          title="O que os dados sugerem que merece atenção"
          subtitle="Leitura dos sinais disponíveis nesta janela. São hipóteses de causa, não certezas."
          headingId={headingId}
        />
      }
    >
      <div className="flex flex-col gap-[var(--ev2-s5)]">
        {data.empty ? (
          <p className="max-w-[62ch] text-[15px] leading-[1.65] text-[var(--ev2-ink-2)]">
            Não há sinais suficientes nesta janela para propor um diagnóstico
            editorial defensável.
          </p>
        ) : null}

        {data.verdict ? (
          <div className="flex flex-col gap-[var(--ev2-s2)]">
            <div className="flex items-center gap-[var(--ev2-s2)]">
              <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--ev2-ink-3)]">
                Síntese
              </span>
              <StatusPill
                tone="neutral"
                label={data.verdict.source === "ia" ? "IA" : "Regra"}
              />
            </div>
            <p className="max-w-[62ch] font-[family-name:var(--font-display)] text-[22px] leading-[1.3] text-[var(--ev2-ink)] lg:text-[26px]">
              {data.verdict.text}
            </p>
          </div>
        ) : null}

        {data.threads.map((thread) => (
          <article
            key={thread.id}
            className="flex flex-col gap-[var(--ev2-s2)] border-t pt-[var(--ev2-s3)]"
            style={{ borderColor: "var(--ev2-hair)" }}
          >
            <div className="flex flex-wrap items-baseline justify-between gap-[var(--ev2-s2)]">
              <h3 className="text-[20px] text-[var(--ev2-ink)] lg:text-[22px]">
                {thread.title}
              </h3>
              <span className="text-[11px] font-medium uppercase tracking-[0.14em] text-[var(--ev2-ink-4)]">
                Origem: {SOURCE_LABEL[thread.source]}
              </span>
            </div>
            <ObservationBlock statements={thread.observations} />
            {thread.reading ? <ReadingBlock hypothesis={thread.reading} /> : null}
          </article>
        ))}

        {data.notices.length > 0 ? (
          <div className="flex flex-col gap-[var(--ev2-s1)]">
            {data.notices.map((notice) => (
              <p
                key={notice.id}
                className="text-[13px] leading-[1.6] text-[var(--ev2-ink-3)]"
              >
                {notice.label}:{" "}
                {notice.kind === "pending"
                  ? "ainda a ser processada. Este relatório é actualizado quando ficar concluída."
                  : "não ficou disponível para este relatório."}
              </p>
            ))}
          </div>
        ) : null}
      </div>
    </ReportBand>
  );
}
