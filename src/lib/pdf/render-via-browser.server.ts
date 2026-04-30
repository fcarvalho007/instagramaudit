/**
 * Browser-based PDF renderer dispatcher.
 *
 * Reads the active provider from `process.env.PDF_RENDER_PROVIDER` (default
 * `"pdfshift"`) and delegates to its implementation. Adding a new provider
 * is a one-line registry change.
 *
 * NEVER read secrets/env at module scope — only inside the function body.
 */

import { pdfshiftProvider } from "./providers/pdfshift.server";
import type { BrowserPdfProvider, BrowserPdfRenderArgs, ProviderName } from "./providers/types";

const REGISTRY: Record<ProviderName, BrowserPdfProvider> = {
  pdfshift: pdfshiftProvider,
  // markupgo: markupgoProvider, // add when needed
  markupgo: pdfshiftProvider, // safe fallback while not implemented
};

function resolveProvider(): BrowserPdfProvider {
  const raw = (process.env.PDF_RENDER_PROVIDER ?? "pdfshift").toLowerCase();
  if (raw === "markupgo" || raw === "pdfshift") {
    return REGISTRY[raw];
  }
  // Unknown value → safest default.
  return REGISTRY.pdfshift;
}

function resolveSandbox(explicit?: boolean): boolean {
  if (typeof explicit === "boolean") return explicit;
  const flag = (process.env.PDF_RENDER_SANDBOX ?? "").toLowerCase();
  return flag === "true" || flag === "1" || flag === "yes";
}

/**
 * Render the given URL to a PDF using the configured browser provider.
 * Returns the raw PDF bytes on success; throws on any failure.
 */
export async function renderViaBrowser(
  args: BrowserPdfRenderArgs,
): Promise<Uint8Array> {
  const provider = resolveProvider();
  return provider.render({
    ...args,
    sandbox: resolveSandbox(args.sandbox),
  });
}