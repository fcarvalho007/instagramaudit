import { Database, LineChart, Search, Sparkles, ExternalLink } from "lucide-react";

import type { AdapterResult } from "@/lib/report/snapshot-to-report-data";
import { useVariantFeatures } from "@/lib/report/report-variant";

import { ReportBand } from "../primitives/report-band";
import { SectionIntro } from "../primitives/section-intro";
import {
  buildEditorialMethodologyData,
  type MethodologyDimensionId,
} from "./methodology-data";

const DIMENSION_ICON: Record<MethodologyDimensionId, typeof Database> = {
  collection: Database,
  market_reference: LineChart,
  editorial_reading: Sparkles,
  demand_signals: Search,
};

/**
 * Metodologia e fontes — camada de apresentação Editorial V2.
 *
 * Todo o conteúdo factual (nomes de fontes, datas, versão do dataset e
 * data de recolha) vem do registo de produção e do snapshot real.
 */
export function EditorialMethodology({ result }: { result: AdapterResult }) {
  const features = useVariantFeatures();
  const data = buildEditorialMethodologyData({
    features,
    analyzedAt: result.data.profile.analyzedAt,
  });

  return (
    <ReportBand
      id="metodologia"
      labelledBy="metodologia-title"
      context={
        <SectionIntro
          title="Como este relatório foi feito"
          subtitle="Os números vêm de dados públicos observados e de cálculos sobre esses dados. As leituras editoriais são apresentadas à parte e nunca alteram os valores."
          headingId="metodologia-title"
        />
      }
    >
      <div className="flex flex-col gap-[var(--ev2-s5,32px)]">
        <ul className="ev2-method-grid">
          {data.dimensions.map((dimension) => {
            const Icon = DIMENSION_ICON[dimension.id];
            return (
              <li key={dimension.id} className="ev2-method-item">
                <span aria-hidden="true" className="ev2-method-icon">
                  <Icon className="size-4" />
                </span>
                <div className="min-w-0">
                  <p className="ev2-method-title">{dimension.title}</p>
                  <p className="ev2-method-body">{dimension.body}</p>
                </div>
              </li>
            );
          })}
        </ul>

        {data.sources.length > 0 ? (
          <div className="ev2-sources">
            <div className="ev2-sources__head">
              <p className="ev2-method-eyebrow">Fontes de referência</p>
              <p className="ev2-tabular ev2-method-meta">
                dataset {data.datasetVersion}
              </p>
            </div>
            <ul className="ev2-sources__list">
              {data.sources.map((source) => (
                <li key={source.name} className="ev2-sources__item">
                  <div className="min-w-0">
                    <p className="ev2-sources__name">
                      {source.name}
                      {source.dateLabel ? (
                        <span className="ev2-tabular ev2-sources__date">
                          {source.dateLabel}
                        </span>
                      ) : null}
                    </p>
                    <p className="ev2-sources__desc">{source.description}</p>
                  </div>
                  {source.url ? (
                    <a
                      href={source.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`Abrir a página de ${source.name} numa nova janela`}
                      className="ev2-sources__link"
                    >
                      <ExternalLink aria-hidden="true" className="size-3.5" />
                    </a>
                  ) : null}
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <p className="ev2-method-note">
          Âmbito: apenas dados públicos do perfil dentro da janela analisada.
          Sem acesso a mensagens privadas, comentários apagados ou métricas que
          exigem login (alcance, visitas, guardados).
          {data.collectedAt ? ` Dados recolhidos em ${data.collectedAt}.` : ""}
        </p>
      </div>
    </ReportBand>
  );
}
