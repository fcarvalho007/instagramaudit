/**
 * Browser-based PDF provider abstraction.
 *
 * The current report renderer (`@react-pdf/renderer`) cannot run inside the
 * Cloudflare Worker runtime because of WASM (yoga-layout). The replacement is
 * an external "print-to-PDF" service that loads the live `/report/print/...`
 * URL and snapshots it to PDF.
 *
 * Multiple providers can implement this interface (PDFShift today, MarkupGo
 * tomorrow). The dispatcher in `render-via-browser.server.ts` selects one at
 * runtime via `process.env.PDF_RENDER_PROVIDER`.
 */

export type ProviderName = "pdfshift" | "markupgo";

export interface BrowserPdfRenderArgs {
  /** Public URL the provider must load. Must already include `?pdf=1`. */
  url: string;
  /**
   * Name of a globally available JS function (on `window`) that the provider
   * polls until it returns a truthy value. PDFShift waits up to 30s.
   */
  waitForGlobalFn?: string;
  /** Hard timeout for the page load (seconds). Provider-clamped. */
  timeoutSeconds?: number;
  /**
   * When true, the provider should generate a non-billed (watermarked) PDF.
   * Used in preview environments to avoid burning credits.
   */
  sandbox?: boolean;
}

export interface BrowserPdfProvider {
  readonly name: ProviderName;
  render(args: BrowserPdfRenderArgs): Promise<Uint8Array>;
}