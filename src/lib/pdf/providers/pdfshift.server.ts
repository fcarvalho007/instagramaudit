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
      // Hard upper bound. PDFShift caps at 900s.
      timeout: Math.max(10, Math.min(args.timeoutSeconds ?? 60, 120)),
      // Sandbox conversions don't burn credits but are watermarked.
      sandbox: args.sandbox === true,
      // Latest Chromium for reliable Tailwind v4 / modern CSS rendering.
    };

    if (args.waitForGlobalFn) {
      body.wait_for = args.waitForGlobalFn;
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
      // Try to extract a useful error message from the JSON body.
      let detail = "";
      try {
        const errJson = (await res.json()) as { error?: string; message?: string };
        detail = errJson.error ?? errJson.message ?? "";
      } catch {
        try {
          detail = (await res.text()).slice(0, 200);
        } catch {
          /* swallow */
        }
      }
      throw new Error(
        `PDFShift HTTP ${res.status}${detail ? `: ${detail}` : ""}`,
      );
    }

    const buf = await res.arrayBuffer();
    return new Uint8Array(buf);
  },
};