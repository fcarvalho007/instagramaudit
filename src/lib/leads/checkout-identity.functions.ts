import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import type { CheckoutIdentitySource } from "./resolve-checkout-lead.server";

const inputSchema = z
  .object({
    report_cache_key: z.string().trim().min(1).max(200).optional(),
  })
  .strict();

export interface CheckoutIdentityStatus {
  identity: CheckoutIdentitySource;
}

/**
 * Estado de identidade específico do checkout de relatório (Ronda 11B.1).
 *
 * Distingue explicitamente sessão global de sessão scoped ao relatório —
 * nunca devolve `hasLead: true` como se o visitante estivesse autenticado
 * globalmente. Não devolve email, lead id nem qualquer PII.
 *
 * `getLeadSessionStatus` mantém-se intacta para os restantes checkouts
 * (packs, diagnóstico 97€), que continuam a exigir identidade global.
 */
export const getCheckoutIdentityStatus = createServerFn({ method: "GET" })
  .inputValidator((raw: unknown) => inputSchema.parse(raw ?? {}))
  .handler(async ({ data }): Promise<CheckoutIdentityStatus> => {
    try {
      const { resolveCheckoutIdentity } = await import(
        "./resolve-checkout-lead.server"
      );
      const identity = await resolveCheckoutIdentity({
        reportRef: data.report_cache_key ?? null,
      });
      return { identity: identity.source };
    } catch {
      return { identity: "none" };
    }
  });
