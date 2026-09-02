/**
 * Introdução de secção editorial: número (rótulo apenas), título display
 * e subtítulo opcional. O número NUNCA é uma chave funcional.
 */
export function SectionIntro({
  /** Rótulo visual, ex. "01". Puramente decorativo. */
  displayNumber,
  title,
  subtitle,
  headingId,
  headingLevel = 2,
}: {
  displayNumber?: string;
  title: string;
  subtitle?: string;
  headingId?: string;
  headingLevel?: 2 | 3;
}) {
  const Heading = headingLevel === 2 ? "h2" : "h3";

  return (
    <div className="flex flex-col gap-[var(--ev2-s2)]">
      {displayNumber ? (
        <span
          aria-hidden="true"
          className="ev2-tabular text-[12px] font-medium uppercase tracking-[0.14em] text-[var(--ev2-ink-4)]"
        >
          {displayNumber}
        </span>
      ) : null}
      <Heading
        id={headingId}
        className="text-[28px] text-[var(--ev2-ink)] lg:text-[36px]"
      >
        {title}
      </Heading>
      {subtitle ? (
        <p className="max-w-[46ch] text-[14px] leading-[1.6] text-[var(--ev2-ink-2)]">
          {subtitle}
        </p>
      ) : null}
    </div>
  );
}
