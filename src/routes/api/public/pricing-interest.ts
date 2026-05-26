/**
 * POST /api/public/pricing-interest
 *
 * Regista intenção de compra dos planos pagos enquanto o produto
 * está em lançamento (sem checkout ativo). Público — protegido por:
 * - validação Zod estrita
 * - rate-limit in-memory por ipHash (1 req / 3s)
 * - grava ip_hash e user_agent truncado
 */

import { createFileRoute } from "@tanstack/react-router";
import { createHash } from "node:crypto";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

function ipHash(ip: string | null): string | null {
  if (!ip) return null;
  return createHash("sha256").update(ip).digest("hex").slice(0, 16);
}

function clientIp(request: Request): string | null {
  const xf = request.headers.get("x-forwarded-for");
  if (xf) return xf.split(",")[0]?.trim() ?? null;
  return request.headers.get("cf-connecting-ip") ?? null;
}

const recent = new Map<string, number>();
const RATE_WINDOW_MS = 3_000;

function rateLimited(key: string): boolean {
  const now = Date.now();
  const last = recent.get(key);
  if (last && now - last < RATE_WINDOW_MS) return true;
  recent.set(key, now);
  if (recent.size > 1000) {
    for (const [k, t] of recent) {
      if (now - t > RATE_WINDOW_MS * 4) recent.delete(k);
    }
  }
  return false;
}

const Schema = z.object({
  pricing_option: z.enum(["single_report", "pack_5_reports"]),
  would_pay: z.enum(["sim", "talvez", "nao"]),
  price_fairness: z.enum(["barato", "justo", "caro"]).optional().nullable(),
  email: z
    .string()
    .trim()
    .email()
    .max(255)
    .optional()
    .or(z.literal("")),
  comment: z.string().trim().max(500).optional().or(z.literal("")),
  referrer: z.string().max(500).optional().nullable(),
});

export const Route = createFileRoute("/api/public/pricing-interest")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let raw: unknown;
        try {
          raw = await request.json();
        } catch {
          return json({ ok: false, code: "INVALID_PAYLOAD" }, 400);
        }

        const parsed = Schema.safeParse(raw);
        if (!parsed.success) {
          return json({ ok: false, code: "INVALID_PAYLOAD" }, 400);
        }

        const ip = clientIp(request);
        const ip_hash = ipHash(ip);
        const rateKey = `pricing-interest:${ip_hash ?? "anon"}`;
        if (rateLimited(rateKey)) {
          return json({ ok: true });
        }

        const userAgent =
          request.headers.get("user-agent")?.slice(0, 255) ?? null;

        const email = parsed.data.email && parsed.data.email.length > 0 ? parsed.data.email : null;
        const comment = parsed.data.comment && parsed.data.comment.length > 0 ? parsed.data.comment : null;

        const { error } = await supabaseAdmin
          .from("pricing_interest")
          .insert({
            pricing_option: parsed.data.pricing_option,
            would_pay: parsed.data.would_pay,
            price_fairness: parsed.data.price_fairness ?? null,
            email,
            comment,
            referrer: parsed.data.referrer ?? null,
            user_agent: userAgent,
            ip_hash,
          });

        if (error) {
          return json({ ok: false, code: "WRITE_FAILED" }, 500);
        }
        return json({ ok: true });
      },
    },
  },
});