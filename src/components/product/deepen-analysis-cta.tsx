import { useEffect, useRef } from "react";
import { Loader2, MessagesSquare } from "lucide-react";
import { useTranslation } from "react-i18next";

import { trackAnonymousEvent } from "@/lib/analytics/anonymous-funnel";
import type { UnlockStatusCode } from "@/lib/leads/lead-capture";

/**
 * Bloco contextual "Aprofundar a análise".
 *
 * Ronda 4 — o botão abre o motor único de conversão com
 * `conversion_entry_point = comment_intelligence`. Depois da captura de
 * email o bloco mostra o estado real do desbloqueio
 * (`unlocking → processing → available`), sem percentagens fictícias.
 */
export function DeepenAnalysisCta({
  handle,
  snapshotId,
  onConvert,
  unlockStatus,
}: {
  handle: string;
  snapshotId: string;
  onConvert?: () => void;
  unlockStatus?: UnlockStatusCode | null;
}) {
  const ref = useRef<HTMLElement | null>(null);
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
            dedupeKey: snapshotId,
          });
          io.disconnect();
        }
      },
      { threshold: 0.4 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [handle, snapshotId]);

  const processing = unlockStatus === "queued" || unlockStatus === "pending";
  const done = unlockStatus === "already_available";

  return (
    <section
      ref={ref}
      aria-labelledby="deepen-analysis-title"
      className="mt-8 rounded-2xl border border-border-default bg-surface-secondary px-5 py-6 sm:px-7 sm:py-8"
    >
      <span className="text-eyebrow-sm text-content-secondary">
        Próximo nível
      </span>
      <h2
        id="deepen-analysis-title"
        className="mt-2 flex items-center gap-2 font-display text-xl sm:text-2xl text-content-primary"
      >
        <MessagesSquare
          className="size-5 shrink-0 text-accent-primary"
          aria-hidden="true"
        />
        Aprofundar a análise
      </h2>
      <p className="mt-2 max-w-2xl font-sans text-sm leading-relaxed text-content-secondary">
        A análise de comentários acrescenta leitura de audiência: temas
        recorrentes, tom das reacções e sinais de intenção nas publicações com
        melhor desempenho de @{handle}.
      </p>

      {processing || done ? (
        <p
          role="status"
          className="mt-4 flex items-center gap-2 text-sm text-content-secondary"
        >
          {processing ? (
            <Loader2
              className="size-4 shrink-0 animate-spin text-accent-primary"
              aria-hidden="true"
            />
          ) : null}
          {processing ? t("unlock.processing") : t("unlock.available")}
        </p>
      ) : onConvert ? (
        <button
          type="button"
          onClick={() => {
            trackAnonymousEvent("level2_cta_clicked", {
              handle,
              snapshotId,
              metadata: { conversion_entry_point: "comment_intelligence" },
            });
            trackAnonymousEvent("lead_cta_clicked", {
              handle,
              snapshotId,
              metadata: { conversion_entry_point: "comment_intelligence" },
            });
            onConvert();
          }}
          className="mt-5 w-full rounded-lg bg-accent-primary px-4 py-3 text-sm font-semibold text-white transition hover:bg-accent-primary/90 sm:w-auto"
        >
          {t("cta.comment_intelligence")}
        </button>
      ) : null}
    </section>
  );
}
