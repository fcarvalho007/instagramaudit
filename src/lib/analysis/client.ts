/**
 * Browser-side client for the public analysis endpoint.
 * Always returns a PublicAnalysisResponse — network errors are mapped
 * into the failure shape so consumers can render a calm pt-PT state.
 */

import type { PublicAnalysisResponse } from "./types";

/**
 * In-flight guard: anula chamadas duplicadas resultantes de React
 * StrictMode / double mount. Defesa em profundidade — a invariante
 * "1 crédito por (lead, cache_key)" é garantida no servidor pelo índice
 * único parcial `uniq_credit_ledger_reserve_per_report`.
 */
const inflight = new Map<string, Promise<PublicAnalysisResponse>>();

export async function fetchPublicAnalysis(
  username: string,
  competitorUsernames: string[] = [],
  options: { window?: "baseline" | "30d" | "90d" } = {},
): Promise<PublicAnalysisResponse> {
  const cleaned = username.trim().replace(/^@/, "");
  const competitors = competitorUsernames
    .map((c) => c.trim().replace(/^@/, ""))
    .filter((c) => c.length > 0)
    .slice(0, 2);

  const windowKind = options.window ?? "baseline";
  const key = `${cleaned.toLowerCase()}|${competitors.map((c) => c.toLowerCase()).join(",")}|${windowKind}`;
  const existing = inflight.get(key);
  if (existing) return existing;

  const promise = (async (): Promise<PublicAnalysisResponse> => {
    try {
    const res = await fetch("/api/analyze-public-v1", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      // Explicit `include` so the `lead_session` cookie is replayed even
      // when the app is loaded inside a third-party iframe (Lovable
      // preview embedded in lovable.dev). Default `same-origin` would be
      // enough on a top-level page but is dropped under cookie
      // partitioning in embed contexts.
      credentials: "include",
      body: JSON.stringify({
        instagram_username: cleaned,
        competitor_usernames: competitors,
        window: windowKind,
      }),
    });

    const json = (await res.json().catch(() => null)) as
      | PublicAnalysisResponse
      | null;

    if (json && typeof json === "object" && "success" in json) {
      return json;
    }

    return {
      success: false,
      error_code: "UPSTREAM_FAILED",
      message:
        "Não foi possível analisar este perfil neste momento. Tentar novamente dentro de instantes.",
    };
    } catch {
    return {
      success: false,
      error_code: "NETWORK_ERROR",
      message: "Falha de ligação. Tentar novamente.",
    };
    }
  })();

  inflight.set(key, promise);
  try {
    return await promise;
  } finally {
    inflight.delete(key);
  }
}
