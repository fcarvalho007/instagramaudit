import "@/styles/editorial-v2.css";

import { getVariantFeatures } from "@/lib/report/report-variant";
import { PremiumCtaProvider } from "@/components/report-redesign/v2/premium-cta-context";

import { EditorialOverview } from "./overview/editorial-overview";
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

        {premiumUnlocked && (
          <section className="ev2-band">
            <div className="ev2-wrap">
              <p className="max-w-[62ch] text-[15px] leading-[1.65] text-[var(--ev2-ink-2)]">
                As secções Pro — diagnóstico editorial e prioridades de acção —
                serão apresentadas nesta mesma camada editorial. Até lá, o
                relatório completo continua disponível na apresentação por
                defeito.
              </p>
            </div>
          </section>
        )}
      </div>
    </PremiumCtaProvider>
  );
}
