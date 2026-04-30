/**
 * PDFShift provider implementation.
 *
 * Docs: https://docs.pdfshift.io/api-reference/convert-to-pdf
 * Auth: header `X-API-Key`
 * Response: binary PDF in body on 200, JSON error otherwise.
 *
 * IMPORTANT: secrets are read inside `render()` — never at module scope —
 * so Vite/Worker env injection works at call time.
 */

import type { BrowserPdfProvider, BrowserPdfRenderArgs } from "./types";

const ENDPOINT = "https://api.pdfshift.io/v3/convert/pdf";

export const pdfshiftProvider: BrowserPdfProvider = {
  name: "pdfshift",

  async render(args: BrowserPdfRenderArgs): Promise<Uint8Array> {
    const apiKey = process.env.PDFSHIFT_API_KEY;
    if (!apiKey) {
      throw new Error("PDFSHIFT_API_KEY is not configured");
    }

    const body: Record<string, unknown> = {
      source: args.url,
      // Layout
      format: "A4",
      landscape: false,
      // Backgrounds ON (default: false for `disable_backgrounds`).
      disable_backgrounds: false,
      // Use the print stylesheet so any `@media print` rules apply.
      use_print: true,
      // Generous default margin — keeps editorial breathing room without
      // letting Tailwind containers touch the page edge.
      margin: { top: "12mm", bottom: "14mm", left: "10mm", right: "10mm" },
      // Wait for the network to be quiet AND for our explicit ready signal.
      wait_for_network: true,
      // Hard upper bound. PDFShift caps `timeout` at 30s on standard plans
      // (account-level limit; raising it requires sales contact). We clamp to
      // that ceiling so the request is never rejected with HTTP 400. Note
      // this is the *page load* timeout, not the wait-for-readiness budget;
      // the network is already idle by the time `wait_for: pdfReady` polls.
      timeout: Math.max(5, Math.min(args.timeoutSeconds ?? 30, 30)),
      // Sandbox conversions don't burn credits but are watermarked.
      sandbox: args.sandbox === true,
      // Latest Chromium for reliable Tailwind v4 / modern CSS rendering.
    };

    if (args.waitForGlobalFn) {
      body.wait_for = args.waitForGlobalFn;
      // CRÍTICO: a rota /report/print/$snapshotId usa `ssr: false`, por isso
      // o `<script>` injectado via `head()` NÃO chega ao HTML inicial. O
      // PDFShift valida `wait_for` lendo `window[fn]` durante o carregamento
      // da página e rejeita com HTTP 400 ("wait_for function ... is not
      // defined or invalid") se a função ainda não existir.
      //
      // Solução: usamos o parâmetro `javascript` para injectar nós próprios
      // o bootstrap mínimo. PDFShift avalia este script no contexto da
      // página assim que o documento começa a carregar, antes de validar
      // `wait_for`. O React, mais tarde, comuta `window.pdfReadyState`
      // para `true` quando o relatório está realmente pronto.
      body.javascript =
        `(function(){` +
        `if(typeof window.pdfReadyState==="undefined"){window.pdfReadyState=false;}` +
        `if(typeof window.${args.waitForGlobalFn}!=="function"){` +
        `window.${args.waitForGlobalFn}=function(){return window.pdfReadyState===true;};` +
        `}` +
        `})();`;
    }

    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: {
        "X-API-Key": apiKey,
        "Content-Type": "application/json",
        "X-Processor-Version": "142",
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      // Try to extract a useful error message from the body. PDFShift v3
      // returns either `{ error: "..." }` (single) or `{ errors: { field: ["..."] } }`
      // (validation). We surface whatever we find so logs are actionable.
      let detail = "";
      try {
        const text = await res.text();
        try {
          const j = JSON.parse(text) as {
            error?: string;
            message?: string;
            errors?: Record<string, string[] | string>;
          };
          if (j.error) {
            detail = j.error;
          } else if (j.message) {
            detail = j.message;
          } else if (j.errors) {
            detail = Object.entries(j.errors)
              .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join("; ") : v}`)
              .join(" | ");
          } else {
            detail = text.slice(0, 300);
          }
        } catch {
          detail = text.slice(0, 300);
        }
      } catch {
        /* swallow */
      }
      throw new Error(
        `PDFShift HTTP ${res.status}${detail ? `: ${detail}` : ""}`,
      );
    }

    const buf = await res.arrayBuffer();
    return new Uint8Array(buf);
  },
};