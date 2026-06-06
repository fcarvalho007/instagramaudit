import { createServerFn } from "@tanstack/react-start";

/**
 * Entitlement do relatório completo para o lead da sessão actual (cookie
 * `lead_session`). Fail-closed: qualquer erro devolve `premiumUnlocked: false`
 * para nunca conceder premium por engano nem quebrar o render do relatório.
 */
export const getMyReportEntitlement = createServerFn({ method: "GET" }).handler(
  async () => {
    try {
      const { getLeadFromCookie } = await import(
        "@/lib/leads/lead-cookie.server"
      );
      const leadId = getLeadFromCookie();
      if (!leadId) {
        return { hasLead: false as const, premiumUnlocked: false };
      }

      const { hasEntitlement } = await import("./entitlements.server");
      const premium = await hasEntitlement(leadId, "report_full_9");
      return { hasLead: true as const, premiumUnlocked: premium };
    } catch {
      return { hasLead: false as const, premiumUnlocked: false };
    }
  },
);