/**
 * Server-only HTTP transport for the Brevo connector gateway.
 *
 * Pure transport: no domain logic, no list resolution, no attribute
 * cleaning. Adds the gateway URL, auth headers, and an 8s abort
 * timeout. Domain modules (e.g. ./contacts.server) compose on top.
 */

const GATEWAY_URL = "https://connector-gateway.lovable.dev/brevo";
const TIMEOUT_MS = 8_000;

export type BrevoFetchResult =
  | {
      ok: true;
      status: number;
      bodyText: string;
      latencyMs: number;
    }
  | {
      ok: false;
      reason: string;
      status?: number;
      latencyMs: number;
    };

export interface BrevoFetchInit {
  method?: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
  body?: unknown;
  /** Override the default 8s timeout. */
  timeoutMs?: number;
}

/**
 * Low-level call into the Brevo gateway. Never throws.
 * Returns the raw text body so callers can choose to JSON.parse or not.
 */
export async function brevoFetch(
  path: string,
  init: BrevoFetchInit = {},
): Promise<BrevoFetchResult> {
  const startedAt = Date.now();

  const lovableKey = process.env.LOVABLE_API_KEY?.trim();
  if (!lovableKey) {
    return {
      ok: false,
      reason: "LOVABLE_API_KEY_MISSING",
      latencyMs: Date.now() - startedAt,
    };
  }

  const brevoKey = process.env.BREVO_API_KEY?.trim();
  if (!brevoKey) {
    return {
      ok: false,
      reason: "BREVO_API_KEY_MISSING",
      latencyMs: Date.now() - startedAt,
    };
  }

  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    init.timeoutMs ?? TIMEOUT_MS,
  );

  try {
    // The Lovable Brevo gateway strips the upstream `/v3` prefix automatically.
    // Calling `/v3/contacts` returns 404 `Invalid route`. Normalize defensively
    // so domain modules can keep authoring paths that mirror Brevo's public API.
    const normalized = path.replace(/^\/?v3\//, "/");
    const withSlash = normalized.startsWith("/") ? normalized : `/${normalized}`;
    const url = `${GATEWAY_URL}${withSlash}`;
    const res = await fetch(url, {
      method: init.method ?? "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${lovableKey}`,
        "X-Connection-Api-Key": brevoKey,
      },
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
      signal: controller.signal,
    });

    let bodyText = "";
    if (res.status !== 204) {
      try {
        bodyText = await res.text();
      } catch {
        // ignore
      }
    }

    if (!res.ok) {
      return {
        ok: false,
        reason: `BREVO_${res.status}:${bodyText.slice(0, 200)}`,
        status: res.status,
        latencyMs: Date.now() - startedAt,
      };
    }

    return {
      ok: true,
      status: res.status,
      bodyText,
      latencyMs: Date.now() - startedAt,
    };
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      return {
        ok: false,
        reason: "BREVO_TIMEOUT",
        latencyMs: Date.now() - startedAt,
      };
    }
    return {
      ok: false,
      reason: `BREVO_NETWORK:${err instanceof Error ? err.message : "unknown"}`,
      latencyMs: Date.now() - startedAt,
    };
  } finally {
    clearTimeout(timeout);
  }
}