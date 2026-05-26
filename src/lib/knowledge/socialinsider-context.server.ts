/**
 * Server-only reader for the Socialinsider Instagram reference rows in
 * `knowledge_benchmarks`. Returns a normalized per-format object so the
 * public report can show an honest external comparison without baking
 * values into i18n strings.
 */

import { supabaseAdmin } from "@/integrations/supabase/client.server";
import type {
  SocialinsiderFormatRef,
  SocialinsiderInstagramContext,
} from "./socialinsider-context";

export type { SocialinsiderFormatRef, SocialinsiderInstagramContext };

// (Types re-exported above from the client-safe module.)

type Row = {
  format: string;
  posts_per_month: number | string | null;
  engagement_pct: number | string | null;
  valid_from: string;
  valid_to: string | null;
  knowledge_sources: { name: string | null; url: string | null } | null;
};

const CACHE_TTL_MS = 60_000;
let cache: { at: number; value: SocialinsiderInstagramContext } | null = null;

function toFormatKey(
  raw: string,
): keyof SocialinsiderInstagramContext | null {
  const v = raw.toLowerCase();
  if (v.startsWith("reel")) return "reel";
  if (v.startsWith("carou") || v.startsWith("carro")) return "carousel";
  if (v.startsWith("imag") || v.startsWith("image")) return "image";
  return null;
}

function toNumber(v: number | string | null): number | null {
  if (v === null || v === undefined) return null;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

export async function loadSocialinsiderInstagramContext(): Promise<SocialinsiderInstagramContext> {
  if (cache && Date.now() - cache.at < CACHE_TTL_MS) {
    return cache.value;
  }

  const empty: SocialinsiderInstagramContext = {
    reel: null,
    carousel: null,
    image: null,
  };

  try {
    const today = new Date().toISOString().slice(0, 10);
    const { data, error } = await supabaseAdmin
      .from("knowledge_benchmarks")
      .select(
        "format, posts_per_month, engagement_pct, valid_from, valid_to, knowledge_sources(name, url)",
      )
      .eq("platform", "instagram")
      .eq("tier", "overall")
      .or(`valid_to.is.null,valid_to.gte.${today}`)
      .order("valid_from", { ascending: false });

    if (error) {
      console.error("[socialinsider-context] query failed:", error.message);
      return empty;
    }

    const rows = (data ?? []) as Row[];
    const filtered = rows.filter(
      (r) => (r.knowledge_sources?.name ?? "").toLowerCase().includes("socialinsider"),
    );

    // Latest row per format (already ordered by valid_from desc).
    const seen = new Set<keyof SocialinsiderInstagramContext>();
    const out: SocialinsiderInstagramContext = { ...empty };
    for (const r of filtered) {
      const key = toFormatKey(r.format);
      if (!key || seen.has(key)) continue;
      seen.add(key);
      out[key] = {
        postsPerMonth: toNumber(r.posts_per_month),
        engagementPct: toNumber(r.engagement_pct),
        sourceName: "Socialinsider",
        sourceUrl: r.knowledge_sources?.url ?? null,
        dataRange: { from: r.valid_from, to: r.valid_to },
      };
    }

    cache = { at: Date.now(), value: out };
    return out;
  } catch (e) {
    console.error("[socialinsider-context] unexpected:", e);
    return empty;
  }
}

/** Test-only: reset the in-memory cache. */
export function __resetSocialinsiderCache(): void {
  cache = null;
}