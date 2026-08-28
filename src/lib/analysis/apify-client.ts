/**
 * Apify client — server-only.
 * Two flows:
 * - `runActor`  : legacy sync wrapper around `run-sync-get-dataset-items`.
 *                 Returns dataset rows only — no runId, no actual cost.
 * - `runActorWithMetadata` : async run + poll + dataset fetch + run detail
 *                 fetch. Returns dataset rows AND `runId` AND `actualCostUsd`
 *                 read from the canonical Apify run record. Slightly slower
 *                 (~200–600ms extra) but gives us the real ledger entry.
 *
 * Token is read from process.env.APIFY_TOKEN. Never expose to the browser.
 */

const APIFY_BASE = "https://api.apify.com/v2/acts";
const APIFY_RUNS_BASE = "https://api.apify.com/v2/actor-runs";
const DEFAULT_TIMEOUT_MS = 60_000;

/**
 * Semantic error codes for admin-facing diagnostics.
 * These surface all the way to the admin UI toast and "Última tentativa" row.
 */
export type ApifySemanticCode =
  | "apify_token_missing"
  | "apify_token_invalid"
  | "apify_billing_blocked"
  | "apify_actor_failed"
  | "apify_dataset_empty"
  | "apify_timeout"
  | "apify_http_error"
  | "apify_parse_failed"
  | "apify_network_error";

/**
 * Apify replies 403 with `platform-feature-disabled` / "Too many outstanding
 * invoices" when the account is blocked for billing reasons. This is not a
 * transient upstream failure — it needs an operator action on the Apify side,
 * so it gets its own semantic code and its own user-facing message.
 */
export function classifyApifyHttpError(
  status: number,
  body: string,
): ApifySemanticCode {
  if (status === 401) return "apify_token_invalid";
  if (status === 403) {
    const lowered = body.toLowerCase();
    if (
      lowered.includes("platform-feature-disabled") ||
      lowered.includes("outstanding invoices") ||
      lowered.includes("payment") ||
      lowered.includes("invoice")
    ) {
      return "apify_billing_blocked";
    }
  }
  return "apify_http_error";
}


export class ApifyConfigError extends Error {
  code: ApifySemanticCode;
  constructor(message: string, code: ApifySemanticCode = "apify_token_missing") {
    super(message);
    this.name = "ApifyConfigError";
    this.code = code;
  }
}

export class ApifyUpstreamError extends Error {
  status: number;
  code: ApifySemanticCode;
  runId?: string;
  actualCostUsd?: number;
  constructor(
    message: string,
    status: number,
    code?: ApifySemanticCode,
  ) {
    super(message);
    this.name = "ApifyUpstreamError";
    this.status = status;
    this.code = code ?? (status === 504 ? "apify_timeout" : "apify_http_error");
  }
}

interface RunActorOptions {
  timeoutMs?: number;
  // Apify's per-actor timeout (seconds) for the synchronous run.
  apifyTimeoutSecs?: number;
  memoryMbytes?: number;
  // Hard cap on dataset items returned by the actor. Cost guard — Apify
  // stops the run as soon as this many items are produced.
  maxItems?: number;
  // Hard cap on the total USD charge for this run. Cost guard — Apify
  // aborts the run when the projected charge would exceed this value.
  maxTotalChargeUsd?: number;
}

export async function runActor<T = unknown>(
  actorId: string,
  input: Record<string, unknown>,
  options: RunActorOptions = {},
): Promise<T[]> {
  const token = process.env.APIFY_TOKEN;
  if (!token) {
    throw new ApifyConfigError("APIFY_TOKEN is not configured", "apify_token_missing");
  }

  const {
    timeoutMs = DEFAULT_TIMEOUT_MS,
    apifyTimeoutSecs = 50,
    memoryMbytes = 1024,
    maxItems,
    maxTotalChargeUsd,
  } = options;

  // Actor IDs may use the form "user/name" — encode the slash safely.
  const encodedActor = actorId.replace("/", "~");
  const url = new URL(
    `${APIFY_BASE}/${encodedActor}/run-sync-get-dataset-items`,
  );
  url.searchParams.set("timeout", String(apifyTimeoutSecs));
  url.searchParams.set("memory", String(memoryMbytes));
  url.searchParams.set("format", "json");
  if (typeof maxItems === "number") {
    url.searchParams.set("maxItems", String(maxItems));
  }
  if (typeof maxTotalChargeUsd === "number") {
    url.searchParams.set("maxTotalChargeUsd", String(maxTotalChargeUsd));
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url.toString(), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // Pass the token via Authorization header instead of query string —
        // avoids leaking the secret into worker logs, Apify request logs,
        // and any intermediate proxies/traces.
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(input),
      signal: controller.signal,
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new ApifyUpstreamError(
        `Apify actor ${actorId} returned ${res.status}: ${text.slice(0, 200)}`,
        res.status,
        classifyApifyHttpError(res.status, text),
      );
    }


    const data = (await res.json()) as unknown;
    if (!Array.isArray(data)) {
      throw new ApifyUpstreamError(
        `Apify actor ${actorId} returned non-array payload`,
        502,
        "apify_parse_failed",
      );
    }
    return data as T[];
  } catch (err) {
    if (err instanceof ApifyUpstreamError || err instanceof ApifyConfigError) {
      throw err;
    }
    if (err instanceof Error && err.name === "AbortError") {
      throw new ApifyUpstreamError(
        `Apify actor ${actorId} timed out after ${timeoutMs}ms`,
        504,
        "apify_timeout",
      );
    }
    throw new ApifyUpstreamError(
      `Apify actor ${actorId} fetch failed: ${(err as Error).message}`,
      502,
      "apify_network_error",
    );
  } finally {
    clearTimeout(timer);
  }
}

// ---------------------------------------------------------------------------
// Async run + metadata flow
// ---------------------------------------------------------------------------

interface ApifyRun {
  id: string;
  status: string;
  defaultDatasetId?: string;
  usageTotalUsd?: number;
  stats?: { runTimeSecs?: number };
}

const TERMINAL_STATUSES = new Set([
  "SUCCEEDED",
  "FAILED",
  "TIMED-OUT",
  "ABORTED",
]);

export interface RunActorWithMetadataResult<T> {
  items: T[];
  runId: string;
  actualCostUsd: number | null;
  status: string;
}

async function apifyFetch(
  url: string,
  init: RequestInit,
  token: string,
  timeoutMs: number,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, {
      ...init,
      headers: {
        ...(init.headers ?? {}),
        Authorization: `Bearer ${token}`,
      },
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Start an actor run asynchronously and poll until it reaches a terminal
 * status. Then fetch the dataset items and the final run record (for
 * `usageTotalUsd`). Returns the dataset rows plus run metadata.
 *
 * Throws ApifyUpstreamError if the run did not succeed. The thrown error
 * carries `.runId` so the caller can still log the partial run.
 */
/**
 * Local concurrency guard for the Apify Free plan (max 5 concurrent Actor
 * runs). We keep one slot of headroom (4) for admin/manual runs. This is an
 * in-isolate semaphore — best effort, but it stops the common case where a
 * burst of requests hitting the same worker fans out into parallel runs.
 */
const APIFY_MAX_CONCURRENT_RUNS = clampConcurrency(
  process.env.APIFY_MAX_CONCURRENT_RUNS,
);
let apifyRunsInFlight = 0;
const apifyRunWaitQueue: Array<() => void> = [];

function clampConcurrency(raw: string | undefined): number {
  const n = raw ? parseInt(raw, 10) : NaN;
  if (Number.isNaN(n)) return 4;
  return Math.max(1, Math.min(5, n));
}

async function acquireApifyRunSlot(): Promise<void> {
  if (apifyRunsInFlight < APIFY_MAX_CONCURRENT_RUNS) {
    apifyRunsInFlight++;
    return;
  }
  await new Promise<void>((resolve) => apifyRunWaitQueue.push(resolve));
  apifyRunsInFlight++;
}

function releaseApifyRunSlot(): void {
  apifyRunsInFlight = Math.max(0, apifyRunsInFlight - 1);
  const next = apifyRunWaitQueue.shift();
  if (next) next();
}

export async function runActorWithMetadata<T = unknown>(
  actorId: string,
  input: Record<string, unknown>,
  options: RunActorOptions = {},
): Promise<RunActorWithMetadataResult<T>> {
  await acquireApifyRunSlot();
  try {
    return await runActorWithMetadataInner<T>(actorId, input, options);
  } finally {
    releaseApifyRunSlot();
  }
}

async function runActorWithMetadataInner<T = unknown>(
  actorId: string,
  input: Record<string, unknown>,
  options: RunActorOptions = {},
): Promise<RunActorWithMetadataResult<T>> {
  const token = process.env.APIFY_TOKEN;
  if (!token) {
    throw new ApifyConfigError("APIFY_TOKEN is not configured", "apify_token_missing");
  }

  const {
    timeoutMs = DEFAULT_TIMEOUT_MS,
    apifyTimeoutSecs = 50,
    memoryMbytes = 1024,
    maxItems,
    maxTotalChargeUsd,
  } = options;

  const encodedActor = actorId.replace("/", "~");
  const startUrl = new URL(`${APIFY_BASE}/${encodedActor}/runs`);
  startUrl.searchParams.set("timeout", String(apifyTimeoutSecs));
  startUrl.searchParams.set("memory", String(memoryMbytes));
  if (typeof maxItems === "number") {
    startUrl.searchParams.set("maxItems", String(maxItems));
  }
  if (typeof maxTotalChargeUsd === "number") {
    startUrl.searchParams.set(
      "maxTotalChargeUsd",
      String(maxTotalChargeUsd),
    );
  }

  // 1) Start the run.
  const startedAt = Date.now();
  const startRes = await apifyFetch(
    startUrl.toString(),
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    },
    token,
    10_000,
  );

  if (!startRes.ok) {
    const text = await startRes.text().catch(() => "");
    throw new ApifyUpstreamError(
      `Apify actor ${actorId} start returned ${startRes.status}: ${text.slice(0, 200)}`,
      startRes.status,
      classifyApifyHttpError(startRes.status, text),
    );
  }


  const startBody = (await startRes.json()) as { data?: ApifyRun };
  const runId = startBody.data?.id;
  if (!runId) {
    throw new ApifyUpstreamError(
      `Apify actor ${actorId} start returned no run id`,
      502,
    );
  }

  // 2) Poll until terminal status.
  let run: ApifyRun = startBody.data!;
  const pollDeadline = startedAt + timeoutMs;
  while (!TERMINAL_STATUSES.has(run.status)) {
    if (Date.now() > pollDeadline) {
      throw new ApifyUpstreamError(
        `Apify run ${runId} polling timed out after ${timeoutMs}ms`,
        504,
        "apify_timeout",
      );
    }
    await new Promise((r) => setTimeout(r, 1500));
    const pollRes = await apifyFetch(
      `${APIFY_RUNS_BASE}/${runId}`,
      { method: "GET" },
      token,
      10_000,
    );
    if (!pollRes.ok) {
      const text = await pollRes.text().catch(() => "");
      throw new ApifyUpstreamError(
        `Apify run ${runId} poll returned ${pollRes.status}: ${text.slice(0, 200)}`,
        pollRes.status,
      );
    }
    const pollBody = (await pollRes.json()) as { data?: ApifyRun };
    if (pollBody.data) run = pollBody.data;
  }

  if (run.status !== "SUCCEEDED") {
    const err = new ApifyUpstreamError(
      `Apify run ${runId} ended with status ${run.status}`,
      502,
      run.status === "TIMED-OUT" ? "apify_timeout" : "apify_actor_failed",
    );
    err.runId = runId;
    err.actualCostUsd =
      typeof run.usageTotalUsd === "number" ? run.usageTotalUsd : undefined;
    throw err;
  }

  // 3) Fetch dataset items.
  const datasetUrl = new URL(`${APIFY_RUNS_BASE}/${runId}/dataset/items`);
  datasetUrl.searchParams.set("format", "json");
  if (typeof maxItems === "number") {
    datasetUrl.searchParams.set("limit", String(maxItems));
  }
  const datasetRes = await apifyFetch(
    datasetUrl.toString(),
    { method: "GET" },
    token,
    15_000,
  );
  if (!datasetRes.ok) {
    const text = await datasetRes.text().catch(() => "");
    throw new ApifyUpstreamError(
      `Apify run ${runId} dataset fetch returned ${datasetRes.status}: ${text.slice(0, 200)}`,
      datasetRes.status,
    );
  }
  const datasetData = (await datasetRes.json()) as unknown;
  if (!Array.isArray(datasetData)) {
    throw new ApifyUpstreamError(
      `Apify run ${runId} dataset returned non-array payload`,
      502,
      "apify_parse_failed",
    );
  }

  // 4) Fetch final run details for the canonical actual cost. The poll loop
  //    above may have stopped on the first SUCCEEDED transition before usage
  //    was finalised, so re-fetch once for the authoritative number.
  let actualCostUsd: number | null =
    typeof run.usageTotalUsd === "number" ? run.usageTotalUsd : null;
  try {
    const detailsRes = await apifyFetch(
      `${APIFY_RUNS_BASE}/${runId}`,
      { method: "GET" },
      token,
      10_000,
    );
    if (detailsRes.ok) {
      const detailsBody = (await detailsRes.json()) as { data?: ApifyRun };
      if (typeof detailsBody.data?.usageTotalUsd === "number") {
        actualCostUsd = detailsBody.data.usageTotalUsd;
      }
    }
  } catch {
    // Best-effort: keep whatever we already had.
  }

  return {
    items: datasetData as T[],
    runId,
    actualCostUsd,
    status: run.status,
  };
}
