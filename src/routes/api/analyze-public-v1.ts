/**
 * Public analysis endpoint — primary profile only.
 *
 * Server-side boundary for the Apify integration. Validates the username,
 * scrapes profile + recent posts, normalizes everything to PublicAnalysisResponse,
 * and never exposes raw upstream payloads or the Apify token to the browser.
 *
 * Scope: 1 profile, 12 recent posts. No competitors, no caching, no persistence.
 */

import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import {
  ApifyConfigError,
  ApifyUpstreamError,
  runActor,
} from "@/lib/analysis/apify-client";
import {
  computeContentSummary,
  normalizeProfile,
} from "@/lib/analysis/normalize";
import type {
  PublicAnalysisErrorCode,
  PublicAnalysisResponse,
} from "@/lib/analysis/types";

const PROFILE_ACTOR = "apify/instagram-profile-scraper";
const POST_ACTOR = "apify/instagram-post-scraper";
const POSTS_LIMIT = 12;

const PayloadSchema = z.object({
  instagram_username: z
    .string()
    .trim()
    .transform((v) => v.replace(/^@/, ""))
    .pipe(z.string().regex(/^[A-Za-z0-9._]{1,30}$/)),
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
        const username = parsed.data.instagram_username;

        try {
          // 1) Profile actor — minimal input, single username.
          const profileRows = await runActor<Record<string, unknown>>(
            PROFILE_ACTOR,
            { usernames: [username] },
            { timeoutMs: 50_000, apifyTimeoutSecs: 45 },
          );

          const profile = profileRows.length > 0
            ? normalizeProfile(profileRows[0])
            : null;

          if (!profile) {
            return failure("PROFILE_NOT_FOUND");
          }

          // 2) Posts actor — recent window, capped to POSTS_LIMIT.
          // `directUrls` is the documented input for instagram-post-scraper
          // and is more reliable than `username` alone (which silently returns
          // empty for some handles). We also keep `resultsLimit` for cost control.
          let contentSummary;
          try {
            const postRows = await runActor<Record<string, unknown>>(
              POST_ACTOR,
              {
                directUrls: [`https://www.instagram.com/${username}/`],
                resultsLimit: POSTS_LIMIT,
                resultsType: "posts",
              },
              { timeoutMs: 60_000, apifyTimeoutSecs: 55 },
            );
            contentSummary = computeContentSummary(
              postRows,
              profile.followers_count,
            );
          } catch (postErr) {
            // Profile worked, posts didn't — degrade gracefully with empty summary.
            console.error(
              "[analyze-public-v1] post scrape failed",
              postErr,
            );
            contentSummary = computeContentSummary([], profile.followers_count);
          }

          return jsonResponse(
            {
              success: true,
              profile,
              content_summary: contentSummary,
              status: {
                success: true,
                data_source: "apify_v1",
                analyzed_at: new Date().toISOString(),
              },
            },
            200,
          );
        } catch (err) {
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
            // Apify returns 404 when the actor cannot resolve the user.
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
