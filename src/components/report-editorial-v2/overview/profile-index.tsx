import { useCountUp, useReveal } from "./use-count-up";

/**
 * Índice do perfil (0–100). O valor é o índice global já calculado em
 * produção. Não existe mediana por escalão nos dados actuais, pelo que
 * não é desenhado nenhum marcador de referência.
 */
export function ProfileIndex({
  score,
  headingId,
}: {
  score: number;
  headingId: string;
}) {
  const { ref, revealed } = useReveal<HTMLDivElement>();
  const animated = useCountUp(score, revealed);

  return (
    <section
      ref={ref}
      aria-labelledby={headingId}
      className="rounded-[14px] border border-[var(--ev2-hair-2)] bg-[var(--ev2-surface)] p-[var(--ev2-s3)] lg:p-[var(--ev2-s4)]"
    >
      <h3
        id={headingId}
        className="text-[13px] font-medium uppercase tracking-[0.12em] text-[var(--ev2-ink-3)]"
        style={{ fontFamily: "var(--font-sans)" }}
      >
        Índice do perfil
      </h3>

      <div className="mt-[var(--ev2-s2)] flex flex-col gap-[var(--ev2-s3)] lg:flex-row lg:items-center lg:gap-[var(--ev2-s4)]">
        <p className="ev2-tabular shrink-0 text-[56px] leading-none text-[var(--ev2-ink)] lg:text-[76px]">
          {animated}
          <span className="ml-[6px] text-[0.3em] text-[var(--ev2-ink-3)]">/ 100</span>
        </p>

        <div className="min-w-0 flex-1">
          <div
            role="img"
            aria-label={`Índice do perfil: ${score} em 100.`}
            className="h-[10px] w-full overflow-hidden rounded-full bg-[var(--ev2-hair)]"
          >
            <div
              className="h-full rounded-full bg-[var(--ev2-blue)] transition-[width] duration-[1200ms] ease-[cubic-bezier(.16,1,.3,1)] motion-reduce:transition-none"
              style={{ width: `${revealed ? score : 0}%` }}
            />
          </div>
          <div className="mt-[8px] flex justify-between text-[12px] text-[var(--ev2-ink-3)]">
            <span>0</span>
            <span>100</span>
          </div>
          <p className="mt-[var(--ev2-s1)] text-[13px] text-[var(--ev2-ink-2)]">
            Combina envolvimento face à referência do escalão (60%) e ritmo de
            publicação (40%). Sem mediana de escalão publicada, não é mostrada
            posição relativa.
          </p>
        </div>
      </div>
    </section>
  );
}
