/**
 * POST /api/admin/refresh-profile
 *
 * One-shot fresh analysis for a single profile. Calls
 * analyze-public-v1?refresh=1 with INTERNAL_API_TOKEN — the authenticated
 * forceRefresh path bypasses the execution mode guard, so the global mode
 * stays cache_only throughout. No global state mutation needed.
 *
 * Admin-only. Requires INTERNAL_API_TOKEN. Respects all provider kill switches.
 */

import { createFileRoute } from "@tanstack/react-router";
import { requireAdminSession } from "@/lib/admin/session";
import {
  isApifyEnabled,
  isTestingModeActive,
  isAllowed,
} from "@/lib/security/apify-allowlist";
import { refreshingHandles } from "@/lib/admin/refresh-lock.server";

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

interface AnalyzeResult {
  success: boolean;
  error_code?: string;
  message?: string;
  snapshot_id?: string;
  // Structured provider detail fields
  provider?: string;
  provider_error_code?: string;
  provider_status?: number;
  provider_message?: string;
  run_id?: string;
  dataset_id?: string;
  details?: string;
}

/**
 * Build a list of candidate URLs for the analyze endpoint.
 * The sandbox dev-server cannot self-fetch (loopback fails with
 * "TypeError: fetch failed"), so we try the published URL first
 * and fall back to the request origin.
 */
function getAnalyzeUrls(request: Request): string[] {
  const origin = new URL(request.url).origin;
  const publishedUrl = "https://auditprofiles.com";
  const urls: string[] = [];

  // If we're NOT already on the published URL, try it first
  if (!origin.includes("auditprofiles.com")) {
    urls.push(`${publishedUrl}/api/analyze-public-v1?refresh=1`);
  }
  // Always include the current origin as fallback
  urls.push(`${origin}/api/analyze-public-v1?refresh=1`);
  return urls;
}

async function runAnalysis(
  request: Request,
  handle: string,
  internalToken: string,
): Promise<Response> {
  let analyzeResult: AnalyzeResult | null = null;
  let lastError: unknown = null;
  const urls = getAnalyzeUrls(request);

  try {
    for (const analyzeUrl of urls) {
      console.info(`[refresh-profile] calling analyze for @${handle} via ${analyzeUrl}`);

      try {
        const analyzeRes = await fetch(analyzeUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${internalToken}`,
          },
          body: JSON.stringify({
            instagram_username: handle,
            competitor_usernames: [],
          }),
        });

        // Parse response body (may be non-JSON on 503 etc.)
        try {
          analyzeResult = (await analyzeRes.json()) as AnalyzeResult;
        } catch {
          analyzeResult = {
            success: false,
            error_code: "internal_parse_failed",
            message: `Resposta não-JSON do servidor (HTTP ${analyzeRes.status}).`,
          };
        }

        if (!analyzeRes.ok || !analyzeResult?.success) {
          console.warn(`[refresh-profile] analyze failed for @${handle}`, {
            status: analyzeRes.status,
            error_code: analyzeResult?.error_code,
            message: analyzeResult?.message,
          });
        } else {
          console.info(`[refresh-profile] analyze success for @${handle}`);
        }

        // We got a real response (even if error) — stop trying other URLs
        break;
      } catch (fetchErr) {
        console.warn(`[refresh-profile] fetch failed for @${handle} via ${analyzeUrl}:`, fetchErr);
        lastError = fetchErr;
        // Try the next URL
        continue;
      }
    }
  } finally {
    refreshingHandles.delete(handle);
  }

  // All URLs failed with network error — no response at all
  if (!analyzeResult && lastError) {
    const errMsg = lastError instanceof Error ? lastError.message : String(lastError);
    return jsonResponse({
      success: false,
      error: `Falha de rede interna — o servidor não conseguiu contactar o endpoint de análise. Tenta na versão publicada. (${errMsg})`,
      error_code: "internal_fetch_failed",
    }, 502);
  }

  if (!analyzeResult?.success) {
    return jsonResponse({
      success: false,
      error: analyzeResult?.message ?? "Falha na análise.",
      error_code: analyzeResult?.error_code ?? "provider_failure",
      provider: analyzeResult?.provider,
      provider_error_code: analyzeResult?.provider_error_code,
      provider_status: analyzeResult?.provider_status,
      provider_message: analyzeResult?.provider_message,
      run_id: analyzeResult?.run_id,
      details: analyzeResult?.details,
    }, 502);
  }

  return jsonResponse({
    success: true,
    handle,
    snapshot_id: analyzeResult.snapshot_id,
  });
}

export const Route = createFileRoute("/api/admin/refresh-profile")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        // 1. Auth
        try {
          await requireAdminSession();
        } catch (res) {
          if (res instanceof Response) return res;
          throw res;
        }

        // 2. Parse body
        let body: { handle?: string };
        try {
          body = await request.json();
        } catch {
          return jsonResponse({ success: false, error: "Invalid JSON" }, 400);
        }

        const handle = body.handle?.trim().replace(/^@/, "").toLowerCase();
        if (!handle || handle.length < 1 || handle.length > 100) {
          return jsonResponse({ success: false, error: "Handle inválido" }, 400);
        }

        // 3. Pre-flight: INTERNAL_API_TOKEN
        const internalToken = process.env.INTERNAL_API_TOKEN;
        if (!internalToken) {
          return jsonResponse({
            success: false,
            error: "INTERNAL_API_TOKEN não configurado.",
            preflight_blocked: "internal_token_missing",
          }, 409);
        }

        // 4. Pre-flight: APIFY_ENABLED
        if (!isApifyEnabled()) {
          return jsonResponse({
            success: false,
            error: "APIFY_ENABLED is not 'true'. Provider desativado.",
            preflight_blocked: "apify_disabled",
          }, 409);
        }

        // 5. Pre-flight: allowlist check
        if (isTestingModeActive() && !isAllowed(handle)) {
          return jsonResponse({
            success: false,
            error: `@${handle} não está na allowlist. Adicione antes de atualizar.`,
            preflight_blocked: "allowlist",
          }, 409);
        }

        // 6. Concurrency lock
        if (refreshingHandles.has(handle)) {
          return jsonResponse({
            success: false,
            error: `Atualização já em curso para @${handle}.`,
            preflight_blocked: "concurrent_refresh",
          }, 409);
        }
        refreshingHandles.add(handle);

        // 7. Run analysis (lock released in finally inside runAnalysis)
        return await runAnalysis(request, handle, internalToken);
      },
    },
  },
});