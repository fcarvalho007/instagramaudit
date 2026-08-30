import { useEffect, useRef } from "react";
import { MessagesSquare } from "lucide-react";

import { trackAnonymousEvent } from "@/lib/analytics/anonymous-funnel";

/**
 * Ronda 3.5 — bloco contextual "Aprofundar a análise".
 *
 * Bloco informativo, sem botão: em staging externo não pode existir uma
 * acção aparentemente funcional que termine apenas em "disponível em breve".
 *
 * Ronda 4: acrescentar aqui o botão de desbloqueio, ligado à captura de
 * email + Comment Intelligence (`/api/public/unlock-comments`), emitindo
 * `level2_cta_clicked`.
 */
export function DeepenAnalysisCta({
  handle,
  snapshotId,
}: {
  handle: string;
  snapshotId: string;
}) {
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
        melhor desempenho de @{handle}. Em preparação.
      </p>
    </section>
  );
}
