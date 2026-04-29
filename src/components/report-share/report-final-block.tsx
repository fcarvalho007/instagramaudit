import { useEffect, useRef, useState } from "react";
import { Check, ExternalLink, FileDown, Link2, Linkedin, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { BETA_COPY } from "@/components/report-beta/beta-copy";

import { SHARE_COPY } from "./share-copy";

interface ReportFinalBlockProps {
  /** UUID do `analysis_snapshots` actual. Activa o botão de PDF. */
  snapshotId?: string;
  /** URL a partilhar. Resolvida via `window.location.href` quando ausente. */
  reportUrl?: string;
}

type PdfErrorCode = keyof typeof SHARE_COPY.toast.pdfErrors;

interface PdfFallback {
  url: string;
  blocked: boolean;
}

/**
 * Bloco final único do relatório público em `/analyze/$username`.
 *
 * Substitui o par anterior `ReportShareActions` (variant `default`) +
 * `BetaFeedbackBlock`, que duplicavam o footer com mensagens sobrepostas.
 * Aqui o PDF é destacado como **deliverable principal**, partilha (link e
 * LinkedIn) fica como apoio secundário e o feedback beta aparece numa
 * linha discreta no fim.
 *
 * Estratégia de abertura do PDF:
 * `window.open("about:blank", "_blank")` é invocado **dentro** do click
 * handler, antes do `await fetch(...)`, para preservar o user-gesture e
 * não ser bloqueado por popup blockers (Chrome, Safari, Firefox). Quando
 * a resposta chega, atribuímos `popup.location.href` ao signed URL. Se o
 * navegador devolver `null` (popup blocker activo), guardamos o URL em
 * estado e revelamos um botão de fallback clicável que o utilizador pode
 * accionar manualmente — esse clique é, ele próprio, um novo user gesture.
 */
export function ReportFinalBlock({
  snapshotId,
  reportUrl,
}: ReportFinalBlockProps) {
  const [resolvedUrl, setResolvedUrl] = useState<string>(reportUrl ?? "");
  const [copied, setCopied] = useState(false);
  const [pdfStatus, setPdfStatus] = useState<"idle" | "loading">("idle");
  const [pdfFallback, setPdfFallback] = useState<PdfFallback | null>(null);
  // Guarda referência ao popup aberto sincronamente para que possamos
  // atribuir-lhe a URL final (ou fechá-lo em caso de erro).
  const pendingPopupRef = useRef<Window | null>(null);

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
    : "";

  async function handleCopy() {
    if (!resolvedUrl) return;
    try {
      if (
        typeof navigator !== "undefined" &&
        navigator.clipboard?.writeText &&
        window.isSecureContext !== false
      ) {
        await navigator.clipboard.writeText(resolvedUrl);
      } else {
        // Fallback para browsers/contextos sem Clipboard API
        // (Safari WebView, http localhost, iframes sem permissão).
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
      setCopied(true);
      toast.success(SHARE_COPY.toast.success);
    } catch {
      toast.error(SHARE_COPY.toast.error);
    }
  }

  async function handlePdf() {
    if (!snapshotId || pdfStatus === "loading") return;

    // Limpa fallback anterior — nova tentativa, nova oportunidade.
    setPdfFallback(null);

    // Abrimos o popup ANTES do await para preservar o user gesture.
    // Se o navegador bloquear, `popup` será null e cairemos no
    // fallback clicável após a resposta chegar.
    let popup: Window | null = null;
    if (typeof window !== "undefined") {
      popup = window.open("about:blank", "_blank", "noopener,noreferrer");
    }
    pendingPopupRef.current = popup;

    setPdfStatus("loading");
    try {
      const res = await fetch("/api/public/public-report-pdf", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ snapshot_id: snapshotId }),
      });

      // Tentamos sempre fazer parse do JSON — o endpoint devolve
      // `error_code` em pt-PT mesmo nas respostas 4xx/5xx.
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
        if (popup && !popup.closed) popup.close();
        const code = (body?.error_code ?? "DEFAULT") as PdfErrorCode;
        const message =
          SHARE_COPY.toast.pdfErrors[code] ??
          SHARE_COPY.toast.pdfErrors.DEFAULT;
        toast.error(message);
        return;
      }

      const signedUrl = body.signed_url;

      if (popup && !popup.closed) {
        // Popup sobreviveu — entregamos o URL final.
        // Alguns browsers (Safari estrito, extensions de privacidade) atiram
        // ao mexer em popup.location depois de um await; nesse caso caímos
        // no fallback clicável, garantindo sempre uma forma de abrir o PDF.
        try {
          popup.location.href = signedUrl;
          toast.success(
            body.cached
              ? SHARE_COPY.toast.pdfCached
              : SHARE_COPY.toast.pdfReady,
          );
        } catch {
          try {
            popup.close();
          } catch {
            /* noop */
          }
          setPdfFallback({ url: signedUrl, blocked: true });
          toast.warning(SHARE_COPY.toast.pdfPopupBlocked);
        }
      } else {
        // Popup blocker activo: guardamos o URL para o utilizador clicar
        // manualmente e mostramos um toast a explicar.
        setPdfFallback({ url: signedUrl, blocked: true });
        toast.warning(SHARE_COPY.toast.pdfPopupBlocked);
      }
    } catch {
      if (popup && !popup.closed) popup.close();
      toast.error(SHARE_COPY.toast.pdfErrors.DEFAULT);
    } finally {
      pendingPopupRef.current = null;
      setPdfStatus("idle");
    }
  }

  const pdfDisabled = !snapshotId || pdfStatus === "loading";
  const pdfLabel =
    pdfStatus === "loading"
      ? SHARE_COPY.actions.pdf.labelLoading
      : SHARE_COPY.actions.pdf.label;
  const { feedback } = BETA_COPY;

  return (
    <section
      aria-label="Concluir relatório"
      className="w-full bg-[radial-gradient(ellipse_at_bottom_right,rgba(6,182,212,0.10),transparent_60%),radial-gradient(ellipse_at_top_left,rgba(139,92,246,0.08),transparent_60%)] border-t border-border-subtle/30"
    >
      <div className="mx-auto max-w-7xl px-5 md:px-6 py-12 md:py-16">
      <div className="rounded-2xl border border-border-subtle/50 bg-surface-base/70 backdrop-blur-sm p-6 md:p-10 space-y-8">
        {/* Acção principal: PDF em destaque */}
        <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <header className="space-y-2 max-w-2xl">
            <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-content-tertiary">
              {SHARE_COPY.eyebrow}
            </p>
            <h2 className="font-display text-2xl md:text-3xl font-medium tracking-tight text-content-primary leading-tight">
              Levar este relatório
            </h2>
            <p className="text-sm md:text-base text-content-secondary leading-relaxed">
              Exporta em PDF para guardar, enviar a um cliente ou apresentar
              numa reunião. O link público também pode ser partilhado.
            </p>
            <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-content-tertiary pt-1">
              O PDF inclui todas as secções deste relatório · link público
              activo durante a fase beta
            </p>
          </header>

          <div className="flex flex-col items-stretch gap-2 md:items-end w-full md:w-auto">
            <button
              type="button"
              onClick={handlePdf}
              disabled={pdfDisabled}
              aria-disabled={pdfDisabled}
              aria-busy={pdfStatus === "loading"}
              title={
                !snapshotId ? SHARE_COPY.actions.pdf.labelDisabled : undefined
              }
              className="w-full md:w-auto shrink-0 inline-flex items-center justify-center gap-2 rounded-full border border-accent-primary bg-accent-primary px-6 py-3 text-sm font-semibold text-surface-base transition-colors duration-200 hover:bg-accent-luminous hover:border-accent-luminous disabled:cursor-not-allowed disabled:border-border-subtle/40 disabled:bg-transparent disabled:text-text-muted disabled:opacity-70"
            >
              {pdfStatus === "loading" ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : (
                <FileDown className="h-4 w-4" aria-hidden="true" />
              )}
              <span>{pdfLabel}</span>
            </button>

            {/* Fallback: o popup foi bloqueado, mostramos um link directo
                que o utilizador pode clicar (esse clique é, ele próprio,
                um novo user gesture e não é bloqueado). */}
            {pdfFallback ? (
              <div
                role="status"
                aria-live="polite"
                className="flex flex-col items-stretch gap-1 md:items-end w-full md:w-auto"
              >
                <a
                  href={pdfFallback.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full md:w-auto inline-flex items-center justify-center gap-2 rounded-full border border-accent-primary bg-accent-primary/10 px-5 py-2 text-sm font-semibold text-accent-primary transition-colors duration-200 hover:bg-accent-primary/20"
                >
                  <ExternalLink className="h-4 w-4" aria-hidden="true" />
                  <span>{SHARE_COPY.actions.pdfFallback.label}</span>
                </a>
                <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-content-tertiary md:text-right">
                  {SHARE_COPY.actions.pdfFallback.blockedHint}
                </p>
              </div>
            ) : null}
          </div>
        </div>

        {/* Acções secundárias: partilha discreta */}
        <div className="flex flex-col gap-2 border-t border-border-subtle/30 pt-5 sm:flex-row sm:flex-wrap sm:items-center">
          <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-content-tertiary sm:mr-2">
            Partilhar
          </span>
          <button
            type="button"
            onClick={handleCopy}
            disabled={!resolvedUrl}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-full border border-border-subtle/60 bg-transparent px-4 py-2 text-sm text-content-primary transition-colors duration-200 hover:border-accent-primary/50 hover:text-accent-primary disabled:cursor-not-allowed disabled:opacity-50"
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

          {resolvedUrl ? (
            <a
              href={linkedinHref}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-full border border-border-subtle/60 bg-transparent px-4 py-2 text-sm text-content-primary transition-colors duration-200 hover:border-accent-primary/50 hover:text-accent-primary"
            >
              <Linkedin className="h-4 w-4" aria-hidden="true" />
              <span>{SHARE_COPY.actions.linkedin.label}</span>
            </a>
          ) : (
            <span
              aria-disabled="true"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-full border border-border-subtle/60 bg-transparent px-4 py-2 text-sm text-content-primary opacity-50 pointer-events-none"
            >
              <Linkedin className="h-4 w-4" aria-hidden="true" />
              <span>{SHARE_COPY.actions.linkedin.label}</span>
            </span>
          )}
        </div>

        {/* Feedback beta: linha discreta no fim */}
        <div className="border-t border-border-subtle/30 pt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1 max-w-xl">
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-content-tertiary">
              {feedback.eyebrow}
            </p>
            <p className="text-sm text-content-secondary leading-relaxed">
              {feedback.subtitle}
            </p>
          </div>
          <a
            href={feedback.action.href}
            className="shrink-0 inline-flex items-center justify-center gap-2 font-mono text-[11px] uppercase tracking-[0.16em] text-accent-primary hover:text-accent-luminous transition-colors"
          >
            {feedback.action.label}
            <span aria-hidden="true">→</span>
          </a>
        </div>
      </div>
      </div>
    </section>
  );
}
