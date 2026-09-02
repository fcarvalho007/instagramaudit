import { ArrowRight } from "lucide-react";
import { useTranslation } from "react-i18next";

import { PUBLIC_PRODUCTS } from "@/lib/payments/products";
import { usePremiumCta } from "@/components/report-redesign/v2/premium-cta-context";

import { EDITORIAL_V2_PRO_SECTIONS } from "../section-metadata";

/**
 * Gate Free → Pro na linguagem visual do Editorial V2.
 *
 * APRESENTAÇÃO APENAS: reutiliza o preço (`PUBLIC_PRODUCTS.report_full_9`)
 * e a acção de compra (`usePremiumCta().goToProCheckout`) já usados pelo
 * gate de produção. Não altera entitlements, créditos, checkout, packs
 * nem analytics.
 */
export function EditorialProGate() {
  const { goToProCheckout } = usePremiumCta();
  const { t } = useTranslation("report");
  const priceLabel = PUBLIC_PRODUCTS.report_full_9.priceLabel;

  return (
    <section
      id="lead-magnet-card"
      aria-labelledby="ev2-pro-gate-title"
      className="ev2-band ev2-gate relative overflow-hidden"
    >
      <div className="ev2-wrap relative">
        <p className="text-[12px] font-medium uppercase tracking-[0.16em] text-[var(--ev2-blue)]">
          Análise Pro
        </p>

        <h2
          id="ev2-pro-gate-title"
          className="mt-[var(--ev2-s2)] max-w-[16ch] text-[38px] leading-[1.06] text-[var(--ev2-ink)] sm:text-[48px] lg:text-[68px]"
        >
          Já sabes o quê. Falta o porquê.
        </h2>

        <div className="mt-[var(--ev2-s4)] grid gap-[var(--ev2-s5)] lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start">
          <div className="min-w-0">
            <p className="max-w-[62ch] text-[16px] leading-[1.65] text-[var(--ev2-ink-2)] lg:text-[17px]">
              A parte gratuita descreve o estado observável do perfil: o que
              aconteceu nesta janela, com que ritmo e com que resposta.
            </p>
            <p className="mt-[var(--ev2-s2)] max-w-[62ch] text-[16px] leading-[1.65] text-[var(--ev2-ink-2)] lg:text-[17px]">
              A Análise Pro acrescenta a leitura seguinte: propõe as causas mais
              prováveis, identifica sinais que podem explicar os resultados e
              transforma os dados num plano de prioridades. É uma interpretação
              fundamentada nos dados recolhidos, não uma prova de causalidade.
            </p>

            <ul className="mt-[var(--ev2-s4)] border-t border-[var(--ev2-hair-2)]">
              {EDITORIAL_V2_PRO_SECTIONS.map((s) => (
                <li
                  key={s.id}
                  className="grid grid-cols-[auto_minmax(0,1fr)] gap-[14px] border-b border-[var(--ev2-hair)] py-[var(--ev2-s3)]"
                >
                  <span className="ev2-tabular shrink-0 text-[13px] tracking-[0.08em] text-[var(--ev2-ink-4)]">
                    {s.displayNumber}
                  </span>
                  <span className="min-w-0">
                    <span className="block text-[18px] text-[var(--ev2-ink)] lg:text-[20px]">
                      {s.title}
                    </span>
                    {s.subtitle ? (
                      <span className="mt-[6px] block max-w-[54ch] text-[14.5px] leading-[1.6] text-[var(--ev2-ink-2)]">
                        {s.subtitle}
                      </span>
                    ) : null}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div className="w-full rounded-[16px] border border-[var(--ev2-hair-2)] bg-[var(--ev2-surface)] p-[var(--ev2-s3)] shadow-[0_18px_50px_-30px_rgba(11,21,36,0.35)] lg:sticky lg:top-[24px] lg:p-[var(--ev2-s4)]">
            <p className="text-[12px] font-medium uppercase tracking-[0.14em] text-[var(--ev2-ink-3)]">
              {t("end_of_free.benefits_title")}
            </p>

            <p className="mt-[var(--ev2-s2)] flex items-baseline gap-[8px]">
              <span className="ev2-tabular text-[44px] leading-none text-[var(--ev2-ink)]">
                {priceLabel}
              </span>
              <span className="text-[13px] text-[var(--ev2-ink-3)]">
                {t("end_of_free.price.caption_suffix")}
              </span>
            </p>

            <button
              type="button"
              onClick={() => goToProCheckout("lock_gate")}
              className="mt-[var(--ev2-s3)] inline-flex min-h-[48px] w-full items-center justify-center gap-[8px] rounded-full bg-[var(--ev2-blue)] px-[24px] text-[15px] font-semibold text-white transition-colors hover:bg-[var(--ev2-blue-2)]"
            >
              {t("end_of_free.cta")}
              <ArrowRight className="size-[18px]" aria-hidden="true" />
            </button>

            <p className="mt-[var(--ev2-s2)] text-[12.5px] leading-[1.6] text-[var(--ev2-ink-3)]">
              {t("end_of_free.reassurance")}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
