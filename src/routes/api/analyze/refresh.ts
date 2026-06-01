/**
 * POST /api/analyze/refresh
 *
 * User-facing refresh endpoint for the public report. Requires an
 * authenticated Supabase session — anonymous visitors can read cached
 * reports but cannot spend Apify credits.
 *
 * Preflight:
 *   - rejects when no snapshot exists for the cache key
 *   - rejects when current snapshot is < 12h old (state "fresh_under_12h"):
 *     the UI doesn't surface the CTA, but a malicious client could call us
 *     anyway, so we double-check server-side.
 *
 * On approval, delegates to analyze-public-v1?refresh=1 with
 * INTERNAL_API_TOKEN (the only authenticated forceRefresh path), reusing
 * the same lock-by-handle + Apify guards as the admin flow.
 *
 * NOTE: this endpoint does NOT consume credits today — the credits table
 * is not implemented yet (see plan §6). When introduced, the debit will
 * happen here, after analyze-public-v1 returns success.
 */

import { createFileRoute } from "@tanstack/react-router";
import {
  isAllowed,
  isApifyEnabled,
  isTestingModeActive,
} from "@/lib/security/apify-allowlist";
import { refreshingHandles } from "@/lib/admin/refresh-lock.server";
import {
  buildCacheKey,
  getFreshnessState,
  lookupSnapshot,
} from "@/lib/analysis/cache";
import { normalizeInstagramHandle } from "@/lib/instagram/normalize-handle";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

async function verifyUserSession(request: Request): Promise<
  | { ok: true; userId: string }
  | { ok: false; status: number; error: string }
> {
  const authHeader = request.headers.get("authorization") ?? "";
  const token = authHeader.toLowerCase().startsWith("bearer ")
    ? authHeader.slice(7).trim()
    : "";
  if (!token) {
    return {
      ok: false,
      status: 401,
      error: "Sessão necessária para actualizar a análise.",
    };
  }
  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !data?.user) {
    return {
      ok: false,
      status: 401,
      error: "Sessão inválida ou expirada.",
    };
  }
  return { ok: true, userId: data.user.id };
}

function getAnalyzeUrls(request: Request): string[] {
  const origin = new URL(request.url).origin;
  const publishedUrl = "https://auditprofiles.com";
  const urls: string[] = [];
  if (!origin.includes("auditprofiles.com")) {
    urls.push(`${publishedUrl}/api/analyze-public-v1?refresh=1`);
  }
  urls.push(`${origin}/api/analyze-public-v1?refresh=1`);
  return urls;
}

export const Route = createFileRoute("/api/analyze/refresh")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        // 1. Auth
        const session = await verifyUserSession(request);
        if (!session.ok) {
          return jsonResponse(
            { success: false, error: session.error, error_code: "unauthenticated" },
            session.status,
          );
        }

        // 2. Body
        let body: {
          instagram_username?: string;
          competitor_usernames?: string[];
        };
        try {
          body = await request.json();
        } catch {
          return jsonResponse(
            { success: false, error: "JSON inválido.", error_code: "invalid_body" },
            400,
          );
        }
        const rawHandle = body.instagram_username?.toString().trim() ?? "";
        if (!rawHandle) {
          return jsonResponse(
            { success: false, error: "Handle em falta.", error_code: "invalid_handle" },
            400,
          );
        }
        let handle: string;
        try {
          handle = normalizeInstagramHandle(rawHandle);
        } catch {
          return jsonResponse(
            { success: false, error: "Handle inválido.", error_code: "invalid_handle" },
            400,
          );
        }
        const competitors = Array.isArray(body.competitor_usernames)
          ? body.competitor_usernames
              .filter((c): c is string => typeof c === "string")
              .map((c) => {
                try {
                  return normalizeInstagramHandle(c);
                } catch {
                  return null;
                }
              })
              .filter((c): c is string => c !== null)
              .slice(0, 2)
          : [];

        // 3. Token
        const internalToken = process.env.INTERNAL_API_TOKEN;
        if (!internalToken) {
          return jsonResponse(
            {
              success: false,
              error: "Refresh indisponível — configuração em falta.",
              error_code: "internal_token_missing",
            },
            503,
          );
        }

        // 4. Provider guards
        if (!isApifyEnabled()) {
          return jsonResponse(
            {
              success: false,
              error: "Recolha automática desligada temporariamente.",
              error_code: "provider_disabled",
            },
            503,
          );
        }
        if (isTestingModeActive() && !isAllowed(handle)) {
          return jsonResponse(
            {
              success: false,
              error: "Este perfil ainda não está disponível para refresh em modo de teste.",
              error_code: "allowlist_blocked",
            },
            403,
          );
        }

        // 5. Freshness preflight — reject if snapshot is < 12h old
        const cacheKey = buildCacheKey(handle, competitors);
        const existing = await lookupSnapshot(cacheKey);
        if (existing) {
          const state = getFreshnessState(existing);
          if (state === "fresh_under_12h") {
            return jsonResponse(
              {
                success: false,
                error: "Análise actualizada há menos de 12 horas — refresh ainda não disponível.",
                error_code: "too_recent",
              },
              409,
            );
          }
        }

        // 6. Concurrency lock
        if (refreshingHandles.has(handle)) {
          return jsonResponse(
            {
              success: false,
              error: "Já está em curso uma actualização para este perfil.",
              error_code: "concurrent_refresh",
            },
            409,
          );
        }
        refreshingHandles.add(handle);

        // 7. Invoke fresh path
        console.info(
          "[analyze/refresh] refresh_requested",
          JSON.stringify({ handle, user_id: session.userId }),
        );

        const urls = getAnalyzeUrls(request);
        let analyzeResult: {
          success?: boolean;
          error_code?: string;
          message?: string;
          analysis_snapshot_id?: string;
          freshness?: unknown;
        } | null = null;
        let lastError: unknown = null;
        try {
          for (const analyzeUrl of urls) {
            try {
              const res = await fetch(analyzeUrl, {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${internalToken}`,
                },
                body: JSON.stringify({
                  instagram_username: handle,
                  competitor_usernames: competitors,
                }),
              });
              try {
                analyzeResult = await res.json();
              } catch {
                analyzeResult = {
                  success: false,
                  error_code: "parse_failed",
                  message: `Resposta não-JSON (HTTP ${res.status}).`,
                };
              }
              if (analyzeResult?.success) break;
              // Got a structured failure — stop trying alternative URLs.
              break;
            } catch (err) {
              lastError = err;
              continue;
            }
          }
        } finally {
          refreshingHandles.delete(handle);
        }

        if (!analyzeResult) {
          console.warn(
            "[analyze/refresh] refresh_failed",
            JSON.stringify({
              handle,
              reason: "network",
              error: lastError instanceof Error ? lastError.message : String(lastError),
            }),
          );
          return jsonResponse(
            {
              success: false,
              error: "Não foi possível contactar o serviço de análise.",
              error_code: "network_error",
            },
            502,
          );
        }

        if (!analyzeResult.success) {
          console.warn(
            "[analyze/refresh] refresh_failed",
            JSON.stringify({ handle, error_code: analyzeResult.error_code }),
          );
          console.info(
            "[analyze/refresh] refresh_credit_not_consumed",
            JSON.stringify({ handle, reason: analyzeResult.error_code ?? "unknown" }),
          );
          return jsonResponse(
            {
              success: false,
              error: analyzeResult.message ?? "Falha ao actualizar a análise.",
              error_code: analyzeResult.error_code ?? "provider_failure",
            },
            502,
          );
        }

        console.info(
          "[analyze/refresh] refresh_success",
          JSON.stringify({
            handle,
            snapshot_id: analyzeResult.analysis_snapshot_id,
          }),
        );
        // Sem tabela de créditos ainda — log explícito mantém auditoria.
        console.info(
          "[analyze/refresh] refresh_credit_not_consumed",
          JSON.stringify({ handle, reason: "credits_not_implemented" }),
        );

        return jsonResponse({
          success: true,
          handle,
          analysis_snapshot_id: analyzeResult.analysis_snapshot_id,
          freshness: analyzeResult.freshness,
        });
      },
    },
  },
});