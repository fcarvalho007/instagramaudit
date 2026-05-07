/**
 * GET /api/admin/refresh-profile-preflight?handle=:handle
 *
 * Lightweight pre-flight check for the admin refresh flow.
 * No provider calls. No side-effects. Returns structured readiness status.
 */

import { createFileRoute } from "@tanstack/react-router";
import { requireAdminSession } from "@/lib/admin/session";
import {
  isApifyEnabled,
  isTestingModeActive,
  isAllowed,
} from "@/lib/security/apify-allowlist";
import { refreshingHandles } from "@/lib/admin/refresh-lock.server";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

interface PreflightCheck {
  key: string;
  label: string;
  status: "ok" | "fail" | "warn";
  message: string;
}

export const Route = createFileRoute("/api/admin/refresh-profile-preflight")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        // 1. Auth
        try {
          await requireAdminSession();
        } catch (res) {
          if (res instanceof Response) return res;
          throw res;
        }

        // 2. Parse handle from query
        const url = new URL(request.url);
        const handle = url.searchParams
          .get("handle")
          ?.trim()
          .replace(/^@/, "")
          .toLowerCase();

        if (!handle || handle.length < 1 || handle.length > 100) {
          return json({ error: "Handle inválido" }, 400);
        }

        // 3. Run checks (no provider calls)
        const checks: PreflightCheck[] = [];
        let blockingReason: string | null = null;

        // INTERNAL_API_TOKEN
        const hasToken = Boolean(
          process.env.INTERNAL_API_TOKEN &&
            process.env.INTERNAL_API_TOKEN.length > 0,
        );
        checks.push({
          key: "internal_token",
          label: "Token interno",
          status: hasToken ? "ok" : "fail",
          message: hasToken ? "Configurado" : "Em falta",
        });
        if (!hasToken && !blockingReason) {
          blockingReason = "Token interno em falta";
        }

        // APIFY_ENABLED
        const apifyOn = isApifyEnabled();
        checks.push({
          key: "apify_enabled",
          label: "Apify",
          status: apifyOn ? "ok" : "fail",
          message: apifyOn ? "Ativo" : "Inativo",
        });
        if (!apifyOn && !blockingReason) {
          blockingReason = "Apify inativo";
        }

        // Allowlist
        const testingMode = isTestingModeActive();
        const inAllowlist = !testingMode || isAllowed(handle);
        checks.push({
          key: "allowlist",
          label: "Allowlist",
          status: inAllowlist ? "ok" : "fail",
          message: !testingMode
            ? "Modo teste desligado"
            : inAllowlist
              ? "Autorizado"
              : "Fora da allowlist",
        });
        if (!inAllowlist && !blockingReason) {
          blockingReason = "Fora da allowlist";
        }

        // Concurrent refresh
        const isRefreshing = refreshingHandles.has(handle);
        checks.push({
          key: "concurrent",
          label: "Concorrência",
          status: isRefreshing ? "fail" : "ok",
          message: isRefreshing ? "Atualização em curso" : "Livre",
        });
        if (isRefreshing && !blockingReason) {
          blockingReason = "Atualização em curso";
        }

        // Comment scraper
        const commentScraperOn =
          process.env.COMMENT_SCRAPER_ENABLED === "true";
        checks.push({
          key: "comment_scraper",
          label: "Comentários",
          status: commentScraperOn ? "ok" : "warn",
          message: commentScraperOn ? "Ativo" : "Desativado",
        });

        // APIFY_TOKEN presence
        const hasApifyToken = Boolean(
          process.env.APIFY_TOKEN && process.env.APIFY_TOKEN.length > 0,
        );
        checks.push({
          key: "apify_token",
          label: "Apify Token",
          status: hasApifyToken ? "ok" : "fail",
          message: hasApifyToken ? "Token presente, não validado" : "Em falta",
        });
        if (!hasApifyToken && !blockingReason) {
          blockingReason = "APIFY_TOKEN em falta";
        }

        // 4. Cache status (lightweight DB read)
        let cacheStatus = {
          has_snapshot: false,
          expired: false,
          expires_at: null as string | null,
        };

        try {
          const { data: snap } = await supabaseAdmin
            .from("analysis_snapshots")
            .select("expires_at")
            .eq("instagram_username", handle)
            .order("updated_at", { ascending: false })
            .limit(1)
            .maybeSingle();

          if (snap) {
            const expiresAt = snap.expires_at;
            const expired = expiresAt
              ? new Date(expiresAt).getTime() < Date.now()
              : false;
            cacheStatus = {
              has_snapshot: true,
              expired,
              expires_at: expiresAt,
            };
          }
        } catch {
          // Non-blocking — cache status is informational
        }

        const canRefresh = !blockingReason;

        return json({
          can_refresh: canRefresh,
          blocking_reason: blockingReason,
          estimated_cost_usd: "~$0.02–0.05",
          checks,
          cache_status: cacheStatus,
        });
      },
    },
  },
});