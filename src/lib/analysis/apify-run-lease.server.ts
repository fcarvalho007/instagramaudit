/**
 * Global Apify concurrency lease (server-only).
 *
 * The in-isolate semaphore in `apify-client.ts` cannot bind concurrency in a
 * serverless deployment: every worker instance keeps its own counter. This
 * module adds a Postgres-backed lease so the *effective* limit is global.
 *
 * Contract:
 *  - acquisition is atomic (single statement in `acquire_apify_run_lease`);
 *  - at most `APIFY_MAX_CONCURRENT_RUNS` (default 4) leases alive at once;
 *  - the lease is always released, on success and on error;
 *  - abandoned leases expire after `APIFY_RUN_LEASE_TTL_SECONDS` (default 180s)
 *    and are reaped by the next acquisition attempt;
 *  - callers that cannot acquire WAIT (poll with backoff) instead of starting
 *    a run, up to `APIFY_RUN_LEASE_WAIT_MS` (default 45s);
 *  - if Postgres itself is unreachable we fail OPEN (log + proceed) so a DB
 *    hiccup never takes the whole product down. The local semaphore still
 *    applies in that case.
 */

import { supabaseAdmin } from "@/integrations/supabase/client.server";

const LOG = "[apify-lease]";

function readInt(name: string, fallback: number, min: number, max: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, n));
}

export function getApifyMaxConcurrentRuns(): number {
  return readInt("APIFY_MAX_CONCURRENT_RUNS", 4, 1, 5);
}

export function getApifyLeaseTtlSeconds(): number {
  return readInt("APIFY_RUN_LEASE_TTL_SECONDS", 180, 30, 900);
}

export function getApifyLeaseWaitMs(): number {
  return readInt("APIFY_RUN_LEASE_WAIT_MS", 45_000, 0, 120_000);
}

export class ApifyConcurrencyBusyError extends Error {
  constructor(waitedMs: number, max: number) {
    super(
      `No Apify run slot available after ${waitedMs}ms (global limit ${max})`,
    );
    this.name = "ApifyConcurrencyBusyError";
  }
}

/** Result of a lease attempt. `degraded` means the DB gate was unavailable. */
export interface LeaseHandle {
  key: string | null;
  degraded: boolean;
}

export async function tryAcquireApifyLease(
  key: string,
  context?: string,
): Promise<"acquired" | "busy" | "degraded"> {
  try {
    const { data, error } = await (supabaseAdmin as any).rpc(
      "acquire_apify_run_lease",
      {
        p_lease_key: key,
        p_max: getApifyMaxConcurrentRuns(),
        p_ttl_seconds: getApifyLeaseTtlSeconds(),
      },
    );
    if (error) {
      console.warn(`${LOG} acquire failed (fail-open)`, context, error.message);
      return "degraded";
    }
    return data === true ? "acquired" : "busy";
  } catch (err) {
    console.warn(`${LOG} acquire threw (fail-open)`, context, err);
    return "degraded";
  }
}

export async function releaseApifyLease(key: string): Promise<void> {
  try {
    const { error } = await (supabaseAdmin as any).rpc(
      "release_apify_run_lease",
      { p_lease_key: key },
    );
    if (error) console.warn(`${LOG} release failed`, key, error.message);
  } catch (err) {
    console.warn(`${LOG} release threw`, key, err);
  }
}

function newLeaseKey(context?: string): string {
  const rand =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return context ? `${context}:${rand}` : rand;
}

/**
 * Run `fn` while holding a global Apify run slot.
 * Waits (with backoff) for a slot; throws `ApifyConcurrencyBusyError` when the
 * wait deadline elapses without one.
 */
export async function withApifyRunLease<T>(
  fn: () => Promise<T>,
  context?: string,
): Promise<T> {
  const key = newLeaseKey(context);
  const deadline = Date.now() + getApifyLeaseWaitMs();
  let held = false;

  for (;;) {
    const outcome = await tryAcquireApifyLease(key, context);
    if (outcome === "acquired") {
      held = true;
      break;
    }
    if (outcome === "degraded") break; // fail-open: proceed without the lease
    if (Date.now() >= deadline) {
      throw new ApifyConcurrencyBusyError(
        getApifyLeaseWaitMs(),
        getApifyMaxConcurrentRuns(),
      );
    }
    await new Promise((r) => setTimeout(r, 1500));
  }

  try {
    return await fn();
  } finally {
    if (held) await releaseApifyLease(key);
  }
}
