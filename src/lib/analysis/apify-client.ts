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

export class ApifyConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ApifyConfigError";
  }
}

export class ApifyUpstreamError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "ApifyUpstreamError";
    this.status = status;
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
    throw new ApifyConfigError("APIFY_TOKEN is not configured");
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
      );
    }

    const data = (await res.json()) as unknown;
    if (!Array.isArray(data)) {
      throw new ApifyUpstreamError(
        `Apify actor ${actorId} returned non-array payload`,
        502,
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
      );
    }
    throw new ApifyUpstreamError(
      `Apify actor ${actorId} fetch failed: ${(err as Error).message}`,
      502,
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
export async function runActorWithMetadata<T = unknown>(
  actorId: string,
  input: Record<string, unknown>,
  options: RunActorOptions = {},
): Promise<RunActorWithMetadataResult<T>> {
  const token = process.env.APIFY_TOKEN;
  if (!token) {
    throw new ApifyConfigError("APIFY_TOKEN is not configured");
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
    );
    (err as ApifyUpstreamError & { runId?: string }).runId = runId;
    (err as ApifyUpstreamError & { actualCostUsd?: number }).actualCostUsd =
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
