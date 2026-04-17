/**
 * Public analysis endpoint — primary profile + up to 2 optional competitors.
 *
 * Server-side boundary for the Apify integration. Validates input, scrapes
 * profiles (single batched call) and posts (per-handle, in parallel via
 * allSettled), normalizes everything into PublicAnalysisResponse, and never
 * exposes raw upstream payloads or the Apify token to the browser.
 *
 * Scope: 1 primary profile + up to 2 competitors, 12 recent posts each.
 * No caching, no persistence, no AI. Partial competitor failures degrade
 * gracefully — the primary profile is always prioritised.
 */

import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import {
  ApifyConfigError,
  ApifyUpstreamError,
  runActor,
} from "@/lib/analysis/apify-client";
import {
  buildCacheKey,
  isFresh,
  isWithinStaleWindow,
  lookupSnapshot,
  storeSnapshot,
  type SnapshotRow,
} from "@/lib/analysis/cache";
import {
  computeContentSummary,
  normalizeProfile,
} from "@/lib/analysis/normalize";
import type {
  CompetitorAnalysis,
  PublicAnalysisErrorCode,
  PublicAnalysisProfile,
  PublicAnalysisResponse,
  PublicAnalysisSuccess,
} from "@/lib/analysis/types";
import { computeBenchmarkPositioning } from "@/lib/benchmark/engine";
import { loadBenchmarkReferences } from "@/lib/benchmark/reference-data";
import type { BenchmarkPositioning } from "@/lib/benchmark/types";

const PROFILE_ACTOR = "apify/instagram-profile-scraper";
const POST_ACTOR = "apify/instagram-post-scraper";
const POSTS_LIMIT = 12;
const MAX_COMPETITORS = 2;

const usernameSchema = z
  .string()
  .trim()
  .transform((v) => v.replace(/^@/, ""))
  .pipe(z.string().regex(/^[A-Za-z0-9._]{1,30}$/));

const PayloadSchema = z.object({
  instagram_username: usernameSchema,
  competitor_usernames: z
    .array(usernameSchema)
    .max(MAX_COMPETITORS)
    .optional()
    .default([]),
});

const ERROR_MESSAGES: Record<PublicAnalysisErrorCode, string> = {
  INVALID_USERNAME: "Username inválido. Verificar e tentar novamente.",
  PROFILE_NOT_FOUND:
    "Não foi possível encontrar este perfil. Verificar o username.",
  UPSTREAM_UNAVAILABLE:
    "Serviço de análise temporariamente indisponível. Tentar novamente dentro de instantes.",
  UPSTREAM_FAILED:
    "Não foi possível analisar este perfil neste momento. Tentar novamente dentro de instantes.",
  NETWORK_ERROR: "Falha de ligação. Tentar novamente.",
};

const HTTP_STATUS: Record<PublicAnalysisErrorCode, number> = {
  INVALID_USERNAME: 400,
  PROFILE_NOT_FOUND: 404,
  UPSTREAM_UNAVAILABLE: 503,
  UPSTREAM_FAILED: 502,
  NETWORK_ERROR: 502,
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

function jsonResponse(body: PublicAnalysisResponse, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });
}

function failure(code: PublicAnalysisErrorCode): Response {
  return jsonResponse(
    { success: false, error_code: code, message: ERROR_MESSAGES[code] },
    HTTP_STATUS[code],
  );
}

function competitorFailure(
  username: string,
  code: "PROFILE_NOT_FOUND" | "POSTS_UNAVAILABLE" | "UPSTREAM_FAILED",
): CompetitorAnalysis {
  const messages: Record<typeof code, string> = {
    PROFILE_NOT_FOUND: `Não foi possível encontrar @${username}.`,
    POSTS_UNAVAILABLE: `Métricas indisponíveis para @${username}.`,
    UPSTREAM_FAILED: `Não foi possível analisar @${username} neste momento.`,
  };
  return {
    success: false,
    username,
    error_code: code,
    message: messages[code],
  };
}

async function fetchPostsForHandle(
  username: string,
  followersCount: number,
) {
  const postRows = await runActor<Record<string, unknown>>(
    POST_ACTOR,
    {
      directUrls: [`https://www.instagram.com/${username}/`],
      resultsLimit: POSTS_LIMIT,
      resultsType: "posts",
    },
    { timeoutMs: 60_000, apifyTimeoutSecs: 55 },
  );
  return computeContentSummary(postRows, followersCount);
}

export const Route = createFileRoute("/api/analyze-public-v1")({
  server: {
    handlers: {
      OPTIONS: async () =>
        new Response(null, { status: 204, headers: corsHeaders }),

      POST: async ({ request }) => {
        let raw: unknown;
        try {
          raw = await request.json();
        } catch {
          return failure("INVALID_USERNAME");
        }

        const parsed = PayloadSchema.safeParse(raw);
        if (!parsed.success) {
          return failure("INVALID_USERNAME");
        }
        const primary = parsed.data.instagram_username;

        // Dedup competitors: lowercase comparison, drop primary, drop dupes,
        // cap at MAX_COMPETITORS. Original casing preserved for display.
        const seen = new Set<string>([primary.toLowerCase()]);
        const competitors: string[] = [];
        for (const c of parsed.data.competitor_usernames ?? []) {
          const key = c.toLowerCase();
          if (seen.has(key)) continue;
          seen.add(key);
          competitors.push(c);
          if (competitors.length >= MAX_COMPETITORS) break;
        }

        // Server-side escape hatch: ?refresh=1 bypasses cache and forces a
        // fresh provider call. Not exposed in the UI today; useful for dev
        // and a future "Atualizar análise" button without contract changes.
        const url = new URL(request.url);
        const forceRefresh = url.searchParams.get("refresh") === "1";

        const cacheKey = buildCacheKey(primary, competitors);

        // Load benchmark references upfront (cached in-memory for 10 min) so
        // both cache-hit and fresh-path responses can embed a positioning
        // computed against the cloud-managed dataset.
        const benchmarkData = await loadBenchmarkReferences();

        // 1) Cache lookup. A non-expired snapshot short-circuits the provider.
        const existing = await lookupSnapshot(cacheKey);
        if (existing && !forceRefresh && isFresh(existing)) {
          return jsonResponse(
            buildCachedResponse(existing, "cache", benchmarkData),
            200,
          );
        }

        const allHandles = [primary, ...competitors];

        try {
          // 2) Single batched profile call for primary + competitors.
          const profileRows = await runActor<Record<string, unknown>>(
            PROFILE_ACTOR,
            { usernames: allHandles },
            { timeoutMs: 60_000, apifyTimeoutSecs: 55 },
          );

          // Map normalised rows by lowercased username for lookup.
          const profilesByHandle = new Map<string, PublicAnalysisProfile>();
          for (const row of profileRows) {
            const np = normalizeProfile(row);
            if (np) profilesByHandle.set(np.username.toLowerCase(), np);
          }

          const primaryProfile = profilesByHandle.get(primary.toLowerCase());
          if (!primaryProfile) {
            return failure("PROFILE_NOT_FOUND");
          }

          // 3) Posts in parallel — primary + each competitor that resolved.
          const primaryPostsP = fetchPostsForHandle(
            primaryProfile.username,
            primaryProfile.followers_count,
          ).catch((err) => {
            console.error("[analyze-public-v1] primary posts failed", err);
            return computeContentSummary([], primaryProfile.followers_count);
          });

          const competitorTasks = competitors.map(async (handle) => {
            const profile = profilesByHandle.get(handle.toLowerCase());
            if (!profile) {
              return competitorFailure(handle, "PROFILE_NOT_FOUND");
            }
            try {
              const summary = await fetchPostsForHandle(
                profile.username,
                profile.followers_count,
              );
              return {
                success: true as const,
                profile,
                content_summary: summary,
              };
            } catch (postErr) {
              console.error(
                "[analyze-public-v1] competitor posts failed",
                handle,
                postErr,
              );
              const code =
                postErr instanceof ApifyUpstreamError && postErr.status === 404
                  ? "PROFILE_NOT_FOUND"
                  : "POSTS_UNAVAILABLE";
              return competitorFailure(handle, code);
            }
          });

          const [primarySummary, competitorResults] = await Promise.all([
            primaryPostsP,
            Promise.all(competitorTasks),
          ]);

          // 4) Persist snapshot (best-effort). The status field is intentionally
          // excluded — it's recomputed per response based on freshness.
          const normalizedPayload = {
            profile: primaryProfile,
            content_summary: primarySummary,
            competitors: competitorResults,
          };

          await storeSnapshot({
            cacheKey,
            instagramUsername: primaryProfile.username,
            competitorUsernames: competitors,
            normalizedPayload: normalizedPayload as unknown as Record<
              string,
              unknown
            >,
          });

          const response: PublicAnalysisSuccess = {
            success: true,
            ...normalizedPayload,
            status: {
              success: true,
              data_source: "fresh",
              analyzed_at: new Date().toISOString(),
            },
          };
          return jsonResponse(response, 200);
        } catch (err) {
          // 5) Stale-while-error: if provider failed but we have a recent
          // snapshot (≤ 7 days), serve it rather than breaking the page.
          if (existing && isWithinStaleWindow(existing)) {
            console.warn(
              "[analyze-public-v1] serving stale snapshot after provider failure",
              cacheKey,
            );
            return jsonResponse(buildCachedResponse(existing, "stale"), 200);
          }

          if (err instanceof ApifyConfigError) {
            console.error("[analyze-public-v1] missing config", err.message);
            return failure("UPSTREAM_UNAVAILABLE");
          }
          if (err instanceof ApifyUpstreamError) {
            console.error(
              "[analyze-public-v1] upstream error",
              err.status,
              err.message,
            );
            if (err.status === 404) return failure("PROFILE_NOT_FOUND");
            return failure("UPSTREAM_FAILED");
          }
          console.error("[analyze-public-v1] unexpected", err);
          return failure("UPSTREAM_FAILED");
        }
      },
    },
  },
});

/**
 * Reconstruct a PublicAnalysisSuccess from a stored snapshot.
 * The status block is always recomputed: data_source reflects freshness,
 * analyzed_at reflects when the underlying scrape happened (updated_at).
 */
function buildCachedResponse(
  snapshot: SnapshotRow,
  source: "cache" | "stale",
): PublicAnalysisSuccess {
  const payload = snapshot.normalized_payload as unknown as {
    profile: PublicAnalysisProfile;
    content_summary: PublicAnalysisSuccess["content_summary"];
    competitors: CompetitorAnalysis[];
  };
  return {
    success: true,
    profile: payload.profile,
    content_summary: payload.content_summary,
    competitors: payload.competitors ?? [],
    status: {
      success: true,
      data_source: source,
      analyzed_at: snapshot.updated_at,
    },
  };
}
