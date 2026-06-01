/**
 * Endpoint-level contract tests for the Phase 2 credit gate on
 * `/api/analyze-public-v1`.
 *
 * Pattern: invoke the actual `Route.options.server.handlers.POST` with a
 * hand-built `Request`. Heavy downstream dependencies (Apify, snapshot
 * cache, analytics, benchmark engine, rate limit, budget, OpenAI prefetch)
 * are mocked via `vi.mock` so we exercise only the credit lifecycle
 * decisions inside the handler. The REAL `credits.server`, `lead-reports`
 * and `lead-cookie` modules are used so the matrix is enforced against
 * the real ledger arithmetic.
 *
 * Eight scenarios — see the per-`it` headers below.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

// ─── Hoisted mutable state shared with vi.mock factories ───────────────
const state = vi.hoisted(() => {
  return {
    // credit_ledger fake rows
    ledger: [] as Array<{
      lead_id: string;
      delta: number;
      reason: string;
      reservation_id: string | null;
    }>,
    // lead_reports fake rows
    leadReports: [] as Array<{ lead_id: string; cache_key: string }>,
    // controllable cache lookup
    snapshot: null as
      | null
      | {
          id: string;
          cache_key: string;
          instagram_username: string;
          competitor_usernames: unknown;
          normalized_payload: Record<string, unknown>;
          provider: string;
          analysis_status: string;
          created_at: string;
          updated_at: string;
          expires_at: string;
        },
    snapshotIsFresh: false,
    // controllable Apify response for fetchProfileWithPosts
    apifyRowFactory: (() => null) as () => Record<string, unknown> | null,
    apifyError: null as Error | null,
    apifyCallCount: 0,
    // controllable normalizeProfile result
    normalizeProfileResult: null as Record<string, unknown> | null,
  };
});

// ─── Mocks: heavy downstream deps ──────────────────────────────────────

vi.mock("@/integrations/supabase/client.server", () => {
  /** Polymorphic chain that resolves to `{ data, error }` no matter how
   *  many `.eq().in().gte().order().limit()` calls are stacked on top. */
  const noopChain = (data: unknown = null) => {
    const fn = vi.fn(() => Promise.resolve({ data, error: null }));
    const obj: Record<string, unknown> = {
      eq: () => obj,
      in: () => obj,
      gte: () => obj,
      order: () => obj,
      limit: () => obj,
      maybeSingle: () => Promise.resolve({ data, error: null }),
      single: () => Promise.resolve({ data, error: null }),
      select: () => obj,
      then: (resolve: (v: { data: unknown; error: null }) => unknown) =>
        resolve({ data, error: null }),
    };
    // `.insert()` etc. can also be awaited directly.
    Object.assign(fn, obj);
    return obj;
  };

  const supabaseAdmin = {
    from: (table: string) => {
      if (table === "credit_ledger") {
        return {
          insert: (
            payload: {
              lead_id: string;
              delta: number;
              reason: string;
              reservation_id?: string | null;
            },
          ) => {
            if (payload.reason === "initial_grant") {
              const dup = state.ledger.some(
                (r) =>
                  r.lead_id === payload.lead_id && r.reason === "initial_grant",
              );
              if (dup) {
                return Promise.resolve({
                  error: { code: "23505", message: "duplicate" },
                });
              }
            }
            state.ledger.push({
              lead_id: payload.lead_id,
              delta: payload.delta,
              reason: payload.reason,
              reservation_id: payload.reservation_id ?? null,
            });
            return Promise.resolve({ error: null });
          },
        };
      }
      if (table === "lead_reports") {
        return {
          upsert: (
            payload: { lead_id: string; cache_key: string },
            _opts: { onConflict: string; ignoreDuplicates: boolean },
          ) => {
            const exists = state.leadReports.some(
              (r) =>
                r.lead_id === payload.lead_id &&
                r.cache_key === payload.cache_key,
            );
            if (!exists)
              state.leadReports.push({
                lead_id: payload.lead_id,
                cache_key: payload.cache_key,
              });
            return Promise.resolve({ error: null });
          },
          select: () => ({
            eq: (_c1: string, leadId: string) => ({
              eq: (_c2: string, cacheKey: string) => ({
                limit: () => ({
                  maybeSingle: () => {
                    const found = state.leadReports.find(
                      (r) =>
                        r.lead_id === leadId && r.cache_key === cacheKey,
                    );
                    return Promise.resolve({
                      data: found ? { id: "fake" } : null,
                      error: null,
                    });
                  },
                }),
              }),
            }),
          }),
        };
      }
      // Negative-cache lookup, enrichment_jobs insert, etc. → noop.
      return noopChain();
    },
    rpc: (name: string, args: { p_lead_id?: string }) => {
      if (name === "credit_balance" && args?.p_lead_id) {
        const lead = args.p_lead_id;
        return Promise.resolve({
          data: state.ledger
            .filter((r) => r.lead_id === lead)
            .reduce((a, r) => a + r.delta, 0),
          error: null,
        });
      }
      return Promise.resolve({ data: null, error: null });
    },
  };
  return { supabaseAdmin };
});

vi.mock("@/lib/analysis/cache", () => ({
  CACHE_TTL_MS: 24 * 60 * 60 * 1000,
  STALE_TOLERANCE_MS: 7 * 24 * 60 * 60 * 1000,
  buildCacheKey: (h: string, comps: string[]) =>
    `v1:${h}|${(comps ?? []).join(",")}`,
  lookupSnapshot: vi.fn(async () => state.snapshot),
  isFresh: vi.fn(() => state.snapshotIsFresh),
  isWithinStaleWindow: vi.fn(() => false),
  getFreshnessState: () => "fresh_under_12h",
  getSnapshotAgeHours: () => 1.2,
  storeSnapshot: vi.fn(async () => "snap-fresh-1"),
  setEnrichmentStatusAtomic: vi.fn(async () => true),
}));

vi.mock("@/lib/analysis/events", () => ({
  recordAnalysisEvent: vi.fn(async () => "event-fake"),
  recordProviderCall: vi.fn(async () => "provider-call-fake"),
  linkProviderCallsToEvent: vi.fn(async () => undefined),
  updateProviderCallsEventId: vi.fn(async () => undefined),
}));

vi.mock("@/lib/analysis/apify-client", async () => {
  // Reuse the real error classes so `instanceof` checks inside the
  // handler keep working (lines 820, 924, 1340 in analyze-public-v1).
  const actual = await vi.importActual<
    typeof import("@/lib/analysis/apify-client")
  >("@/lib/analysis/apify-client");
  return {
    ...actual,
    runActorWithMetadata: vi.fn(async () => {
      state.apifyCallCount++;
      if (state.apifyError) throw state.apifyError;
      const row = state.apifyRowFactory();
      return {
        items: row ? [row] : [],
        runId: "run-fake",
        actualCostUsd: 0.01,
      };
    }),
  };
});

vi.mock("@/lib/security/apify-allowlist", () => ({
  isApifyEnabled: () => true,
  isAllowed: () => true,
  isTestingModeActive: () => false,
  getAllowlist: () => [],
}));

vi.mock("@/lib/security/apify-budget.server", async () => {
  const actual = await vi.importActual<
    typeof import("@/lib/security/apify-budget.server")
  >("@/lib/security/apify-budget.server");
  return {
    ...actual,
    assertApifyDailyBudgetAvailable: vi.fn(async () => undefined),
  };
});

vi.mock("@/lib/security/public-rate-limit.server", async () => {
  const actual = await vi.importActual<
    typeof import("@/lib/security/public-rate-limit.server")
  >("@/lib/security/public-rate-limit.server");
  return {
    ...actual,
    assertWithinPublicRateLimit: vi.fn(async () => undefined),
  };
});

vi.mock("@/lib/admin/alerts", () => ({
  evaluateAlertsForEvent: vi.fn(async () => undefined),
}));

vi.mock("@/lib/benchmark/reference-data.server", () => ({
  loadBenchmarkReferences: vi.fn(async () => ({
    benchmarks: [],
    metadata: { dataset_version: "test", source_count: 0 },
  })),
}));

vi.mock("@/lib/benchmark/engine", () => ({
  computeBenchmarkPositioning: vi.fn(() => ({
    tier: { code: "small", label: "Pequeno" },
    engagement: { actual: 0, median: 0, percentile: 50, vs_median_pct: 0 },
    format: { dominant: "reel", median_pct: 0, vs_median_pct: 0 },
    sample_size: 0,
  })),
}));

vi.mock("@/lib/analysis/normalize", () => ({
  normalizeProfile: vi.fn(() => state.normalizeProfileResult),
  computeContentSummary: vi.fn(() => ({
    posts_analyzed: 12,
    total_engagement: 0,
    average_engagement_rate: 0,
    median_likes: 0,
    median_comments: 0,
    dominant_format: "reel",
    format_breakdown: { reel: 12, image: 0, carousel: 0 },
  })),
  enrichPosts: vi.fn(() => ({
    posts: [],
    format_stats: {
      reel: { count: 12, engagement_rate: 0 },
      image: { count: 0, engagement_rate: 0 },
      carousel: { count: 0, engagement_rate: 0 },
    },
  })),
}));

vi.mock("@/lib/analysis/cost", async () => {
  const actual = await vi.importActual<typeof import("@/lib/analysis/cost")>(
    "@/lib/analysis/cost",
  );
  return {
    ...actual,
    hashRequestIp: vi.fn(async () => "ip-hash-fake"),
    estimateApifyCost: vi.fn(() => 0.01),
    parseUserAgentFamily: vi.fn(() => "test"),
  };
});

vi.mock("@/lib/analysis/comment-scraper.server", () => ({
  shouldRunCommentScraper: () => false,
  isValidInstagramPostUrl: () => false,
}));

vi.mock("@/lib/admin/execution-mode.server", () => ({
  getAnalysisExecutionMode: vi.fn(async () => "fresh"),
}));

vi.mock("@/lib/analysis/thumbnail-cache.server", () => ({
  prefetchThumbnailsAsBase64: vi.fn(async () => ({})),
}));

vi.mock("@/lib/market-signals/cache", () => ({
  readCachedSummary: () => null,
}));

vi.mock("@/lib/enrichment/types", () => ({
  ALL_ENRICHMENT_TYPES: [],
  ENRICHMENT_PRIORITY: {},
  buildInitialEnrichmentStatus: () => ({}),
}));

// ─── Real modules used by the gate (NOT mocked) ────────────────────────
// - @/lib/credits/credits.server
// - @/lib/credits/lead-reports.server
// - @/lib/leads/lead-cookie.server

// ─── Test setup ────────────────────────────────────────────────────────

process.env.SESSION_SECRET = "test-secret-at-least-16-chars-long";
process.env.INTERNAL_API_TOKEN = "internal-token-for-tests";

const LEAD_ID = "11111111-2222-3333-4444-555555555555";
const HANDLE = "frederico.m.carvalho";
const CACHE_KEY = `v1:${HANDLE}|`;

// Real cookie encoder (uses SESSION_SECRET set above).
let encodeLeadCookie: (leadId: string) => string;
let LEAD_COOKIE_NAME: string;
let postHandler: (ctx: { request: Request }) => Promise<Response>;
let credits: typeof import("@/lib/credits/credits.server");
let leadReports: typeof import("@/lib/credits/lead-reports.server");

beforeEach(async () => {
  // Reset all per-test state.
  state.ledger.length = 0;
  state.leadReports.length = 0;
  state.snapshot = null;
  state.snapshotIsFresh = false;
  state.apifyRowFactory = () => null;
  state.apifyError = null;
  state.apifyCallCount = 0;
  state.normalizeProfileResult = null;

  // Lazy imports so all vi.mock factories above are wired first.
  if (!postHandler) {
    const cookieMod = await import("@/lib/leads/lead-cookie.server");
    encodeLeadCookie = cookieMod.encodeLeadCookie;
    LEAD_COOKIE_NAME = cookieMod.LEAD_COOKIE_NAME;
    credits = await import("@/lib/credits/credits.server");
    leadReports = await import("@/lib/credits/lead-reports.server");
    const route = await import("@/routes/api/analyze-public-v1");
    // TanStack Route shape: Route.options.server.handlers.POST
    const handlers = (route.Route as unknown as {
      options: { server: { handlers: { POST: typeof postHandler } } };
    }).options.server.handlers;
    postHandler = handlers.POST;
  }
});

function buildRequest(opts: {
  withCookie?: string | null;
  withInternalToken?: boolean;
  body?: Record<string, unknown>;
} = {}): Request {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (opts.withCookie) {
    headers["cookie"] = `${LEAD_COOKIE_NAME}=${opts.withCookie}`;
  }
  if (opts.withInternalToken) {
    headers["authorization"] = `Bearer ${process.env.INTERNAL_API_TOKEN}`;
  }
  return new Request("https://test.local/api/analyze-public-v1", {
    method: "POST",
    headers,
    body: JSON.stringify(opts.body ?? { instagram_username: HANDLE }),
  });
}

function freshSnapshot(): NonNullable<typeof state.snapshot> {
  const now = new Date().toISOString();
  return {
    id: "snap-cached-1",
    cache_key: CACHE_KEY,
    instagram_username: HANDLE,
    competitor_usernames: [],
    normalized_payload: {
      profile: {
        username: HANDLE,
        display_name: "Frederico",
        followers_count: 1000,
        following_count: 100,
        posts_count: 50,
        is_business: false,
      },
      content_summary: {
        posts_analyzed: 12,
        total_engagement: 0,
        average_engagement_rate: 0,
        median_likes: 0,
        median_comments: 0,
        dominant_format: "reel",
        format_breakdown: { reel: 12, image: 0, carousel: 0 },
      },
      competitors: [],
    },
    provider: "apify",
    analysis_status: "ready",
    created_at: now,
    updated_at: now,
    expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  };
}

function fullProfileRow(opts: {
  postsCount?: number;
  latestPosts?: unknown[];
  isPrivate?: boolean;
  isProfessional?: boolean;
}): Record<string, unknown> {
  return {
    username: HANDLE,
    posts_count: opts.postsCount ?? 12,
    is_private: opts.isPrivate ?? false,
    private: opts.isPrivate ?? false,
    latestPosts: opts.latestPosts ?? [],
  };
}

function fakeNormalizedProfile(opts: {
  postsCount?: number;
  isProfessional?: boolean;
} = {}): Record<string, unknown> {
  return {
    username: HANDLE,
    display_name: "Frederico",
    followers_count: 1000,
    following_count: 100,
    posts_count: opts.postsCount ?? 12,
    is_business: opts.isProfessional ?? false,
  };
}

// ─── Scenarios ─────────────────────────────────────────────────────────

describe("analyze-public-v1 · Phase 2 credit gate contract", () => {
  it("1. sem cookie → ONBOARDING_REQUIRED e Apify NÃO é chamado", async () => {
    const res = await postHandler({ request: buildRequest() });
    expect(res.status).toBe(402);
    const body = (await res.json()) as { error_code: string };
    expect(body.error_code).toBe("ONBOARDING_REQUIRED");
    expect(state.apifyCallCount).toBe(0);
    // Nenhum ledger entry criado.
    expect(state.ledger.filter((r) => r.reason === "reserve")).toHaveLength(0);
  });

  it("2. lead com saldo 0 → INSUFFICIENT_CREDITS e Apify NÃO é chamado", async () => {
    await credits.grantInitialCredits(LEAD_ID);
    const r1 = await credits.reserveCredit({ leadId: LEAD_ID });
    await credits.confirmReservation({ leadId: LEAD_ID, reservationId: r1.reservationId });
    const r2 = await credits.reserveCredit({ leadId: LEAD_ID });
    await credits.confirmReservation({ leadId: LEAD_ID, reservationId: r2.reservationId });
    expect(await credits.getBalance(LEAD_ID)).toBe(0);

    const cookie = encodeLeadCookie(LEAD_ID);
    const res = await postHandler({ request: buildRequest({ withCookie: cookie }) });
    expect(res.status).toBe(402);
    const body = (await res.json()) as { error_code: string };
    expect(body.error_code).toBe("INSUFFICIENT_CREDITS");
    expect(state.apifyCallCount).toBe(0);
    expect(await credits.getBalance(LEAD_ID)).toBe(0);
  });

  it("3. cache hit JÁ associado ao lead → 0 créditos consumidos", async () => {
    await credits.grantInitialCredits(LEAD_ID);
    state.snapshot = freshSnapshot();
    state.snapshotIsFresh = true;
    await leadReports.upsertLeadReport({
      leadId: LEAD_ID,
      handle: HANDLE,
      cacheKey: CACHE_KEY,
    });
    const balanceBefore = await credits.getBalance(LEAD_ID);

    const cookie = encodeLeadCookie(LEAD_ID);
    const res = await postHandler({ request: buildRequest({ withCookie: cookie }) });
    expect(res.status).toBe(200);
    expect(state.apifyCallCount).toBe(0);
    expect(await credits.getBalance(LEAD_ID)).toBe(balanceBefore);
    // Sem reserve no ledger.
    expect(state.ledger.filter((r) => r.reason === "reserve")).toHaveLength(0);
  });

  it("4. cache hit NOVO para o lead → consome 1 crédito + cria associação", async () => {
    await credits.grantInitialCredits(LEAD_ID);
    state.snapshot = freshSnapshot();
    state.snapshotIsFresh = true;
    expect(await credits.getBalance(LEAD_ID)).toBe(2);

    const cookie = encodeLeadCookie(LEAD_ID);
    const res = await postHandler({ request: buildRequest({ withCookie: cookie }) });
    expect(res.status).toBe(200);
    expect(state.apifyCallCount).toBe(0);
    expect(await credits.getBalance(LEAD_ID)).toBe(1);
    // Reserva confirmada + associação criada.
    expect(state.ledger.filter((r) => r.reason === "reserve")).toHaveLength(1);
    expect(state.ledger.filter((r) => r.reason === "confirm")).toHaveLength(1);
    expect(state.leadReports).toHaveLength(1);
    expect(state.leadReports[0]).toMatchObject({
      lead_id: LEAD_ID,
      cache_key: CACHE_KEY,
    });
  });

  it("5. fresh success → consome/confirma 1 crédito + cria associação", async () => {
    await credits.grantInitialCredits(LEAD_ID);
    state.snapshot = null;
    state.apifyRowFactory = () =>
      fullProfileRow({
        postsCount: 12,
        latestPosts: Array.from({ length: 12 }, (_, i) => ({
          id: `p${i}`,
          shortcode: `s${i}`,
        })),
      });
    state.normalizeProfileResult = fakeNormalizedProfile({
      postsCount: 12,
      isProfessional: true,
    });

    const cookie = encodeLeadCookie(LEAD_ID);
    const res = await postHandler({ request: buildRequest({ withCookie: cookie }) });
    expect(res.status).toBe(200);
    expect(state.apifyCallCount).toBe(1);
    expect(await credits.getBalance(LEAD_ID)).toBe(1);
    expect(state.ledger.filter((r) => r.reason === "confirm")).toHaveLength(1);
    expect(state.leadReports).toHaveLength(1);
  });

  it("6. provider error (ApifyUpstreamError 500) → liberta reserva, saldo intacto", async () => {
    await credits.grantInitialCredits(LEAD_ID);
    const balanceBefore = await credits.getBalance(LEAD_ID);
    const { ApifyUpstreamError } = await import("@/lib/analysis/apify-client");
    state.apifyError = new ApifyUpstreamError(
      "boom",
      500,
      "apify_http_error",
    );

    const cookie = encodeLeadCookie(LEAD_ID);
    const res = await postHandler({ request: buildRequest({ withCookie: cookie }) });
    expect(res.status).toBe(502);
    const body = (await res.json()) as { error_code: string };
    expect(body.error_code).toBe("UPSTREAM_FAILED");
    expect(state.apifyCallCount).toBe(1);
    expect(await credits.getBalance(LEAD_ID)).toBe(balanceBefore);
    // Houve reserve seguida de release (delta +1).
    expect(state.ledger.filter((r) => r.reason === "reserve")).toHaveLength(1);
    expect(state.ledger.filter((r) => r.reason === "release")).toHaveLength(1);
    expect(state.leadReports).toHaveLength(0);
  });

  it("7. PROFILE_PERSONAL_NO_FEED → liberta reserva, saldo intacto", async () => {
    await credits.grantInitialCredits(LEAD_ID);
    const balanceBefore = await credits.getBalance(LEAD_ID);
    state.apifyRowFactory = () =>
      fullProfileRow({
        postsCount: 42,
        latestPosts: [], // sem posts → empty feed
        isPrivate: false,
        isProfessional: false,
      });
    state.normalizeProfileResult = fakeNormalizedProfile({
      postsCount: 42,
      isProfessional: false, // gate sobe → PERSONAL_NO_FEED
    });

    const cookie = encodeLeadCookie(LEAD_ID);
    const res = await postHandler({ request: buildRequest({ withCookie: cookie }) });
    expect(res.status).toBe(422);
    const body = (await res.json()) as { error_code: string };
    expect(body.error_code).toBe("PROFILE_PERSONAL_NO_FEED");
    expect(await credits.getBalance(LEAD_ID)).toBe(balanceBefore);
    expect(state.ledger.filter((r) => r.reason === "release")).toHaveLength(1);
    expect(state.leadReports).toHaveLength(0);
  });

  it("8. INTERNAL_API_TOKEN bypass → sem cookie e sem consumir crédito", async () => {
    state.apifyRowFactory = () =>
      fullProfileRow({
        postsCount: 12,
        latestPosts: Array.from({ length: 12 }, (_, i) => ({ id: `p${i}` })),
      });
    state.normalizeProfileResult = fakeNormalizedProfile({
      postsCount: 12,
      isProfessional: true,
    });

    const res = await postHandler({
      request: buildRequest({ withInternalToken: true }),
    });
    expect(res.status).toBe(200);
    expect(state.apifyCallCount).toBe(1);
    // Nenhuma entrada no ledger — bypass não toca em credit_ledger.
    expect(state.ledger).toHaveLength(0);
    // Nenhuma associação criada.
    expect(state.leadReports).toHaveLength(0);
  });
});
