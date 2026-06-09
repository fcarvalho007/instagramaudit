import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

/**
 * Entitlement Pro para o lead da sessão actual (cookie `lead_session`).
 *
 * Considera premium se:
 *   (a) lead tem `report_full_9` entitlement (compra avulsa, booleano global), OU
 *   (b) lead já consumiu um unlock de pack para este `snapshotId` específico.
 *
 * Devolve também o saldo de unlocks restantes do pack para a UI poder
 * oferecer "Usar 1 dos teus relatórios Pro" sem consumir automaticamente.
 *
 * Fail-closed: qualquer erro devolve `premiumUnlocked: false`.
 */
const entitlementInput = z
  .object({
    snapshotId: z.string().trim().min(1).max(80).optional(),
  })
  .optional();

export const getMyReportEntitlement = createServerFn({ method: "GET" })
  .inputValidator((raw: unknown) => entitlementInput.parse(raw))
  .handler(async ({ data }) => {
    try {
      const { getLeadFromCookie } = await import(
        "@/lib/leads/lead-cookie.server"
      );
      const leadId = getLeadFromCookie();
      if (!leadId) {
        return {
          hasLead: false as const,
          premiumUnlocked: false,
          unlockSource: null,
          packBalance: 0,
        };
      }

      const { hasEntitlement } = await import("./entitlements.server");
      const {
        getReportUnlocksBalance,
        hasUnlockForCacheKey,
      } = await import("./report-unlocks.server");

      const hasGlobal = await hasEntitlement(leadId, "report_full_9");

      let unlockedByPack = false;
      if (!hasGlobal && data?.snapshotId) {
        unlockedByPack = await hasUnlockForCacheKey({
          leadId,
          reportCacheKey: data.snapshotId,
        });
      }

      const packBalance = await getReportUnlocksBalance(leadId);

      const premiumUnlocked = hasGlobal || unlockedByPack;
      return {
        hasLead: true as const,
        premiumUnlocked,
        unlockSource: hasGlobal
          ? ("entitlement" as const)
          : unlockedByPack
            ? ("pack_consumed" as const)
            : null,
        packBalance,
      };
    } catch {
      return {
        hasLead: false as const,
        premiumUnlocked: false,
        unlockSource: null,
        packBalance: 0,
      };
    }
  });

/**
 * Consome 1 unlock de pack para o `snapshotId` actual. Idempotente:
 * chamadas repetidas devolvem `{ ok: true, already: true }`. Falha com
 * `insufficient` quando o lead não tem saldo de pack disponível.
 */
const consumeInput = z.object({
  snapshotId: z.string().trim().min(1).max(80),
  instagramUsername: z.string().trim().min(1).max(60).optional(),
});

export const consumeReportUnlockForSnapshot = createServerFn({ method: "POST" })
  .inputValidator((raw: unknown) => consumeInput.parse(raw))
  .handler(async ({ data }) => {
    const { getLeadFromCookie } = await import(
      "@/lib/leads/lead-cookie.server"
    );
    const leadId = getLeadFromCookie();
    if (!leadId) {
      return { ok: false as const, reason: "no_lead" as const };
    }

    const { consumeReportUnlock } = await import("./report-unlocks.server");
    const { recordProductEvent } = await import("@/lib/tracking.server");

    const result = await consumeReportUnlock({
      leadId,
      reportCacheKey: data.snapshotId,
      instagramUsername: data.instagramUsername ?? null,
    });

    if ("already" in result) {
      return { ok: true as const, already: true as const };
    }
    if ("insufficient" in result) {
      return {
        ok: false as const,
        reason: "insufficient" as const,
        balance: result.balance,
      };
    }

    await recordProductEvent({
      eventType: "report_unlock_consumed",
      leadId,
      metadata: {
        snapshot_id: data.snapshotId,
        instagram_username: data.instagramUsername ?? null,
        balance_after: result.balanceAfter,
      },
    });

    return {
      ok: true as const,
      consumed: true as const,
      balanceAfter: result.balanceAfter,
    };
  });