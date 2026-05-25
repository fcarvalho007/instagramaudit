import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { recordProductEvent } from "@/lib/tracking.server";
import { verifyUnsubscribeToken } from "@/lib/email/unsubscribe-token.server";

const inputSchema = z.object({
  token: z.string().min(1).max(4096),
});

export type UnsubscribeResult =
  | { ok: true; alreadyOptedOut: boolean; maskedEmail: string | null }
  | { ok: false; reason: "invalid_token" | "lead_not_found" };

function maskEmail(email: string | null): string | null {
  if (!email) return null;
  const [user, domain] = email.split("@");
  if (!user || !domain) return null;
  const prefix = user.slice(0, 1);
  return `${prefix}${"*".repeat(Math.max(1, user.length - 1))}@${domain}`;
}

export const unsubscribeWithToken = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => inputSchema.parse(input))
  .handler(async ({ data }): Promise<UnsubscribeResult> => {
    const verified = verifyUnsubscribeToken(data.token);
    if (!verified) {
      return { ok: false, reason: "invalid_token" };
    }

    const { data: lead } = await (supabaseAdmin as any)
      .from("leads")
      .select("id, email, marketing_consent")
      .eq("id", verified.leadId)
      .maybeSingle();

    if (!lead) {
      return { ok: false, reason: "lead_not_found" };
    }

    const masked = maskEmail(lead.email ?? null);

    if (lead.marketing_consent === false) {
      try {
        await recordProductEvent({
          eventType: "lead_unsubscribed_idempotent" as any,
          leadId: lead.id,
          metadata: { source: "email_link" },
        });
      } catch (err) {
        console.error("[unsubscribe] idempotent event failed:", err);
      }
      return { ok: true, alreadyOptedOut: true, maskedEmail: masked };
    }

    const { error: updateError } = await (supabaseAdmin as any)
      .from("leads")
      .update({
        marketing_consent: false,
        marketing_consent_at: new Date().toISOString(),
      })
      .eq("id", lead.id);

    if (updateError) {
      console.error("[unsubscribe] update failed:", updateError);
      return { ok: false, reason: "invalid_token" };
    }

    try {
      await recordProductEvent({
        eventType: "lead_unsubscribed" as any,
        leadId: lead.id,
        metadata: { source: "email_link" },
      });
    } catch (err) {
      console.error("[unsubscribe] event failed:", err);
    }

    return { ok: true, alreadyOptedOut: false, maskedEmail: masked };
  });
