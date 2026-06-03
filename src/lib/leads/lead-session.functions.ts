import { createServerFn } from "@tanstack/react-start";

/**
 * Lightweight check exposing whether the current request carries a valid
 * (HMAC-verified) `lead_session` cookie. Used by the focused checkout to
 * gate render before any payment-related server fn is called.
 *
 * No PII is returned — only a boolean — and no DB call is made.
 */
export const getLeadSessionStatus = createServerFn({ method: "GET" }).handler(
  async () => {
    try {
      const { getLeadFromCookie } = await import("./lead-cookie.server");
      return { hasLead: getLeadFromCookie() !== null };
    } catch {
      // Missing/invalid SESSION_SECRET or other config issue: treat as
      // "no session" so the UI shows the focused fallback instead of
      // crashing the route.
      return { hasLead: false };
    }
  },
);