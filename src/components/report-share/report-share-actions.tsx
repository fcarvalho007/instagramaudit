import { useEffect, useState } from "react";
import { Check, FileDown, Link2, Linkedin } from "lucide-react";
import { toast } from "sonner";

import { SHARE_COPY } from "./share-copy";

interface ReportShareActionsProps {
  /** URL a partilhar. Se omitida, é resolvida em runtime via `window.location.href`. */
  reportUrl?: string;
  /** `compact` para o topo (sem eyebrow/descrição), `default` para o fim. */
  variant?: "compact" | "default";
}

/**
 * Grupo de ações de partilha do relatório público (fase beta). Não chama
 * providers, não gera PDF — apenas copia o link e abre o share intent do
 * LinkedIn. O botão de PDF está intencionalmente desativado.
 */
export function ReportShareActions({
  reportUrl,
  variant = "default",
}: ReportShareActionsProps) {
  const [resolvedUrl, setResolvedUrl] = useState<string>(reportUrl ?? "");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (reportUrl) {
      setResolvedUrl(reportUrl);
      return;
    }
    if (typeof window !== "undefined") {
      setResolvedUrl(window.location.href);
    }
  }, [reportUrl]);

  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(t);
  }, [copied]);

  const linkedinHref = resolvedUrl
    ? `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(resolvedUrl)}`
    : "#";

  async function handleCopy() {
    if (!resolvedUrl) return;
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(resolvedUrl);
      } else {
        throw new Error("clipboard-unavailable");
      }
      setCopied(true);
      toast.success(SHARE_COPY.toast.success);
    } catch {
      toast.error(SHARE_COPY.toast.error);
    }
  }

  const isCompact = variant === "compact";

  return (
    <section
      aria-label={SHARE_COPY.eyebrow}
      className={
        isCompact
          ? "mx-auto w-full max-w-6xl px-4 pt-4 sm:px-6 lg:px-8"
          : "mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 lg:px-8"
      }
    >
      <div
        className={
          isCompact
            ? "flex flex-col gap-3 rounded-xl border border-border-subtle/50 bg-surface-secondary/30 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
            : "rounded-2xl border border-border-subtle/60 bg-surface-secondary/40 px-5 py-6 sm:px-7 sm:py-7"
        }
      >
        {!isCompact ? (
          <header className="mb-5">
            <p className="font-mono text-[0.7rem] uppercase tracking-[0.18em] text-text-muted">
              {SHARE_COPY.eyebrow}
            </p>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-text-secondary">
              {SHARE_COPY.description}
            </p>
          </header>
        ) : (
          <p className="font-mono text-[0.7rem] uppercase tracking-[0.18em] text-text-muted sm:flex-shrink-0">
            {SHARE_COPY.eyebrow}
          </p>
        )}

        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
          <button
            type="button"
            onClick={handleCopy}
            disabled={!resolvedUrl}
            className="inline-flex items-center justify-center gap-2 rounded-full border border-accent-primary/40 bg-accent-primary/5 px-4 py-2 text-sm font-medium text-accent-primary transition-colors duration-200 hover:bg-accent-primary/10 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {copied ? (
              <Check className="h-4 w-4" aria-hidden="true" />
            ) : (
              <Link2 className="h-4 w-4" aria-hidden="true" />
            )}
            <span>
              {copied
                ? SHARE_COPY.actions.copy.labelDone
                : SHARE_COPY.actions.copy.label}
            </span>
          </button>

          <a
            href={linkedinHref}
            target="_blank"
            rel="noopener noreferrer"
            aria-disabled={!resolvedUrl}
            className="inline-flex items-center justify-center gap-2 rounded-full border border-border-subtle/60 bg-surface-secondary/40 px-4 py-2 text-sm font-medium text-text-primary transition-colors duration-200 hover:border-border-subtle hover:bg-surface-secondary/60"
          >
            <Linkedin className="h-4 w-4" aria-hidden="true" />
            <span>{SHARE_COPY.actions.linkedin.label}</span>
          </a>

          <button
            type="button"
            disabled
            aria-disabled="true"
            title={SHARE_COPY.actions.pdf.note}
            className="inline-flex cursor-not-allowed items-center justify-center gap-2 rounded-full border border-border-subtle/40 bg-transparent px-4 py-2 text-sm font-medium text-text-muted opacity-70"
          >
            <FileDown className="h-4 w-4" aria-hidden="true" />
            <span>{SHARE_COPY.actions.pdf.label}</span>
            <span className="ml-1 rounded-full border border-border-subtle/50 px-2 py-[1px] font-mono text-[0.6rem] uppercase tracking-[0.14em]">
              {SHARE_COPY.actions.pdf.note}
            </span>
          </button>
        </div>
      </div>
    </section>
  );
}