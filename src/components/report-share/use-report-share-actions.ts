import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { SHARE_COPY } from "./share-copy";

type PdfErrorCode = keyof typeof SHARE_COPY.toast.pdfErrors;

export interface PdfFallback {
  url: string;
}

export interface UseReportShareActions {
  /** Trigger PDF generation + open. Safe to call from any user gesture. */
  exportPdf: () => Promise<void>;
  /** Trigger native share when available, otherwise copy the report URL. */
  share: () => Promise<void>;
  /** True while the PDF endpoint is being called. */
  pdfBusy: boolean;
  /** True while a share/copy action is in flight. */
  shareBusy: boolean;
  /** PDF disabled when no snapshotId is available. */
  pdfDisabled: boolean;
  /** Resolved canonical URL for sharing. */
  resolvedUrl: string;
  /** When set, popup was blocked and we expose a clickable link. */
  pdfFallback: PdfFallback | null;
  /** Manually clear the fallback (e.g. after the user clicks it). */
  clearPdfFallback: () => void;
}

/**
 * Centralised hook for the report's PDF + share interactions.
 *
 * Used by both the report header (top) and the final block (bottom) so
 * every entry point shares identical behaviour and toasts. Opens a popup
 * synchronously inside the click handler to survive popup blockers, then
 * fills it with the signed URL once the API responds. Falls back to a
 * clickable link when the popup is blocked.
 */
export function useReportShareActions(args: {
  snapshotId?: string;
  reportUrl?: string;
}): UseReportShareActions {
  const { snapshotId, reportUrl } = args;
  const [resolvedUrl, setResolvedUrl] = useState<string>(reportUrl ?? "");
  const [pdfBusy, setPdfBusy] = useState(false);
  const [shareBusy, setShareBusy] = useState(false);
  const [pdfFallback, setPdfFallback] = useState<PdfFallback | null>(null);

  useEffect(() => {
    if (reportUrl) {
      setResolvedUrl(reportUrl);
      return;
    }
    if (typeof window !== "undefined") {
      setResolvedUrl(window.location.href);
    }
  }, [reportUrl]);

  const exportPdf = useCallback(async () => {
    if (!snapshotId || pdfBusy) return;
    setPdfFallback(null);
    setPdfBusy(true);
    try {
      const res = await fetch("/api/public/public-report-pdf", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ snapshot_id: snapshotId }),
      });

      type PdfResponseBody = {
        success?: boolean;
        signed_url?: string;
        cached?: boolean;
        error_code?: string;
      };
      let body: PdfResponseBody | null = null;
      try {
        body = (await res.json()) as PdfResponseBody;
      } catch {
        body = null;
      }

      if (!res.ok || !body?.success || !body.signed_url) {
        const code = (body?.error_code ?? "DEFAULT") as PdfErrorCode;
        const message = SHARE_COPY.toast.pdfErrors[code] ?? SHARE_COPY.toast.pdfErrors.DEFAULT;
        toast.error(message);
        return;
      }

      const signedUrl = body.signed_url;
      // Sempre expomos o link de fallback para que o utilizador possa
      // re-abrir o PDF a qualquer momento (especialmente útil em mobile,
      // onde o gesto programático pode não disparar uma nova aba).
      setPdfFallback({ url: signedUrl });

      // Tentamos abrir o PDF disparando o clique de uma <a> sintética.
      // Como o handler ainda está dentro da mesma "task" do gesto do
      // utilizador (mesmo após await), Chrome/Safari aceitam isto como
      // navegação iniciada pelo utilizador e não bloqueiam.
      let opened = false;
      if (typeof document !== "undefined") {
        try {
          const a = document.createElement("a");
          a.href = signedUrl;
          a.target = "_blank";
          a.rel = "noopener noreferrer";
          a.style.display = "none";
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          opened = true;
        } catch {
          opened = false;
        }
      }

      toast.success(body.cached ? SHARE_COPY.toast.pdfCached : SHARE_COPY.toast.pdfReady);
      if (!opened) {
        toast.message(SHARE_COPY.toast.pdfPopupBlocked);
      }
    } catch {
      toast.error(SHARE_COPY.toast.pdfErrors.DEFAULT);
    } finally {
      setPdfBusy(false);
    }
  }, [snapshotId, pdfBusy]);

  const share = useCallback(async () => {
    if (!resolvedUrl || shareBusy) return;
    setShareBusy(true);
    try {
      // Tentar Web Share API quando disponível (mobile, Safari moderno).
      if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
        try {
          await navigator.share({
            title: document?.title ?? "Relatório InstaBench",
            url: resolvedUrl,
          });
          return;
        } catch (err) {
          // AbortError = utilizador cancelou; não cair para clipboard.
          if (err instanceof Error && err.name === "AbortError") return;
          // Outros erros → tentar copiar para clipboard.
        }
      }

      // Fallback: copiar para clipboard.
      try {
        if (
          typeof navigator !== "undefined" &&
          navigator.clipboard?.writeText &&
          window.isSecureContext !== false
        ) {
          await navigator.clipboard.writeText(resolvedUrl);
        } else {
          const ta = document.createElement("textarea");
          ta.value = resolvedUrl;
          ta.setAttribute("readonly", "");
          ta.style.position = "fixed";
          ta.style.top = "-1000px";
          ta.style.opacity = "0";
          document.body.appendChild(ta);
          ta.select();
          const ok = document.execCommand("copy");
          document.body.removeChild(ta);
          if (!ok) throw new Error("execCommand-failed");
        }
        toast.success(SHARE_COPY.toast.success);
      } catch {
        toast.error(SHARE_COPY.toast.error);
      }
    } finally {
      setShareBusy(false);
    }
  }, [resolvedUrl, shareBusy]);

  const clearPdfFallback = useCallback(() => setPdfFallback(null), []);

  return {
    exportPdf,
    share,
    pdfBusy,
    shareBusy,
    pdfDisabled: !snapshotId,
    resolvedUrl,
    pdfFallback,
    clearPdfFallback,
  };
}
