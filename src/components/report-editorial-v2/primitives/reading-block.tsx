/**
 * LEITURA — interpretação ou hipótese, nunca facto medido.
 *
 * Regra de produto: linguagem causal cautelosa ("os dados sugerem…",
 * "a hipótese mais provável…", "pode indicar…"). A API é estruturalmente
 * distinta do `ObservationBlock` para impedir troca acidental.
 */
export type ReadingConfidence = "baixa" | "média" | "alta";

export function ReadingBlock({
  hypothesis,
  confidence,
}: {
  /** Uma única leitura interpretativa, em linguagem cautelosa. */
  hypothesis: string;
  confidence?: ReadingConfidence;
}) {
  return (
    <div
      className="rounded-[10px] border p-[var(--ev2-s3)]"
      style={{ background: "var(--ev2-blue-4)", borderColor: "var(--ev2-blue-3)" }}
    >
      <p className="mb-[var(--ev2-s1)] text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--ev2-blue)]">
        Leitura
      </p>
      <p className="text-[15px] leading-[1.65] text-[var(--ev2-ink)]">{hypothesis}</p>
      {confidence ? (
        <p className="mt-[var(--ev2-s2)] text-[12px] text-[var(--ev2-ink-3)]">
          Confiança da leitura: {confidence}
        </p>
      ) : null}
    </div>
  );
}
