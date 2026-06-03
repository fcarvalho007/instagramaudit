/**
 * Public server function for the /servicos contact form. No auth needed:
 * the form is the entry point for prospective customers. Inserts directly
 * via the admin client and emits a tracking event.
 */

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const inputSchema = z
  .object({
    name: z.string().trim().min(1).max(120),
    email: z.string().trim().email().max(255),
    company: z.string().trim().max(120).optional(),
    topic: z.enum(["auditoria", "formacao", "agencia", "outro"]),
    message: z.string().trim().min(10).max(2000),
  })
  .strict();

export const submitServicesInquiry = createServerFn({ method: "POST" })
  .inputValidator((raw: unknown) => inputSchema.parse(raw))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );
    const { recordProductEvent } = await import("@/lib/tracking.server");
    const { getRequest } = await import("@tanstack/react-start/server");

    let userAgent: string | null = null;
    let referrer: string | null = null;
    try {
      const req = getRequest();
      userAgent = req.headers.get("user-agent");
      referrer = req.headers.get("referer");
    } catch {
      /* not in a request scope */
    }

    const { error } = await supabaseAdmin.from("service_inquiries").insert({
      name: data.name,
      email: data.email.toLowerCase(),
      company: data.company ?? null,
      topic: data.topic,
      message: data.message,
      user_agent: userAgent,
      referrer: referrer,
    });

    if (error) {
      throw new Error("Não foi possível enviar o pedido. Tenta novamente.");
    }

    await recordProductEvent({
      eventType: "services_inquiry_submitted",
      metadata: { topic: data.topic },
    }).catch(() => {});

    return { ok: true };
  });