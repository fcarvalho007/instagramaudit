/**
 * Veredicto editorial: headline Fraunces grande + standfirst.
 * O texto é o veredicto de produção já resolvido (IA validada ou
 * fallback determinístico) — esta camada só o apresenta.
 */
export function EditorialVerdict({
  headingId,
  title,
  standfirst,
}: {
  headingId: string;
  title: string;
  standfirst: string;
}) {
  return (
    <div className="flex flex-col gap-[var(--ev2-s2)]">
      <h2
        id={headingId}
        className="max-w-[18ch] text-[36px] leading-[1.08] text-[var(--ev2-ink)] sm:text-[44px] lg:max-w-[20ch] lg:text-[62px]"
      >
        {title}
      </h2>
      <p className="max-w-[62ch] text-[16px] leading-[1.6] text-[var(--ev2-ink-2)] lg:text-[17px]">
        {standfirst}
      </p>
    </div>
  );
}
