import type {
  AdapterResult,
  SnapshotPayload,
} from "@/lib/report/snapshot-to-report-data";

import { ReportBand } from "../primitives/report-band";
import { SectionIntro } from "../primitives/section-intro";
import { ObservationBlock } from "../primitives/observation-block";
import { EDITORIAL_V2_SECTIONS } from "../section-metadata";
import { EditorialVerdict } from "./editorial-verdict";
import { PrimarySignal } from "./primary-signal";
import { ProfileContext } from "./profile-context";
import { ProfileIndex } from "./profile-index";
import { SecondarySignals } from "./secondary-signals";
import { useEditorialOverviewData } from "./overview-data";
import { useReveal } from "./use-count-up";

const nf = new Intl.NumberFormat("pt-PT");

function pct(n: number): string {
  if (!Number.isFinite(n)) return "0,00%";
  return `${n.toFixed(2).replace(".", ",")}%`;
}

/**
 * Visão geral do Editorial V2 (Fase A).
 *
 * Consome exactamente os mesmos dados da visão geral de produção; não
 * altera gating, entitlements, período, snapshot ou analytics.
 */
export function EditorialOverview({
  result,
  payload,
}: {
  result: AdapterResult;
  payload?: SnapshotPayload;
}) {
  const data = useEditorialOverviewData(result, payload);
  const meta = EDITORIAL_V2_SECTIONS[0];
  const { ref, revealed } = useReveal<HTMLDivElement>();

  const [primary, ...rest] = data.signals;

  return (
    <ReportBand
      id="visao-geral"
      labelledBy="ev2-overview-verdict"
      context={
        <div className="flex flex-col gap-[var(--ev2-s4)]">
          <SectionIntro
            displayNumber={meta.displayNumber}
            title={meta.title}
            subtitle={meta.subtitle}
            headingLevel={3}
          />
          <ProfileContext profile={data.profile} windowLabel={data.windowLabel} />
        </div>
      }
    >
      <div
        ref={ref}
        data-revealed={revealed ? "true" : "false"}
        className="flex flex-col gap-[var(--ev2-s5)] transition-[opacity,transform] duration-700 ease-[cubic-bezier(.16,1,.3,1)] motion-reduce:transition-none data-[revealed=false]:translate-y-[14px] data-[revealed=false]:opacity-0"
      >
        <EditorialVerdict
          headingId="ev2-overview-verdict"
          title={data.verdict.title}
          standfirst={data.verdict.paragraph}
        />

        <ProfileIndex score={data.score} headingId="ev2-overview-index" />

        {primary ? (
          <PrimarySignal signal={primary} headingId="ev2-overview-primary" />
        ) : (
          <ObservationBlock
            statements={[
              `Nesta janela não há sinais de atenção com dados suficientes para @${data.profile.username}.`,
            ]}
          />
        )}

        <SecondarySignals signals={rest} headingId="ev2-overview-secondary" />

        <ObservationBlock
          statements={[
            `Foram analisadas ${nf.format(data.profile.postsAnalyzed)} publicações${data.windowLabel ? ` (${data.windowLabel})` : ""}.`,
            data.engagement.hasBenchmark
              ? `A taxa de envolvimento é ${pct(data.engagement.rate)} e a referência do escalão é ${pct(data.engagement.benchmark)}.`
              : `A taxa de envolvimento é ${pct(data.engagement.rate)}; não há referência de escalão disponível nesta janela.`,
          ]}
        />
      </div>
    </ReportBand>
  );
}
