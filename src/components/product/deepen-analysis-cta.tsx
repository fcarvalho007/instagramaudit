import { useEffect, useRef, useState } from "react";
import { MessagesSquare } from "lucide-react";

import { trackAnonymousEvent } from "@/lib/analytics/anonymous-funnel";

/**
 * Ronda 3 — placeholders de conversão B e C.
 *
 * Bloco contextual "Aprofundar a análise", onde entrará o Comment
 * Intelligence (Level 2). Não chama providers nem pede email.
 *
 * Ronda 4: ligar `onClick` ao fluxo de captura de email + unlock de
 * Comment Intelligence (`/api/public/unlock-comments`).
 */
export function DeepenAnalysisCta({
  handle,
  snapshotId,
}: {
  handle: string;
  snapshotId: string;
}) {
  const [notified, setNotified] = useState(false);
  const ref = useRef<HTMLElement | null>(null);

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
        className="mt-2 font-display text-xl sm:text-2xl text-content-primary"
      >
        Aprofundar a análise
      </h2>
      <p className="mt-2 max-w-2xl font-sans text-sm leading-relaxed text-content-secondary">
        A análise de comentários acrescenta leitura de audiência: temas
        recorrentes, tom das reacções e sinais de intenção nas publicações com
        melhor desempenho de @{handle}.
      </p>
      <button
        type="button"
        onClick={() => {
          setNotified(true);
          // Ronda 4: abrir captura de email + desbloqueio de Comment Intelligence.
          trackAnonymousEvent("level2_cta_clicked", { handle, snapshotId });
        }}
        className="mt-5 inline-flex items-center gap-2 rounded-lg bg-accent-primary px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-accent-primary/90"
      >
        <MessagesSquare className="size-4" aria-hidden="true" />
        Aprofundar a análise
      </button>
      {notified ? (
        <p role="status" className="mt-2 text-xs text-content-tertiary">
          Disponível em breve.
        </p>
      ) : null}
    </section>
  );
}
