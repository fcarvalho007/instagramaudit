import { useEffect, useRef } from "react";
import { Sparkles } from "lucide-react";
import { useTranslation } from "react-i18next";

import { trackAnonymousEvent } from "@/lib/analytics/anonymous-funnel";

/**
 * Cabeçalho da "Auditoria Instantânea".
 *
 * Ronda 4 — a acção "Guardar esta auditoria" abre o motor único de
 * conversão (`ConversionSheet`) com `conversion_entry_point = save_audit`.
 */
export function InstantAuditBar({
  handle,
  snapshotId,
  onConvert,
}: {
  handle: string;
  snapshotId: string;
  onConvert?: () => void;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const { t } = useTranslation("conversion");

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          trackAnonymousEvent("level2_cta_viewed", {
            handle,
            snapshotId,
            dedupeKey: `${snapshotId}:save_audit`,
          });
          io.disconnect();
        }
      },
      { threshold: 0.4 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [handle, snapshotId]);

  return (
    <div
      ref={ref}
      className="mb-4 flex flex-wrap items-center gap-3 rounded-xl border border-border-default bg-surface-secondary px-4 py-3 sm:flex-nowrap sm:px-5"
    >
      <Sparkles
        className="size-4 shrink-0 text-accent-primary"
        aria-hidden="true"
      />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-content-primary">
          Auditoria Instantânea
        </p>
        <p className="truncate text-xs text-content-secondary">
          Leitura imediata de @{handle} com base em dados públicos.
        </p>
      </div>
      {onConvert ? (
        <button
          type="button"
          onClick={() => {
            trackAnonymousEvent("lead_cta_clicked", {
              handle,
              snapshotId,
              metadata: { conversion_entry_point: "save_audit" },
            });
            onConvert();
          }}
          className="w-full shrink-0 rounded-lg border border-accent-primary/50 px-3 py-2 text-sm font-semibold text-accent-primary transition hover:bg-accent-primary/10 sm:w-auto"
        >
          {t("cta.save_audit")}
        </button>
      ) : null}
    </div>
  );
}
