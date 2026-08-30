import { useEffect, useRef } from "react";
import { ArrowRight } from "lucide-react";
import { useTranslation } from "react-i18next";

import { trackAnonymousEvent } from "@/lib/analytics/anonymous-funnel";

/**
 * Terceiro ponto de entrada da conversão (Ronda 4): CTA de continuidade no
 * fim do relatório. Abre exactamente o mesmo motor de captura dos outros
 * dois CTAs — só muda `conversion_entry_point = report_end`.
 */
export function ReportEndCta({
  handle,
  snapshotId,
  onConvert,
  hidden,
}: {
  handle: string;
  snapshotId: string;
  onConvert: () => void;
  /** Escondido depois da conversão — o valor já foi entregue. */
  hidden?: boolean;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const { t } = useTranslation("conversion");

  useEffect(() => {
    if (hidden) return;
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          trackAnonymousEvent("lead_cta_viewed", {
            handle,
            snapshotId,
            metadata: { conversion_entry_point: "report_end" },
            dedupeKey: `${snapshotId}:report_end`,
          });
          io.disconnect();
        }
      },
      { threshold: 0.4 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [handle, snapshotId, hidden]);

  if (hidden) return null;

  return (
    <div
      ref={ref}
      className="mt-6 flex flex-col gap-3 rounded-2xl border border-border-default bg-surface-muted px-5 py-6 sm:flex-row sm:items-center sm:justify-between sm:px-7"
    >
      <p className="max-w-xl text-sm leading-relaxed text-content-secondary">
        {t("subcopy")}
      </p>
      <button
        type="button"
        onClick={() => {
          trackAnonymousEvent("lead_cta_clicked", {
            handle,
            snapshotId,
            metadata: { conversion_entry_point: "report_end" },
          });
          onConvert();
        }}
        className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-accent-primary px-4 py-3 text-sm font-semibold text-white transition hover:bg-accent-primary/90"
      >
        {t("cta.report_end")}
        <ArrowRight className="size-4" aria-hidden="true" />
      </button>
    </div>
  );
}
