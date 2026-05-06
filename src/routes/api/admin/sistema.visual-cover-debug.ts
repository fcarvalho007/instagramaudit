/**
 * GET /api/admin/sistema/visual-cover-debug?handle=<username>
 *
 * Returns P07 Visual Cover Analysis debug info for admin panel.
 * Never exposes API keys — only boolean presence.
 */

import { createFileRoute } from "@tanstack/react-router";
import { requireAdminSession } from "@/lib/admin/session";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import {
  isOpenAiEnabled,
  isOpenAiTestingModeActive,
  isOpenAiAllowed,
  getOpenAiAllowlist,
} from "@/lib/security/openai-allowlist";

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export const Route = createFileRoute(
  "/api/admin/sistema/visual-cover-debug",
)({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          await requireAdminSession();
        } catch (res) {
          if (res instanceof Response) return res;
          throw res;
        }

        const url = new URL(request.url);
        const handle = url.searchParams
          .get("handle")
          ?.trim()
          .replace(/^@/, "")
          .toLowerCase();

        // 1. OpenAI gate status
        const openaiEnabled = isOpenAiEnabled();
        const testingMode = isOpenAiTestingModeActive();
        const allowlist = getOpenAiAllowlist();
        const handleAllowed = handle ? isOpenAiAllowed(handle) : null;
        const apiKeySet =
          typeof process.env.OPENAI_API_KEY === "string" &&
          process.env.OPENAI_API_KEY.trim().length > 0;

        // 2. Latest snapshot for handle
        let snapshotInfo: Record<string, unknown> | null = null;
        let thumbnailInfo: {
          total: number;
          urls: string[];
          allRaw: boolean;
        } | null = null;

        if (handle) {
          const { data: snap } = await supabaseAdmin
            .from("analysis_snapshots")
            .select("id, created_at, normalized_payload")
            .eq("instagram_username", handle)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();

          if (snap) {
            const payload = snap.normalized_payload as Record<
              string,
              unknown
            > | null;
            const vca = payload?.visual_cover_analysis as Record<
              string,
              unknown
            > | null;
            snapshotInfo = {
              id: snap.id,
              created_at: snap.created_at,
              has_visual_cover: !!vca,
              overall_score: vca?.overallScore ?? null,
              status: vca?.status ?? null,
              model: vca?.model ?? null,
              thumbnail_count: Array.isArray(vca?.thumbnails)
                ? (vca.thumbnails as unknown[]).length
                : null,
            };

            // Thumbnail readiness from posts
            const posts = payload?.posts as
              | Array<Record<string, unknown>>
              | undefined;
            if (Array.isArray(posts)) {
              const thumbUrls = posts
                .map((p) => p.thumbnail_url as string | undefined)
                .filter(
                  (u): u is string =>
                    typeof u === "string" && u.length > 0,
                );
              const first3 = thumbUrls.slice(0, 3).map((u) => {
                const truncated =
                  u.length > 80 ? u.slice(0, 40) + "..." + u.slice(-30) : u;
                return truncated;
              });
              const allRaw = thumbUrls.every(
                (u) =>
                  u.startsWith("https://") && !u.includes("/api/public/"),
              );
              thumbnailInfo = {
                total: thumbUrls.length,
                urls: first3,
                allRaw,
              };
            }
          }
        }

        // 3. Last provider call log for visual-cover-analysis
        const { data: lastCall } = await supabaseAdmin
          .from("provider_call_logs")
          .select(
            "id, created_at, status, model, prompt_tokens, completion_tokens, estimated_cost_usd, actual_cost_usd, error_excerpt, handle, http_status, duration_ms",
          )
          .eq("actor", "visual-cover-analysis")
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        // 4. Determine P07 status
        let p07Status:
          | "not_attempted"
          | "blocked_openai_gate"
          | "allowed_not_executed"
          | "executed_success"
          | "executed_error";
        if (lastCall) {
          p07Status =
            lastCall.status === "success"
              ? "executed_success"
              : "executed_error";
        } else if (!openaiEnabled || !apiKeySet) {
          p07Status = "blocked_openai_gate";
        } else if (handle && !handleAllowed) {
          p07Status = "blocked_openai_gate";
        } else {
          p07Status = "not_attempted";
        }

        return json({
          p07Status,
          openai: {
            enabled: openaiEnabled,
            testingMode,
            allowlist,
            handleAllowed,
            apiKeySet,
          },
          snapshot: snapshotInfo,
          thumbnails: thumbnailInfo,
          lastProviderCall: lastCall
            ? {
                id: lastCall.id,
                created_at: lastCall.created_at,
                status: lastCall.status,
                model: lastCall.model,
                http_status: lastCall.http_status,
                duration_ms: lastCall.duration_ms,
                prompt_tokens: lastCall.prompt_tokens,
                completion_tokens: lastCall.completion_tokens,
                cost:
                  lastCall.actual_cost_usd ??
                  lastCall.estimated_cost_usd ??
                  null,
                error: lastCall.error_excerpt,
                handle: lastCall.handle,
              }
            : null,
        });
      },
    },
  },
});
