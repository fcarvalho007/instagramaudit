import "@/styles/editorial-v2.css";

import { useMemo } from "react";

import { getVariantFeatures } from "@/lib/report/report-variant";
import { buildBlock01Sample } from "@/lib/report/block01-sample";
import { PremiumCtaProvider } from "@/components/report-redesign/v2/premium-cta-context";

import { EditorialOverview } from "./overview/editorial-overview";
import { EditorialEngagement } from "./engagement/editorial-engagement";
import { EditorialFrequency } from "./frequency/editorial-frequency";
import { EditorialFormatMix } from "./format-mix/editorial-format-mix";
import { EditorialKeyPosts } from "./key-posts/editorial-key-posts";
import { EditorialConversations } from "./conversations/editorial-conversations";
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

  // Mesma amostra de performance que o bloco de produção usa para
  // dimensionar melhor/pior publicação. Nenhum cálculo novo.
  const performanceSampleSize = useMemo(() => {
    const posts = payload?.posts ?? null;
    if (!Array.isArray(posts) || posts.length === 0) return 0;
    return buildBlock01Sample(posts).performancePosts.length;
  }, [payload?.posts]);

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

        {/* Engagement — mesma visibilidade que em produção: vive dentro do
            bloco de visão geral e é mostrado a anónimos, leads e Pro. */}
        {features.blockOverview !== "hidden" && (
          <EditorialEngagement result={result} />
        )}

        {/* Frequência editorial — mesma visibilidade que em produção. */}
        {features.blockOverview !== "hidden" && (
          <EditorialFrequency result={result} />
        )}

        {/* Mix de formatos — mesma visibilidade que em produção. */}
        {features.blockOverview !== "hidden" && (
          <EditorialFormatMix result={result} payload={payload} />
        )}

        {/* Publicações-chave — mesma regra de produção: em estado anónimo
            não se mostram métricas analíticas por publicação. */}
        {features.blockOverview !== "hidden" && (
          <EditorialKeyPosts
            result={result}
            performanceSampleSize={performanceSampleSize}
            analyticsVisible={leadCaptured || premiumUnlocked}
          />
        )}

        {/* Conversas — mesma fronteira de produção: só após captura de
            email ou com Pro; pagar nunca remove o que já foi entregue. */}
        {(leadCaptured || premiumUnlocked) && (
          <EditorialConversations result={result} payload={payload} />
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

        {/* TODO (Editorial V2): remover antes do lançamento público. */}
        <EditorialV2PreviewBadge />
      </div>
    </PremiumCtaProvider>
  );
}
