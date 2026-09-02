/**
 * OBSERVAÇÃO — apenas afirmações directamente suportadas pelos dados.
 *
 * Regra de produto: nada aqui pode ser interpretação, hipótese ou causa.
 * A API é deliberadamente diferente do `ReadingBlock` (`statements: string[]`
 * vs `hypothesis: string`), para que os dois não possam ser trocados por
 * engano.
 */
export function ObservationBlock({
  statements,
}: {
  /** Factos medidos. Uma frase por entrada. */
  statements: readonly string[];
}) {
  if (statements.length === 0) return null;

  return (
    <div className="border-l-2 pl-[var(--ev2-s3)]" style={{ borderColor: "var(--ev2-hair-2)" }}>
      <p className="mb-[var(--ev2-s1)] text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--ev2-ink-3)]">
        Observação
      </p>
      <ul className="flex flex-col gap-[var(--ev2-s1)]">
        {statements.map((statement) => (
          <li key={statement} className="text-[15px] leading-[1.65] text-[var(--ev2-ink-2)]">
            {statement}
          </li>
        ))}
      </ul>
    </div>
  );
}
