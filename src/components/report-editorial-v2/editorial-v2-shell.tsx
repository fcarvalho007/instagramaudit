import "@/styles/editorial-v2.css";

import { getVariantFeatures } from "@/lib/report/report-variant";
import { PremiumCtaProvider } from "@/components/report-redesign/v2/premium-cta-context";

import { EditorialOverview } from "./overview/editorial-overview";
import { EditorialEngagement } from "./engagement/editorial-engagement";
import { EditorialProGate } from "./gate/editorial-pro-gate";
import type { ReportPresentationProps } from "./report-presentation-props";

/**
 * Camada de apresentação Editorial V2.
 *
 * Recebe exactamente as mesmas props de produção que o `ReportShellV2`
 * e aplica o mesmo gating: visão geral controlada por
 * `features.blockOverview`, gate Pro apenas em `leadCaptured &&
 * !premiumUnlocked`. Nesta fase só a visão geral e o gate estão
 * migrados — nenhum fetch, selector, métrica, entitlement ou evento de
 * analytics é introduzido.
 */
export function EditorialV2Shell({
  result,
  payload,
  snapshotId,
  variant = "public_mvp",
  featuresOverride,
  leadCaptured = false,
  premiumUnlocked = false,
}: ReportPresentationProps) {
  const features = featuresOverride ?? getVariantFeatures(variant);
  const showProGate = leadCaptured && !premiumUnlocked;

  return (
    <PremiumCtaProvider
      snapshotId={snapshotId ?? null}
      handle={result.data.profile.username}
      variant={variant}
      premiumUnlocked={premiumUnlocked}
    >
      <div className="editorial-v2" data-report-design="editorial_v2">
        {features.blockOverview !== "hidden" && (
          <EditorialOverview result={result} payload={payload} />
        )}

        {showProGate && <EditorialProGate />}

        {/*
          TODO (Editorial V2): remover antes de tornar público.
          Andaime de desenvolvimento — existe apenas dentro de
          `?report_design=editorial_v2` e nunca no relatório de produção.
          Substituído pelas secções Pro assim que forem migradas.
        */}
        {premiumUnlocked && (
          <section className="ev2-band" data-ev2-dev-placeholder="pro-sections">
            <div className="ev2-wrap">
              <div className="rounded-[10px] border border-dashed border-[var(--ev2-hair-2)] p-[var(--ev2-s3)]">
                <p className="text-[12px] font-medium uppercase tracking-[0.14em] text-[var(--ev2-ink-3)]">
                  Ambiente de desenvolvimento — Editorial V2
                </p>
                <p className="mt-[8px] max-w-[62ch] text-[14px] leading-[1.6] text-[var(--ev2-ink-2)]">
                  As secções Pro (diagnóstico editorial e prioridades de acção)
                  ainda não foram migradas para esta camada. Bloco temporário,
                  não destinado a utilizadores.
                </p>
              </div>
            </div>
          </section>
        )}

      </div>
    </PremiumCtaProvider>
  );
}
