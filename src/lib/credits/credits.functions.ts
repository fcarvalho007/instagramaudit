import { createServerFn } from "@tanstack/react-start";

/**
 * Saldo de créditos do lead da sessão atual (via cookie `lead_session`).
 *
 * Devolve `{ hasLead: false, balance: 0 }` quando não há cookie válido —
 * o caller (sidebar paid state) só renderiza o indicador quando o
 * relatório já está desbloqueado, por isso nunca expõe o saldo a anónimos.
 */
export const getMyCreditBalance = createServerFn({ method: "GET" }).handler(
  async () => {
    try {
      const { getLeadFromCookie } = await import(
        "@/lib/leads/lead-cookie.server"
      );
      const leadId = getLeadFromCookie();
      if (!leadId) return { hasLead: false as const, balance: 0 };

      const { getBalance } = await import("./credits.server");
      const balance = await getBalance(leadId);
      return { hasLead: true as const, balance };
    } catch {
      return { hasLead: false as const, balance: 0 };
    }
  },
);