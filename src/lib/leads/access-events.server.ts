/**
 * Eventos de acesso (Ronda 5B) — magic link, verificação e área privada.
 *
 * Escreve em `product_events` via service role. Nunca regista token nem
 * email em claro: só `lead_id`, `handle` e metadados neutros.
 */

import { supabaseAdmin } from "@/integrations/supabase/client.server";

export const ACCESS_EVENTS = [
  "access_email_queued",
  "access_email_sent",
  "access_email_failed",
  "magic_link_clicked",
  "email_verified",
  "magic_link_invalid",
  "magic_link_expired",
  "full_session_created",
  "private_area_viewed",
  "report_reopened",
  "access_email_resend_requested",
  "access_email_resend_rate_limited",
] as const;

export type AccessEvent = (typeof ACCESS_EVENTS)[number];

export async function recordAccessEvent(input: {
  eventType: AccessEvent;
  leadId?: string | null;
  handle?: string | null;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  try {
    await supabaseAdmin.from("product_events").insert({
      event_type: input.eventType,
      lead_id: input.leadId ?? null,
      handle: input.handle ?? null,
      metadata: input.metadata ?? {},
    });
  } catch (err) {
    console.info("[access-events] insert skipped", err);
  }
}
