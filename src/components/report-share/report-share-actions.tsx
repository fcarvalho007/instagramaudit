import { useEffect, useState } from "react";
import { Check, FileDown, Link2, Linkedin, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { SHARE_COPY } from "./share-copy";

interface ReportShareActionsProps {
  /** URL a partilhar. Se omitida, é resolvida em runtime via `window.location.href`. */
  reportUrl?: string;
  /** `compact` para o topo (sem eyebrow/descrição), `default` para o fim. */
  variant?: "compact" | "default";
  /**
   * UUID do `analysis_snapshots` actual. Quando presente, o botão "Pedir
   * versão PDF" fica activo e chama `/api/public/public-report-pdf`. Sem ele,
   * o botão fica desactivado em modo de placeholder.
   */
  snapshotId?: string;
}

/**
 * Grupo de ações de partilha do relatório público (fase beta). Não chama
 * providers de análise (Apify/DataForSEO/OpenAI). O botão de PDF chama o
 * endpoint público snapshot-keyed quando `snapshotId` está disponível.
 */
export function ReportShareActions({
  reportUrl,
  variant = "default",
  snapshotId,
}: ReportShareActionsProps) {
  const [resolvedUrl, setResolvedUrl] = useState<string>(reportUrl ?? "");
  const [copied, setCopied] = useState(false);
  const [pdfStatus, setPdfStatus] = useState<"idle" | "loading">("idle");

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

  async function handlePdf() {
    if (!snapshotId || pdfStatus === "loading") return;
    setPdfStatus("loading");
    try {
      const res = await fetch("/api/public/public-report-pdf", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ snapshot_id: snapshotId }),
      });
      if (!res.ok) throw new Error(`http_${res.status}`);
      const body = (await res.json()) as {
        success?: boolean;
        signed_url?: string;
        cached?: boolean;
      };
      if (!body.success || !body.signed_url) throw new Error("invalid_response");
      if (typeof window !== "undefined") {
        window.open(body.signed_url, "_blank", "noopener,noreferrer");
      }
      toast.success(
        body.cached ? SHARE_COPY.toast.pdfCached : SHARE_COPY.toast.pdfReady,
      );
    } catch {
      toast.error(SHARE_COPY.toast.pdfError);
    } finally {
      setPdfStatus("idle");
    }
  }

  const isCompact = variant === "compact";
  const pdfDisabled = !snapshotId || pdfStatus === "loading";
  const pdfLabel =
    pdfStatus === "loading"
      ? SHARE_COPY.actions.pdf.labelLoading
      : SHARE_COPY.actions.pdf.label;

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
            onClick={handlePdf}
            disabled={pdfDisabled}
            aria-disabled={pdfDisabled}
            aria-busy={pdfStatus === "loading"}
            title={
              !snapshotId ? SHARE_COPY.actions.pdf.labelDisabled : undefined
            }
            className="inline-flex items-center justify-center gap-2 rounded-full border border-accent-primary/40 bg-accent-primary/5 px-4 py-2 text-sm font-medium text-accent-primary transition-colors duration-200 hover:bg-accent-primary/10 disabled:cursor-not-allowed disabled:border-border-subtle/40 disabled:bg-transparent disabled:text-text-muted disabled:opacity-70 disabled:hover:bg-transparent"
          >
            {pdfStatus === "loading" ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <FileDown className="h-4 w-4" aria-hidden="true" />
            )}
            <span>{pdfLabel}</span>
          </button>
        </div>
      </div>
    </section>
  );
}