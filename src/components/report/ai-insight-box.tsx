import { Sparkles } from "lucide-react";

export type AIInsightEmphasis =
  | "default"
  | "positive"
  | "negative"
  | "neutral";

interface AIInsightBoxProps {
  insight: string;
  emphasis?: AIInsightEmphasis;
}

/**
 * Editorial annotation block placed under each report section. Explains, in
 * plain Portuguese, what a non-expert reader should take away from the
 * numbers above. Visuals come from the `--insight-*` token family in
 * `tokens-light.css` so no hex literals leak into components.
 */
export function AIInsightBox({
  insight,
  emphasis = "default",
}: AIInsightBoxProps) {
  const v = emphasis;
  return (
    <aside
      className="flex items-start gap-3 md:gap-4 rounded-2xl border px-4 py-4 md:px-5 md:py-5"
      style={{
        backgroundColor: `rgb(var(--insight-${v}-bg))`,
        borderColor: `rgb(var(--insight-${v}-border))`,
      }}
      role="note"
      aria-label="Leitura IA"
    >
      <div
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
        style={{
          backgroundColor: `rgb(var(--insight-${v}-border) / 0.45)`,
        }}
      >
        <Sparkles
          className="size-4"
          style={{ color: `rgb(var(--insight-${v}-icon))` }}
          aria-hidden="true"
        />
      </div>
      <div className="min-w-0 flex-1 space-y-1.5">
        <p
          className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em]"
          style={{ color: `rgb(var(--insight-${v}-icon))` }}
        >
          Leitura IA
        </p>
        <p
          className="text-[14px] md:text-[15px] leading-relaxed"
          style={{ color: `rgb(var(--insight-${v}-text))` }}
        >
          {insight}
        </p>
      </div>
    </aside>
  );
}