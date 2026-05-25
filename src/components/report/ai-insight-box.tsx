import { Check, Copy, Sparkles } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

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
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(insight);
      } else {
        const ta = document.createElement("textarea");
        ta.value = insight;
        ta.style.position = "fixed";
        ta.style.top = "-1000px";
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
      }
      setCopied(true);
      toast.success("Diagnóstico copiado");
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      toast.error("Não foi possível copiar");
    }
  };

  return (
    <aside
      className="relative flex items-start gap-3 md:gap-4 rounded-2xl border px-4 py-4 md:px-5 md:py-5"
      style={{
        backgroundColor: `rgb(var(--insight-${v}-bg))`,
        borderColor: `rgb(var(--insight-${v}-border))`,
      }}
      role="note"
      aria-label="Diagnóstico"
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
          className="text-eyebrow-sm font-semibold"
          style={{ color: `rgb(var(--insight-${v}-icon))` }}
        >
          DIAGNÓSTICO
        </p>
        <p
          className="text-[14px] md:text-[15px] leading-relaxed"
          style={{ color: `rgb(var(--insight-${v}-text))` }}
        >
          {insight}
        </p>
      </div>
      <button
        type="button"
        onClick={handleCopy}
        aria-label={copied ? "Diagnóstico copiado" : "Copiar diagnóstico"}
        className="absolute top-2 right-2 inline-flex items-center justify-center size-7 rounded-md text-content-tertiary hover:text-content-secondary hover:bg-black/[0.04] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary focus-visible:ring-offset-1"
      >
        {copied ? (
          <Check className="size-3.5" aria-hidden="true" />
        ) : (
          <Copy className="size-3.5" aria-hidden="true" />
        )}
      </button>
    </aside>
  );
}