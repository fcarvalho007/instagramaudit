/**
 * Partial public reading for profiles Instagram hides from logged-out
 * readers. Public (no session), so the handler verifies the caller: it only
 * answers for handles that our own analysis already classified as
 * PROFILE_RESTRICTED in the last 24h — it can never be used as an open proxy.
 */

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import type { PartialProfile } from "./public-profile-meta";

export interface RestrictedProfilePreviewResult {
  profile: PartialProfile | null;
  verifiedAt: string;
  source: "fresh" | "stored";
}

const InputSchema = z.object({
  handle: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9._]{1,30}$/),
});

export const getRestrictedProfilePreview = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => InputSchema.parse(data))
  .handler(async ({ data }): Promise<RestrictedProfilePreviewResult | null> => {
    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { data: event } = await supabaseAdmin
        .from("analysis_events")
        .select("created_at, data_source")
        .eq("handle", data.handle)
        .eq("network", "instagram")
        .eq("error_code", "PROFILE_RESTRICTED")
        .gte("created_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (!event) return null;

      const { fetchPublicProfileMeta } = await import("./public-profile-meta.server");
      return {
        profile: await fetchPublicProfileMeta(data.handle),
        verifiedAt: event.created_at,
        source: event.data_source === "fresh" ? "fresh" : "stored",
      };
    } catch (err) {
      console.warn("[restricted-profile] preview failed", err);
      return null;
    }
  });
