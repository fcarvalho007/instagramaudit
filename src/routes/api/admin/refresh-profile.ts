/**
 * POST /api/admin/refresh-profile
 *
 * One-shot fresh analysis for a single profile. Temporarily sets execution
 * mode to "fresh", calls analyze-public-v1?refresh=1 server-to-server,
 * then restores "cache_only" in a finally block — even on failure.
 *
 * Admin-only. Requires INTERNAL_API_TOKEN. Respects all provider kill switches.
 */

import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireAdminSession } from "@/lib/admin/session";
import { invalidateExecutionModeCache } from "@/lib/admin/execution-mode.server";
import {
  isApifyEnabled,
  isTestingModeActive,
  isAllowed,
} from "@/lib/security/apify-allowlist";

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

async function setMode(mode: "cache_only" | "fresh"): Promise<boolean> {
  const { error } = await supabaseAdmin.from("app_config").upsert(
    {
      key: "analysis_execution_mode",
      value: mode,
      updated_at: new Date().toISOString(),
      updated_by: "admin:refresh-profile",
    },
    { onConflict: "key" },
  );
  invalidateExecutionModeCache();
  if (error) {
    console.error(`[refresh-profile] failed to set mode to ${mode}`, error);
    return false;
  }
  return true;
}

interface AnalyzeResult {
  success: boolean;
  error_code?: string;
  message?: string;
  snapshot_id?: string;
}

async function runAnalysisAndRestore(
  request: Request,
  handle: string,
  internalToken: string,
): Promise<Response> {
  let analyzeResult: AnalyzeResult | null = null;
  let restoreWarning: string | null = null;

  try {
    const origin = new URL(request.url).origin;
    const analyzeUrl = `${origin}/api/analyze-public-v1?refresh=1`;

    console.info(`[refresh-profile] calling analyze for @${handle}`);

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

    analyzeResult = (await analyzeRes.json().catch(() => null)) as AnalyzeResult | null;

    if (!analyzeRes.ok || !analyzeResult?.success) {
      console.warn(`[refresh-profile] analyze failed for @${handle}`, analyzeResult);
    } else {
      console.info(`[refresh-profile] analyze success for @${handle}`);
    }
  } catch (err) {
    console.error(`[refresh-profile] analyze threw for @${handle}`, err);
  } finally {
    const restored = await setMode("cache_only");
    if (!restored) {
      console.error("[refresh-profile] CRITICAL: failed to restore cache_only!");
      restoreWarning = "Atenção: não foi possível restaurar o modo cache_only. Verifique em Sistema.";
    }
  }

  if (!analyzeResult?.success) {
    return jsonResponse({
      success: false,
      error: analyzeResult?.message ?? "Falha na análise.",
      error_code: analyzeResult?.error_code,
      restore_warning: restoreWarning,
    }, 502);
  }

  return jsonResponse({
    success: true,
    handle,
    snapshot_id: analyzeResult.snapshot_id,
    restore_warning: restoreWarning,
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

        // 5. Pre-flight: allowlist
        if (isTestingModeActive() && !isAllowed(handle)) {
          return jsonResponse({
            success: false,
            error: `@${handle} não está na allowlist. Adicione antes de atualizar.`,
            preflight_blocked: "allowlist",
          }, 409);
        }

        // 6. Set execution mode to fresh
        const freshSet = await setMode("fresh");
        if (!freshSet) {
          return jsonResponse({
            success: false,
            error: "Falha ao ativar modo fresh.",
          }, 500);
        }

        // 7. Run analysis and always restore mode
        return await runAnalysisAndRestore(request, handle, internalToken);
      },
    },
  },
});