import { createServerFn } from "@tanstack/react-start";

/**
 * Lightweight check exposing whether the current request carries a valid
 * `lead_session` cookie AND the decoded lead still exists in `leads`.
 * Used by the focused checkout to gate render before any payment-related
 * server fn is called.
 *
 * No PII is returned — only a boolean — and no DB call is made.
 */
export const getLeadSessionStatus = createServerFn({ method: "GET" }).handler(
  async () => {
    try {
      const { getLeadFromCookie } = await import("./lead-cookie.server");
      const leadId = getLeadFromCookie();
      if (!leadId) return { hasLead: false };

      const { supabaseAdmin } = await import(
        "@/integrations/supabase/client.server"
      );
      const { data } = await supabaseAdmin
        .from("leads")
        .select("id")
        .eq("id", leadId)
        .maybeSingle();
      return { hasLead: Boolean(data) };
    } catch {
      // Missing/invalid SESSION_SECRET or other config issue: treat as
      // "no session" so the UI shows the focused fallback instead of
      // crashing the route.
      return { hasLead: false };
    }
  },
);