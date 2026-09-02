import "@/styles/editorial-v2.css";

import { ReportBand } from "./primitives/report-band";
import { SectionIntro } from "./primitives/section-intro";
import { MetricDisplay } from "./primitives/metric-display";
import { ObservationBlock } from "./primitives/observation-block";
import { ReadingBlock } from "./primitives/reading-block";
import { StatusPill } from "./primitives/status-pill";
import { EDITORIAL_V2_SECTIONS } from "./section-metadata";
import type { ReportPresentationProps } from "./report-presentation-props";

/**
 * Fundação de apresentação do Editorial V2.
 *
 * Consome exactamente as mesmas props de produção que o `ReportShellV2`
 * (mesmos dados, mesmo gating, mesmas acções). Nesta fase apenas monta a
 * estrutura editorial e os primitivos partilhados — nenhuma secção do
 * relatório foi migrada, não há gráficos e não existe qualquer fetch,
 * selector ou métrica nova.
 */
export function EditorialV2Shell({ result }: ReportPresentationProps) {
  const { profile, meta } = result.data;
  const nf = new Intl.NumberFormat("pt-PT");

  return (
    <div className="editorial-v2" data-report-design="editorial_v2">
      <ReportBand
        id="abertura"
        labelledBy="ev2-abertura"
        context={
          <div className="flex flex-col gap-[var(--ev2-s3)]">
            <SectionIntro
              headingId="ev2-abertura"
              displayNumber={EDITORIAL_V2_SECTIONS[0].displayNumber}
              title={EDITORIAL_V2_SECTIONS[0].title}
              subtitle={EDITORIAL_V2_SECTIONS[0].subtitle}
            />
            <div>
              <StatusPill tone="neutral" label={`Escalão ${profile.tier}`} />
            </div>
          </div>
        }
      >
        <div className="ev2-reveal flex flex-col gap-[var(--ev2-s5)]">
          <MetricDisplay
            label="Perfil"
            value={`@${profile.username}`}
            note={meta?.windowLabel ? `Janela: ${meta.windowLabel}` : undefined}
            size="lg"
          />

          <div className="grid grid-cols-2 gap-[var(--ev2-s4)] sm:grid-cols-3">
            <MetricDisplay label="Seguidores" value={nf.format(profile.followers)} />
            <MetricDisplay label="A seguir" value={nf.format(profile.following)} />
            <MetricDisplay label="Publicações" value={nf.format(profile.postsCount)} />
          </div>

          <ObservationBlock
            statements={[
              `O perfil @${profile.username} tem ${nf.format(profile.followers)} seguidores e ${nf.format(profile.postsCount)} publicações registadas.`,
              `Foram analisadas ${nf.format(profile.postsAnalyzed)} publicações na janela considerada.`,
            ]}
          />

          <ReadingBlock
            hypothesis="Esta é a camada de apresentação Editorial V2 em fundação: os dados apresentados são os mesmos do relatório de produção e nenhuma secção foi migrada."
            confidence="alta"
          />
        </div>
      </ReportBand>
    </div>
  );
}
