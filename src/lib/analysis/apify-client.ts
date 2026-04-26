/**
 * Apify client — server-only.
 * Calls actors via the run-sync-get-dataset-items endpoint, which blocks
 * until the actor finishes and returns dataset rows directly. Avoids the
 * runs/datasets two-step polling.
 *
 * Token is read from process.env.APIFY_TOKEN. Never expose to the browser.
 */

const APIFY_BASE = "https://api.apify.com/v2/acts";
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
